from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require
from app.db.session import get_db
from app.models import AuditLog, User
from app.schemas.audit import AuditLogOut
from app.schemas.common import Paginated

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs", response_model=Paginated[AuditLogOut])
def list_audit(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    user_id: UUID | None = None,
    entity_type: str | None = None,
    action: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("audit.read")),
):
    q = select(AuditLog)
    if user_id:
        q = q.where(AuditLog.user_id == user_id)
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    if action:
        q = q.where(AuditLog.action == action)
    if date_from:
        q = q.where(AuditLog.created_at >= date_from)
    if date_to:
        q = q.where(AuditLog.created_at <= date_to)

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    q = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.scalars(q).all())
    return {"items": items, "total": int(total), "page": page, "page_size": page_size}
