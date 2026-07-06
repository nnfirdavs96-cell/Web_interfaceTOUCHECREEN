"""Generic CRUD helpers used by резOURCE-роутерами."""
from typing import Any
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User
from app.services import audit


def list_paginated(
    db: Session,
    model: type,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    search_field: str = "name",
    order_by: Any | None = None,
):
    q = select(model)
    if search:
        col = getattr(model, search_field)
        q = q.where(col.ilike(f"%{search}%"))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    q = q.order_by(order_by if order_by is not None else model.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    items = db.scalars(q).all()
    return {"items": list(items), "total": int(total), "page": page, "page_size": page_size}


def get_or_404(db: Session, model: type, obj_id: UUID):
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    # Тенант-изоляция: cross-tenant доступ выглядит как 404.
    from app.api.tenant import check_object_scope

    if not check_object_scope(obj):
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj


def create(
    db: Session,
    model: type,
    data: dict,
    *,
    user: User,
    request: Request,
    entity_type: str,
):
    # Тенант-изоляция: авто-проставляем organization_id при создании.
    from app.api.tenant import assign_tenant

    data = assign_tenant(data, model)
    obj = model(**data)
    db.add(obj)
    db.flush()
    audit.log(
        db,
        user=user,
        action="create",
        entity_type=entity_type,
        entity_id=obj.id,
        after=audit.dump(obj),
        request=request,
    )
    db.commit()
    db.refresh(obj)
    return obj


def update(
    db: Session,
    obj,
    data: dict,
    *,
    user: User,
    request: Request,
    entity_type: str,
):
    before = audit.dump(obj)
    for k, v in data.items():
        if v is not None or k in obj.__table__.columns:  # type: ignore[attr-defined]
            setattr(obj, k, v)
    db.flush()
    audit.log(
        db,
        user=user,
        action="update",
        entity_type=entity_type,
        entity_id=obj.id,
        before=before,
        after=audit.dump(obj),
        request=request,
    )
    db.commit()
    db.refresh(obj)
    return obj


def delete(
    db: Session,
    obj,
    *,
    user: User,
    request: Request,
    entity_type: str,
):
    before = audit.dump(obj)
    obj_id = obj.id
    db.delete(obj)
    audit.log(
        db,
        user=user,
        action="delete",
        entity_type=entity_type,
        entity_id=obj_id,
        before=before,
        request=request,
    )
    db.commit()
