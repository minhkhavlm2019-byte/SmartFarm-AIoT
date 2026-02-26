from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from enum import Enum

# --- 0. Định nghĩa Enum cho Role ---
# Giúp code rõ ràng hơn, tránh gõ sai chữ "admin"/"farmer"
class UserRole(str, Enum):
    ADMIN = "ADMIN"   # Lưu ý: Nên để in hoa để khớp với logic so sánh trong deps.py
    FARMER = "FARMER"
    TECH = "TECH"

# --- 1. Schema Cơ bản (Base) ---
# Chứa các trường chung có thể xuất hiện ở nhiều nơi
class UserBase(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    role: Optional[str] = "FARMER" # Dùng str để linh hoạt, mặc định là FARMER
    is_locked: Optional[bool] = False
    failed_login_attempts: Optional[int] = 0

# --- 2. Schema TẠO MỚI (Register) ---
# Bắt buộc phải có password và username khi tạo
class UserCreate(UserBase):
    username: str
    password: str
    role: str = "FARMER" 

# --- 3. Schema CẬP NHẬT (Update) ---
# Dùng cho API /users/me (Tự sửa thông tin)
class UserUpdate(BaseModel):
    password: Optional[str] = None
    email: Optional[str] = None  # Có thể dùng EmailStr nếu đã cài email-validator
    full_name: Optional[str] = None
    # Lưu ý: Không cho phép tự update role ở đây để bảo mật

# --- 4. Schema TRẢ VỀ (Response) ---
# Đây là class "User" mà FastAPI tìm kiếm bấy lâu nay
# Tuyệt đối không chứa password_hash
class User(UserBase):
    user_id: int            # ID từ Database
    created_at: Optional[datetime] = None

    class Config:
        # Pydantic v2 dùng from_attributes để đọc dữ liệu từ SQLAlchemy
        from_attributes = True 

# --- 5. Schema cho TOKEN (Login) ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str       # Trả về role để Frontend phân quyền
    username: str   # Trả về tên để hiển thị

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
# from typing import Optional
# from pydantic import BaseModel, EmailStr
# from datetime import datetime
# from enum import Enum

# # --- 0. Định nghĩa lại Enum cho Schema (Phải khớp với Model) ---
# class UserRole(str, Enum):
#     ADMIN = "admin"
#     FARMER = "farmer"

# # --- 1. Schema dùng chung (Base) ---
# class UserBase(BaseModel):
#     username: str             # Bắt buộc
#     email: Optional[EmailStr] = None
#     full_name: Optional[str] = None
#     is_active: Optional[bool] = True
#     role: UserRole = UserRole.FARMER # Mặc định là nông dân

# # --- 2. Schema khi TẠO MỚI (Register) ---
# from typing import Optional
# from pydantic import BaseModel

# # Schema dùng khi tạo user mới
# class UserCreate(BaseModel):
#     username: str
#     password: str
#     full_name: Optional[str] = None
#     email: Optional[str] = None
#     role: str = "FARMER" # Mặc định là Farmer nếu không chọn         # Bắt buộc password khi tạo

# # --- 3. Schema khi CẬP NHẬT (Update) ---
# class UserUpdate(BaseModel):
#     # Tất cả đều là Optional vì người dùng có thể chỉ sửa 1 trường
#     password: Optional[str] = None
#     email: Optional[EmailStr] = None
#     full_name: Optional[str] = None

# # --- 4. Schema TRẢ VỀ (Response) ---
# # Dùng để trả dữ liệu về Frontend (Tuyệt đối không có password)
# class UserResponse(UserBase):
#     user_id: int              # Khớp với models.py
#     created_at: Optional[datetime] = None

#     class Config:
#         # Pydantic v2 dùng from_attributes thay vì orm_mode
#         from_attributes = True 

# # --- 5. Schema cho TOKEN ---
# class Token(BaseModel):
#     access_token: str
#     token_type: str
#     role: str       # Trả về role để Frontend biết đường điều hướng
#     username: str   # Trả về tên để hiển thị "Xin chào..."

# class TokenPayload(BaseModel):
#     sub: Optional[str] = None # sub trong JWT thường chứa username (string)
#     role: Optional[str] = None
# from typing import Optional
# from pydantic import BaseModel, EmailStr

# # 1. Schema dùng chung (Shared properties)
# class UserBase(BaseModel):
#     email: Optional[EmailStr] = None
#     full_name: Optional[str] = None
#     is_active: Optional[bool] = True
#     is_superuser: Optional[bool] = False

# # 2. Schema nhận dữ liệu từ Client khi tạo User mới (Register)
# class UserCreate(UserBase):
#     email: EmailStr         # Bắt buộc phải có Email
#     password: str           # Bắt buộc phải có Password
#     full_name: str          # Bắt buộc tên

# # 3. Schema nhận dữ liệu khi Update User
# class UserUpdate(UserBase):
#     password: Optional[str] = None # Cho phép đổi pass (hoặc không)

# # 4. Schema trả về dữ liệu cho Client (Response)
# # Quan trọng: Không được trả về password!
# class User(UserBase):
#     id: int
    
#     class Config:
#         from_attributes = True # Để Pydantic đọc được dữ liệu từ SQLAlchemy (ORM mode cũ)

# # 5. Schema riêng cho Token đăng nhập
# class Token(BaseModel):
#     access_token: str
#     token_type: str

# class TokenPayload(BaseModel):
#     sub: Optional[int] = None