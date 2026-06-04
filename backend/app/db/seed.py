"""Заполнение БД начальными данными: роли + супер-админ."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rbac import ROLES
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Role, User


def seed(db: Session) -> None:
    existing = {r.code for r in db.scalars(select(Role)).all()}
    for code, name in ROLES.items():
        if code not in existing:
            db.add(Role(code=code, name=name))
    db.commit()

    admin = db.scalar(select(User).where(User.email == settings.SEED_ADMIN_EMAIL))
    if admin is None:
        super_admin_role = db.scalar(select(Role).where(Role.code == "super_admin"))
        assert super_admin_role is not None
        db.add(
            User(
                email=settings.SEED_ADMIN_EMAIL,
                password_hash=hash_password(settings.SEED_ADMIN_PASSWORD),
                full_name="Super Admin",
                role_id=super_admin_role.id,
                is_active=True,
            )
        )
        db.commit()


def run() -> None:
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    run()
