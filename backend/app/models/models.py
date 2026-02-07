from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text, BigInteger, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

# QUAN TRỌNG: Phải import Base từ db.base để init_db.py nhận diện được bảng
from db.base import Base 

# ================= ENUMS (Định nghĩa các lựa chọn cố định) =================

class UserRole(str, enum.Enum):
    ADMIN = "admin"      # Quyền cao nhất
    FARMER = "farmer"    # Người nông dân (chỉ xem, không sửa cấu hình sâu)

class DeviceStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    ERROR = "ERROR"

class ActionType(str, enum.Enum):
    PUMP_ON = "PUMP_ON"       # Bật bơm tưới
    PUMP_OFF = "PUMP_OFF"     # Tắt bơm
    MIST_ON = "MIST_ON"       # Bật phun sương (Làm mát)
    MIST_OFF = "MIST_OFF"     # Tắt phun sương

class TriggerSource(str, enum.Enum):
    AI_MODEL = "AI_MODEL"     # Do AI quyết định (Quan trọng cho đồ án)
    MANUAL = "MANUAL"         # Do người dùng bấm nút trên App
    FAILSAFE = "FAILSAFE"     # Cơ chế an toàn (Ví dụ: quá nóng tự bật)
    TIMER = "TIMER"           # Hẹn giờ truyền thống

# ================= CÁC BẢNG QUẢN TRỊ (ADMIN & SYSTEM) =================

class User(Base):
    """Bảng Người Dùng"""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    email = Column(String(100), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.FARMER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Quan hệ: 1 User quản lý nhiều Zone
    zones = relationship("Zone", back_populates="owner")


class Zone(Base):
    """Bảng Khu Vực (Ví dụ: Nhà màng 1, Nhà màng 2)"""
    __tablename__ = "zones"

    zone_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(100), nullable=False) # VD: "Vườn Xà Lách Thủy Canh"
    description = Column(String(255), nullable=True)
    crop_type = Column(String(50), default="Lettuce") # Loại cây trồng
    
    # Quan hệ
    owner = relationship("User", back_populates="zones")
    devices = relationship("Device", back_populates="zone")
    setting = relationship("ZoneSetting", back_populates="zone", uselist=False, cascade="all, delete-orphan")


class ZoneSetting(Base):
    """
    Bảng Cấu Hình Ngưỡng (QUAN TRỌNG CHO AI):
    Thay vì fix cứng trong code, ta lưu vào DB để người dùng chỉnh trên App.
    """
    __tablename__ = "zone_settings"

    setting_id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.zone_id"), unique=True)
    
    # Ngưỡng tưới nước (Dựa trên độ ẩm đất)
    min_soil_moisture = Column(Float, default=40.0) # Dưới 40% là tưới
    max_soil_moisture = Column(Float, default=70.0) # Trên 70% là dừng
    
    # Ngưỡng sốc nhiệt (Dựa trên nhiệt độ không khí)
    heat_shock_temp = Column(Float, default=35.0)   # Trên 35 độ là SỐC -> Phun sương ngay
    
    # Chu kỳ tưới/phun (Giây)
    pump_duration = Column(Integer, default=30)     # Tưới trong 30s
    mist_duration = Column(Integer, default=60)     # Phun sương trong 60s
    
    zone = relationship("Zone", back_populates="setting")


class Device(Base):
    """Bảng Thiết Bị (ESP32)"""
    __tablename__ = "devices"

    device_id = Column(String(50), primary_key=True) # MAC Address (VD: A4:CF:12:...)
    zone_id = Column(Integer, ForeignKey("zones.zone_id"), nullable=True)
    name = Column(String(100), default="New Device")
    status = Column(Enum(DeviceStatus), default=DeviceStatus.OFFLINE)
    last_seen = Column(DateTime(timezone=True))
    fw_version = Column(String(20), nullable=True) # Phiên bản Firmware ESP32
    
    # Quan hệ
    zone = relationship("Zone", back_populates="devices")
    sensor_data = relationship("SensorData", back_populates="device")
    logs = relationship("ActionLog", back_populates="device")

# ================= CÁC BẢNG DỮ LIỆU LỚN (BIG DATA) =================

class SensorData(Base):
    """
    Bảng Lưu Trữ Dữ Liệu Cảm Biến:
    Lưu lịch sử lâu dài để vẽ biểu đồ & Train lại AI sau này.
    """
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True) # Dùng BigInt vì dữ liệu sẽ rất nhiều
    device_id = Column(String(50), ForeignKey("devices.device_id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Các thông số môi trường
    temp = Column(Float)      # Nhiệt độ không khí
    hum_air = Column(Float)   # Độ ẩm không khí
    hum_soil = Column(Float)  # Độ ẩm đất
    light = Column(Float, nullable=True) # Ánh sáng (Lux) - Nếu có
    
    device = relationship("Device", back_populates="sensor_data")


class ActionLog(Base):
    """
    Bảng Nhật Ký Hoạt Động:
    Lưu lại bằng chứng AI đã làm việc (Tại sao lại tưới? Tại sao lại phun sương?)
    Rất quan trọng khi bảo vệ đồ án.
    """
    __tablename__ = "action_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), ForeignKey("devices.device_id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    action = Column(Enum(ActionType))      # Hành động gì?
    trigger = Column(Enum(TriggerSource))  # Ai ra lệnh? (AI hay Người)
    reason = Column(String(255))           # Lý do (VD: "Temp 38 > 35 (Heat Shock)")
    
    device = relationship("Device", back_populates="logs")