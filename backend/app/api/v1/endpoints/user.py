from typing import Any, List
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from api import deps
from crud import user as crud_user
from schemas import user as schemas
from models.models import User as UserModel 
from models import models

router = APIRouter()

# --- 1. LẤY DANH SÁCH USER (ADMIN ONLY) ---
@router.get("/", response_model=List[schemas.User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser), # <--- Chỉ Admin
):
    """
    Lấy danh sách nhân viên. Chỉ Admin mới được gọi.
    """
    users = crud_user.get_users(db, skip=skip, limit=limit)
    return users

# --- 2. TẠO USER MỚI (ADMIN ONLY) ---
@router.post("/", response_model=schemas.User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
    current_user: UserModel = Depends(deps.get_current_active_superuser), # <--- Chỉ Admin
):
    """
    Admin tạo nhân viên mới (Có thể set Role ADMIN, TECH, FARMER).
    """
    # Kiểm tra Email trùng
    if user_in.email:
        user = crud_user.get_user_by_email(db, email=user_in.email)
        if user:
            raise HTTPException(status_code=400, detail="Email này đã tồn tại trong hệ thống.")
            
    # Kiểm tra Username trùng
    user_by_name = crud_user.get_user_by_username(db, username=user_in.username)
    if user_by_name:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại.")

    user = crud_user.create_user(db, user=user_in)
    return user

# --- 3. ĐĂNG KÝ TỰ DO (OPTIONAL) ---
# Nếu hệ thống của bạn là nội bộ (Farm), bạn có thể bỏ API này đi 
# hoặc giữ lại để test nhanh (nhưng ai biết API này cũng tạo được user).
@router.post("/register", response_model=schemas.User)
def register(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
):
    user = crud_user.get_user_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác."
        )
    user = crud_user.create_user(db, user=user_in)
    return user

# --- 4. CẬP NHẬT HỒ SƠ CÁ NHÂN (SELF UPDATE) ---
# Đây là API user tự sửa tên/pass/email của mình
@router.put("/me", response_model=schemas.User)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserUpdate, # Nhận JSON Body theo Schema UserUpdate
    current_user: UserModel = Depends(deps.get_current_active_user), # Ai login cũng được
):
    """
    User tự cập nhật thông tin (Password, Email, Fullname).
    """
    # Hàm crud.update_user cần xử lý việc hash password nếu người dùng gửi password mới lên
    user = crud_user.update_user(db, db_user=current_user, user_in=user_in)
    return user

@router.put("/{target_user_id}/toggle-lock")
def toggle_user_lock(target_user_id: int, db: Session = Depends(deps.get_db)):
    """
    API dành cho Admin: Nhấn 1 lần để Khóa, nhấn lại để Mở Khóa
    """
    user = db.query(models.User).filter(models.User.user_id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    
    # Không cho phép tự khóa chính quyền Admin của mình (Chống tự hủy)
    if user.role == models.UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Không thể khóa tài khoản Admin tối cao!")

    # Đảo ngược trạng thái khóa (Đang khóa -> Mở, Đang mở -> Khóa)
    user.is_locked = not user.is_locked
    
    # ĐIỂM TINH TẾ: Nếu là "Mở khóa", ta phải reset số lần sai về 0 để họ đăng nhập lại
    if not user.is_locked:
        user.failed_login_attempts = 0

    db.commit()
    
    status_msg = "Đã KHÓA" if user.is_locked else "Đã MỞ KHÓA"
    return {"message": f"{status_msg} tài khoản {user.username} thành công!"}
# from typing import Any, List
# from fastapi import APIRouter, Body, Depends, HTTPException
# from sqlalchemy.orm import Session

# from api import deps
# from crud import user as crud_user

# # --- KHẮC PHỤC LỖI TẠI ĐÂY: IMPORT RÕ RÀNG ---

# # 1. Import Schema (Pydantic) -> Dùng cho response_model (Trả về JSON)
# from schemas import user as schemas_user
# from schemas.user import UserUpdate

# # 2. Import Model (SQLAlchemy) -> Dùng cho tương tác Database
# from models.models import User as UserModel 

# router = APIRouter()

# # --- 1. LẤY DANH SÁCH USER (ADMIN ONLY) ---
# @router.get("/", response_model=List[schemas_user.User]) # Dùng Schema
# def read_users(
#     skip: int = 0,
#     limit: int = 100,
#     db: Session = Depends(deps.get_db),
#     current_user: UserModel = Depends(deps.get_current_active_superuser), # Dùng Model DB
# ):
#     """
#     Retrieve users.
#     """
#     users = crud_user.get_users(db, skip=skip, limit=limit)
#     return users

# # --- 2. TẠO USER MỚI (ADMIN ONLY) ---
# @router.post("/", response_model=schemas_user.User) # Dùng Schema
# def create_user(
#     *,
#     db: Session = Depends(deps.get_db),
#     user_in: schemas_user.UserCreate,
#     current_user: UserModel = Depends(deps.get_current_active_superuser), # Dùng Model DB
# ):
#     """
#     Create new user.
#     """
#     user = crud_user.get_user_by_email(db, email=user_in.email)
#     if user:
#         raise HTTPException(
#             status_code=400,
#             detail="The user with this username already exists in the system.",
#         )
#     user = crud_user.create_user(db, user=user_in)
#     return user

# # --- 3. ĐĂNG KÝ USER MỚI (PUBLIC - DÙNG CHO NÚT THÊM USER CỦA BẠN) ---
# # Lưu ý: Endpoint này thường trùng logic với cái trên, 
# # nhưng bạn đang gọi /register từ Frontend nên giữ lại.
# @router.post("/register", response_model=schemas_user.User)
# def register(
#     *,
#     db: Session = Depends(deps.get_db),
#     user_in: schemas_user.UserCreate,
# ):
#     user = crud_user.get_user_by_username(db, username=user_in.username)
#     if user:
#         raise HTTPException(
#             status_code=400,
#             detail="Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác."
#         )
#     user = crud_user.create_user(db, user=user_in)
#     return user

# # --- 4. CẬP NHẬT THÔNG TIN CÁ NHÂN (SELF UPDATE) ---
# @router.put("/me", response_model=schemas_user.User) # <--- LỖI CŨ CỦA BẠN Ở ĐÂY (Đã sửa thành Schema)
# def update_user_me(
#     *,
#     db: Session = Depends(deps.get_db),
#     password: str = Body(None),
#     full_name: str = Body(None),
#     email: str = Body(None),
#     current_user: UserModel = Depends(deps.get_current_user), # Dùng Model DB
# ):
#     """
#     Update own user.
#     """
#     current_user_data = schemas_user.UserUpdate(
#         password=password,
#         full_name=full_name,
#         email=email
#     )
#     user = crud_user.update_user(db, db_user=current_user, user_in=current_user_data)
#     return user
# from fastapi import APIRouter, Depends, HTTPException, Body
# from sqlalchemy.orm import Session
# from typing import List
# from api import deps
# from db.session import get_db
# from crud import user as crud_user
# from schemas import user as schemas_user
# from schemas.user import UserUpdate
# from models.models import User
# router = APIRouter()

# # --- API LẤY DANH SÁCH USER ---
# @router.get("/", response_model=List[schemas_user.UserResponse])
# def read_users(
#     skip: int = 0, 
#     limit: int = 100, 
#     db: Session = Depends(deps.get_db),
#     current_user = Depends(deps.get_current_active_superuser) # <--- CHỈ ADMIN MỚI GỌI ĐƯỢC
# ):
#     """
#     Lấy danh sách user (Chỉ Admin).
#     """
#     return crud_user.get_users(db, skip=skip, limit=limit)

# # --- API ĐĂNG KÝ ---
# @router.post("/register", response_model=schemas_user.UserResponse)
# def register(user_in: schemas_user.UserCreate, db: Session = Depends(get_db)):
#     # Kiểm tra trùng username
#     user = crud_user.get_user_by_username(db, username=user_in.username)
#     if user:
#         raise HTTPException(
#             status_code=400,
#             detail="Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác."
#         )
    
#     # Tạo user mới
#     user = crud_user.create_user(db, user=user_in)
#     return user
# @router.put("/me", response_model=User)
# def update_user_me(
#     *,
#     db: Session = Depends(deps.get_db),
#     password: str = Body(None),
#     full_name: str = Body(None),
#     email: str = Body(None),
#     current_user: User = Depends(deps.get_current_user),
# ):
#     """
#     Cập nhật thông tin cá nhân của người dùng hiện tại
#     """
#     user_in = UserUpdate(password=password, full_name=full_name, email=email)
#     user = crud_user.user.update_user(db, db_user=current_user, user_in=user_in)
#     return user