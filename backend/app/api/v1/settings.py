"""Read-only endpoint системных настроек (отображение в UI).

Запись отложена до этапа production-настроек; критичные параметры (SECRET_KEY, БД)
управляются через .env и docker compose, а не через UI.
"""
from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.config import settings
from app.models import User

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings(_: User = Depends(get_current_user)) -> dict:
    return {
        "project_name": settings.PROJECT_NAME,
        "version": "0.7.0",
        "env": settings.ENV,
        "debug": settings.DEBUG,
        "hikvision_mode": settings.HIKVISION_MODE,
        "multitenancy_enabled": settings.MULTITENANCY_ENABLED,
        "mediamtx_enabled": settings.MEDIAMTX_ENABLED,
        "access_token_ttl_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "refresh_token_ttl_days": settings.REFRESH_TOKEN_EXPIRE_DAYS,
        "cors_origins": settings.cors_origins_list,
        "demo_seed_enabled": settings.DEMO_SEED,
    }
