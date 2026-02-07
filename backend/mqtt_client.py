import paho.mqtt.client as mqtt
import json

# Cấu hình kết nối
MQTT_BROKER = "localhost" # Vì chạy trên máy tính cá nhân nên dùng localhost
MQTT_PORT = 1883
MQTT_TOPIC_SENSOR = "farm/+/data" # Dấu + là wildcard: nhận data từ mọi nông trại

# Hàm chạy khi kết nối thành công
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Kết nối MQTT thành công!")
        # Đăng ký nhận tin nhắn từ topic cảm biến
        client.subscribe(MQTT_TOPIC_SENSOR)
        print(f"Đang lắng nghe topic: {MQTT_TOPIC_SENSOR}")
    else:
        print(f"Kết nối thất bại, mã lỗi: {rc}")

# Hàm chạy khi có tin nhắn mới gửi đến
def on_message(client, userdata, msg):
    try:
        # Giải mã tin nhắn
        payload = msg.payload.decode("utf-8")
        topic = msg.topic
        print(f"NHẬN DATA [{topic}]: {payload}")
        
        # Ở đây sau này sẽ viết code lưu vào Database
        # data = json.loads(payload)
        # save_to_db(data)
        
    except Exception as e:
        print(f"Lỗi xử lý tin nhắn: {e}")

# Hàm khởi tạo client
def start_mqtt():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start() # Chạy ngầm trong một luồng riêng (Non-blocking)
        return client
    except Exception as e:
        print(f"Không thể kết nối MQTT Broker: {e}")
        return None