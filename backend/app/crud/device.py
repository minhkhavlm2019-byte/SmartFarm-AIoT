from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

from models import models
from schemas import device as schemas

# ================= 1. QUẢN LÝ THIẾT BỊ (DEVICE) =================
"""đã tích hợp một tính năng rất hay vào đây gọi là "Auto-Provisioning" (Tự động nhận diện thiết bị).

Tác dụng: Khi bạn nạp code cho một con ESP32 mới tinh và cắm điện, hệ thống sẽ tự động tạo thiết bị 
đó trong Database ngay khi nó gửi gói tin đầu tiên. Bạn không cần phải vào Admin nhập tay ID thiết bị. 
Rất tiện khi Demo bảo vệ!"""
def get_device(db: Session, device_id: str):
    """Tìm thiết bị theo ID (MAC Address)"""
    return db.query(models.Device).filter(models.Device.device_id == device_id).first()

def get_devices(db: Session, skip: int = 0, limit: int = 100):
    """Lấy danh sách thiết bị (Phân trang)"""
    return db.query(models.Device).offset(skip).limit(limit).all()

def create_device(db: Session, device: schemas.DeviceCreate):
    """Tạo thiết bị mới thủ công"""
    db_device = models.Device(
        device_id=device.device_id,
        name=device.name,
        zone_id=device.zone_id,
        status=models.DeviceStatus.OFFLINE
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

def update_device_status(db: Session, device_id: str):
    """
    Heartbeat: Cập nhật trạng thái ONLINE mỗi khi ESP32 gửi tin.
    Nếu thiết bị chưa tồn tại -> Tự động tạo mới (Auto-Provisioning).
    """
    device = get_device(db, device_id)
    
    if not device:
        # Tự động tạo thiết bị mới nếu chưa có
        device = models.Device(
            device_id=device_id, 
            name=f"New ESP32 ({device_id[-4:]})", # Tự đặt tên VD: New ESP32 (A1B2)
            status=models.DeviceStatus.ONLINE
        )
        db.add(device)
    else:
        # Cập nhật trạng thái
        device.status = models.DeviceStatus.ONLINE
        device.last_seen = datetime.now()
    
    db.commit()
    db.refresh(device)
    return device

# ================= 2. QUẢN LÝ DỮ LIỆU CẢM BIẾN (SENSOR DATA) =================

def create_sensor_reading(db: Session, data: schemas.SensorDataInput, device_id: str):
    """
    Lưu dữ liệu cảm biến vào bảng Big Data
    """
    # 1. Đảm bảo thiết bị luôn Online khi gửi dữ liệu
    update_device_status(db, device_id)

    # 2. Lưu dữ liệu
    db_sensor = models.SensorData(
        device_id=device_id,
        temp=data.temp,
        hum_air=data.hum_air,
        hum_soil=data.hum_soil,
        light=data.light
    )
    db.add(db_sensor)
    db.commit()
    db.refresh(db_sensor)
    return db_sensor

def get_sensor_history(db: Session, device_id: str, limit: int = 50):
    """
    Lấy dữ liệu để vẽ biểu đồ App.
    Lấy mới nhất trước (DESC) để hiển thị ngay tức thì.
    """
    return db.query(models.SensorData)\
             .filter(models.SensorData.device_id == device_id)\
             .order_by(desc(models.SensorData.timestamp))\
             .limit(limit)\
             .all()

def get_latest_sensor_reading(db: Session, device_id: str):
    """Lấy chỉ số hiện tại để hiển thị Dashboard"""
    return db.query(models.SensorData)\
             .filter(models.SensorData.device_id == device_id)\
             .order_by(desc(models.SensorData.timestamp))\
             .first()

# ================= 3. NHẬT KÝ HOẠT ĐỘNG (LOGS) =================

def create_action_log(
    db: Session, 
    device_id: str, 
    action: models.ActionType, 
    trigger: models.TriggerSource, 
    reason: str
):
    """
    Ghi lại quyết định của AI hoặc người dùng
    """
    db_log = models.ActionLog(
        device_id=device_id,
        action=action,
        trigger=trigger,
        reason=reason
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log