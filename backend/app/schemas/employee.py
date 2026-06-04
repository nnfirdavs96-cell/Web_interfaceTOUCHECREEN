from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class EmployeeBase(BaseModel):
    external_id: str | None = None
    first_name: str = Field(min_length=1, max_length=128)
    last_name: str = Field(min_length=1, max_length=128)
    middle_name: str | None = None
    phone: str | None = None
    email: str | None = None
    organization_id: UUID | None = None
    department_id: UUID | None = None
    branch_id: UUID | None = None
    position: str | None = None
    photo_url: str | None = None
    status: str = "active"
    hired_at: date | None = None
    comment: str | None = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(EmployeeBase):
    pass


class EmployeeOut(EmployeeBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssignDevicesRequest(BaseModel):
    device_ids: list[UUID]
    access_level: str = "default"
    valid_from: date | None = None
    valid_to: date | None = None


class EmployeeAccessOut(BaseModel):
    id: UUID
    device_id: UUID
    access_level: str
    valid_from: date | None
    valid_to: date | None
    synced_at: datetime | None

    model_config = {"from_attributes": True}
