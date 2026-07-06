from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class Camera(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    """IP-камера видеонаблюдения (подключение через ONVIF / RTSP).

    Отдельная сущность от Device (СКУД-терминал). Опционально
    привязывается к устройству через linked_device_id — тогда UI
    может показывать видео с камеры при событии прохода.
    """

    __tablename__ = "cameras"

    branch_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Точка доступа, к которой привязана камера (просмотр входа при проходе).
    linked_device_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # Вендор/протокол: onvif (по умолчанию), rtsp (только прямой url).
    vendor: Mapped[str] = mapped_column(
        String(32), default="onvif", nullable=False, index=True
    )
    ip: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # Порт ONVIF-сервиса (обычно 80).
    port: Mapped[int] = mapped_column(Integer, default=80, nullable=False)
    username: Mapped[str] = mapped_column(String(128), nullable=False)
    password_encrypted: Mapped[str] = mapped_column(String(512), nullable=False)
    # Явный RTSP-URL (если известен или для vendor=rtsp). Иначе берётся из ONVIF.
    rtsp_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    online: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    comment: Mapped[str | None] = mapped_column(String(512), nullable=True)
