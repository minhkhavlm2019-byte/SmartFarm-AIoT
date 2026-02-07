from fastapi import APIRouter
from api.v1.endpoints import devices, login

api_router = APIRouter()

# Gom router devices vào đường dẫn chính /devices
api_router.include_router(devices.router, prefix="/devices", tags=["Devices"])
api_router.include_router(login.router, tags=["login"])

# Sau này nếu có thêm router zones, users thì thêm dòng dưới:
# api_router.include_router(zones.router, prefix="/zones", tags=["Zones"])