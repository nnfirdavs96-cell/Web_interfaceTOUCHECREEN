from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require
from app.db.session import get_db
from app.models import User
from app.schemas.auth import UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require("users.read")),
) -> list[UserOut]:
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [
        UserOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role.code,
            permissions=[],
            is_active=u.is_active,
        )
        for u in users
    ]
