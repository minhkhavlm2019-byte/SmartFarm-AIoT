from pydantic import BaseModel
import random
from fastapi import APIRouter, Depends, HTTPException, Body
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Import các module của dự án
from db.session import SessionLocal
from core import security
from core.config import settings
from crud import user as crud_user 
from models import models
from core.email_service import send_otp_email

from api import deps
# --- 1. KHAI BÁO SCHEMA ---
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

router = APIRouter()
# Bộ nhớ tạm lưu OTP (Trong thực tế có thể lưu vào DB hoặc Redis)
OTP_STORE = {}

# --- 2. API YÊU CẦU QUÊN MẬT KHẨU ---
@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(deps.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    
    if not user:
        return {"message": "Nếu email tồn tại, hệ thống đã gửi mã OTP."}
    
    # Tạo mã OTP 6 số ngẫu nhiên
    otp = str(random.randint(100000, 999999))
    
    OTP_STORE[req.email] = {
        "otp": otp,
        "expires": datetime.now() + timedelta(minutes=5)
    }
    
    # 2. GỌI HÀM GỬI MAIL VÀO ĐÂY (Thay cho đoạn print mô phỏng cũ)
    send_otp_email(req.email, otp)
    
    return {"message": "Nếu email tồn tại, hệ thống đã gửi mã OTP."}

# --- 3. API ĐẶT LẠI MẬT KHẨU MỚI ---
@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(deps.get_db)):
    # Kiểm tra OTP có tồn tại không
    record = OTP_STORE.get(req.email)
    
    if not record or record["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác.")
        
    if record["expires"] < datetime.now():
        del OTP_STORE[req.email] # Xóa OTP hết hạn
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn (quá 5 phút).")
    
    # Lấy user và đổi mật khẩu
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
    # Mã hóa mật khẩu mới (Giả sử bạn đã có hàm get_password_hash ở file security.py)
    from core.security import get_password_hash
    user.password_hash = get_password_hash(req.new_password)
    db.commit()
    
    # Đổi xong thì xóa OTP đi để không dùng lại được
    del OTP_STORE[req.email]
    
    return {"message": "Đổi mật khẩu thành công!"}