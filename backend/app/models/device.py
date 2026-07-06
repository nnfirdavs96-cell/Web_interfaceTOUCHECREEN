from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class Device(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "devices"

    branch_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    vendor: Mapped[str] = mapped_column(
        String(32), default="hikvision", nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(32), default="multi", nullable=False)
    ip: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    port: Mapped[int] = mapped_column(Integer, default=80, nullable=False)
    username: Mapped[str] = mapped_column(String(128), nullable=False)
    password_encrypted: Mapped[str] = mapped_column(String(512), nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    firmware: Mapped[str | None] = mapped_column(String(128), nullable=True)
    online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    purpose: Mapped[str] = mapped_column(String(32), default="entry", nullable=False)
    timezone_offset: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    comment: Mapped[str | None] = mapped_column(String(512), nullable=True)
