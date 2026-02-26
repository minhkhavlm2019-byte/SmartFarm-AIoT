from fastapi import APIRouter
from api.v1.endpoints import devices, login, zones, user, reports, auth
from .endpoints import logs

api_router = APIRouter()

# Gom router devices vào đường dẫn chính /devices
api_router.include_router(devices.router, prefix="/devices", tags=["Devices"])
api_router.include_router(login.router, tags=["login"])
api_router.include_router(zones.router, prefix="/zones", tags=["zones"])
api_router.include_router(devices.router, prefix="/auth", tags=["Auth"])
api_router.include_router(user.router, prefix="/users", tags=["Users"])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Sau này nếu có thêm router zones, users thì thêm dòng dưới:
# api_router.include_router(zones.router, prefix="/zones", tags=["Zones"])