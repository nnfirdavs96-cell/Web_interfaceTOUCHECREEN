from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel


class AttendanceEventOut(BaseModel):
    id: UUID
    employee_id: UUID | None
    device_id: UUID | None
    external_user_id: str | None
    event_time: datetime
    event_type: str
    success: bool
    model_config = {"from_attributes": True}


class AttendanceReportOut(BaseModel):
    id: UUID
    employee_id: UUID
    date: date
    required_check_in: time | None
    actual_check_in: datetime | None
    required_check_out: time | None
    actual_check_out: datetime | None
    late_minutes: int
    early_leave_minutes: int
    worked_minutes: int
    status: str
    device_in_id: UUID | None
    device_out_id: UUID | None
    model_config = {"from_attributes": True}
