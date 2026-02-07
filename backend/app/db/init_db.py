from sqlalchemy.orm import Session
from core.config import settings
from db.base import Base  # Import metadata để tạo bảng
from db.session import engine
from models.models import User, UserRole  # Import Model User
from core.security import get_password_hash

def init_db(db: Session) -> None:
    # 1. TẠO TOÀN BỘ BẢNG (Nếu chưa có)
    # Dòng này tương đương với câu lệnh "CREATE TABLE IF NOT EXISTS..." trong SQL
    Base.metadata.create_all(bind=engine)

    # 2. TẠO USER ADMIN MẶC ĐỊNH
    # Kiểm tra xem admin đã tồn tại chưa
    user = db.query(User).filter(User.username == settings.FIRST_SUPERUSER).first()
    
    if not user:
        print(f"Chưa có Admin. Đang tạo user: {settings.FIRST_SUPERUSER}...")
        
        user_in = User(
            username=settings.FIRST_SUPERUSER,
            password_hash=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            full_name="Super Admin",
            role=UserRole.ADMIN  # Dùng Enum đã định nghĩa trong models
        )
        
        db.add(user_in)
        db.commit()
        db.refresh(user_in)
        print("Đã tạo Admin thành công!")
    else:
        print(f"Admin {settings.FIRST_SUPERUSER} đã tồn tại. Bỏ qua.")