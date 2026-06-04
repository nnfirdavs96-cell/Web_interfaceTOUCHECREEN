from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, Field


class ScheduleDayIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    is_workday: bool = True
    start_time: time | None = None
    end_time: time | None = None
    shift_no: int = 1


class ScheduleDayOut(ScheduleDayIn):
    id: UUID
    model_config = {"from_attributes": True}


class ScheduleBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = "office"
    allowed_late_minutes: int = 10
    allowed_early_leave_minutes: int = 10
    night_shift: bool = False
    lunch_start: time | None = None
    lunch_end: time | None = None
    comment: str | None = None


class ScheduleCreate(ScheduleBase):
    days: list[ScheduleDayIn] = []


class ScheduleUpdate(ScheduleBase):
    days: list[ScheduleDayIn] | None = None


class ScheduleOut(ScheduleBase):
    id: UUID
    days: list[ScheduleDayOut] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class AssignRequest(BaseModel):
    target_type: str  # employee | department | branch
    target_ids: list[UUID]
    valid_from: date | None = None
    valid_to: date | None = None
