"""Role-Based Access Control: статичная матрица прав по ролям.

Коды разрешений строятся как `<resource>.<action>`. Для ветки `branch_admin`/`manager`
дополнительно применяется branch-scope в зависимостях API.
"""

ROLES = {
    "super_admin": "Супер-админ",
    "admin": "Администратор",
    "hr": "Отдел кадров",
    "accountant": "Бухгалтерия",
    "manager": "Руководитель",
    "viewer": "Наблюдатель",
    "branch_admin": "Администратор филиала",
}

PERMISSIONS: list[tuple[str, str]] = [
    ("organizations.read", "Просмотр организаций"),
    ("organizations.write", "Изменение организаций"),
    ("departments.read", "Просмотр отделов"),
    ("departments.write", "Изменение отделов"),
    ("branches.read", "Просмотр филиалов"),
    ("branches.write", "Изменение филиалов"),
    ("devices.read", "Просмотр устройств"),
    ("devices.write", "Изменение устройств"),
    ("devices.sync", "Синхронизация устройств"),
    ("cameras.read", "Просмотр камер"),
    ("cameras.write", "Изменение камер"),
    ("employees.read", "Просмотр сотрудников"),
    ("employees.write", "Изменение сотрудников"),
    ("schedules.read", "Просмотр расписаний"),
    ("schedules.write", "Изменение расписаний"),
    ("attendance.read", "Просмотр событий и табелей"),
    ("attendance.recalculate", "Пересчёт табелей"),
    ("reports.read", "Просмотр отчётов"),
    ("reports.export", "Экспорт отчётов"),
    ("integrations.read", "Просмотр интеграций"),
    ("integrations.write", "Изменение интеграций"),
    ("integrations.send", "Отправка отчётов в 1С/биллинг"),
    ("users.read", "Просмотр пользователей системы"),
    ("users.write", "Изменение пользователей системы"),
    ("audit.read", "Просмотр аудит-логов"),
    ("settings.write", "Изменение настроек системы"),
]

ALL_PERMISSIONS = {code for code, _ in PERMISSIONS}

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "super_admin": set(ALL_PERMISSIONS),
    "admin": ALL_PERMISSIONS - {"settings.write"},
    "hr": {
        "organizations.read",
        "departments.read",
        "departments.write",
        "branches.read",
        "employees.read",
        "employees.write",
        "schedules.read",
        "schedules.write",
        "attendance.read",
        "reports.read",
    },
    "accountant": {
        "organizations.read",
        "departments.read",
        "branches.read",
        "employees.read",
        "attendance.read",
        "reports.read",
        "reports.export",
        "integrations.read",
        "integrations.send",
    },
    "manager": {
        "organizations.read",
        "departments.read",
        "branches.read",
        "devices.read",
        "cameras.read",
        "employees.read",
        "schedules.read",
        "attendance.read",
        "reports.read",
    },
    "viewer": {
        "organizations.read",
        "departments.read",
        "branches.read",
        "devices.read",
        "cameras.read",
        "employees.read",
        "schedules.read",
        "attendance.read",
        "reports.read",
    },
    "branch_admin": {
        "organizations.read",
        "departments.read",
        "branches.read",
        "devices.read",
        "devices.write",
        "devices.sync",
        "cameras.read",
        "cameras.write",
        "employees.read",
        "employees.write",
        "schedules.read",
        "attendance.read",
        "reports.read",
        "reports.export",
    },
}


def has_permission(role: str, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())
