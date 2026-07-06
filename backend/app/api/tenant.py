"""Мультитенантность — изоляция данных по организации (тенанту).

Модель: тенант = Organization. Реализация — идиоматичная для SQLAlchemy:
контекстная переменная current_tenant хранит org_id текущего запроса,
а событие do_orm_execute применяет with_loader_criteria ко всем SELECT'ам
scoped-моделей. Это автоматически фильтрует списки, связи и вложенные
загрузки без правки роутеров.

Флаг settings.MULTITENANCY_ENABLED:
- false (по умолчанию): current_tenant всегда None → фильтрации нет,
  поведение идентично single-tenant. Безопасно для текущего деплоя.
- true: не-админ видит только свою организацию; super_admin/admin — все.

Важно:
- get_current_user выставляет current_tenant по пользователю.
- Фоновые задачи (poller) не трогают контекст → видят все тенанты.
- Session.get() по PK НЕ покрывается loader_criteria → get_or_404 делает
  явную проверку check_object_scope (cross-tenant выглядит как 404).
- Строки с organization_id IS NULL при включённом флаге НЕ видны не-админам
  → перед включением нужен backfill organization_id.
"""
from contextvars import ContextVar
from uuid import UUID

from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria

from app.core.config import settings
from app.models import (
    Branch,
    Camera,
    Department,
    Device,
    Employee,
    Organization,
    Schedule,
    User,
)

# Роли, видящие все организации (без тенант-ограничения).
BYPASS_ROLES = {"super_admin", "admin"}

# org_id текущего запроса; None = без ограничения (single-tenant / bypass / фон).
current_tenant: ContextVar[UUID | None] = ContextVar("current_tenant", default=None)

# Модели, фильтруемые по organization_id.
_SCOPED_BY_ORG = (Branch, Department, Employee, Device, Camera, Schedule, User)


def tenant_for(user: User) -> UUID | None:
    """org_id, которым ограничен пользователь, или None (без ограничения)."""
    if not settings.MULTITENANCY_ENABLED:
        return None
    try:
        role_code = user.role.code
    except Exception:  # noqa: BLE001
        role_code = ""
    if role_code in BYPASS_ROLES:
        return None
    return user.organization_id


def set_current_tenant(user: User) -> None:
    """Выставить тенант-контекст запроса из пользователя."""
    current_tenant.set(tenant_for(user))


def assign_tenant(data: dict, model: type) -> dict:
    """Проставить organization_id при создании, если модель scoped и он не задан."""
    org = current_tenant.get()
    if org is None:
        return data
    if model in _SCOPED_BY_ORG and not data.get("organization_id"):
        data["organization_id"] = org
    return data


def check_object_scope(obj) -> bool:
    """True если объект доступен текущему тенанту (для get_or_404)."""
    org = current_tenant.get()
    if org is None:
        return True
    # Organization: сам объект должен быть тенантом пользователя.
    if isinstance(obj, Organization):
        return obj.id == org
    obj_org = getattr(obj, "organization_id", None)
    if obj_org is None:
        # scoped-модель без организации при включённой изоляции — не показываем
        return not isinstance(obj, _SCOPED_BY_ORG)
    return obj_org == org


@event.listens_for(Session, "do_orm_execute")
def _apply_tenant_criteria(execute_state) -> None:
    """Применяет тенант-фильтр ко всем ORM SELECT'ам scoped-моделей."""
    if not execute_state.is_select:
        return
    org = current_tenant.get()
    if org is None:
        return
    for model in _SCOPED_BY_ORG:
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                model,
                lambda cls: cls.organization_id == org,
                include_aliases=True,
            )
        )
    execute_state.statement = execute_state.statement.options(
        with_loader_criteria(
            Organization,
            lambda cls: cls.id == org,
            include_aliases=True,
        )
    )
