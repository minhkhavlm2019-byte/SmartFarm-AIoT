from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from db.session import SessionLocal
from core.config import settings
from crud import user as crud_user
from models.models import User
# Import Enum Role để so sánh cho chuẩn
from schemas.user import UserRole 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/login/access-token")

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

# --- 1. HÀM HELPER: CHUẨN HÓA ROLE ---
# Giúp xử lý mọi trường hợp Enum, String, viết hoa/thường
def _normalize_role(role_data) -> str:
    if not role_data:
        return ""
    
    # Lấy giá trị chuỗi từ các dạng Enum khác nhau
    if hasattr(role_data, "value"):
        role_str = str(role_data.value)
    elif hasattr(role_data, "name"):
        role_str = str(role_data.name)
    else:
        role_str = str(role_data)
    
    # Chuẩn hóa: Viết hoa, cắt khoảng trắng, lấy phần sau dấu chấm (nếu có)
    role_final = role_str.upper().strip()
    if "." in role_final:
        role_final = role_final.split(".")[-1]
        
    return role_final

# --- 2. LẤY USER HIỆN TẠI TỪ TOKEN (CƠ BẢN) ---
def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = crud_user.get_user(db, user_id=int(user_id))
    if user is None:
        raise credentials_exception
    return user

# --- 3. QUYỀN ADMIN (CHỈ ADMIN MỚI ĐƯỢC VÀO) ---
def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    role = _normalize_role(current_user.role)
    print(f"🔍 Check Admin: User='{current_user.username}', Role='{role}'")

    if role != "ADMIN":
        raise HTTPException(
            status_code=403, 
            detail="Quyền hạn không đủ. Yêu cầu quyền Quản trị viên (ADMIN)."
        )
    return current_user

# --- 4. QUYỀN KỸ THUẬT (ADMIN HOẶC TECH ĐỀU ĐƯỢC) ---
# Dùng cho các API điều khiển thiết bị, cấu hình Zone
def get_current_tech_user(
    current_user: User = Depends(get_current_user),
) -> User:
    role = _normalize_role(current_user.role)
    
    # Cho phép nếu là ADMIN hoặc TECH
    allowed_roles = ["ADMIN", "TECH"]
    
    if role not in allowed_roles:
        raise HTTPException(
            status_code=403, 
            detail="Quyền hạn không đủ. Yêu cầu quyền Kỹ thuật (TECH) hoặc Quản trị (ADMIN)."
        )
    return current_user

# --- 5. QUYỀN NÔNG DÂN (AI CŨNG VÀO ĐƯỢC MIỄN LÀ ĐÃ LOGIN) ---
# Dùng cho xem Dashboard, xem lịch sử (Read-only)
def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Tài khoản đã bị khóa.")
    return current_user
# from typing import Generator, Optional
# from fastapi import Depends, HTTPException, status
# from fastapi.security import OAuth2PasswordBearer
# from jose import jwt, JWTError
# from sqlalchemy.orm import Session

# from db.session import SessionLocal
# from core.config import settings
# from crud import user as crud_user
# from models.models import User

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/login/access-token")

# def get_db() -> Generator:
#     try:
#         db = SessionLocal()
#         yield db
#     finally:
#         db.close()

# # 1. Hàm lấy User hiện tại từ Token
# def get_current_user(
#     db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
# ) -> User:
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
#         user_id: str = payload.get("sub")
#         if user_id is None:
#             raise credentials_exception
#     except JWTError:
#         raise credentials_exception
    
#     user = crud_user.get_user(db, user_id=int(user_id))
#     if user is None:
#         raise credentials_exception
#     return user

# # 2. Hàm kiểm tra quyền ADMIN (Quan trọng)
# def get_current_active_superuser(
#     current_user: User = Depends(get_current_user),
# ) -> User:
#     print(f"🔍 DEBUG CHECK QUYỀN: User='{current_user.username}', Role='{current_user.role}'")

#     if not current_user.role:
#         raise HTTPException(status_code=403, detail="Tài khoản chưa được phân quyền.")

#     # --- ĐOẠN CODE SỬA LỖI Ở ĐÂY ---
#     # 1. Nếu role là Enum (có thuộc tính .value), lấy giá trị thực của nó
#     if hasattr(current_user.role, "value"):
#         role_str = str(current_user.role.value)
#     # 2. Nếu role là Enum dạng chuỗi (UserRole.ADMIN), lấy tên của nó
#     elif hasattr(current_user.role, "name"):
#         role_str = str(current_user.role.name)
#     # 3. Nếu là chuỗi thông thường
#     else:
#         role_str = str(current_user.role)

#     # Chuẩn hóa: Viết hoa, cắt khoảng trắng
#     role_chuan_hoa = role_str.upper().strip()

#     # Xử lý trường hợp đặc biệt: Nếu chuỗi vẫn là "USERROLE.ADMIN" -> Cắt lấy phần sau dấu chấm
#     if "." in role_chuan_hoa:
#         role_chuan_hoa = role_chuan_hoa.split(".")[-1] # Lấy "ADMIN"

#     print(f"✅ Role sau khi xử lý: '{role_chuan_hoa}'")

#     if role_chuan_hoa != "ADMIN":
#         raise HTTPException(
#             status_code=403, 
#             detail="Bạn không có quyền thực hiện thao tác này (Chỉ dành cho Admin)"
#         )
    
#     return current_user
# def get_current_active_superuser(
#     current_user: User = Depends(get_current_user),
# ) -> User:
#     # Nếu role không phải ADMIN -> Báo lỗi 403 Forbidden
#     # Lưu ý: Sửa so sánh tùy theo enum hoặc string trong DB của bạn
#     if str(current_user.role).upper() != "ADMIN": 
#         raise HTTPException(
#             status_code=403, detail="Bạn không có quyền thực hiện thao tác này (Chỉ dành cho Admin)"
#         )
#     return current_user