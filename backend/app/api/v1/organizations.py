from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api import crud
from app.api.deps import require
from app.db.session import get_db
from app.models import Organization, User
from app.schemas.common import Paginated
from app.schemas.organization import OrganizationCreate, OrganizationOut, OrganizationUpdate

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("", response_model=Paginated[OrganizationOut])
def list_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("organizations.read")),
):
    return crud.list_paginated(
        db, Organization, page=page, page_size=page_size, search=search, order_by=Organization.name
    )


@router.post("", response_model=OrganizationOut, status_code=201)
def create_organization(
    body: OrganizationCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("organizations.write")),
):
    return crud.create(
        db, Organization, body.model_dump(), user=user, request=request, entity_type="organization"
    )


@router.get("/{org_id}", response_model=OrganizationOut)
def get_organization(
    org_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("organizations.read")),
):
    return crud.get_or_404(db, Organization, org_id)


@router.put("/{org_id}", response_model=OrganizationOut)
def update_organization(
    org_id: UUID,
    body: OrganizationUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("organizations.write")),
):
    obj = crud.get_or_404(db, Organization, org_id)
    return crud.update(
        db, obj, body.model_dump(), user=user, request=request, entity_type="organization"
    )


@router.delete("/{org_id}", status_code=204)
def delete_organization(
    org_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("organizations.write")),
):
    obj = crud.get_or_404(db, Organization, org_id)
    crud.delete(db, obj, user=user, request=request, entity_type="organization")
