"""OnvifCamera — драйвер ONVIF/RTSP для IP-камер.

Использует ONVIF для обнаружения snapshot/stream URI, затем тянет
кадр по HTTP через httpx (Digest/Basic auth). RTSP-URL кэшируется в
модели (rtsp_url) для последующего транскодинга в WebRTC/HLS.

Статус: рабочий каркас. Без реального железа для проверки часть
ONVIF-квирков (профили, аутентификация snapshot) может потребовать
донастройки — как это было с Hikvision ISAPI. onvif-zeep импортируется
лениво, чтобы бэкенд/тесты не падали если библиотека не установлена.
"""
import asyncio
import logging

import httpx

from app.services.cameras.base import CameraConn, CameraInfo, PTZCommand

log = logging.getLogger("cameras.onvif")

# Кэш обнаруженных URI на процесс (ip:port -> {"snapshot":..., "stream":...}).
_uri_cache: dict[str, dict[str, str]] = {}


class OnvifCamera:
    def __init__(self, conn: CameraConn) -> None:
        self.conn = conn
        self._key = f"{conn.ip}:{conn.port}"

    # --- ONVIF (синхронный zeep) выносим в threadpool ---------------------

    def _discover_uris_sync(self) -> dict[str, str]:
        """Синхронно опрашивает ONVIF media-сервис. Вызывать через to_thread."""
        try:
            from onvif import ONVIFCamera  # ленивый импорт
        except ImportError:
            log.warning("onvif-zeep не установлен — ONVIF discovery недоступен")
            return {}

        try:
            cam = ONVIFCamera(
                self.conn.ip, self.conn.port, self.conn.username, self.conn.password
            )
            media = cam.create_media_service()
            profiles = media.GetProfiles()
            if not profiles:
                return {}
            token = profiles[0].token
            result: dict[str, str] = {}
            try:
                snap = media.GetSnapshotUri({"ProfileToken": token})
                result["snapshot"] = snap.Uri
            except Exception as e:  # noqa: BLE001
                log.debug("GetSnapshotUri failed: %s", e)
            try:
                stream = media.GetStreamUri(
                    {
                        "StreamSetup": {
                            "Stream": "RTP-Unicast",
                            "Transport": {"Protocol": "RTSP"},
                        },
                        "ProfileToken": token,
                    }
                )
                result["stream"] = stream.Uri
            except Exception as e:  # noqa: BLE001
                log.debug("GetStreamUri failed: %s", e)
            return result
        except Exception as e:  # noqa: BLE001
            log.info("ONVIF discovery failed for %s: %s", self._key, e)
            return {}

    async def _uris(self) -> dict[str, str]:
        if self._key in _uri_cache:
            return _uri_cache[self._key]
        uris = await asyncio.to_thread(self._discover_uris_sync)
        if uris:
            _uri_cache[self._key] = uris
        return uris

    # --- Публичный протокол VideoSource -----------------------------------

    async def test_connection(self) -> CameraInfo:
        uris = await self._uris()
        if uris:
            return CameraInfo(
                online=True,
                detail="ONVIF: камера отвечает, профили получены",
            )
        # ONVIF не ответил — но может быть задан прямой rtsp_url.
        if self.conn.rtsp_url:
            return CameraInfo(
                online=True,
                detail="RTSP-URL задан вручную (ONVIF-обнаружение недоступно)",
            )
        return CameraInfo(
            online=False,
            detail=(
                "Камера не ответила по ONVIF. Проверьте IP/порт/логин или "
                "задайте RTSP-URL вручную."
            ),
        )

    async def get_snapshot(self) -> bytes | None:
        uris = await self._uris()
        snap_uri = uris.get("snapshot")
        if not snap_uri:
            return None
        try:
            auth = httpx.DigestAuth(self.conn.username, self.conn.password)
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(snap_uri, auth=auth)
                if resp.status_code == 401:
                    # некоторые камеры хотят Basic вместо Digest
                    resp = await client.get(
                        snap_uri,
                        auth=(self.conn.username, self.conn.password),
                    )
                resp.raise_for_status()
                return resp.content
        except Exception as e:  # noqa: BLE001
            log.info("snapshot fetch failed for %s: %s", self._key, e)
            return None

    async def get_stream_url(self) -> str | None:
        # Приоритет — явный rtsp_url; иначе то, что дал ONVIF.
        if self.conn.rtsp_url:
            return self.conn.rtsp_url
        uris = await self._uris()
        return uris.get("stream")

    async def ptz_control(self, cmd: PTZCommand) -> bool:
        # PTZ пока не реализован (требует железа с поворотным механизмом).
        log.debug("PTZ %s requested for %s (not implemented)", cmd, self._key)
        return False
