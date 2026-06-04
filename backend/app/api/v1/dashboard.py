from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import AttendanceEvent, AttendanceReport, Device, Employee, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    week_ago = today - timedelta(days=6)

    total_employees = db.scalar(
        select(func.count(Employee.id)).where(Employee.status == "active")
    ) or 0
    total_devices = db.scalar(select(func.count(Device.id))) or 0
    online_devices = db.scalar(select(func.count(Device.id)).where(Device.online.is_(True))) or 0

    today_reports = list(
        db.scalars(select(AttendanceReport).where(AttendanceReport.date == today)).all()
    )
    came_today = sum(1 for r in today_reports if r.status in ("normal", "late", "partial", "early_leave"))
    late_today = sum(1 for r in today_reports if r.status == "late")
    absent_today = sum(1 for r in today_reports if r.status == "absent")

    # weekly chart
    week_rows = list(
        db.execute(
            select(
                AttendanceReport.date,
                func.count(AttendanceReport.id).filter(AttendanceReport.status != "absent"),
                func.count(AttendanceReport.id).filter(AttendanceReport.status == "late"),
            )
            .where(AttendanceReport.date >= week_ago, AttendanceReport.date <= today)
            .group_by(AttendanceReport.date)
            .order_by(AttendanceReport.date)
        ).all()
    )
    weekly = [{"date": str(d), "came": int(c or 0), "late": int(l or 0)} for d, c, l in week_rows]

    recent_events = list(
        db.scalars(
            select(AttendanceEvent).order_by(AttendanceEvent.event_time.desc()).limit(10)
        ).all()
    )
    events_out = [
        {
            "id": str(e.id),
            "employee_id": str(e.employee_id) if e.employee_id else None,
            "device_id": str(e.device_id) if e.device_id else None,
            "event_time": e.event_time.isoformat(),
            "event_type": e.event_type,
        }
        for e in recent_events
    ]

    return {
        "kpis": {
            "total_employees": total_employees,
            "total_devices": total_devices,
            "online_devices": online_devices,
            "came_today": came_today,
            "late_today": late_today,
            "absent_today": absent_today,
        },
        "weekly": weekly,
        "recent_events": events_out,
    }
