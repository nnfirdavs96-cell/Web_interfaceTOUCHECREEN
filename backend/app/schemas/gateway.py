from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class GatewayBase(BaseModel):
    branch_id: UUID | None = None
    organization_id: UUID | None = None
    name: str = Field(min_length=1, max_length=255)
    comment: str | None = None


class GatewayCreate(GatewayBase):
    pass


class GatewayUpdate(BaseModel):
    branch_id: UUID | None = None
    organization_id: UUID | None = None
    name: str | None = None
    comment: str | None = None


class GatewayOut(GatewayBase):
    id: UUID
    online: bool
    last_seen_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GatewayCreated(GatewayOut):
    """При создании/перегенерации токена возвращаем сырой токен ОДИН раз."""

    token: str
