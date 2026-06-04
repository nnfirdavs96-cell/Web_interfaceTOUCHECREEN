"""Сбор плоских строк табеля для отчётов и экспорта."""
from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AttendanceReport, Employee


def fetch_rows(
    db: Session,
    *,
    date_from: date,
    date_to: date,
    employee_id: UUID | None = None,
    department_id: UUID | None = None,
    branch_id: UUID | None = None,
    organization_id: UUID | None = None,
    status: str | None = None,
) -> list[dict]:
    q = (
        select(AttendanceReport, Employee)
        .join(Employee, Employee.id == AttendanceReport.employee_id)
        .where(AttendanceReport.date >= date_from, AttendanceReport.date <= date_to)
        .order_by(AttendanceReport.date, Employee.last_name)
    )
    if employee_id:
        q = q.where(AttendanceReport.employee_id == employee_id)
    if department_id:
        q = q.where(Employee.department_id == department_id)
    if branch_id:
        q = q.where(Employee.branch_id == branch_id)
    if organization_id:
        q = q.where(Employee.organization_id == organization_id)
    if status:
        q = q.where(AttendanceReport.status == status)

    rows: list[dict] = []
    for rep, emp in db.execute(q).all():
        rows.append(
            {
                "external_id": emp.external_id or str(emp.id)[:8],
                "full_name": " ".join(filter(None, [emp.last_name, emp.first_name, emp.middle_name])),
                "date": rep.date,
                "required_check_in": rep.required_check_in,
                "actual_check_in": rep.actual_check_in,
                "required_check_out": rep.required_check_out,
                "actual_check_out": rep.actual_check_out,
                "late_minutes": rep.late_minutes,
                "early_leave_minutes": rep.early_leave_minutes,
                "worked_minutes": rep.worked_minutes,
                "status": rep.status,
            }
        )
    return rows
