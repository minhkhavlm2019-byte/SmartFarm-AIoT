from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api import deps
from crud import zone as crud
from schemas import zone as schemas
from models import models

router = APIRouter()

# --- 1. LẤY DANH SÁCH ZONE (GET) ---
# Ai cũng xem được, nhưng kết quả trả về sẽ khác nhau tùy theo Role (Admin/Tech/Farmer)
@router.get("/", response_model=List[schemas.ZoneResponse])
def read_zones(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user) 
):
    """
    Lấy danh sách Zone.
    - Admin: Nhận tất cả.
    - Tech: Chỉ nhận Zone được phân công kỹ thuật.
    - Farmer: Chỉ nhận Zone đang canh tác.
    """
    zones = crud.get_zones_by_role(db, user=current_user, skip=skip, limit=limit)
    return zones

# --- 2. TẠO ZONE MỚI (POST) ---
# Thường chỉ Admin mới được tạo và phân quyền cho Tech/Farmer
@router.post("/", response_model=schemas.ZoneResponse)
def create_zone(
    *,
    db: Session = Depends(deps.get_db),
    zone_in: schemas.ZoneCreate,
    current_user: models.User = Depends(deps.get_current_active_superuser) # Khuyến nghị: Chỉ Admin (Superuser)
):
    """
    Tạo Zone mới và gán Tech/Farmer (nếu có trong body gửi lên).
    """
    # Kiểm tra tên trùng (Optional)
    # existing_zone = crud.get_zone_by_name(db, zone_in.name)
    # if existing_zone: raise HTTPException(status_code=400, detail="Tên Zone đã tồn tại")
    
    zone = crud.create_zone(db=db, zone=zone_in, owner_id=current_user.user_id)
    return zone

# --- 3. CẬP NHẬT ZONE (PUT) ---
# Admin hoặc Tech phụ trách zone đó được sửa
# --- 3. CẬP NHẬT ZONE (PUT) ---
@router.put("/{zone_id}", response_model=schemas.ZoneResponse)
def update_zone(
    zone_id: int, 
    zone_in: schemas.ZoneUpdate, 
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """
    Cập nhật thông tin Zone (Đổi chế độ AUTO/MANUAL, Cài đặt ngưỡng).
    - ADMIN: Được phép sửa mọi Zone.
    - FARMER: Chỉ được phép sửa Zone (Vườn) do chính mình quản lý.
    - TECH: KHÔNG được phép sửa (Chỉ lo bảo trì thiết bị, không can thiệp canh tác).
    """
    from crud import zone as crud_zone 
    
    # 1. Lấy thông tin Zone hiện tại từ Database ra kiểm tra
    current_zone = crud_zone.get_zone(db, zone_id=zone_id)
    if not current_zone:
        raise HTTPException(status_code=404, detail="Không tìm thấy Zone này")

    # 2. KIỂM TRA QUYỀN TRUY CẬP (BẢO MẬT CHẶT CHẼ)
    # - Nếu là KỸ THUẬT (TECH): Chặn ngay lập tức!
    if current_user.role == models.UserRole.TECH:
        raise HTTPException(status_code=403, detail="Kỹ thuật viên không có quyền thay đổi cấu hình canh tác của Vườn!")
            
    # - Nếu là NÔNG DÂN (FARMER): Kiểm tra xem có đúng vườn của mình không
    elif current_user.role == models.UserRole.FARMER:
        if current_zone.farmer_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thay đổi cấu hình vườn của người khác!")

    # 3. Nếu qua được bước kiểm tra quyền (ADMIN hoặc FARMER hợp lệ), tiến hành cập nhật
    # Dòng đã sửa
    zone = crud_zone.update_zone(db, zone_id, zone_in)
    #zone = crud_zone.update_zone(db, zone_id=zone_id, obj_in=zone_in)
    return zone
# --- 4. XÓA ZONE (DELETE) ---
# Chỉ Admin mới nên có quyền xóa vùng canh tác
@router.delete("/{zone_id}")
def delete_zone(
    zone_id: int, 
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_superuser) # Khuyến nghị: Chỉ Admin
):
    success = crud.delete_zone(db, zone_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy Zone hoặc không thể xóa")
    return {"status": "success", "message": "Đã xóa Zone thành công"}

@router.put("/{zone_id}/settings")
def update_zone_settings(
    zone_id: int, 
    settings_in: schemas.ZoneSettingUpdate, 
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """
    API chuyên dụng để lưu trạng thái gạt công tắc AUTO/MANUAL 
    và các ngưỡng nhiệt độ, độ ẩm từ Frontend.
    """
    # 1. Kiểm tra Vườn có tồn tại không
    current_zone = db.query(models.Zone).filter(models.Zone.zone_id == zone_id).first()
    if not current_zone:
        raise HTTPException(status_code=404, detail="Không tìm thấy Zone này")

    # 2. KIỂM TRA PHÂN QUYỀN (BẢO MẬT)
    if current_user.role == models.UserRole.TECH:
        raise HTTPException(status_code=403, detail="Kỹ thuật viên không có quyền thay đổi cấu hình canh tác!")
    elif current_user.role == models.UserRole.FARMER:
        if current_zone.farmer_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thay đổi cấu hình vườn của người khác!")

    # 3. Lấy cấu hình hiện tại (ZoneSetting)
    setting = db.query(models.ZoneSetting).filter(models.ZoneSetting.zone_id == zone_id).first()
    
    # Nếu Vườn mới tạo chưa có cấu hình -> Khởi tạo cấu hình mặc định
    if not setting:
        setting = models.ZoneSetting(zone_id=zone_id)
        db.add(setting)
        db.flush() # Đẩy tạm vào DB để có ID thao tác tiếp

    # 4. Cập nhật các thông số mà Frontend gửi lên (Bỏ qua các thông số không gửi)
    update_data = settings_in.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(setting, key, value) 

    # 5. Lưu xuống Database
    try:
        db.commit()
        db.refresh(setting)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu Database: {e}")

    return {
        "message": "Đã lưu thiết lập thành công!", 
        "settings": setting
    }