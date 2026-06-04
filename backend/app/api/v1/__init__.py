from fastapi import APIRouter

from app.api.v1 import (
    audit,
    auth,
    branches,
    departments,
    devices,
    employees,
    organizations,
    users,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(departments.router)
api_router.include_router(branches.router)
api_router.include_router(devices.router)
api_router.include_router(employees.router)
api_router.include_router(users.router)
api_router.include_router(audit.router)
