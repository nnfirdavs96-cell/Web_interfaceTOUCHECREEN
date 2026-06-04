from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.rbac import has_permission
from app.core.security import decode_token
from app.db.session import get_db
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=True)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise creds_exc
        user_id = UUID(payload["sub"])
    except (ValueError, KeyError):
        raise creds_exc from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise creds_exc
    return user


def require(permission: str):
    def _checker(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user.role.code, permission):
            raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")
        return user

    return _checker
