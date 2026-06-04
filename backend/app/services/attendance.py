"""Алгоритм расчёта табеля сотрудника по событиям прохода и расписанию."""
from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AttendanceEvent,
    AttendanceReport,
    Employee,
    Schedule,
    ScheduleAssignment,
    ScheduleDay,
)


def effective_schedule(db: Session, employee: Employee, target_date: date) -> Schedule | None:
    """Подбирает расписание сотрудника: индивидуальное > отдел > филиал."""
    target_ids: list[tuple[str, UUID]] = []
    target_ids.append(("employee", employee.id))
    if employee.department_id:
        target_ids.append(("department", employee.department_id))
    if employee.branch_id:
        target_ids.append(("branch", employee.branch_id))

    for ttype, tid in target_ids:
        q = select(ScheduleAssignment).where(
            ScheduleAssignment.target_type == ttype,
            ScheduleAssignment.target_id == tid,
        )
        for asg in db.scalars(q).all():
            if asg.valid_from and target_date < asg.valid_from:
                continue
            if asg.valid_to and target_date > asg.valid_to:
                continue
            return db.get(Schedule, asg.schedule_id)
    return None


def _to_minutes(td: timedelta) -> int:
    return max(0, int(td.total_seconds() // 60))


def calculate(db: Session, employee: Employee, target_date: date) -> AttendanceReport:
    """Считает табель за дату и делает UPSERT в attendance_reports."""
    schedule = effective_schedule(db, employee, target_date)
    weekday = target_date.weekday()
    day_cfg: ScheduleDay | None = None
    if schedule:
        day_cfg = next((d for d in schedule.days if d.weekday == weekday), None)

    # Окно событий: для ночной смены — до конца следующих суток
    start_window = datetime.combine(target_date, time(0, 0), tzinfo=timezone.utc)
    end_window = start_window + timedelta(days=1)
    if schedule and schedule.night_shift:
        end_window = start_window + timedelta(days=1, hours=12)

    events = list(
        db.scalars(
            select(AttendanceEvent)
            .where(
                AttendanceEvent.employee_id == employee.id,
                AttendanceEvent.success.is_(True),
                AttendanceEvent.event_time >= start_window,
                AttendanceEvent.event_time < end_window,
            )
            .order_by(AttendanceEvent.event_time)
        ).all()
    )

    required_in = day_cfg.start_time if day_cfg and day_cfg.is_workday else None
    required_out = day_cfg.end_time if day_cfg and day_cfg.is_workday else None

    actual_in: datetime | None = events[0].event_time if events else None
    actual_out: datetime | None = events[-1].event_time if len(events) > 1 else None
    device_in_id = events[0].device_id if events else None
    device_out_id = events[-1].device_id if len(events) > 1 else None

    late = 0
    early = 0
    worked = 0
    status = "absent"

    if not day_cfg or not day_cfg.is_workday:
        status = "day_off" if events == [] else "normal"
    elif actual_in is None:
        status = "absent"
    else:
        if required_in:
            required_in_dt = datetime.combine(target_date, required_in, tzinfo=timezone.utc)
            late = _to_minutes(actual_in - required_in_dt) if actual_in > required_in_dt else 0
            allowed = schedule.allowed_late_minutes if schedule else 0
            if late <= allowed:
                late = 0

        if required_out and actual_out:
            required_out_dt = datetime.combine(target_date, required_out, tzinfo=timezone.utc)
            early = (
                _to_minutes(required_out_dt - actual_out)
                if actual_out < required_out_dt
                else 0
            )
            allowed = schedule.allowed_early_leave_minutes if schedule else 0
            if early <= allowed:
                early = 0

        if actual_in and actual_out:
            worked = _to_minutes(actual_out - actual_in)
            if schedule and schedule.lunch_start and schedule.lunch_end:
                lunch = (
                    datetime.combine(target_date, schedule.lunch_end)
                    - datetime.combine(target_date, schedule.lunch_start)
                )
                worked = max(0, worked - _to_minutes(lunch))

        status = (
            "late" if late > 0 else
            "early_leave" if early > 0 else
            "partial" if worked > 0 and worked < 4 * 60 else
            "normal"
        )

    existing = db.scalar(
        select(AttendanceReport).where(
            AttendanceReport.employee_id == employee.id,
            AttendanceReport.date == target_date,
        )
    )
    if existing is None:
        existing = AttendanceReport(employee_id=employee.id, date=target_date)
        db.add(existing)

    existing.required_check_in = required_in
    existing.required_check_out = required_out
    existing.actual_check_in = actual_in
    existing.actual_check_out = actual_out
    existing.late_minutes = late
    existing.early_leave_minutes = early
    existing.worked_minutes = worked
    existing.status = status
    existing.device_in_id = device_in_id
    existing.device_out_id = device_out_id

    db.flush()
    return existing


def recalculate_range(db: Session, date_from: date, date_to: date) -> int:
    """Пересчитывает табель для всех активных сотрудников за период."""
    employees = list(db.scalars(select(Employee).where(Employee.status == "active")).all())
    count = 0
    current = date_from
    while current <= date_to:
        for emp in employees:
            calculate(db, emp, current)
            count += 1
        current += timedelta(days=1)
    db.commit()
    return count
