from sqlalchemy.orm import Session
from models.models import Zone, User, UserRole
from schemas.zone import ZoneCreate
from schemas.zone import ZoneUpdate

def get_zones(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Zone).offset(skip).limit(limit).all()

def get_zone(db: Session, zone_id: int):
    """Lấy chi tiết 1 Zone theo ID"""
    return db.query(Zone).filter(Zone.zone_id == zone_id).first()

def get_zones_by_role(db: Session, user: User, skip: int = 0, limit: int = 100):
    """
    Lấy danh sách Zone theo quyền hạn (Role-Based):
    - ADMIN: Xem tất cả.
    - TECH: Chỉ xem Zone mình được gán làm kỹ thuật.
    - FARMER: Chỉ xem Zone mình được gán làm nông dân.
    """
    query = db.query(Zone)

    if user.role == UserRole.ADMIN:
        # Admin thấy hết
        pass
    elif user.role == UserRole.TECH:
        # Tech chỉ thấy zone mình quản lý
        query = query.filter(Zone.technician_id == user.user_id)
    elif user.role == UserRole.FARMER:
        # Farmer chỉ thấy zone mình canh tác
        query = query.filter(Zone.farmer_id == user.user_id)
    else:
        # Các role khác (nếu có) không thấy gì
        return []

    return query.offset(skip).limit(limit).all()

def create_zone(db: Session, zone: ZoneCreate, owner_id: int):
    """
    Tạo Zone mới.
    - owner_id: ID của người tạo (Admin)
    - technician_id / farmer_id: Lấy từ dữ liệu gửi lên
    """
    db_zone = Zone(
        name=zone.name,
        description=zone.description,
        crop_type=zone.crop_type,
        owner_id=owner_id,               # Người sở hữu (Admin tạo)
        technician_id=zone.technician_id, # Gán Kỹ thuật viên
        farmer_id=zone.farmer_id          # Gán Nông dân
    )
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone

def update_zone(db: Session, zone_id: int, zone_in: ZoneUpdate):
    """
    Cập nhật thông tin Zone (Tên, Mô tả, Phân công nhân sự)
    """
    db_zone = get_zone(db, zone_id)
    if not db_zone:
        return None
    
    # Chuyển đổi dữ liệu input thành dict, loại bỏ các trường null
    update_data = zone_in.model_dump(exclude_unset=True)

    # Cập nhật từng trường vào DB Model
    for field, value in update_data.items():
        setattr(db_zone, field, value)

    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone

# ================= 4. XÓA (DELETE) =================

def delete_zone(db: Session, zone_id: int):
    """Xóa Zone khỏi hệ thống"""
    db_zone = get_zone(db, zone_id)
    if db_zone:
        db.delete(db_zone)
        db.commit()
        return True
    return False