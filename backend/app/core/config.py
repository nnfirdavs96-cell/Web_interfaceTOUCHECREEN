from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "Hikvision Access Platform"
    ENV: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"

    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: str = "http://localhost,http://localhost:5173"

    HIKVISION_MODE: str = "mock"

    # Мультитенантность: изоляция данных по организации (тенанту).
    # false → single-tenant (как сейчас), фильтрация выключена — БЕЗ риска
    # для существующего деплоя. true → каждый пользователь видит только
    # свою организацию (super_admin/admin — все). Требует backfill
    # organization_id у существующих строк перед включением.
    MULTITENANCY_ENABLED: bool = False

    # MediaMTX — транскодер RTSP→WebRTC/HLS для live-видео камер.
    # MEDIAMTX_ENABLED=false → /stream отдаёт только rtsp_url (без live в браузере).
    MEDIAMTX_ENABLED: bool = False
    MEDIAMTX_API_URL: str = "http://mediamtx:9997"
    # Публичные пути (через nginx) для плеера в браузере.
    MEDIAMTX_HLS_PATH: str = "/hls"
    MEDIAMTX_WEBRTC_PATH: str = "/webrtc"

    SEED_ADMIN_EMAIL: str = "admin@hikvision.dev"
    SEED_ADMIN_PASSWORD: str = "admin"
    DEMO_SEED: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()  # type: ignore[call-arg]
