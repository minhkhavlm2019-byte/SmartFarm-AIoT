import paho.mqtt.client as mqtt
from core.config import settings
from core.security import decrypt_payload
import json

# Hàm gọi khi kết nối thành công
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"Đã kết nối MQTT Broker: {settings.MQTT_BROKER}")
        # Subscribe vào topic cảm biến
        client.subscribe(settings.MQTT_TOPIC_SENSOR)
        print(f"Đang lắng nghe: {settings.MQTT_TOPIC_SENSOR}")
    else:
        print(f"Kết nối thất bại, mã lỗi: {rc}")

# Hàm gọi khi nhận tin nhắn
def on_message(client, userdata, msg):
    try:
        print(f"\nNhận tin từ {msg.topic}")
        payload_str = msg.payload.decode('utf-8')
        
        # 1. Parse JSON vỏ bọc: {"data": "Base64_String..."}
        payload_json = json.loads(payload_str)
        
        if "data" in payload_json:
            encrypted_data = payload_json["data"]
            print(f"Dữ liệu mã hóa: {encrypted_data}")
            
            # 2. Gọi hàm giải mã từ security.py
            real_data = decrypt_payload(encrypted_data)
            
            if real_data:
                print(f"Dữ liệu giải mã: {real_data}")
                # Ví dụ: real_data = {'temp': 32.5, 'hum_air': 60, 'hum_soil': 40}
                # Tại đây bạn sẽ gọi service để lưu vào DB (sẽ làm sau)
            else:
                print("Giải mã thất bại!")
        else:
            print(f" Dữ liệu không đúng định dạng bảo mật: {payload_str}")

    except Exception as e:
        print(f"Lỗi xử lý tin nhắn: {e}")

# Khởi tạo Client
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

# Hàm khởi chạy MQTT (Sẽ được gọi bên main.py)
def start_mqtt():
    if settings.MQTT_USER and settings.MQTT_PASS:
        client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASS)
    
    try:
        client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
        client.loop_start() # Chạy luồng ngầm (Non-blocking)
    except Exception as e:
        print(f"Không thể kết nối MQTT: {e}")