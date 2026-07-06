from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api import crud
from app.api.deps import require
from app.core.crypto import encrypt
from app.core.security import decode_token
from app.db.session import get_db
from app.models import Camera, User
from app.schemas.camera import (
    CameraCreate,
    CameraOut,
    CameraStreamInfo,
    CameraTestResult,
    CameraUpdate,
)
from app.schemas.common import Paginated
from app.services.cameras import CameraService

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.get("", response_model=Paginated[CameraOut])
def list_cameras(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("cameras.read")),
):
    return crud.list_paginated(
        db, Camera, page=page, page_size=page_size, search=search, order_by=Camera.name
    )


@router.post("", response_model=CameraOut, status_code=201)
def create_camera(
    body: CameraCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("cameras.write")),
):
    data = body.model_dump()
    password = data.pop("password")
    data["password_encrypted"] = encrypt(password)
    return crud.create(
        db, Camera, data, user=user, request=request, entity_type="camera"
    )


@router.get("/{camera_id}", response_model=CameraOut)
def get_camera(
    camera_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("cameras.read")),
):
    return crud.get_or_404(db, Camera, camera_id)


@router.put("/{camera_id}", response_model=CameraOut)
def update_camera(
    camera_id: UUID,
    body: CameraUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("cameras.write")),
):
    camera = crud.get_or_404(db, Camera, camera_id)
    data = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "password" in data:
        data["password_encrypted"] = encrypt(data.pop("password"))
    return crud.update(db, camera, data, user=user, request=request, entity_type="camera")


@router.delete("/{camera_id}", status_code=204)
def delete_camera(
    camera_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("cameras.write")),
):
    camera = crud.get_or_404(db, Camera, camera_id)
    crud.delete(db, camera, user=user, request=request, entity_type="camera")


@router.post("/{camera_id}/test-connection", response_model=CameraTestResult)
async def test_connection(
    camera_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("cameras.read")),
):
    camera = crud.get_or_404(db, Camera, camera_id)
    driver = CameraService.driver_for(camera)
    info = await driver.test_connection()
    camera.online = info.online
    if info.online:
        camera.last_seen_at = datetime.now(timezone.utc)
        if info.model:
            camera.model = info.model
    db.commit()
    return CameraTestResult(online=info.online, detail=info.detail, model=info.model)


@router.get("/{camera_id}/stream", response_model=CameraStreamInfo)
async def get_stream(
    camera_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("cameras.read")),
):
    """Live-стрим камеры.

    Если включён MediaMTX — регистрирует путь и отдаёт HLS/WebRTC URL для
    воспроизведения в браузере. Иначе — только исходный RTSP-URL.
    """
    from app.core.config import settings
    from app.core.crypto import decrypt
    from app.services.cameras import mediamtx

    camera = crud.get_or_404(db, Camera, camera_id)
    driver = CameraService.driver_for(camera)
    rtsp = await driver.get_stream_url()

    if not rtsp:
        return CameraStreamInfo(
            stream_url=None,
            live=False,
            detail="RTSP-URL не найден (ONVIF не ответил и rtsp_url не задан)",
        )

    if not settings.MEDIAMTX_ENABLED:
        return CameraStreamInfo(
            stream_url=rtsp,
            live=False,
            detail="RTSP доступен. Live в браузере требует MediaMTX (выключен).",
        )

    try:
        password = decrypt(camera.password_encrypted)
    except Exception:
        password = ""
    source = mediamtx.build_source(rtsp, camera.username, password)
    ok = await mediamtx.ensure_path(camera.id, source)
    urls = mediamtx.playback_urls(camera.id)
    if ok:
        return CameraStreamInfo(
            stream_url=rtsp,
            hls_url=urls["hls_url"],
            webrtc_url=urls["webrtc_url"],
            live=True,
            detail="Live-поток готов (MediaMTX)",
        )
    return CameraStreamInfo(
        stream_url=rtsp,
        live=False,
        detail="MediaMTX недоступен — live не запущен, есть только RTSP",
    )


@router.get("/{camera_id}/snapshot")
async def snapshot(
    camera_id: UUID,
    t: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """JPEG-снимок с камеры для live-превью в UI.

    Токен передаётся через ?t= чтобы использовать URL прямо в <img src>.
    """
    if not t:
        raise HTTPException(status_code=401, detail="token required")
    try:
        payload = decode_token(t)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="invalid token") from None

    camera = crud.get_or_404(db, Camera, camera_id)
    driver = CameraService.driver_for(camera)
    img = await driver.get_snapshot()
    if img is None:
        return Response(status_code=503, content=b"camera unavailable")
    # Mock отдаёт PNG, реальная камера — JPEG. Определяем по сигнатуре.
    media_type = "image/png" if img[:8] == b"\x89PNG\r\n\x1a\n" else "image/jpeg"
    return Response(
        content=img,
        media_type=media_type,
        headers={"Cache-Control": "no-store"},
    )
