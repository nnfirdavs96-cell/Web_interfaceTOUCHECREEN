from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CameraBase(BaseModel):
    branch_id: UUID | None = None
    organization_id: UUID | None = None
    linked_device_id: UUID | None = None
    name: str = Field(min_length=1, max_length=255)
    vendor: str = Field(default="onvif")
    ip: str = Field(min_length=1, max_length=64)
    port: int = Field(default=80, ge=1, le=65535)
    username: str = Field(min_length=1, max_length=128)
    rtsp_url: str | None = Field(default=None, max_length=512)
    comment: str | None = None


class CameraCreate(CameraBase):
    password: str = Field(min_length=1, max_length=128)


class CameraUpdate(BaseModel):
    branch_id: UUID | None = None
    organization_id: UUID | None = None
    linked_device_id: UUID | None = None
    name: str | None = None
    vendor: str | None = None
    ip: str | None = None
    port: int | None = None
    username: str | None = None
    password: str | None = None
    rtsp_url: str | None = None
    comment: str | None = None


class CameraOut(CameraBase):
    id: UUID
    model: str | None
    online: bool
    last_seen_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CameraTestResult(BaseModel):
    online: bool
    detail: str
    model: str | None = None


class CameraStreamInfo(BaseModel):
    stream_url: str | None = None       # исходный RTSP-URL
    hls_url: str | None = None          # live HLS через MediaMTX (для браузера)
    webrtc_url: str | None = None       # live WebRTC (WHEP) через MediaMTX
    live: bool = False                  # доступен ли live через транскодер
    detail: str
