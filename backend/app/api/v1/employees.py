from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api import crud
from app.api.deps import require
from app.db.session import get_db
from app.models import Device, Employee, EmployeeCredential, EmployeeDeviceAccess, User
from app.schemas.common import Paginated
from app.schemas.employee import (
    AssignDevicesRequest,
    CardRequest,
    CredentialOut,
    EmployeeAccessOut,
    EmployeeCreate,
    EmployeeOut,
    EmployeeUpdate,
    EnrollResponse,
    FingerprintRequest,
    SyncToDeviceRequest,
)
from app.services import audit
from app.services.hikvision import HikvisionService

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=Paginated[EmployeeOut])
def list_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = None,
    organization_id: UUID | None = None,
    department_id: UUID | None = None,
    branch_id: UUID | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("employees.read")),
):
    q = select(Employee)
    if search:
        like = f"%{search}%"
        q = q.where(
            or_(
                Employee.first_name.ilike(like),
                Employee.last_name.ilike(like),
                Employee.middle_name.ilike(like),
                Employee.external_id.ilike(like),
                Employee.phone.ilike(like),
            )
        )
    if organization_id:
        q = q.where(Employee.organization_id == organization_id)
    if department_id:
        q = q.where(Employee.department_id == department_id)
    if branch_id:
        q = q.where(Employee.branch_id == branch_id)
    if status:
        q = q.where(Employee.status == status)

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    q = (
        q.order_by(Employee.last_name, Employee.first_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.scalars(q).all())
    return {"items": items, "total": int(total), "page": page, "page_size": page_size}


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(
    body: EmployeeCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("employees.write")),
):
    return crud.create(
        db, Employee, body.model_dump(), user=user, request=request, entity_type="employee"
    )


@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(
    emp_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("employees.read")),
):
    return crud.get_or_404(db, Employee, emp_id)


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(
    emp_id: UUID,
    body: EmployeeUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("employees.write")),
):
    emp = crud.get_or_404(db, Employee, emp_id)
    return crud.update(
        db, emp, body.model_dump(), user=user, request=request, entity_type="employee"
    )


@router.delete("/{emp_id}", status_code=204)
def delete_employee(
    emp_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("employees.write")),
):
    emp = crud.get_or_404(db, Employee, emp_id)
    crud.delete(db, emp, user=user, request=request, entity_type="employee")


@router.get("/{emp_id}/access", response_model=list[EmployeeAccessOut])
def list_access(
    emp_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("employees.read")),
):
    crud.get_or_404(db, Employee, emp_id)
    rows = db.scalars(
        select(EmployeeDeviceAccess).where(EmployeeDeviceAccess.employee_id == emp_id)
    ).all()
    return list(rows)


@router.post("/{emp_id}/assign-devices", response_model=list[EmployeeAccessOut])
def assign_devices(
    emp_id: UUID,
    body: AssignDevicesRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("employees.write")),
):
    emp = crud.get_or_404(db, Employee, emp_id)
    if not body.device_ids:
        raise HTTPException(status_code=400, detail="device_ids is required")

    existing = {
        row.device_id: row
        for row in db.scalars(
            select(EmployeeDeviceAccess).where(EmployeeDeviceAccess.employee_id == emp.id)
        ).all()
    }

    now = datetime.now(timezone.utc)
    result: list[EmployeeDeviceAccess] = []
    for dev_id in body.device_ids:
        device = db.get(Device, dev_id)
        if device is None:
            continue
        row = existing.get(dev_id)
        if row is None:
            row = EmployeeDeviceAccess(employee_id=emp.id, device_id=dev_id)
            db.add(row)
        row.access_level = body.access_level
        row.valid_from = body.valid_from
        row.valid_to = body.valid_to
        row.synced_at = now
        result.append(row)

    audit.log(
        db,
        user=user,
        action="assign-devices",
        entity_type="employee",
        entity_id=emp.id,
        after={"device_ids": [str(d) for d in body.device_ids]},
        request=request,
    )
    db.commit()
    for r in result:
        db.refresh(r)
    return result


# ---------- credentials ----------


def _get_device(db: Session, device_id: UUID) -> Device:
    dev = db.get(Device, device_id)
    if dev is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return dev


def _save_credential(
    db: Session,
    employee_id: UUID,
    device_id: UUID,
    cred_type: str,
    value_ref: str | None,
) -> EmployeeCredential:
    # одна запись на (employee, device, type)
    existing = db.scalar(
        select(EmployeeCredential).where(
            EmployeeCredential.employee_id == employee_id,
            EmployeeCredential.device_id == device_id,
            EmployeeCredential.type == cred_type,
        )
    )
    if existing is None:
        existing = EmployeeCredential(
            employee_id=employee_id, device_id=device_id, type=cred_type
        )
        db.add(existing)
    existing.value_ref = value_ref
    existing.enrolled_at = datetime.now(timezone.utc)
    return existing


@router.get("/{emp_id}/credentials", response_model=list[CredentialOut])
def list_credentials(
    emp_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("employees.read")),
):
    crud.get_or_404(db, Employee, emp_id)
    rows = db.scalars(
        select(EmployeeCredential).where(EmployeeCredential.employee_id == emp_id)
    ).all()
    return list(rows)


@router.post("/{emp_id}/sync-to-device", response_model=EnrollResponse)
async def sync_to_device(
    emp_id: UUID,
    body: SyncToDeviceRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("devices.sync")),
):
    """Создаёт/обновляет пользователя на устройстве (employeeNo = employee.external_id)."""
    emp = crud.get_or_404(db, Employee, emp_id)
    if not emp.external_id:
        raise HTTPException(
            status_code=400, detail="У сотрудника нет external_id — заполните «ID сотрудника»"
        )
    device = _get_device(db, body.device_id)
    full_name = " ".join(filter(None, [emp.last_name, emp.first_name, emp.middle_name]))
    client = HikvisionService.client_for(device)
    res = await client.upsert_user(emp.external_id, full_name)

    audit.log(
        db,
        user=user,
        action="sync-to-device",
        entity_type="employee",
        entity_id=emp.id,
        after={"device_id": str(device.id), "success": res.success, "detail": res.detail},
        request=request,
    )
    db.commit()
    return EnrollResponse(success=res.success, detail=res.detail, value_ref=res.value_ref)


@router.post("/{emp_id}/enroll-fingerprint", response_model=EnrollResponse)
async def enroll_fingerprint(
    emp_id: UUID,
    body: FingerprintRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("employees.write")),
):
    """Запускает дистанционную регистрацию отпечатка. Устройство покажет
    сотруднику «Поднесите палец» — нужно приложить 3 раза."""
    emp = crud.get_or_404(db, Employee, emp_id)
    if not emp.external_id:
        raise HTTPException(status_code=400, detail="Сначала укажите external_id сотрудника")
    device = _get_device(db, body.device_id)
    client = HikvisionService.client_for(device)
    res = await client.capture_fingerprint(emp.external_id, body.finger_no)
    if res.success:
        _save_credential(db, emp.id, device.id, "fingerprint", res.value_ref)
    audit.log(
        db,
        user=user,
        action="enroll-fingerprint",
        entity_type="employee",
        entity_id=emp.id,
        after={"finger_no": body.finger_no, "success": res.success, "detail": res.detail},
        request=request,
    )
    db.commit()
    return EnrollResponse(success=res.success, detail=res.detail, value_ref=res.value_ref)


@router.post("/{emp_id}/enroll-face", response_model=EnrollResponse)
async def enroll_face(
    emp_id: UUID,
    device_id: UUID = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    request: Request = None,  # type: ignore[assignment]
    user: User = Depends(require("employees.write")),
):
    """Загружает фото лица на устройство и привязывает к сотруднику."""
    emp = crud.get_or_404(db, Employee, emp_id)
    if not emp.external_id:
        raise HTTPException(status_code=400, detail="Сначала укажите external_id сотрудника")
    device = _get_device(db, device_id)
    image_bytes = await file.read()
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл слишком большой (>5MB)")
    client = HikvisionService.client_for(device)
    res = await client.upload_face(emp.external_id, image_bytes)
    if res.success:
        _save_credential(db, emp.id, device.id, "face", res.value_ref)
    audit.log(
        db,
        user=user,
        action="enroll-face",
        entity_type="employee",
        entity_id=emp.id,
        after={"success": res.success, "detail": res.detail, "size": len(image_bytes)},
        request=request,
    )
    db.commit()
    return EnrollResponse(success=res.success, detail=res.detail, value_ref=res.value_ref)


@router.post("/{emp_id}/add-card", response_model=EnrollResponse)
async def add_card(
    emp_id: UUID,
    body: CardRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("employees.write")),
):
    emp = crud.get_or_404(db, Employee, emp_id)
    if not emp.external_id:
        raise HTTPException(status_code=400, detail="Сначала укажите external_id сотрудника")
    device = _get_device(db, body.device_id)
    client = HikvisionService.client_for(device)
    res = await client.add_card(emp.external_id, body.card_no)
    if res.success:
        _save_credential(db, emp.id, device.id, "card", res.value_ref)
    audit.log(
        db,
        user=user,
        action="add-card",
        entity_type="employee",
        entity_id=emp.id,
        after={"card_last4": body.card_no[-4:], "success": res.success, "detail": res.detail},
        request=request,
    )
    db.commit()
    return EnrollResponse(success=res.success, detail=res.detail, value_ref=res.value_ref)
