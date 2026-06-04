import json
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog, User


def _serialize(value: Any) -> Any:
    if isinstance(value, (UUID, datetime)):
        return str(value)
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    return value


def dump(obj: Any) -> dict[str, Any] | None:
    """Сериализует SQLAlchemy-объект в dict, который PostgreSQL JSONB примет."""
    if obj is None:
        return None
    data: dict[str, Any] = {}
    for col in obj.__table__.columns:  # type: ignore[attr-defined]
        if col.name in ("password_hash",):
            continue
        data[col.name] = _serialize(getattr(obj, col.name))
    # round-trip через json чтобы убедиться что всё сериализуемо
    return json.loads(json.dumps(data, default=str))


def log(
    db: Session,
    *,
    user: User | None,
    action: str,
    entity_type: str,
    entity_id: str | UUID | None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user.id if user else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            before=before,
            after=after,
            ip=(request.client.host if request and request.client else None),
            user_agent=(request.headers.get("user-agent") if request else None),
        )
    )
