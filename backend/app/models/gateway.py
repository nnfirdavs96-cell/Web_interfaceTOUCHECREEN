from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class Gateway(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    """Edge Gateway — локальный агент в сети клиента (решает NAT).

    Держит исходящий WS-туннель к облаку и выполняет команды к устройствам
    LAN. Устройства ссылаются на gateway через Device.gateway_id.
    """

    __tablename__ = "gateways"

    branch_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # SHA-256 токена агента (сам токен показывается один раз при создании).
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    online: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    comment: Mapped[str | None] = mapped_column(String(512), nullable=True)
