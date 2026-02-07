from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings

# In ra để kiểm tra xem nó đang lấy URL nào (Debug)
print(f"Connecting to Database: {settings.DATABASE_URL}")

# --- LOGIC TỰ ĐỘNG NHẬN DIỆN LOẠI DB ---

if "sqlite" in settings.DATABASE_URL:
    # Cấu hình riêng cho SQLite
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        settings.DATABASE_URL, 
        connect_args=connect_args
    )
else:
    # Cấu hình cho MySQL / PostgreSQL
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,  # Tự động kết nối lại nếu bị ngắt (Rất quan trọng với MySQL)
        pool_recycle=3600    # Tái tạo kết nối sau 1 giờ
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)