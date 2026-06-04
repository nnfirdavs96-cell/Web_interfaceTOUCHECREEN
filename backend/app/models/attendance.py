from datetime import date, datetime, time
from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class AttendanceEvent(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "attendance_events"

    employee_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True
    )
    device_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True
    )
    external_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(16), default="unknown", nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    raw_payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)


class AttendanceReport(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "attendance_reports"
    __table_args__ = (UniqueConstraint("employee_id", "date", name="uq_emp_date"),)

    employee_id: Mapped[UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    required_check_in: Mapped[time | None] = mapped_column(Time, nullable=True)
    actual_check_in: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    required_check_out: Mapped[time | None] = mapped_column(Time, nullable=True)
    actual_check_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    late_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    early_leave_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    worked_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="absent", nullable=False, index=True)
    device_in_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("devices.id", ondelete="SET NULL"), nullable=True
    )
    device_out_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("devices.id", ondelete="SET NULL"), nullable=True
    )
