from datetime import date
from uuid import UUID

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class Employee(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "employees"

    external_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    middle_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    organization_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    department_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    branch_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    position: Mapped[str | None] = mapped_column(String(128), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False, index=True)
    hired_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
