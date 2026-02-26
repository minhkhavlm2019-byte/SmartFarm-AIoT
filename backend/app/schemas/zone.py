from pydantic import BaseModel
from typing import Optional

# ================= DỮ LIỆU CƠ BẢN =================
class ZoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    crop_type: Optional[str] = "Rau Cải" # Mặc định

class ZoneSettingResponse(BaseModel):
    mode: str
    min_soil_moisture: float
    max_soil_moisture: float
    heat_shock_temp: float
    pump_duration: int
    mist_duration: int
    class Config:
        from_attributes = True

# ================= INPUT (Frontend -> Backend) =================

class ZoneCreate(ZoneBase):
    """
    Dữ liệu khi tạo Zone mới.
    Admin sẽ chọn Tech và Farmer từ Dropdown nên cần nhận 2 ID này.
    """
    technician_id: Optional[int] = None
    farmer_id: Optional[int] = None

class ZoneUpdate(BaseModel):
    """
    Dùng cho API PUT /zones/{id}
    Cho phép thay đổi tên, mô tả hoặc người phụ trách.
    """
    name: Optional[str] = None
    description: Optional[str] = None
    crop_type: Optional[str] = None
    technician_id: Optional[int] = None
    farmer_id: Optional[int] = None

# ================= OUTPUT (Backend -> Frontend) =================

class ZoneResponse(ZoneBase):
    """
    Dữ liệu trả về để hiển thị lên bảng.
    """
    zone_id: int
    
    # Thay user_id cũ bằng owner_id (Người tạo)
    owner_id: Optional[int] = None 
    
    # Trả về ID của người phụ trách để Frontend hiển thị hoặc bind vào Form sửa
    technician_id: Optional[int] = None
    farmer_id: Optional[int] = None
    setting: Optional[ZoneSettingResponse] = None

    class Config:
        from_attributes = True # Pydantic v2 (tương đương orm_mode trong v1)
        
class ZoneSettingUpdate(BaseModel):
    mode: Optional[str] = None
    min_soil_moisture: Optional[float] = None
    max_soil_moisture: Optional[float] = None
    heat_shock_temp: Optional[float] = None
    pump_duration: Optional[int] = None
    mist_duration: Optional[int] = None