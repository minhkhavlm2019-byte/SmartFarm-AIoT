from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Import các module của dự án
from db.session import SessionLocal
from core import security
from core.config import settings
from crud import user as crud_user 

router = APIRouter()

# Dependency lấy DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API Đăng nhập lấy Token
@router.post("/login/access-token")
def login_access_token(
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    
    # 1. Gọi hàm authenticate từ CRUD (Thay vì query trực tiếp ở đây)
    # Hàm này đã bao gồm việc tìm user và check pass hash
    user = crud_user.authenticate(
        db, 
        username=form_data.username, 
        password=form_data.password
    )
    
    # 2. Xử lý nếu đăng nhập thất bại
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tên đăng nhập hoặc mật khẩu",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Kiểm tra trạng thái User (Active hay không)
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Tài khoản đã bị khóa")

    # 4. Tạo Access Token (JWT)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Lưu ý: user.role là Enum, nên dùng .value để lấy chuỗi (VD: "admin")
    access_token = security.create_access_token(
        data={
            "sub": str(user.user_id),  # Quan trọng: ID user
            "role": user.role.value if hasattr(user.role, 'value') else user.role, 
            "name": user.full_name # Lưu thêm tên để Frontend hiển thị cho tiện
        }, 
        expires_delta=access_token_expires,
    )
    
    # 5. Trả về Token
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

# from datetime import timedelta
# from typing import Any

# from fastapi import APIRouter, Depends, HTTPException, status
# from fastapi.security import OAuth2PasswordRequestForm
# from sqlalchemy.orm import Session

# # Import các module của dự án
# from db.session import SessionLocal
# from core import security
# from core.config import settings
# from crud import user as crud_user # Bạn sẽ cần tạo file này ở bước sau
# from models import models

# router = APIRouter()

# # Dependency lấy DB
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# # API Đăng nhập lấy Token
# @router.post("/login/access-token")
# def login_access_token(
#     db: Session = Depends(get_db), 
#     form_data: OAuth2PasswordRequestForm = Depends()
# ) -> Any:
#     """
#     OAuth2 compatible token login, get an access token for future requests.
#     """
#     # 1. Tìm user trong DB theo username
#     user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
#     # 2. Kiểm tra User và Password
#     if not user or not security.verify_password(form_data.password, user.password_hash):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Sai tên đăng nhập hoặc mật khẩu",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
    
#     # 3. Kiểm tra trạng thái User (Active hay không)
#     if not user.is_active:
#         raise HTTPException(status_code=400, detail="Tài khoản đã bị khóa")

#     # 4. Tạo Access Token (JWT)
#     access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = security.create_access_token(
#         data={"sub": str(user.user_id), "role": user.role}, # Lưu user_id vào token
#         expires_delta=access_token_expires,
#     )
    
#     # 5. Trả về Token
#     return {
#         "access_token": access_token,
#         "token_type": "bearer",
#     }