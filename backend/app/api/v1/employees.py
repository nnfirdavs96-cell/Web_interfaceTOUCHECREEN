from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api import crud
from app.api.deps import require
from app.db.session import get_db
from app.models import Device, Employee, EmployeeDeviceAccess, User
from app.schemas.common import Paginated
from app.schemas.employee import (
    AssignDevicesRequest,
    EmployeeAccessOut,
    EmployeeCreate,
    EmployeeOut,
    EmployeeUpdate,
)
from app.services import audit

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
