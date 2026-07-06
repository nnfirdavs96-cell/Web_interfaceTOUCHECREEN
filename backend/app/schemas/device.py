from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DeviceBase(BaseModel):
    branch_id: UUID | None = None
    organization_id: UUID | None = None
    name: str = Field(min_length=1, max_length=255)
    vendor: str = Field(default="hikvision")
    type: str = Field(default="multi")
    ip: str = Field(min_length=1, max_length=64)
    port: int = Field(default=80, ge=1, le=65535)
    username: str = Field(min_length=1, max_length=128)
    purpose: str = "entry"
    timezone_offset: int = Field(default=5, ge=-12, le=14)
    comment: str | None = None


class DeviceCreate(DeviceBase):
    password: str = Field(min_length=1, max_length=128)


class DeviceUpdate(BaseModel):
    branch_id: UUID | None = None
    organization_id: UUID | None = None
    name: str | None = None
    vendor: str | None = None
    type: str | None = None
    ip: str | None = None
    port: int | None = None
    username: str | None = None
    password: str | None = None
    purpose: str | None = None
    timezone_offset: int | None = None
    comment: str | None = None


class DeviceOut(DeviceBase):
    id: UUID
    serial_number: str | None
    firmware: str | None
    online: bool
    last_seen_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeviceTestResult(BaseModel):
    online: bool
    detail: str
    serial_number: str | None = None
    firmware: str | None = None
