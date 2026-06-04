from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DepartmentBase(BaseModel):
    organization_id: UUID
    parent_id: UUID | None = None
    name: str = Field(min_length=1, max_length=255)
    comment: str | None = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(DepartmentBase):
    pass


class DepartmentOut(DepartmentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
