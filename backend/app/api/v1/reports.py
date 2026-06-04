from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import require
from app.db.session import get_db
from app.models import User
from app.services import export, report

router = APIRouter(prefix="/reports", tags=["reports"])


def _default_range(date_from: date | None, date_to: date | None) -> tuple[date, date]:
    today = datetime.now(timezone.utc).date()
    return (date_from or today - timedelta(days=30), date_to or today)


@router.get("/timesheet")
def timesheet(
    date_from: date | None = None,
    date_to: date | None = None,
    employee_id: UUID | None = None,
    department_id: UUID | None = None,
    branch_id: UUID | None = None,
    organization_id: UUID | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("reports.read")),
):
    date_from, date_to = _default_range(date_from, date_to)
    rows = report.fetch_rows(
        db,
        date_from=date_from,
        date_to=date_to,
        employee_id=employee_id,
        department_id=department_id,
        branch_id=branch_id,
        organization_id=organization_id,
        status=status,
    )
    return {"date_from": str(date_from), "date_to": str(date_to), "rows": rows}


@router.get("/summary")
def summary(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("reports.read")),
):
    date_from, date_to = _default_range(date_from, date_to)
    rows = report.fetch_rows(db, date_from=date_from, date_to=date_to)
    by_status: dict[str, int] = {}
    for r in rows:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1
    return {
        "date_from": str(date_from),
        "date_to": str(date_to),
        "total_rows": len(rows),
        "by_status": by_status,
    }


def _export(
    fmt: str,
    date_from: date | None,
    date_to: date | None,
    db: Session,
    **filters,
) -> Response:
    date_from, date_to = _default_range(date_from, date_to)
    rows = report.fetch_rows(db, date_from=date_from, date_to=date_to, **filters)
    name = export.filename("timesheet", date_from, date_to, fmt)

    if fmt == "csv":
        content = export.rows_to_csv(rows)
        media = "text/csv"
    elif fmt == "xlsx":
        content = export.rows_to_xlsx(rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        content = export.rows_to_pdf(rows)
        media = "application/pdf"
    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )


@router.get("/export/csv")
def export_csv(
    date_from: date | None = None,
    date_to: date | None = None,
    employee_id: UUID | None = None,
    department_id: UUID | None = None,
    branch_id: UUID | None = None,
    organization_id: UUID | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("reports.export")),
):
    return _export("csv", date_from, date_to, db,
                   employee_id=employee_id, department_id=department_id,
                   branch_id=branch_id, organization_id=organization_id, status=status)


@router.get("/export/excel")
def export_xlsx(
    date_from: date | None = None,
    date_to: date | None = None,
    employee_id: UUID | None = None,
    department_id: UUID | None = None,
    branch_id: UUID | None = None,
    organization_id: UUID | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("reports.export")),
):
    return _export("xlsx", date_from, date_to, db,
                   employee_id=employee_id, department_id=department_id,
                   branch_id=branch_id, organization_id=organization_id, status=status)


@router.get("/export/pdf")
def export_pdf(
    date_from: date | None = None,
    date_to: date | None = None,
    employee_id: UUID | None = None,
    department_id: UUID | None = None,
    branch_id: UUID | None = None,
    organization_id: UUID | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("reports.export")),
):
    return _export("pdf", date_from, date_to, db,
                   employee_id=employee_id, department_id=department_id,
                   branch_id=branch_id, organization_id=organization_id, status=status)
