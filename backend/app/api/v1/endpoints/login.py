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
from models import models # [THÊM MỚI] Import models để query trực tiếp

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
    
    # 1. Tìm user bằng username (Lấy ra object user để còn xử lý biến đếm)
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    # 2. Xử lý nếu user không tồn tại trong hệ thống
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tên đăng nhập hoặc mật khẩu",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Kiểm tra xem tài khoản có đang bị khóa (do sai 5 lần) hay không?
    if getattr(user, 'is_locked', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa do đăng nhập sai quá 5 lần. Vui lòng liên hệ Admin."
        )

    # 4. Kiểm tra trạng thái User (Active hay không)
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Tài khoản đã bị khóa/vô hiệu hóa")

    # 5. KIỂM TRA MẬT KHẨU VÀ ĐẾM SỐ LẦN SAI
    # Sử dụng hàm verify_password từ core.security
    if not security.verify_password(form_data.password, user.password_hash):
        # Nếu sai pass: Tăng biến đếm thêm 1
        user.failed_login_attempts = getattr(user, 'failed_login_attempts', 0) + 1
        
        # Nếu chạm mốc 5 lần -> Khóa tài khoản
        if user.failed_login_attempts >= 5:
            user.is_locked = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Tài khoản của bạn đã bị khóa do nhập sai 5 lần liên tiếp."
            )
        
        db.commit()
        # Báo cho người dùng biết số lần thử còn lại
        remain = 5 - user.failed_login_attempts
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Sai mật khẩu. Bạn còn {remain} lần thử.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 6. NẾU MẬT KHẨU ĐÚNG -> RESET BIẾN ĐẾM VỀ 0
    if getattr(user, 'failed_login_attempts', 0) > 0:
        user.failed_login_attempts = 0
        db.commit()

    # 7. Tạo Access Token (JWT)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Lấy giá trị chuỗi của Role (VD: "ADMIN" thay vì UserRole.ADMIN)
    role_value = user.role.value if hasattr(user.role, 'value') else user.role

    access_token = security.create_access_token(
        data={
            "sub": str(user.user_id), 
            "role": role_value, 
            "name": user.full_name
        }, 
            expires_delta=access_token_expires,
    )
    
    # 8. Trả về Token VÀ Role
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role_value,       # <--- QUAN TRỌNG: Gửi quyền về cho Frontend
        "username": user.username # <--- QUAN TRỌNG: Gửi tên về để hiển thị
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
# from crud import user as crud_user 

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
    
#     # 1. Gọi hàm authenticate từ CRUD 
#     user = crud_user.authenticate(
#         db, 
#         username=form_data.username, 
#         password=form_data.password
#     )
    
#     # 2. Xử lý nếu đăng nhập thất bại
#     if not user:
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
    
#     # Lấy giá trị chuỗi của Role (VD: "ADMIN" thay vì UserRole.ADMIN)
#     role_value = user.role.value if hasattr(user.role, 'value') else user.role

#     access_token = security.create_access_token(
#         data={
#             "sub": str(user.user_id), 
#             "role": role_value, 
#             "name": user.full_name
#         }, 
#         expires_delta=access_token_expires,
#     )
    
#     # 5. Trả về Token VÀ Role (👇 ĐÃ CẬP NHẬT)
#     return {
#         "access_token": access_token,
#         "token_type": "bearer",
#         "role": role_value,       # <--- QUAN TRỌNG: Gửi quyền về cho Frontend
#         "username": user.username # <--- QUAN TRỌNG: Gửi tên về để hiển thị
#     }
# from datetime import timedelta
# from typing import Any

# from fastapi import APIRouter, Depends, HTTPException, status
# from fastapi.security import OAuth2PasswordRequestForm
# from sqlalchemy.orm import Session

# # Import các module của dự án
# from db.session import SessionLocal
# from core import security
# from core.config import settings
# from crud import user as crud_user 

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
    
#     # 1. Gọi hàm authenticate từ CRUD (Thay vì query trực tiếp ở đây)
#     # Hàm này đã bao gồm việc tìm user và check pass hash
#     user = crud_user.authenticate(
#         db, 
#         username=form_data.username, 
#         password=form_data.password
#     )
    
#     # 2. Xử lý nếu đăng nhập thất bại
#     if not user:
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
    
#     # Lưu ý: user.role là Enum, nên dùng .value để lấy chuỗi (VD: "admin")
#     access_token = security.create_access_token(
#         data={
#             "sub": str(user.user_id),  # Quan trọng: ID user
#             "role": user.role.value if hasattr(user.role, 'value') else user.role, 
#             "name": user.full_name # Lưu thêm tên để Frontend hiển thị cho tiện
#         }, 
#         expires_delta=access_token_expires,
#     )
    
#     # 5. Trả về Token
#     return {
#         "access_token": access_token,
#         "token_type": "bearer",
#     }

# # from datetime import timedelta
# # from typing import Any

# # from fastapi import APIRouter, Depends, HTTPException, status
# # from fastapi.security import OAuth2PasswordRequestForm
# # from sqlalchemy.orm import Session

# # # Import các module của dự án
# # from db.session import SessionLocal
# # from core import security
# # from core.config import settings
# # from crud import user as crud_user # Bạn sẽ cần tạo file này ở bước sau
# # from models import models

# # router = APIRouter()

# # # Dependency lấy DB
# # def get_db():
# #     db = SessionLocal()
# #     try:
# #         yield db
# #     finally:
# #         db.close()

# # # API Đăng nhập lấy Token
# # @router.post("/login/access-token")
# # def login_access_token(
# #     db: Session = Depends(get_db), 
# #     form_data: OAuth2PasswordRequestForm = Depends()
# # ) -> Any:
# #     """
# #     OAuth2 compatible token login, get an access token for future requests.
# #     """
# #     # 1. Tìm user trong DB theo username
# #     user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
# #     # 2. Kiểm tra User và Password
# #     if not user or not security.verify_password(form_data.password, user.password_hash):
# #         raise HTTPException(
# #             status_code=status.HTTP_401_UNAUTHORIZED,
# #             detail="Sai tên đăng nhập hoặc mật khẩu",
# #             headers={"WWW-Authenticate": "Bearer"},
# #         )
    
# #     # 3. Kiểm tra trạng thái User (Active hay không)
# #     if not user.is_active:
# #         raise HTTPException(status_code=400, detail="Tài khoản đã bị khóa")

# #     # 4. Tạo Access Token (JWT)
# #     access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
# #     access_token = security.create_access_token(
# #         data={"sub": str(user.user_id), "role": user.role}, # Lưu user_id vào token
# #         expires_delta=access_token_expires,
# #     )
    
# #     # 5. Trả về Token
# #     return {
# #         "access_token": access_token,
# #         "token_type": "bearer",
# #     }