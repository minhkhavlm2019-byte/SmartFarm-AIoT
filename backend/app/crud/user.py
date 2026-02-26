from sqlalchemy.orm import Session
from models.models import User
from schemas.user import UserCreate
from core.security import get_password_hash, verify_password
from schemas.user import UserUpdate # Import thêm UserUpdate
# 1. Lấy thông tin User bằng Username (Sửa từ Email -> Username)
def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

# 2. Lấy thông tin User bằng ID
def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.user_id == user_id).first()

# 3. Tạo User mới (Register)
def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    
    db_user = User(
        username=user.username, # Lưu username thay vì email làm khóa chính
        email=user.email,
        full_name=user.full_name,
        password_hash=hashed_password, # Lưu ý: Model bạn đặt là password_hash hay hashed_password? Check kỹ models.py
        is_active=True,
        role=user.role # Mặc định là nông dân
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
def update_user(db: Session, db_user: User, user_in: UserUpdate):
    update_data = user_in.dict(exclude_unset=True) # Chỉ lấy các trường có gửi lên
    
    # 1. Nếu có đổi mật khẩu -> Mã hóa nó
    if "password" in update_data and update_data["password"]:
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"] # Xóa pass thô
        db_user.password_hash = hashed_password # Gán pass mã hóa

    # 2. Cập nhật các trường khác (full_name, email)
    for field in update_data:
        setattr(db_user, field, update_data[field])

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
# 4. Xác thực đăng nhập (Authenticate) - Đã sửa logic
def authenticate(db: Session, username: str, password: str):
    """
    Kiểm tra username và password.
    """
    # Tìm user theo username thay vì email
    user = get_user_by_username(db, username=username)
    
    if not user:
        return None
    
    # Kiểm tra pass (Lưu ý tên trường trong Model là password_hash)
    if not verify_password(password, user.password_hash):
        return None
        
    return user
# from sqlalchemy.orm import Session
# from models.models import User
# from schemas.user import UserCreate
# from core.security import get_password_hash, verify_password

# # 1. Lấy thông tin User bằng Email (Dùng khi đăng nhập hoặc check trùng lặp)
# def get_user_by_email(db: Session, email: str):
#     return db.query(User).filter(User.email == email).first()

# # 2. Lấy thông tin User bằng ID
# def get_user(db: Session, user_id: int):
#     return db.query(User).filter(User.id == user_id).first()

# # 3. Tạo User mới (Register)
# def create_user(db: Session, user: UserCreate):
#     # Bước quan trọng: Băm mật khẩu trước khi lưu
#     hashed_password = get_password_hash(user.password)
    
#     # Tạo đối tượng User Model (Mapping với bảng SQL)
#     db_user = User(
#         email=user.email,
#         full_name=user.full_name,
#         hashed_password=hashed_password,
#         is_active=True,         # Mặc định kích hoạt ngay
#         is_superuser=False      # Mặc định là user thường
#     )
    
#     db.add(db_user)
#     db.commit()      # Lưu xuống DB
#     db.refresh(db_user) # Lấy lại ID vừa sinh ra
#     return db_user

# # 4. Xác thực đăng nhập (Authenticate)
# def authenticate(db: Session, email: str, password: str):
#     """
#     Kiểm tra email và password có khớp không.
#     Trả về User object nếu đúng, None nếu sai.
#     """
#     user = get_user_by_email(db, email=email)
    
#     if not user:
#         return None # Không tìm thấy email
    
#     if not verify_password(password, user.hashed_password):
#         return None # Sai mật khẩu
        
#     return user