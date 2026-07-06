from datetime import date, time
from uuid import UUID

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class Schedule(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "schedules"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(32), default="office", nullable=False)
    allowed_late_minutes: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    allowed_early_leave_minutes: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    night_shift: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    lunch_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    lunch_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    days: Mapped[list["ScheduleDay"]] = relationship(
        back_populates="schedule", cascade="all, delete-orphan", lazy="selectin"
    )


class ScheduleDay(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "schedule_days"

    schedule_id: Mapped[UUID] = mapped_column(
        ForeignKey("schedules.id", ondelete="CASCADE"), index=True
    )
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon..6=Sun
    is_workday: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    shift_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    schedule: Mapped[Schedule] = relationship(back_populates="days")


class ScheduleAssignment(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "schedule_assignments"

    schedule_id: Mapped[UUID] = mapped_column(
        ForeignKey("schedules.id", ondelete="CASCADE"), index=True
    )
    target_type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    target_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    valid_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    valid_to: Mapped[date | None] = mapped_column(Date, nullable=True)
