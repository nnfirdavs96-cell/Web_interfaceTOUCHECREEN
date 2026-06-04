from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import require
from app.db.session import get_db
from app.models import Schedule, ScheduleAssignment, ScheduleDay, User
from app.schemas.schedule import (
    AssignRequest,
    ScheduleCreate,
    ScheduleOut,
    ScheduleUpdate,
)
from app.services import audit

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("", response_model=list[ScheduleOut])
def list_schedules(
    db: Session = Depends(get_db),
    _: User = Depends(require("schedules.read")),
):
    return list(db.scalars(select(Schedule).order_by(Schedule.name)).all())


@router.post("", response_model=ScheduleOut, status_code=201)
def create_schedule(
    body: ScheduleCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("schedules.write")),
):
    data = body.model_dump(exclude={"days"})
    sch = Schedule(**data)
    for d in body.days:
        sch.days.append(ScheduleDay(**d.model_dump()))
    db.add(sch)
    db.flush()
    audit.log(
        db, user=user, action="create", entity_type="schedule", entity_id=sch.id,
        after={"name": sch.name, "type": sch.type}, request=request,
    )
    db.commit()
    db.refresh(sch)
    return sch


@router.get("/{sch_id}", response_model=ScheduleOut)
def get_schedule(
    sch_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("schedules.read")),
):
    sch = db.get(Schedule, sch_id)
    if sch is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return sch


@router.put("/{sch_id}", response_model=ScheduleOut)
def update_schedule(
    sch_id: UUID,
    body: ScheduleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("schedules.write")),
):
    sch = db.get(Schedule, sch_id)
    if sch is None:
        raise HTTPException(status_code=404, detail="Schedule not found")

    payload = body.model_dump(exclude={"days"}, exclude_unset=True)
    for k, v in payload.items():
        setattr(sch, k, v)
    if body.days is not None:
        sch.days.clear()
        db.flush()
        for d in body.days:
            sch.days.append(ScheduleDay(**d.model_dump()))
    db.flush()
    audit.log(db, user=user, action="update", entity_type="schedule", entity_id=sch.id, request=request)
    db.commit()
    db.refresh(sch)
    return sch


@router.delete("/{sch_id}", status_code=204)
def delete_schedule(
    sch_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("schedules.write")),
):
    sch = db.get(Schedule, sch_id)
    if sch is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(sch)
    audit.log(db, user=user, action="delete", entity_type="schedule", entity_id=sch_id, request=request)
    db.commit()


@router.post("/{sch_id}/assign", status_code=201)
def assign_schedule(
    sch_id: UUID,
    body: AssignRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("schedules.write")),
):
    sch = db.get(Schedule, sch_id)
    if sch is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if body.target_type not in ("employee", "department", "branch"):
        raise HTTPException(status_code=400, detail="invalid target_type")

    # удалить старые назначения для тех же target_id того же type
    db.execute(
        delete(ScheduleAssignment).where(
            ScheduleAssignment.schedule_id == sch_id,
            ScheduleAssignment.target_type == body.target_type,
            ScheduleAssignment.target_id.in_(body.target_ids),
        )
    )
    for tid in body.target_ids:
        db.add(
            ScheduleAssignment(
                schedule_id=sch_id,
                target_type=body.target_type,
                target_id=tid,
                valid_from=body.valid_from,
                valid_to=body.valid_to,
            )
        )
    audit.log(
        db, user=user, action="assign", entity_type="schedule", entity_id=sch_id,
        after={"target_type": body.target_type, "target_ids": [str(t) for t in body.target_ids]},
        request=request,
    )
    db.commit()
    return {"assigned": len(body.target_ids)}
