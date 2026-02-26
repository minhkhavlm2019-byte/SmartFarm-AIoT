from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from models.models import DeviceStatus, ActionType, TriggerSource

# ================= 1. IOT SECURITY & INPUT (Đầu vào từ ESP32) =================

class EncryptedPayload(BaseModel):
    """
    Schema nhận gói tin mã hóa từ ESP32.
    ESP32 chỉ gửi đúng format này: {"data": "Chuỗi_Base64..."}
    """
    data: str

class SensorDataInput(BaseModel):
    """
    Dữ liệu SẠCH sau khi đã giải mã AES.
    Dùng Pydantic để validate (chặn số liệu ảo).
    """
    temp: float = Field(..., ge=-10, le=80, description="Nhiệt độ (-10 đến 80 độ)")
    hum_air: float = Field(..., ge=0, le=100, description="Độ ẩm KK (0-100%)")
    hum_soil: float = Field(..., ge=0, le=4095, description="Độ ẩm đất (0-100% hoặc Raw ADC)")
    light: Optional[float] = Field(None, ge=0, description="Ánh sáng (Lux)")

# ================= 2. SENSOR DATA OUTPUT (Đầu ra cho App Mobile) =================

class SensorDataResponse(SensorDataInput):
    """
    Dữ liệu trả về để vẽ biểu đồ
    """
    id: int
    device_id: str
    timestamp: datetime

    class Config:
        from_attributes = True # Cho phép đọc từ SQLAlchemy Model

# ================= 3. ACTION LOGS (Nhật ký AI) =================

class ActionLogResponse(BaseModel):
    """
    Trả về lịch sử tưới để hiển thị lên App
    """
    log_id: int
    action: ActionType
    trigger: TriggerSource
    reason: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# ================= 4. DEVICE MANAGEMENT (Quản lý thiết bị) =================

class DeviceBase(BaseModel):
    name: Optional[str] = None
    zone_id: Optional[int] = None

class DeviceCreate(DeviceBase):
    """Dùng khi tạo thiết bị mới"""
    device_id: str = Field(..., min_length=12, max_length=17, description="MAC Address")
    name: str = "New Device"
    zone_id: Optional[int] = None

# Trong schemas/device.py

class DeviceUpdate(BaseModel):
    """
    Schema dùng cho method PUT. 
    Các trường là Optional để cho phép cập nhật từng phần.
    """
    name: Optional[str] = None
    zone_id: Optional[int] = None
    status: Optional[DeviceStatus] = None # Thêm trường này nếu muốn Admin đổi trạng thái
    
class DeviceResponse(DeviceBase):
    """
    Thông tin chi tiết thiết bị trả về cho App
    """
    device_id: str
    name: str
    status: DeviceStatus
    last_seen: Optional[datetime] = None
    fw_version: Optional[str] = None
    pump_state: Optional[bool] = False
    light_state: Optional[bool] = False
    mist_state: Optional[bool] = False
    
    # Kèm theo trạng thái mới nhất (Optional)
    current_sensor: Optional[SensorDataResponse] = None
    temp: Optional[float] = None
    hum_soil: Optional[float] = None
    hum_air: Optional[float] = None
    light: Optional[float] = None

    class Config:
        from_attributes = True