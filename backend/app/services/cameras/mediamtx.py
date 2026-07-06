"""Интеграция с MediaMTX — транскодер RTSP→WebRTC/HLS для live-видео.

MediaMTX тянет RTSP с камеры по требованию (sourceOnDemand) и отдаёт
браузеру низколатентный WebRTC (WHEP) или HLS. Мы регистрируем путь
через его control API, а плеер в браузере обращается по публичным
URL, проксируемым nginx.

Поток:
  camera.rtsp/ONVIF → [MediaMTX pull] → WebRTC/HLS → браузер

Если MEDIAMTX_ENABLED=false — модуль не используется, /stream отдаёт
только rtsp_url (live в браузере недоступен без транскодера).
"""
import logging
from urllib.parse import urlparse, urlunparse
from uuid import UUID

import httpx

from app.core.config import settings

log = logging.getLogger("cameras.mediamtx")


def path_name(camera_id: UUID) -> str:
    """Имя пути в MediaMTX (без дефисов — только hex UUID)."""
    return f"cam_{camera_id.hex}"


def _with_credentials(rtsp_url: str, username: str, password: str) -> str:
    """Встраивает user:pass в RTSP-URL, если их там ещё нет."""
    try:
        parsed = urlparse(rtsp_url)
        if parsed.username or not username:
            return rtsp_url
        netloc = f"{username}:{password}@{parsed.hostname or ''}"
        if parsed.port:
            netloc += f":{parsed.port}"
        return urlunparse(parsed._replace(netloc=netloc))
    except Exception:  # noqa: BLE001
        return rtsp_url


async def ensure_path(camera_id: UUID, rtsp_source: str) -> bool:
    """Идемпотентно регистрирует путь камеры в MediaMTX.

    Возвращает True если путь настроен (или уже существовал).
    """
    name = path_name(camera_id)
    body = {"source": rtsp_source, "sourceOnDemand": True}
    base = settings.MEDIAMTX_API_URL.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            # add — создаёт; если уже есть, MediaMTX вернёт 400 → патчим
            resp = await client.post(
                f"{base}/v3/config/paths/add/{name}", json=body
            )
            if resp.status_code == 400:
                resp = await client.patch(
                    f"{base}/v3/config/paths/patch/{name}", json=body
                )
            resp.raise_for_status()
            return True
    except Exception as e:  # noqa: BLE001
        log.info("MediaMTX ensure_path failed for %s: %s", name, e)
        return False


def playback_urls(camera_id: UUID) -> dict[str, str]:
    """Публичные URL плеера (относительные, через nginx-прокси)."""
    name = path_name(camera_id)
    hls = settings.MEDIAMTX_HLS_PATH.rstrip("/")
    webrtc = settings.MEDIAMTX_WEBRTC_PATH.rstrip("/")
    return {
        "hls_url": f"{hls}/{name}/index.m3u8",
        "webrtc_url": f"{webrtc}/{name}/whep",
    }


def build_source(rtsp_url: str, username: str, password: str) -> str:
    return _with_credentials(rtsp_url, username, password)
