from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require
from app.db.session import get_db
from app.models import AttendanceEvent, User
from app.schemas.attendance import AttendanceEventOut, AttendanceReportOut
from app.schemas.common import Paginated
from app.services import attendance as attendance_service
from app.services import poller
from app.services.ws import manager

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("/events", response_model=Paginated[AttendanceEventOut])
def list_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    employee_id: UUID | None = None,
    device_id: UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("attendance.read")),
):
    q = select(AttendanceEvent)
    if employee_id:
        q = q.where(AttendanceEvent.employee_id == employee_id)
    if device_id:
        q = q.where(AttendanceEvent.device_id == device_id)
    if date_from:
        q = q.where(AttendanceEvent.event_time >= date_from)
    if date_to:
        q = q.where(AttendanceEvent.event_time <= date_to)

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    q = (
        q.order_by(AttendanceEvent.event_time.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        "items": list(db.scalars(q).all()),
        "total": int(total),
        "page": page,
        "page_size": page_size,
    }


@router.post("/fetch-events", status_code=202)
async def fetch_now(_: User = Depends(require("attendance.read"))):
    n = await poller.poll_once()
    return {"saved": n}


@router.post("/recalculate")
def recalculate(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("attendance.recalculate")),
):
    today = datetime.now(timezone.utc).date()
    date_from = date_from or today - timedelta(days=7)
    date_to = date_to or today
    count = attendance_service.recalculate_range(db, date_from, date_to)
    return {"processed": count, "from": str(date_from), "to": str(date_to)}


@router.get("/reports", response_model=Paginated[AttendanceReportOut])
def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    employee_id: UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("attendance.read")),
):
    from app.models import AttendanceReport

    q = select(AttendanceReport)
    if employee_id:
        q = q.where(AttendanceReport.employee_id == employee_id)
    if date_from:
        q = q.where(AttendanceReport.date >= date_from)
    if date_to:
        q = q.where(AttendanceReport.date <= date_to)
    if status:
        q = q.where(AttendanceReport.status == status)

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    q = q.order_by(AttendanceReport.date.desc()).offset((page - 1) * page_size).limit(page_size)
    return {
        "items": list(db.scalars(q).all()),
        "total": int(total),
        "page": page,
        "page_size": page_size,
    }


# WebSocket live events
@router.websocket("/ws/events")
async def ws_events(ws: WebSocket):
    """Простой stream живых событий. Без авторизации для упрощения; в проде — токен в query."""
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(ws)
