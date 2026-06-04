from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BranchBase(BaseModel):
    organization_id: UUID
    name: str = Field(min_length=1, max_length=255)
    address: str | None = None
    responsible: str | None = None
    phone: str | None = None
    working_hours: str | None = None
    comment: str | None = None


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BranchBase):
    pass


class BranchOut(BranchBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
