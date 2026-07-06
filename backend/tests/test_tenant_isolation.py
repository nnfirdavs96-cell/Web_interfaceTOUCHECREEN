"""Тесты тенант-изоляции (мультитенантность).

Используют in-memory SQLite и тот же ORM-механизм (событие do_orm_execute
+ with_loader_criteria), что и продакшн, — проверяют реальную фильтрацию
запросов, а не только чистые функции.
"""
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import app.api.tenant as tenant
from app.core.config import settings
from app.db.base import Base
from app.models import Branch, Department, Device, Employee, Organization


@pytest.fixture
def db(monkeypatch):
    monkeypatch.setattr(settings, "MULTITENANCY_ENABLED", True)
    eng = create_engine("sqlite://")
    Base.metadata.create_all(
        eng,
        tables=[
            Organization.__table__,
            Branch.__table__,
            Department.__table__,
            Employee.__table__,
            Device.__table__,
        ],
    )
    session = sessionmaker(bind=eng)()
    yield session
    tenant.current_tenant.set(None)
    session.close()


@pytest.fixture
def orgs(db):
    o1 = Organization(name="Org1")
    o2 = Organization(name="Org2")
    db.add_all([o1, o2])
    db.flush()
    db.add_all(
        [
            Employee(first_name="A", last_name="One", organization_id=o1.id),
            Employee(first_name="B", last_name="Two", organization_id=o2.id),
            Device(name="D1", ip="1.1.1.1", username="a", password_encrypted="x", organization_id=o1.id),
            Device(name="D2", ip="2.2.2.2", username="a", password_encrypted="x", organization_id=o2.id),
        ]
    )
    db.commit()
    return o1, o2


def test_no_context_sees_all(db, orgs):
    tenant.current_tenant.set(None)
    db.expire_all()
    assert len(db.scalars(select(Employee)).all()) == 2


def test_org1_scope_isolates(db, orgs):
    o1, _ = orgs
    tenant.current_tenant.set(o1.id)
    db.expire_all()
    assert [e.first_name for e in db.scalars(select(Employee)).all()] == ["A"]
    assert [d.name for d in db.scalars(select(Device)).all()] == ["D1"]
    assert [o.name for o in db.scalars(select(Organization)).all()] == ["Org1"]


def test_org2_scope_isolates(db, orgs):
    _, o2 = orgs
    tenant.current_tenant.set(o2.id)
    db.expire_all()
    assert [e.first_name for e in db.scalars(select(Employee)).all()] == ["B"]


def test_assign_tenant_on_create(db, orgs):
    o1, _ = orgs
    tenant.current_tenant.set(o1.id)
    data = tenant.assign_tenant({"name": "D3"}, Device)
    assert data["organization_id"] == o1.id


def test_check_object_scope(db, orgs):
    o1, o2 = orgs
    tenant.current_tenant.set(o1.id)
    cross = Device(name="X", ip="9", username="a", password_encrypted="x", organization_id=o2.id)
    same = Device(name="Y", ip="9", username="a", password_encrypted="x", organization_id=o1.id)
    assert tenant.check_object_scope(cross) is False
    assert tenant.check_object_scope(same) is True


def test_disabled_flag_no_scope(monkeypatch):
    monkeypatch.setattr(settings, "MULTITENANCY_ENABLED", False)

    class _Role:
        code = "hr"

    class _User:
        role = _Role()
        organization_id = "whatever"

    assert tenant.tenant_for(_User()) is None
