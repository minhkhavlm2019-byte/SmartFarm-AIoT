import os
from dotenv import load_dotenv

# 1. Load nội dung từ file .env vào biến môi trường
load_dotenv()

class Settings:
    # --- THÔNG TIN DỰ ÁN ---
    PROJECT_NAME: str = "Smart Farm AIoT"
    API_V1_STR: str = "/api/v1"

    # --- DATABASE ---
    # Ưu tiên lấy từ .env (MySQL). 
    # Nếu .env không có hoặc lỗi, fallback về SQLite để hệ thống luôn chạy được.
    # LƯU Ý: Nếu bạn chưa cài MySQL, hãy xóa dòng DATABASE_URL trong file .env
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smart_farm.db")

    # --- BẢO MẬT (SECURITY) ---
    SECRET_KEY: str = os.getenv("SECRET_KEY", "Mat_Ma_Mac_Dinh_Neu_Khong_Co_Env")
    ALGORITHM: str = "HS256"
    # AES Key: Phải ép kiểu sang bytes để thư viện mã hóa hiểu
    # Nếu trong .env ngắn hơn 16 ký tự sẽ gây lỗi, nên cẩn thận
    AES_KEY: bytes = os.getenv("AES_KEY", "DoanTotNghiep202").encode('utf-8')

    # Cấu hình Token Login
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FIRST_SUPERUSER: str = "admin"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"

    # --- MQTT CONFIGURATION ---
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "broker.hivemq.com")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", 1883)) # Ép kiểu sang int
    MQTT_USER: str = os.getenv("MQTT_USER", "")
    MQTT_PASS: str = os.getenv("MQTT_PASS", "")

    # --- MQTT TOPICS ---
    MQTT_TOPIC_SENSOR: str = os.getenv("MQTT_TOPIC_SENSOR", "k19/doan_tot_nghiep/project_xalach/sensor")
    
    # [QUAN TRỌNG] 
    # Trong code API (Python) và Firmware (C++) chúng ta dùng khái niệm "CONTROL" (Điều khiển chung)
    # Nhưng trong .env bạn đặt là "MQTT_TOPIC_PUMP".
    # Dòng dưới đây sẽ lấy giá trị PUMP trong .env gán cho biến CONTROL.
    MQTT_TOPIC_CONTROL: str = os.getenv("MQTT_TOPIC_PUMP", "k19/doan_tot_nghiep/project_xalach/control")

settings = Settings()
# import os
# from dotenv import load_dotenv

# # Load file .env ngay khi file này được import
# load_dotenv()

# class Settings:
#     # Lấy thông tin từ .env
#     API_V1_STR: str = "/api/v1"
#     DATABASE_URL: str = "sqlite:///./smart_farm.db"
#     PROJECT_NAME: str = "Smart Farm AIoT"
    
#     # Bảo mật
#     SECRET_KEY: str = os.getenv("SECRET_KEY", "default_secret")
#     # QUAN TRỌNG: Ép kiểu sang bytes để dùng cho hàm mã hóa
#     AES_KEY: bytes = os.getenv("AES_KEY", "DoanTotNghiep202").encode('utf-8')

#     # MQTT
#     MQTT_BROKER: str = os.getenv("MQTT_BROKER", "broker.hivemq.com")
#     MQTT_PORT: int = int(os.getenv("MQTT_PORT", 1883))
#     MQTT_USER: str = os.getenv("MQTT_USER", "")
#     MQTT_PASS: str = os.getenv("MQTT_PASS", "")
    
#     MQTT_TOPIC_SENSOR: str = os.getenv("MQTT_TOPIC_SENSOR", "farm/sensor")
#     MQTT_TOPIC_PUMP: str = os.getenv("MQTT_TOPIC_PUMP", "farm/pump")
#     # FIRST_SUPERUSER: str = os.getenv("FIRST_SUPERUSER", "admin")
#     # FIRST_SUPERUSER_PASSWORD: str = os.getenv("FIRST_SUPERUSER_PASSWORD", "1a2b3c4d5e6f")
#     # Cấu hình Admin mặc định
#     FIRST_SUPERUSER: str = "admin"
#     FIRST_SUPERUSER_PASSWORD: str = "admin123" # Mật khẩu mặc định
#     ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

# settings = Settings()