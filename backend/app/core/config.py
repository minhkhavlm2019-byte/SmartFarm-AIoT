import os
from dotenv import load_dotenv

# Load file .env ngay khi file này được import
load_dotenv()

class Settings:
    # Lấy thông tin từ .env
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./smart_farm.db"
    PROJECT_NAME: str = "Smart Farm AIoT"
    
    # Bảo mật
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default_secret")
    # QUAN TRỌNG: Ép kiểu sang bytes để dùng cho hàm mã hóa
    AES_KEY: bytes = os.getenv("AES_KEY", "DoanTotNghiep202").encode('utf-8')

    # MQTT
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "broker.hivemq.com")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", 1883))
    MQTT_USER: str = os.getenv("MQTT_USER", "")
    MQTT_PASS: str = os.getenv("MQTT_PASS", "")
    
    MQTT_TOPIC_SENSOR: str = os.getenv("MQTT_TOPIC_SENSOR", "farm/sensor")
    MQTT_TOPIC_PUMP: str = os.getenv("MQTT_TOPIC_PUMP", "farm/pump")
    # FIRST_SUPERUSER: str = os.getenv("FIRST_SUPERUSER", "admin")
    # FIRST_SUPERUSER_PASSWORD: str = os.getenv("FIRST_SUPERUSER_PASSWORD", "1a2b3c4d5e6f")
    # Cấu hình Admin mặc định
    FIRST_SUPERUSER: str = "admin"
    FIRST_SUPERUSER_PASSWORD: str = "admin123" # Mật khẩu mặc định
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

settings = Settings()