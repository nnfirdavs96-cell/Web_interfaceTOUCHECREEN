"""Camera Abstraction Layer — единый доступ к IP-камерам (ONVIF/RTSP)."""
from app.services.cameras.base import (
    CameraConn,
    CameraInfo,
    PTZCommand,
    VideoSource,
)
from app.services.cameras.service import CameraService

SUPPORTED_CAMERA_VENDORS = ["onvif", "rtsp"]

__all__ = [
    "CameraConn",
    "CameraInfo",
    "PTZCommand",
    "VideoSource",
    "CameraService",
    "SUPPORTED_CAMERA_VENDORS",
]
