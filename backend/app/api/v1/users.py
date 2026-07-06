from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import require
from app.core.rbac import ROLES
from app.core.security import hash_password
from app.db.session import get_db
from app.models import Role, User
from app.schemas.common import Paginated
from app.schemas.user import UserCreate, UserListOut, UserUpdate
from app.services import audit

router = APIRouter(prefix="/users", tags=["users"])


def _to_out(u: User) -> UserListOut:
    return UserListOut(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        role=u.role.code,
        organization_id=u.organization_id,
        is_active=u.is_active,
        last_login_at=u.last_login_at,
        created_at=u.created_at,
    )


def _resolve_role(db: Session, code: str) -> Role:
    if code not in ROLES:
        raise HTTPException(status_code=400, detail=f"Unknown role: {code}")
    role = db.scalar(select(Role).where(Role.code == code))
    if role is None:
        raise HTTPException(status_code=400, detail="Role missing in DB")
    return role


@router.get("", response_model=Paginated[UserListOut])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("users.read")),
):
    q = select(User)
    if search:
        like = f"%{search}%"
        q = q.where(or_(User.email.ilike(like), User.full_name.ilike(like)))
    from sqlalchemy import func

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    q = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = [_to_out(u) for u in db.scalars(q).all()]
    return {"items": items, "total": int(total), "page": page, "page_size": page_size}


@router.post("", response_model=UserListOut, status_code=201)
def create_user(
    body: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require("users.write")),
):
    if db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(status_code=409, detail="Email already exists")
    role = _resolve_role(db, body.role)
    # Тенант: явно заданная организация или (при мультитенантности) организация
    # создающего администратора.
    from app.api.tenant import current_tenant

    org_id = body.organization_id or current_tenant.get()
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role_id=role.id,
        organization_id=org_id,
        is_active=body.is_active,
    )
    db.add(user)
    db.flush()
    audit.log(
        db,
        user=actor,
        action="create",
        entity_type="user",
        entity_id=user.id,
        after=audit.dump(user),
        request=request,
    )
    db.commit()
    db.refresh(user)
    return _to_out(user)


@router.put("/{user_id}", response_model=UserListOut)
def update_user(
    user_id: UUID,
    body: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require("users.write")),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    before = audit.dump(user)
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        user.role_id = _resolve_role(db, body.role).id
    if body.organization_id is not None:
        user.organization_id = body.organization_id
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password:
        user.password_hash = hash_password(body.password)
    db.flush()
    audit.log(
        db,
        user=actor,
        action="update",
        entity_type="user",
        entity_id=user.id,
        before=before,
        after=audit.dump(user),
        request=request,
    )
    db.commit()
    db.refresh(user)
    return _to_out(user)


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require("users.write")),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == actor.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    before = audit.dump(user)
    db.delete(user)
    audit.log(
        db,
        user=actor,
        action="delete",
        entity_type="user",
        entity_id=user_id,
        before=before,
        request=request,
    )
    db.commit()


@router.get("/roles", response_model=list[dict])
def list_roles(_: User = Depends(require("users.read"))):
    return [{"code": code, "name": name} for code, name in ROLES.items()]
