from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

from models import models
from schemas import device as schemas

# --- 1. IMPORT LOGGER ---
from core.logger import get_logger

# Khởi tạo Logger cho module này
logger = get_logger(__name__)

# ================= 1. QUẢN LÝ THIẾT BỊ (DEVICE) =================

def get_device(db: Session, device_id: str):
    """Tìm thiết bị theo ID (MAC Address)"""
    return db.query(models.Device).filter(models.Device.device_id == device_id).first()

def get_devices(db: Session, skip: int = 0, limit: int = 100):
    """Lấy danh sách thiết bị"""
    return db.query(models.Device).offset(skip).limit(limit).all()

def create_device(db: Session, device: schemas.DeviceCreate):
    """Tạo thiết bị mới thủ công (Admin)"""
    logger.info(f"Admin creating new device: {device.device_id} - {device.name}")
    
    db_device = models.Device(
        device_id=device.device_id,
        name=device.name,
        zone_id=device.zone_id,
        status=models.DeviceStatus.OFFLINE
    )
    try:
        db.add(db_device)
        db.commit()
        db.refresh(db_device)
        logger.info(f"Device created successfully: {device.device_id}")
        return db_device
    except Exception as e:
        logger.error(f"Error creating device {device.device_id}: {str(e)}")
        db.rollback()
        raise e

def update_device(db: Session, device_id: str, device_in: schemas.DeviceUpdate):
    """
    Cập nhật thiết bị (Có Log debug chi tiết lỗi Silent Failure)
    """
    logger.info(f"Request update Device ID: {device_id}")
    
    # 1. Tìm thiết bị
    db_device = get_device(db, device_id)
    if not db_device:
        logger.warning(f"Update failed: Device ID {device_id} not found.")
        return None
        
    # 2. Debug dữ liệu đầu vào
    logger.debug(f"Raw Input from Frontend: {device_in}")

    # 3. Lọc dữ liệu (Chỉ lấy những trường Frontend thực sự gửi)
    update_data = device_in.model_dump(exclude_unset=True)
    logger.info(f"Data to be saved (Filtered): {update_data}")

    # Kiểm tra nếu dữ liệu rỗng (Nguyên nhân chính gây lỗi không lưu)
    if not update_data:
        logger.error(f"⚠️ UPDATE DATA IS EMPTY! Check Schema DeviceUpdate in schemas/device.py")
        return db_device

    # 4. Cập nhật từng trường
    for field, value in update_data.items():
        setattr(db_device, field, value)

    # 5. Lưu vào DB
    try:
        db.add(db_device)
        db.commit()
        db.refresh(db_device)
        logger.info(f"✅ Device {device_id} updated successfully.")
        return db_device
    except Exception as e:
        logger.critical(f"🔥 Database Error during update {device_id}: {str(e)}")
        db.rollback()
        raise e

def update_device_status(db: Session, device_id: str):
    """
    Heartbeat & Auto-Provisioning
    """
    device = get_device(db, device_id)
    
    if not device:
        # Tự động tạo thiết bị mới nếu chưa có
        logger.warning(f"⚡ Auto-Provisioning: Detected new device {device_id}")
        device = models.Device(
            device_id=device_id, 
            name=f"New ESP32 ({device_id[-4:]})",
            status=models.DeviceStatus.ONLINE,
            last_seen=datetime.now()
        )
        db.add(device)
        logger.info(f"Auto-created device {device_id} in DB.")
    else:
        # Cập nhật trạng thái
        if device.status != models.DeviceStatus.ONLINE:
             logger.info(f"Device {device_id} is back ONLINE")
             
        device.status = models.DeviceStatus.ONLINE
        device.last_seen = datetime.now()
    
    db.commit()
    db.refresh(device)
    return device

# ================= 2. QUẢN LÝ DỮ LIỆU CẢM BIẾN =================

def create_sensor_reading(db: Session, data: schemas.SensorDataInput, device_id: str):
    """Lưu dữ liệu cảm biến"""
    # 1. Cập nhật trạng thái Online
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
    
    # Log nhẹ (Debug) - Không log Info để tránh spam file log nếu tần suất gửi cao
    logger.debug(f"Saved sensor data for {device_id}: T={data.temp}, H={data.hum_air}")
    
    return db_sensor

def get_sensor_history(db: Session, device_id: str, limit: int = 50):
    return db.query(models.SensorData)\
             .filter(models.SensorData.device_id == device_id)\
             .order_by(desc(models.SensorData.timestamp))\
             .limit(limit)\
             .all()

def get_latest_sensor_reading(db: Session, device_id: str):
    return db.query(models.SensorData)\
             .filter(models.SensorData.device_id == device_id)\
             .order_by(desc(models.SensorData.timestamp))\
             .first()

# ================= 3. NHẬT KÝ HOẠT ĐỘNG (LOGS) =================

def create_action_log(db: Session, device_id: str, action: models.ActionType, trigger: models.TriggerSource, reason: str):
    """Ghi lại quyết định điều khiển"""
    logger.info(f"ACTION TRIGGERED: {device_id} -> {action} | By: {trigger} | Reason: {reason}")
    
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
# from sqlalchemy.orm import Session
# from sqlalchemy import desc
# from datetime import datetime

# from models import models
# from schemas import device as schemas

# # ================= 1. QUẢN LÝ THIẾT BỊ (DEVICE) =================
# """đã tích hợp một tính năng rất hay vào đây gọi là "Auto-Provisioning" (Tự động nhận diện thiết bị).

# Tác dụng: Khi bạn nạp code cho một con ESP32 mới tinh và cắm điện, hệ thống sẽ tự động tạo thiết bị 
# đó trong Database ngay khi nó gửi gói tin đầu tiên. Bạn không cần phải vào Admin nhập tay ID thiết bị. 
# Rất tiện khi Demo bảo vệ!"""
# def get_device(db: Session, device_id: str):
#     """Tìm thiết bị theo ID (MAC Address)"""
#     return db.query(models.Device).filter(models.Device.device_id == device_id).first()

# def get_devices(db: Session, skip: int = 0, limit: int = 100):
#     """Lấy danh sách thiết bị (Phân trang)"""
#     return db.query(models.Device).offset(skip).limit(limit).all()

# def create_device(db: Session, device: schemas.DeviceCreate):
#     """Tạo thiết bị mới thủ công"""
#     db_device = models.Device(
#         device_id=device.device_id,
#         name=device.name,
#         zone_id=device.zone_id,
#         status=models.DeviceStatus.OFFLINE
#     )
#     db.add(db_device)
#     db.commit()
#     db.refresh(db_device)
#     return db_device

# # Trong crud/device.py, tìm hàm update_device và sửa lại:

# def update_device(db: Session, device_id: str, device_in: schemas.DeviceUpdate):
#     # 1. Tìm thiết bị
#     db_device = get_device(db, device_id)
#     if not db_device:
#         return None
        
#     # 2. Chuyển dữ liệu đầu vào thành Dictionary (loại bỏ các trường null/không gửi)
#     # exclude_unset=True: Chỉ lấy những trường mà Frontend thực sự gửi lên
#     update_data = device_in.model_dump(exclude_unset=True)

#     # 3. Cập nhật từng trường
#     # Cách này ngắn gọn và bao quát cả name, zone_id, status...
#     for field, value in update_data.items():
#         setattr(db_device, field, value)

#     # 4. Lưu vào DB
#     db.add(db_device)
#     db.commit()
#     db.refresh(db_device) # Quan trọng: Load lại dữ liệu mới từ DB để trả về
#     return db_device


# def update_device_status(db: Session, device_id: str):
#     """
#     Heartbeat: Cập nhật trạng thái ONLINE mỗi khi ESP32 gửi tin.
#     Nếu thiết bị chưa tồn tại -> Tự động tạo mới (Auto-Provisioning).
#     """
#     device = get_device(db, device_id)
    
#     if not device:
#         # Tự động tạo thiết bị mới nếu chưa có
#         device = models.Device(
#             device_id=device_id, 
#             name=f"New ESP32 ({device_id[-4:]})", # Tự đặt tên VD: New ESP32 (A1B2)
#             status=models.DeviceStatus.ONLINE
#         )
#         db.add(device)
#     else:
#         # Cập nhật trạng thái
#         device.status = models.DeviceStatus.ONLINE
#         device.last_seen = datetime.now()
    
#     db.commit()
#     db.refresh(device)
#     return device

# # ================= 2. QUẢN LÝ DỮ LIỆU CẢM BIẾN (SENSOR DATA) =================

# def create_sensor_reading(db: Session, data: schemas.SensorDataInput, device_id: str):
#     """
#     Lưu dữ liệu cảm biến vào bảng Big Data
#     """
#     # 1. Đảm bảo thiết bị luôn Online khi gửi dữ liệu
#     update_device_status(db, device_id)

#     # 2. Lưu dữ liệu
#     db_sensor = models.SensorData(
#         device_id=device_id,
#         temp=data.temp,
#         hum_air=data.hum_air,
#         hum_soil=data.hum_soil,
#         light=data.light
#     )
#     db.add(db_sensor)
#     db.commit()
#     db.refresh(db_sensor)
#     return db_sensor

# def get_sensor_history(db: Session, device_id: str, limit: int = 50):
#     """
#     Lấy dữ liệu để vẽ biểu đồ App.
#     Lấy mới nhất trước (DESC) để hiển thị ngay tức thì.
#     """
#     return db.query(models.SensorData)\
#              .filter(models.SensorData.device_id == device_id)\
#              .order_by(desc(models.SensorData.timestamp))\
#              .limit(limit)\
#              .all()

# def get_latest_sensor_reading(db: Session, device_id: str):
#     """Lấy chỉ số hiện tại để hiển thị Dashboard"""
#     return db.query(models.SensorData)\
#              .filter(models.SensorData.device_id == device_id)\
#              .order_by(desc(models.SensorData.timestamp))\
#              .first()

# # ================= 3. NHẬT KÝ HOẠT ĐỘNG (LOGS) =================

# def create_action_log(
#     db: Session, 
#     device_id: str, 
#     action: models.ActionType, 
#     trigger: models.TriggerSource, 
#     reason: str
# ):
#     """
#     Ghi lại quyết định của AI hoặc người dùng
#     """
#     db_log = models.ActionLog(
#         device_id=device_id,
#         action=action,
#         trigger=trigger,
#         reason=reason
#     )
#     db.add(db_log)
#     db.commit()
#     db.refresh(db_log)
#     return db_log