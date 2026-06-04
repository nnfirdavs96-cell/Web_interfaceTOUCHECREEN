from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api import crud
from app.api.deps import require
from app.db.session import get_db
from app.models import Branch, User
from app.schemas.branch import BranchCreate, BranchOut, BranchUpdate
from app.schemas.common import Paginated

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("", response_model=Paginated[BranchOut])
def list_branches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("branches.read")),
):
    return crud.list_paginated(
        db, Branch, page=page, page_size=page_size, search=search, order_by=Branch.name
    )


@router.post("", response_model=BranchOut, status_code=201)
def create_branch(
    body: BranchCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("branches.write")),
):
    return crud.create(
        db, Branch, body.model_dump(), user=user, request=request, entity_type="branch"
    )


@router.get("/{branch_id}", response_model=BranchOut)
def get_branch(
    branch_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("branches.read")),
):
    return crud.get_or_404(db, Branch, branch_id)


@router.put("/{branch_id}", response_model=BranchOut)
def update_branch(
    branch_id: UUID,
    body: BranchUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("branches.write")),
):
    obj = crud.get_or_404(db, Branch, branch_id)
    return crud.update(
        db, obj, body.model_dump(), user=user, request=request, entity_type="branch"
    )


@router.delete("/{branch_id}", status_code=204)
def delete_branch(
    branch_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("branches.write")),
):
    obj = crud.get_or_404(db, Branch, branch_id)
    crud.delete(db, obj, user=user, request=request, entity_type="branch")
