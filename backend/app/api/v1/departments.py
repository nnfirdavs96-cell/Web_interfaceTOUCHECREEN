from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import crud
from app.api.deps import require
from app.db.session import get_db
from app.models import Department, User
from app.schemas.department import DepartmentCreate, DepartmentOut, DepartmentUpdate

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
def list_departments(
    organization_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require("departments.read")),
):
    q = select(Department).order_by(Department.name)
    if organization_id:
        q = q.where(Department.organization_id == organization_id)
    return list(db.scalars(q).all())


@router.post("", response_model=DepartmentOut, status_code=201)
def create_department(
    body: DepartmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("departments.write")),
):
    return crud.create(
        db, Department, body.model_dump(), user=user, request=request, entity_type="department"
    )


@router.get("/{dep_id}", response_model=DepartmentOut)
def get_department(
    dep_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("departments.read")),
):
    return crud.get_or_404(db, Department, dep_id)


@router.put("/{dep_id}", response_model=DepartmentOut)
def update_department(
    dep_id: UUID,
    body: DepartmentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("departments.write")),
):
    obj = crud.get_or_404(db, Department, dep_id)
    return crud.update(
        db, obj, body.model_dump(), user=user, request=request, entity_type="department"
    )


@router.delete("/{dep_id}", status_code=204)
def delete_department(
    dep_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("departments.write")),
):
    obj = crud.get_or_404(db, Department, dep_id)
    crud.delete(db, obj, user=user, request=request, entity_type="department")
