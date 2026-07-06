from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import crud
from app.api.deps import require
from app.core.crypto import encrypt
from app.db.session import get_db
from app.models import Device, User
from app.schemas.common import Paginated
from app.schemas.device import DeviceCreate, DeviceOut, DeviceTestResult, DeviceUpdate
from app.services import audit
from app.services.devices import DeviceService

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("", response_model=Paginated[DeviceOut])
def list_devices(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("devices.read")),
):
    return crud.list_paginated(
        db, Device, page=page, page_size=page_size, search=search, order_by=Device.name
    )


@router.post("", response_model=DeviceOut, status_code=201)
def create_device(
    body: DeviceCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("devices.write")),
):
    data = body.model_dump()
    password = data.pop("password")
    data["password_encrypted"] = encrypt(password)
    return crud.create(
        db, Device, data, user=user, request=request, entity_type="device"
    )


@router.get("/{device_id}", response_model=DeviceOut)
def get_device(
    device_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("devices.read")),
):
    return crud.get_or_404(db, Device, device_id)


@router.put("/{device_id}", response_model=DeviceOut)
def update_device(
    device_id: UUID,
    body: DeviceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("devices.write")),
):
    device = crud.get_or_404(db, Device, device_id)
    data = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "password" in data:
        data["password_encrypted"] = encrypt(data.pop("password"))
    return crud.update(db, device, data, user=user, request=request, entity_type="device")


@router.delete("/{device_id}", status_code=204)
def delete_device(
    device_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("devices.write")),
):
    device = crud.get_or_404(db, Device, device_id)
    crud.delete(db, device, user=user, request=request, entity_type="device")


@router.post("/{device_id}/test-connection", response_model=DeviceTestResult)
async def test_connection(
    device_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("devices.read")),
):
    device = crud.get_or_404(db, Device, device_id)
    client = DeviceService.driver_for(device)
    info = await client.test_connection()
    device.online = info.online
    if info.online:
        device.last_seen_at = datetime.now(timezone.utc)
        if info.serial_number:
            device.serial_number = info.serial_number
        if info.firmware:
            device.firmware = info.firmware
        # Параллельно синхронизируем время устройства с временем сервера
        try:
            await client.set_time(device.timezone_offset)
        except Exception:
            pass
        # Гарантируем 24/7 расписание доступа (иначе устройство отказывает всем)
        try:
            await client.ensure_24x7_schedule()
        except Exception:
            pass
        # Залить всех активных сотрудников из БД на устройство
        try:
            from app.models import Employee

            employees = list(
                db.scalars(
                    select(Employee).where(
                        Employee.status == "active",
                        Employee.external_id.is_not(None),
                    )
                ).all()
            )
            for emp in employees:
                full_name = " ".join(
                    filter(None, [emp.last_name, emp.first_name, emp.middle_name])
                )
                try:
                    await client.upsert_user(emp.external_id, full_name)
                except Exception:
                    pass
        except Exception:
            pass
    db.commit()
    return DeviceTestResult(
        online=info.online,
        detail=info.detail,
        serial_number=info.serial_number,
        firmware=info.firmware,
    )


@router.post("/{device_id}/sync-time")
async def sync_time(
    device_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("devices.write")),
):
    """Принудительная синхронизация времени устройства с временем сервера."""
    device = crud.get_or_404(db, Device, device_id)
    client = DeviceService.driver_for(device)
    ok = await client.set_time(device.timezone_offset)
    return {"success": ok, "detail": "Время синхронизировано" if ok else "Не удалось задать время"}


@router.get("/{device_id}/snapshot")
async def device_snapshot(
    device_id: UUID,
    t: str | None = None,  # JWT в query — для <img src> чтобы не плодить хедеры
    db: Session = Depends(get_db),
):
    """JPEG-снимок с камеры устройства (для live-превью в UI).

    Принимает токен через ?t= чтобы можно было использовать в <img src>.
    """
    from fastapi import HTTPException
    from fastapi.responses import Response

    from app.core.security import decode_token

    if not t:
        raise HTTPException(status_code=401, detail="token required")
    try:
        payload = decode_token(t)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="invalid token") from None

    device = crud.get_or_404(db, Device, device_id)
    client = DeviceService.driver_for(device)
    img = await client.get_snapshot()
    if img is None:
        return Response(status_code=503, content=b"camera unavailable")
    return Response(
        content=img,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store"},
    )


@router.post("/{device_id}/sync-all-employees")
async def sync_all_employees(
    device_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("devices.sync")),
):
    """Пушит всех активных сотрудников из БД на устройство.

    Используется когда устройство впервые добавили или для восстановления
    рассинхрона (например после сброса устройства).
    """
    from app.models import Employee

    device = crud.get_or_404(db, Device, device_id)
    client = DeviceService.driver_for(device)

    employees = list(
        db.scalars(
            select(Employee).where(
                Employee.status == "active",
                Employee.external_id.is_not(None),
            )
        ).all()
    )
    success = 0
    failed = 0
    errors: list[str] = []
    for emp in employees:
        full_name = " ".join(
            filter(None, [emp.last_name, emp.first_name, emp.middle_name])
        )
        try:
            res = await client.upsert_user(emp.external_id, full_name)
            if res.success:
                success += 1
            else:
                failed += 1
                if len(errors) < 3:
                    errors.append(f"{emp.external_id}: {res.detail[:60]}")
        except Exception as e:
            failed += 1
            if len(errors) < 3:
                errors.append(f"{emp.external_id}: {str(e)[:60]}")

    detail = f"Залито {success} из {len(employees)} сотрудников"
    if failed:
        detail += f" · ошибок: {failed}"
        if errors:
            detail += " (" + "; ".join(errors) + ")"

    return {
        "success": failed == 0,
        "synced": success,
        "failed": failed,
        "total": len(employees),
        "detail": detail,
    }


@router.post("/{device_id}/sync", status_code=202)
async def sync_device(
    device_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("devices.sync")),
):
    """Заглушка синхронизации пользователей и графиков доступа.

    Полная реализация — на этапе 4 (Celery worker + права доступа).
    """
    device = crud.get_or_404(db, Device, device_id)
    audit.log(
        db,
        user=user,
        action="sync",
        entity_type="device",
        entity_id=device.id,
        request=request,
    )
    db.commit()
    return {"queued": True, "device_id": str(device.id)}
