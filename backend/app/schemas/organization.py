from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class OrganizationBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    inn: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    responsible_person: str | None = None
    comment: str | None = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(OrganizationBase):
    pass


class OrganizationOut(OrganizationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
