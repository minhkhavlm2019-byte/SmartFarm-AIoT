import base64
import json
from Crypto.Cipher import AES
from core.config import settings # <--- Import settings từ file config
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from passlib.context import CryptContext # Cần cài: pip install passlib bcrypt
from core.config import settings
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import json

def decrypt_payload(encrypted_base64: str) -> dict:
    """
    Hàm giải mã dữ liệu từ ESP32 gửi lên
    Input: Chuỗi Base64 (Ví dụ: "8J+SglRlbXA9MzIuNS4uLg==")
    Output: Dictionary Python (Ví dụ: {"temp": 32, "hum": 80})
    """
    try:
        # 1. Decode Base64 về dạng bytes
        encrypted_bytes = base64.b64decode(encrypted_base64)

        # 2. Khởi tạo bộ giải mã AES (Mode ECB giống ESP32)
        cipher = AES.new(settings.AES_KEY, AES.MODE_ECB)

        # 3. Giải mã
        decrypted_padded = cipher.decrypt(encrypted_bytes)

        # 4. Xử lý Padding (ESP32 dùng Zero Padding)
        # Loại bỏ các ký tự null (\x00) ở cuối chuỗi
        decrypted_bytes = decrypted_padded.rstrip(b'\x00')

        # 5. Chuyển thành chuỗi JSON và parse thành Dict
        json_str = decrypted_bytes.decode('utf-8')
        
        # Xử lý trường hợp chuỗi JSON bị lỗi dư ký tự rác (nếu có)
        json_str = json_str.strip() 
        
        return json.loads(json_str)

    except Exception as e:
        print(f"Lỗi giải mã: {e}")
        return None
    
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """Kiểm tra mật khẩu nhập vào có khớp với DB không"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Băm mật khẩu trước khi lưu vào DB"""
    return pwd_context.hash(password)

# --- PHẦN 2: JWT TOKEN (ĐĂNG NHẬP) ---
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt