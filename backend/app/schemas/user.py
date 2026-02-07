from typing import Optional
from pydantic import BaseModel, EmailStr

# 1. Schema dùng chung (Shared properties)
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False

# 2. Schema nhận dữ liệu từ Client khi tạo User mới (Register)
class UserCreate(UserBase):
    email: EmailStr         # Bắt buộc phải có Email
    password: str           # Bắt buộc phải có Password
    full_name: str          # Bắt buộc tên

# 3. Schema nhận dữ liệu khi Update User
class UserUpdate(UserBase):
    password: Optional[str] = None # Cho phép đổi pass (hoặc không)

# 4. Schema trả về dữ liệu cho Client (Response)
# Quan trọng: Không được trả về password!
class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True # Để Pydantic đọc được dữ liệu từ SQLAlchemy (ORM mode cũ)

# 5. Schema riêng cho Token đăng nhập
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None