from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TenantMixin:
    """Tenant-ready: организация = граница тенанта (мультитенантность).

    Пока nullable и БЕЗ enforcement — только подготовка схемы, чтобы при
    включении мультитенантности (отдельный этап) не мигрировать заполненную
    прод-БД. Фильтрация по tenant добавляется middleware'ом позже.
    """

    organization_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UUIDPKMixin:
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
