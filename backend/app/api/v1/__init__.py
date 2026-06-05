from fastapi import APIRouter

from app.api.v1 import (
    attendance,
    audit,
    auth,
    branches,
    dashboard,
    departments,
    devices,
    employees,
    organizations,
    reports,
    schedules,
    settings as settings_router,
    users,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(organizations.router)
api_router.include_router(departments.router)
api_router.include_router(branches.router)
api_router.include_router(devices.router)
api_router.include_router(employees.router)
api_router.include_router(schedules.router)
api_router.include_router(attendance.router)
api_router.include_router(reports.router)
api_router.include_router(users.router)
api_router.include_router(audit.router)
api_router.include_router(settings_router.router)
