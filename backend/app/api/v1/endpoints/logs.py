from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from db.session import get_db # Chỉnh đường dẫn get_db cho đúng với project của bạn
from models.models import ActionLog, Device, LogLevel # Import các model cần thiết

router = APIRouter()

@router.get("/")
def get_system_logs(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    level: Optional[LogLevel] = None,
    search: Optional[str] = None
):
    """
    Lấy danh sách nhật ký hệ thống (Dành cho Kỹ thuật viên)
    Hỗ trợ phân trang, lọc theo Level (ERROR, WARN...) và tìm kiếm Text.
    """
    query = db.query(ActionLog)

    # Lọc theo mức độ cảnh báo nếu có truyền lên
    if level:
        query = query.filter(ActionLog.level == level)
        
    # Tìm kiếm theo lý do, mã thiết bị hoặc hành động
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (ActionLog.reason.ilike(search_term)) |
            (ActionLog.device_id.ilike(search_term)) |
            (ActionLog.action.ilike(search_term))
        )

    # Sắp xếp mới nhất lên đầu
    logs = query.order_by(ActionLog.timestamp.desc()).offset(skip).limit(limit).all()

    # Format dữ liệu trả về cho khớp với Frontend (TechDashboard)
    result = []
    for log in logs:
        result.append({
            "id": log.log_id,
            "timestamp": log.timestamp,
            "level": log.level.value if log.level else "INFO",
            "source": log.device_id or "SYSTEM", # Nếu null thì gán là SYSTEM
            "event_type": log.action.value if log.action else "UNKNOWN",
            "message": log.reason,
            "payload": log.payload
        })

    return result