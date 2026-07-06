from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4, max_length=72)
    full_name: str = Field(min_length=1, max_length=255)
    role: str
    organization_id: UUID | None = None  # тенант пользователя (мультитенантность)
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    organization_id: UUID | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=4, max_length=72)


class UserListOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    organization_id: UUID | None = None
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
