import json
import paho.mqtt.client as mqtt
from sqlalchemy.orm import Session

# Import cấu hình
from core.config import settings
from core.security import decrypt_payload
from db.session import SessionLocal
from crud import device as crud_device
from schemas import device as schemas

# 1. Khởi tạo Client MQTT
client = mqtt.Client()

# 2. Callback khi kết nối thành công
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ [MQTT] Đã kết nối Broker: {settings.MQTT_BROKER}")
        # Subscribe vào topic Sensor
        client.subscribe(settings.MQTT_TOPIC_SENSOR)
        print(f"📡 [MQTT] Đang lắng nghe: {settings.MQTT_TOPIC_SENSOR}")
    else:
        print(f"❌ [MQTT] Lỗi kết nối, code: {rc}")

# 3. Callback khi nhận tin nhắn (QUAN TRỌNG NHẤT)
def on_message(client, userdata, msg):
    """
    Hàm này chạy mỗi khi Wokwi hoặc ESP32 gửi dữ liệu lên.
    """
    db: Session = SessionLocal()
    try:
        # A. Giải mã gói tin sang chuỗi
        payload_str = msg.payload.decode('utf-8')
        # print(f"📩 [RAW]: {payload_str}") # Bật lên nếu muốn debug

        try:
            data_json = json.loads(payload_str)
        except json.JSONDecodeError:
            print("⚠️ Lỗi JSON: Gói tin không đúng định dạng")
            return

        sensor_data = None
        device_id = "UNKNOWN"

        # --- TRƯỜNG HỢP 1: Dữ liệu từ Wokwi (JSON phẳng, không mã hóa) ---
        # Wokwi gửi: {"temp": 24, "hum_air": 40, "device_id": "..."}
        if "temp" in data_json and "device_id" in data_json:
            sensor_data = data_json
            device_id = data_json.get("device_id")
            # print("🔹 Nhận dữ liệu Wokwi (Không mã hóa)")

        # --- TRƯỜNG HỢP 2: Dữ liệu từ ESP32 thật (Có mã hóa AES) ---
        # ESP32 gửi: {"data": "chuỗi_mã_hóa_base64..."}
        elif "data" in data_json:
            decrypted = decrypt_payload(data_json["data"])
            if decrypted:
                sensor_data = decrypted
                device_id = decrypted.get("device_id", "UNKNOWN")
                print("🔐 Nhận dữ liệu AES (Đã giải mã)")
            else:
                print("❌ Giải mã AES thất bại")
                return
        
        else:
            print("⚠️ Gói tin thiếu trường dữ liệu quan trọng")
            return

        # --- LƯU VÀO DATABASE ---
        if sensor_data and device_id:
            try:
                # Map dữ liệu vào Schema (dùng .get để tránh lỗi nếu thiếu trường)
                sensor_input = schemas.SensorDataInput(
                    temp=float(sensor_data.get("temp", 0)),
                    hum_air=float(sensor_data.get("hum_air", 0)),
                    hum_soil=float(sensor_data.get("hum_soil", 0)),
                    light=float(sensor_data.get("light", 0))
                )

                # Gọi hàm CRUD để lưu
                crud_device.create_sensor_reading(db, sensor_input, device_id)
                print(f"💾 [DB] Saved: Dev={device_id} | T={sensor_input.temp} | H={sensor_input.hum_air}")

            except Exception as e:
                print(f"❌ Lỗi khi lưu vào DB: {e}")

    except Exception as e:
        print(f"❌ Lỗi hệ thống MQTT: {e}")
    finally:
        db.close() # Luôn đóng kết nối DB

# 4. Cấu hình & Kết nối
if settings.MQTT_USER and settings.MQTT_PASS:
    client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASS)

client.on_connect = on_connect
client.on_message = on_message

try:
    # Kết nối nhưng KHÔNG gọi loop_forever ở đây (main.py sẽ lo việc đó)
    client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
except Exception as e:
    print(f"❌ [CRITICAL] Không thể kết nối MQTT: {e}")


# 5. Hàm gửi lệnh (Dùng cho API điều khiển)
def publish_command(topic: str, message: str):
    """
    Gửi lệnh điều khiển xuống thiết bị (PUMP_ON, LIGHT_OFF...)
    """
    try:
        client.publish(topic, message)
        print(f"📤 [MQTT] Gửi lệnh: {message} -> {topic}")
        return True
    except Exception as e:
        print(f"❌ [MQTT] Lỗi gửi lệnh: {e}")
        return False
# import paho.mqtt.client as mqtt
# import json
# from sqlalchemy.orm import Session

# # Import các module cấu hình và xử lý dữ liệu
# from core.config import settings
# from core.security import decrypt_payload
# from db.session import SessionLocal
# from crud import device as crud_device
# from schemas import device as schemas

# # Khởi tạo Client toàn cục (Để các file khác có thể import biến này nếu cần)
# client = mqtt.Client()

# def on_connect(client, userdata, flags, rc):
#     """Callback khi kết nối thành công"""
#     if rc == 0:
#         print(f"✅ [MQTT] Đã kết nối Broker: {settings.MQTT_BROKER}")
#         # Subscribe vào topic Sensor để nhận dữ liệu
#         client.subscribe(settings.MQTT_TOPIC_SENSOR)
#         print(f"📡 Đang lắng nghe: {settings.MQTT_TOPIC_SENSOR}")
#     else:
#         print(f"❌ [MQTT] Lỗi kết nối, code: {rc}")
        
# def on_message(client, userdata, msg):
#     db: Session = SessionLocal()
#     try:
#         payload_str = msg.payload.decode('utf-8')
#         # print(f"DEBUG RECEIVE: {payload_str}") # Bật dòng này để xem dữ liệu thô
        
#         try:
#             payload_json = json.loads(payload_str)
#         except json.JSONDecodeError:
#             print("⚠️ Gói tin không phải JSON")
#             return

#         sensor_data = {}
#         device_id = "UNKNOWN"

#         # TRƯỜNG HỢP 1: Gói tin đã mã hóa AES (Có trường "data")
#         if "data" in payload_json:
#             decrypted = decrypt_payload(payload_json["data"])
#             if decrypted:
#                 sensor_data = decrypted
#                 print("🔓 Giải mã AES thành công")
#             else:
#                 print("❌ Giải mã thất bại")
#                 return
        
#         # TRƯỜNG HỢP 2: Gói tin JSON thường (Chưa mã hóa - Dành cho Test/Wokwi)
#         # Nếu không có "data", ta thử đọc trực tiếp các trường temp, hum_air
#         elif "temp" in payload_json:
#             sensor_data = payload_json
#             print("⚠️ Nhận JSON thô (Chưa mã hóa)")
        
#         else:
#             print("⚠️ Gói tin không đúng định dạng (Thiếu temp hoặc data)")
#             return

#         # LƯU VÀO DB
#         if sensor_data:
#             try:
#                 # Map dữ liệu từ JSON sang Schema
#                 # Lưu ý: Cần đảm bảo tên trường khớp nhau (temp, hum_air...)
#                 sensor_input = schemas.SensorDataInput(**sensor_data)
#                 device_id = sensor_data.get("device_id", "UNKNOWN_DEV")
                
#                 crud_device.create_sensor_reading(db, sensor_input, device_id)
#                 print(f"💾 [DB] Đã lưu: Device={device_id} | Temp={sensor_input.temp}")
#             except Exception as e:
#                 print(f"❌ Lỗi lưu DB: {e}")

#     except Exception as e:
#         print(f"❌ Lỗi Hệ thống: {e}")
#     finally:
#         db.close()

# # có mã hóa
# # def on_message(client, userdata, msg):
# #     """
# #     Callback xử lý tin nhắn đến:
# #     Nhận -> Giải mã -> Lưu DB
# #     """
# #     db: Session = SessionLocal() # Tạo kết nối DB
# #     try:
# #         # 1. Nhận dữ liệu thô từ Broker
# #         payload_str = msg.payload.decode('utf-8')
        
# #         # 2. Parse JSON
# #         try:
# #             payload_json = json.loads(payload_str)
# #         except json.JSONDecodeError:
# #             print("⚠️ Gói tin không phải JSON hợp lệ")
# #             return

# #         # 3. Giải mã AES (Nếu có trường "data")
# #         if "data" in payload_json:
# #             decrypted_dict = decrypt_payload(payload_json["data"])
            
# #             if decrypted_dict:
# #                 # 4. Validate dữ liệu và Lưu vào Database
# #                 try:
# #                     sensor_input = schemas.SensorDataInput(**decrypted_dict)
# #                     device_id = decrypted_dict.get("device_id", "UNKNOWN_DEV")
                    
# #                     crud_device.create_sensor_reading(db, sensor_input, device_id)
# #                     print(f"💾 [DB] Đã lưu: Device={device_id} | Temp={sensor_input.temp}°C")

# #                 except Exception as e:
# #                     print(f"❌ [Lỗi Dữ liệu] Không thể lưu vào DB: {e}")
# #             else:
# #                 print("⚠️ Giải mã thất bại (Sai Key hoặc dữ liệu bị lỗi)")
# #         else:
# #             print("⚠️ Gói tin thiếu trường 'data' (Chưa mã hóa?)")

# #     except Exception as e:
# #         print(f"❌ [Lỗi Hệ thống] {e}")
# #     finally:
# #         db.close()

# # --- CẤU HÌNH CLIENT ---

# if settings.MQTT_USER and settings.MQTT_PASS:
#     client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASS)

# client.on_connect = on_connect
# client.on_message = on_message

# # Kết nối ban đầu
# try:
#     client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
# except Exception as e:
#     print(f"❌ [CRITICAL] Không thể kết nối MQTT Broker: {e}")


# # --- [QUAN TRỌNG] HÀM GỬI LỆNH (Đã khôi phục) ---
# def publish_command(topic: str, message: str):
#     """
#     Hàm này được gọi từ API (api/v1/endpoints/devices.py) 
#     để gửi lệnh điều khiển (Bật/Tắt) xuống ESP32.
#     """
#     if client and client.is_connected(): # Kiểm tra kết nối trước khi gửi
#         try:
#             client.publish(topic, message)
#             print(f"📤 [MQTT] Đã gửi lệnh '{message}' tới {topic}")
#             return True
#         except Exception as e:
#             print(f"❌ [MQTT] Lỗi khi gửi lệnh: {e}")
#             return False
#     else:
#         print("⚠️ [MQTT] Không thể gửi lệnh: Client chưa kết nối hoặc bị ngắt.")
#         return False
# import paho.mqtt.client as mqtt
# import json
# from sqlalchemy.orm import Session

# # Import các module cấu hình và xử lý dữ liệu
# from core.config import settings
# from core.security import decrypt_payload
# from db.session import SessionLocal
# from crud import device as crud_device
# from schemas import device as schemas

# # Khởi tạo Client (Để main.py có thể import và chạy)
# client = mqtt.Client()

# def on_connect(client, userdata, flags, rc):
#     """Callback khi kết nối thành công"""
#     if rc == 0:
#         print(f"✅ [MQTT] Đã kết nối Broker: {settings.MQTT_BROKER}")
#         # Subscribe vào topic Sensor để nhận dữ liệu
#         client.subscribe(settings.MQTT_TOPIC_SENSOR)
#         print(f"📡 Đang lắng nghe: {settings.MQTT_TOPIC_SENSOR}")
#     else:
#         print(f"❌ [MQTT] Lỗi kết nối, code: {rc}")

# def on_message(client, userdata, msg):
#     """
#     Callback xử lý tin nhắn đến:
#     Nhận -> Giải mã -> Lưu DB
#     """
#     db: Session = SessionLocal() # Tạo kết nối DB
#     try:
#         # 1. Nhận dữ liệu thô từ Broker
#         payload_str = msg.payload.decode('utf-8')
#         # print(f"📩 [RAW]: {payload_str}") # Bỏ comment nếu muốn debug tin nhắn gốc
        
#         # 2. Parse JSON
#         try:
#             payload_json = json.loads(payload_str)
#         except json.JSONDecodeError:
#             print("⚠️ Gói tin không phải JSON hợp lệ")
#             return

#         # 3. Giải mã AES (Nếu có trường "data")
#         if "data" in payload_json:
#             decrypted_dict = decrypt_payload(payload_json["data"])
            
#             if decrypted_dict:
#                 # print(f"🔓 [AES] Giải mã: {decrypted_dict}")
                
#                 # 4. Validate dữ liệu và Lưu vào Database
#                 try:
#                     # Kiểm tra dữ liệu có đúng chuẩn không (temp, hum_air...)
#                     sensor_input = schemas.SensorDataInput(**decrypted_dict)
                    
#                     # Lấy ID thiết bị (nếu không có thì gán mặc định UNKNOWN)
#                     device_id = decrypted_dict.get("device_id", "UNKNOWN_DEV")
                    
#                     # Gọi hàm CRUD để lưu vào bảng sensor_data
#                     crud_device.create_sensor_reading(db, sensor_input, device_id)
                    
#                     print(f"💾 [DB] Đã lưu: Device={device_id} | Temp={sensor_input.temp}°C")

#                 except Exception as e:
#                     print(f"❌ [Lỗi Dữ liệu] Không thể lưu vào DB: {e}")
#             else:
#                 print("⚠️ Giải mã thất bại (Sai Key hoặc dữ liệu bị lỗi)")
#         else:
#             print("⚠️ Gói tin thiếu trường 'data' (Chưa mã hóa?)")

#     except Exception as e:
#         print(f"❌ [Lỗi Hệ thống] {e}")
#     finally:
#         db.close() # Luôn đóng kết nối DB sau khi xử lý xong

# # --- CẤU HÌNH CLIENT ---

# # Nếu có User/Pass trong .env thì set vào
# if settings.MQTT_USER and settings.MQTT_PASS:
#     client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASS)

# # Gán các hàm callback
# client.on_connect = on_connect
# client.on_message = on_message

# # Kết nối ban đầu (Việc lặp/loop sẽ do main.py quản lý)
# try:
#     client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
# except Exception as e:
#     print(f"❌ [CRITICAL] Không thể kết nối MQTT Broker: {e}")