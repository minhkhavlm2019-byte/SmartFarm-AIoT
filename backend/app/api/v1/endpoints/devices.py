import json
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api import deps
from crud import device as crud
from schemas import device as schemas
from models import models
from services.mqtt_service import publish_command
from core.config import settings

router = APIRouter()

# 👇 FIX 2: Thêm Schema để hứng JSON Body từ Frontend gửi lên
class ControlCommand(BaseModel):
    command: str

# ================= 1. API LẤY THÔNG TIN (GET) =================

@router.get("/")
def read_devices(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user) # Ai login rồi đều xem được
):
    """
    Lấy danh sách tất cả thiết bị KÈM THEO dữ liệu cảm biến mới nhất.
    """
    devices = crud.get_devices(db, skip=skip, limit=limit)
    
    result = []
    for dev in devices:
        # 👇 FIX 1: Lấy bản ghi SensorData mới nhất của thiết bị này
        latest_sensor = db.query(models.SensorData)\
            .filter(models.SensorData.device_id == dev.device_id)\
            .order_by(models.SensorData.timestamp.desc())\
            .first()
            
        # Gộp thông tin thiết bị và thông số môi trường vào 1 JSON phẳng
        device_data = {
            "device_id": dev.device_id,
            "name": dev.name,
            "zone_id": dev.zone_id,
            "status": dev.status.value if dev.status else "OFFLINE",
            "last_seen": dev.last_seen,
            "fw_version": dev.fw_version,
            
            # Nếu có dữ liệu thì gắn vào, không thì trả về None (Frontend sẽ hiện '--')
            "temp": latest_sensor.temp if latest_sensor else None,
            "hum_soil": latest_sensor.hum_soil if latest_sensor else None,
            "hum_air": latest_sensor.hum_air if latest_sensor else None,
        }
        result.append(device_data)
        
    return result

@router.get("/{device_id}", response_model=schemas.DeviceResponse)
def read_device(
    device_id: str, 
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user)
):
    """Xem chi tiết 1 thiết bị."""
    db_device = crud.get_device(db, device_id=device_id)
    if db_device is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    return db_device

@router.get("/{device_id}/history", response_model=List[schemas.SensorDataResponse])
def read_sensor_history(
    device_id: str, 
    limit: int = 20, 
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user)
):
    """Lấy dữ liệu lịch sử để vẽ biểu đồ."""
    history = crud.get_sensor_history(db, device_id=device_id, limit=limit)
    if not history:
        return []
    return history

# ================= 2. API CẬP NHẬT / TẠO MỚI =================

@router.post("/", response_model=schemas.DeviceResponse)
def create_device(
    device_in: schemas.DeviceCreate, 
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_superuser) # Chỉ ADMIN
):
    """Tạo thiết bị mới."""
    existing_device = crud.get_device(db, device_id=device_in.device_id)
    if existing_device:
        raise HTTPException(status_code=400, detail="Device ID này đã tồn tại!")
    
    return crud.create_device(db=db, device=device_in)

@router.put("/{device_id}", response_model=schemas.DeviceResponse)
def update_device(
    device_id: str, 
    device_in: schemas.DeviceUpdate, 
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_tech_user) # ADMIN hoặc TECH
):
    """Đổi tên hoặc chuyển Zone cho thiết bị."""
    device = crud.update_device(db, device_id, device_in)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

# ================= 3. API ĐIỀU KHIỂN (CONTROL) =================

@router.post("/{device_id}/control")
def control_device(
    device_id: str,
    payload: ControlCommand, # 👇 FIX 2: Hứng JSON Body
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user) # 👇 FIX 3: Cho phép Farmer điều khiển
) -> Any:
    """
    Điều khiển thiết bị qua MQTT.
    """
    action = payload.command # Lấy chữ PUMP_ON ra từ JSON
    
    # 1. Kiểm tra thiết bị có tồn tại không
    db_device = crud.get_device(db, device_id=device_id)
    if not db_device:
        raise HTTPException(status_code=404, detail=f"Thiết bị '{device_id}' không tồn tại.")

    # 2. Mapping lệnh sang JSON cho ESP32
    mqtt_cmd = {}
    
    if action == "PUMP_ON":
        mqtt_cmd = {"device": "PUMP", "status": "ON"}
    elif action == "PUMP_OFF":
        mqtt_cmd = {"device": "PUMP", "status": "OFF"}
    elif action == "MIST_ON":
        mqtt_cmd = {"device": "MIST", "status": "ON"}
    elif action == "MIST_OFF":
        mqtt_cmd = {"device": "MIST", "status": "OFF"}
    elif action == "LIGHT_ON":
        mqtt_cmd = {"device": "LIGHT", "status": "ON"}
    elif action == "LIGHT_OFF":
        mqtt_cmd = {"device": "LIGHT", "status": "OFF"}
    elif action == "SYSTEM_REBOOT":
        mqtt_cmd = {"device": "SYSTEM", "status": "REBOOT"}
    else:
        mqtt_cmd = {"raw_action": action}

    # 3. Chuẩn bị Payload và Topic
    payload_str = json.dumps(mqtt_cmd)
    target_topic = getattr(settings, "MQTT_TOPIC_CONTROL", "k19/smartfarm/control")

    # 4. Gửi MQTT
    is_sent = publish_command(target_topic, payload_str)
    
    if not is_sent:
        raise HTTPException(status_code=503, detail="Lỗi kết nối MQTT Server.")

    # 5. Ghi log hành động
    try:
        # Ghi log lịch sử ai là người bấm nút
        crud.create_action_log(
            db=db,
            device_id=device_id,
            action=action,
            trigger="MANUAL", # Lưu theo ENUM là MANUAL
            reason=f"Điều khiển tay bởi {current_user.role}: {current_user.username}"
        )
    except Exception as e:
        print(f"⚠️ Warning: Không thể ghi log hành động: {e}")

    return {
        "status": "success",
        "message": f"Đã gửi lệnh {action}",
        "sent_payload": mqtt_cmd
    }
# import json
# from typing import Any, List
# from fastapi import APIRouter, Depends, HTTPException, Query
# from sqlalchemy.orm import Session

# from api import deps
# from crud import device as crud
# from schemas import device as schemas
# from services.mqtt_service import publish_command
# from core.config import settings

# router = APIRouter()

# # ================= 1. API LẤY THÔNG TIN (GET) =================

# @router.get("/", response_model=List[schemas.DeviceResponse])
# def read_devices(
#     skip: int = 0, 
#     limit: int = 100, 
#     db: Session = Depends(deps.get_db),
#     current_user = Depends(deps.get_current_active_user) # Ai login rồi đều xem được
# ):
#     """
#     Lấy danh sách tất cả thiết bị.
#     """
#     devices = crud.get_devices(db, skip=skip, limit=limit)
#     return devices

# @router.get("/sensors/latest")
# def read_latest_sensor_data(
#     db: Session = Depends(deps.get_db),
#     current_user = Depends(deps.get_current_active_user)
# ):
#     """
#     API trả về dữ liệu TỔNG QUAN (Trung bình cộng của tất cả thiết bị).
#     Dùng cho Dashboard.
#     """
#     devices = crud.get_devices(db)
    
#     total_temp = 0
#     total_hum = 0
#     count = 0
    
#     for dev in devices:
#         # Lấy bản ghi mới nhất của từng thiết bị
#         last_reading = crud.get_sensor_history(db, device_id=dev.device_id, limit=1)
#         if last_reading:
#             data = last_reading[0]
#             if data.temp is not None and data.hum_air is not None:
#                 total_temp += data.temp
#                 total_hum += data.hum_air
#                 count += 1
            
#     if count > 0:
#         return {
#             "temp": round(total_temp / count, 1),
#             "hum_air": round(total_hum / count, 1),
#             "online_count": count
#         }
    
#     return {
#         "temp": 0, 
#         "hum_air": 0, 
#         "online_count": 0
#     }

# @router.get("/{device_id}", response_model=schemas.DeviceResponse)
# def read_device(
#     device_id: str, 
#     db: Session = Depends(deps.get_db),
#     current_user = Depends(deps.get_current_active_user)
# ):
#     """
#     Xem chi tiết 1 thiết bị.
#     """
#     db_device = crud.get_device(db, device_id=device_id)
#     if db_device is None:
#         raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
#     return db_device

# @router.get("/{device_id}/history", response_model=List[schemas.SensorDataResponse])
# def read_sensor_history(
#     device_id: str, 
#     limit: int = 20, 
#     db: Session = Depends(deps.get_db),
#     current_user = Depends(deps.get_current_active_user)
# ):
#     """
#     Lấy dữ liệu lịch sử để vẽ biểu đồ.
#     """
#     history = crud.get_sensor_history(db, device_id=device_id, limit=limit)
#     if not history:
#         return []
#     return history

# # ================= 2. API CẬP NHẬT / TẠO MỚI =================

# @router.post("/", response_model=schemas.DeviceResponse)
# def create_device(
#     device_in: schemas.DeviceCreate, 
#     db: Session = Depends(deps.get_db),
#     current_user = Depends(deps.get_current_active_superuser) # Chỉ ADMIN mới được tạo
# ):
#     """
#     Tạo thiết bị mới.
#     """
#     existing_device = crud.get_device(db, device_id=device_in.device_id)
#     if existing_device:
#         raise HTTPException(status_code=400, detail="Device ID này đã tồn tại!")
    
#     return crud.create_device(db=db, device=device_in)

# @router.put("/{device_id}", response_model=schemas.DeviceResponse)
# def update_device(
#     device_id: str, 
#     device_in: schemas.DeviceUpdate, 
#     db: Session = Depends(deps.get_db),
#     current_user = Depends(deps.get_current_tech_user) # ADMIN hoặc TECH được sửa
# ):
#     """
#     Đổi tên hoặc chuyển Zone cho thiết bị.
#     """
#     device = crud.update_device(db, device_id, device_in)
#     if not device:
#         raise HTTPException(status_code=404, detail="Device not found")
#     return device

# # ================= 3. API ĐIỀU KHIỂN (CONTROL) =================

# @router.post("/{device_id}/control")
# def control_device(
#     device_id: str,
#     action: str = Query(..., description="PUMP_ON, PUMP_OFF, MIST_ON..."),
#     db: Session = Depends(deps.get_db),
#     current_user = Depends(deps.get_current_tech_user) # ADMIN hoặc TECH được điều khiển
# ) -> Any:
#     """
#     Điều khiển thiết bị qua MQTT.
#     """
#     # 1. Kiểm tra thiết bị có tồn tại không
#     db_device = crud.get_device(db, device_id=device_id)
#     if not db_device:
#         raise HTTPException(status_code=404, detail=f"Thiết bị '{device_id}' không tồn tại.")

#     # 2. Mapping lệnh sang JSON cho ESP32
#     mqtt_cmd = {}
    
#     if action == "PUMP_ON":
#         mqtt_cmd = {"device": "PUMP", "status": "ON"}
#     elif action == "PUMP_OFF":
#         mqtt_cmd = {"device": "PUMP", "status": "OFF"}
#     elif action == "MIST_ON":
#         mqtt_cmd = {"device": "MIST", "status": "ON"}
#     elif action == "MIST_OFF":
#         mqtt_cmd = {"device": "MIST", "status": "OFF"}
#     elif action == "LIGHT_ON":
#         mqtt_cmd = {"device": "LIGHT", "status": "ON"}
#     elif action == "LIGHT_OFF":
#         mqtt_cmd = {"device": "LIGHT", "status": "OFF"}
#     else:
#         # Fallback: Gửi lệnh thô nếu không khớp pattern trên
#         mqtt_cmd = {"raw_action": action}

#     # 3. Chuẩn bị Payload và Topic
#     payload_str = json.dumps(mqtt_cmd)
    
#     # Topic điều khiển: k19/smartfarm/control
#     # Đảm bảo settings.MQTT_TOPIC_CONTROL đã được định nghĩa trong .env hoặc config.py
#     # Nếu chưa có, dùng hardcode: target_topic = "k19/smartfarm/control"
#     target_topic = getattr(settings, "MQTT_TOPIC_CONTROL", "k19/smartfarm/control")

#     # 4. Gửi MQTT
#     is_sent = publish_command(target_topic, payload_str)
    
#     if not is_sent:
#         raise HTTPException(status_code=503, detail="Lỗi kết nối MQTT Server.")

#     # 5. Ghi log hành động (Optional)
#     try:
#         crud.create_action_log(
#             db=db,
#             device_id=device_id,
#             action=action,
#             trigger="APP_MANUAL",
#             reason=f"User {current_user.username} controlled via Dashboard"
#         )
#     except Exception as e:
#         print(f"⚠️ Warning: Không thể ghi log hành động: {e}")

#     return {
#         "status": "success",
#         "message": f"Đã gửi lệnh {action}",
#         "sent_payload": mqtt_cmd
#     }
# from typing import List, Any
# from fastapi import APIRouter, Depends, HTTPException, Query
# from sqlalchemy.orm import Session


# from db.session import SessionLocal
# from crud import device as crud
# from schemas import device as schemas

# # Import service MQTT và Config để gửi lệnh
# from services.mqtt_service import publish_command
# from core.config import settings

# router = APIRouter()

# # Dependency: Hàm lấy DB Session cho mỗi request
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# # ================= 1. API LẤY THÔNG TIN (GET) =================

# @router.get("/", response_model=List[schemas.DeviceResponse])
# def read_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
#     """
#     Lấy danh sách tất cả thiết bị đang có.
#     Dùng cho màn hình Home của App.
#     """
#     devices = crud.get_devices(db, skip=skip, limit=limit)
#     return devices
# import json
# @router.get("/sensors/latest")
# def read_latest_sensor_data(db: Session = Depends(get_db)):
#     """
#     API trả về dữ liệu TỔNG QUAN (Trung bình cộng của tất cả thiết bị).
#     Trả về Object {} để Frontend dễ hiển thị.
#     """
#     devices = crud.get_devices(db)
    
#     total_temp = 0
#     total_hum = 0
#     count = 0
    
#     for dev in devices:
#         # Lấy bản ghi mới nhất của từng thiết bị
#         # Lưu ý: Sửa dev.id thành dev.device_id cho đúng model
#         last_reading = crud.get_sensor_history(db, device_id=dev.device_id, limit=1)
#         if last_reading:
#             data = last_reading[0]
#             total_temp += data.temp
#             total_hum += data.hum_air
#             count += 1
            
#     if count > 0:
#         return {
#             "temp": round(total_temp / count, 1),   # Tính trung bình
#             "hum_air": round(total_hum / count, 1),
#             "online_count": count
#         }
    
#     # Nếu chưa có dữ liệu nào
#     return {
#         "temp": 0, 
#         "hum_air": 0, 
#         "online_count": 0
#     }
    
# @router.put("/{device_id}", response_model=schemas.DeviceResponse)
# def update_device(device_id: str, device_in: schemas.DeviceUpdate, db: Session = Depends(get_db)):
#     """
#     API để đổi tên thiết bị hoặc CHUYỂN ZONE.
#     Body: { "zone_id": 2 } -> Chuyển thiết bị sang Zone 2
#     """
#     device = crud.update_device(db, device_id, device_in)
#     if not device:
#         raise HTTPException(status_code=404, detail="Device not found")
#     return device

# @router.get("/{device_id}", response_model=schemas.DeviceResponse)
# def read_device(device_id: str, db: Session = Depends(get_db)):
#     """
#     Xem chi tiết 1 thiết bị cụ thể.
#     """
#     db_device = crud.get_device(db, device_id=device_id)
#     if db_device is None:
#         raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
#     return db_device

# @router.get("/{device_id}/history", response_model=List[schemas.SensorDataResponse])
# def read_sensor_history(device_id: str, limit: int = 20, db: Session = Depends(get_db)):
#     """
#     QUAN TRỌNG: API lấy dữ liệu để vẽ biểu đồ (Chart).
#     Mặc định lấy 20 điểm dữ liệu mới nhất.
#     """
#     history = crud.get_sensor_history(db, device_id=device_id, limit=limit)
#     if not history:
#         return []
#     return history

# # ================= 2. API ĐIỀU KHIỂN (POST) =================

# @router.post("/{device_id}/control")
# def control_device(
#     device_id: str,
#     action: str = Query(..., description="Lệnh điều khiển: PUMP_ON, PUMP_OFF, MIST_ON..."),
#     db: Session = Depends(get_db)
# ):
#     """
#     API gửi lệnh điều khiển xuống ESP32 qua MQTT.
#     Ví dụ: POST /devices/ESP32_WOKWI_01/control?action=PUMP_ON
#     """
#     # 1. (Tùy chọn) Kiểm tra xem thiết bị có tồn tại trong DB không
#     # db_device = crud.get_device(db, device_id=device_id)
#     # if not db_device:
#     #     raise HTTPException(status_code=404, detail="Thiết bị không tồn tại")

#     # 2. Gửi lệnh qua MQTT
#     # Chúng ta gửi vào Topic CONTROL chung đã cấu hình trong settings
#     # Nội dung gửi đi chính là chuỗi 'action' (VD: "PUMP_ON")
    
#     print(f"📡 API nhận lệnh: {action} -> Gửi tới topic: {settings.MQTT_TOPIC_CONTROL}")
    
#     success = publish_command(topic=settings.MQTT_TOPIC_CONTROL, message=action)

#     if success:
#         return {"status": "success", "message": f"Đã gửi lệnh {action} tới thiết bị"}
#     else:
#         raise HTTPException(status_code=500, detail="Lỗi kết nối MQTT, không gửi được lệnh")
# # @router.get("/sensors/latest")
# # def read_latest_sensor_data(db: Session = Depends(get_db)):
# #     """
# #     API lấy dữ liệu cảm biến mới nhất của TẤT CẢ thiết bị.
# #     Dùng cho Dashboard tổng quan.
# #     """
# #     # Lấy danh sách thiết bị
# #     devices = crud.get_devices(db)
# #     results = []
    
# #     for dev in devices:
# #         # Lấy 1 bản ghi mới nhất của thiết bị đó
# #         last_reading = crud.get_sensor_history(db, device_id=dev.id, limit=1)
# #         if last_reading:
# #             data = last_reading[0]
# #             results.append({
# #                 "device_id": dev.id,
# #                 "temp": data.temp,
# #                 "hum_air": data.hum_air,
# #                 "hum_soil": data.hum_soil,
# #                 "ts": data.ts
# #             })
    
# #     # Nếu chỉ có 1 thiết bị test, trả về object trực tiếp để Frontend dễ xử lý
# #     # (Tùy logic frontend của bạn, ở đây mình trả về list)
# #     return results
# # ================= API ĐIỀU KHIỂN THIẾT BỊ (FULL) =================
# @router.post("/", response_model=schemas.DeviceResponse)
# def create_device(
#     device_in: schemas.DeviceCreate, 
#     db: Session = Depends(get_db)
# ):
#     """
#     API tạo thiết bị mới.
#     Body: {"device_id": "ESP32_01", "name": "Vườn Lan", "zone_id": null}
#     """
#     # 1. Kiểm tra ID đã tồn tại chưa
#     # Lưu ý: crud.get_device trả về model hoặc None
#     existing_device = crud.get_device(db, device_id=device_in.device_id)
#     if existing_device:
#         raise HTTPException(status_code=400, detail="Device ID này đã tồn tại!")
    
#     # 2. Gọi hàm CRUD để lưu vào DB
#     # Nếu trong crud/device.py chưa có hàm create_device, bạn xem BƯỚC 3 bên dưới
#     return crud.create_device(db=db, device=device_in)
# @router.post("/{device_id}/control", status_code=200)
# def control_device(
#     device_id: str, 
#     action: str, 
#     db: Session = Depends(get_db)
# ) -> Any:
#     """
#     API điều khiển thiết bị (Bơm, Phun sương, Đèn).
    
#     - Input action: "PUMP_ON" | "PUMP_OFF" | "MIST_ON" | "MIST_OFF" | "LIGHT_ON" | "LIGHT_OFF"
#     - Output MQTT: {"device": "PUMP", "status": "ON"} (Format ESP32 yêu cầu)
#     """
    
#     # 1. Kiểm tra thiết bị có tồn tại trong DB không
#     # (Nếu bạn muốn cho phép điều khiển cả thiết bị chưa đăng ký thì có thể bỏ qua bước này)
#     db_device = crud.get_device(db, device_id=device_id)
#     if not db_device:
#         # Tùy chọn: Có thể báo lỗi hoặc chỉ warning. Ở đây mình báo lỗi 404.
#         raise HTTPException(
#             status_code=404, 
#             detail=f"Thiết bị '{device_id}' không tồn tại trong hệ thống."
#         )

#     # 2. Xử lý logic chuyển đổi lệnh (Mapping)
#     mqtt_cmd = {}
    
#     # --- Nhóm Bơm (PUMP) ---
#     if action == "PUMP_ON":
#         mqtt_cmd = {"device": "PUMP", "status": "ON"}
#     elif action == "PUMP_OFF":
#         mqtt_cmd = {"device": "PUMP", "status": "OFF"}
    
#     # --- Nhóm Phun sương (MIST) ---
#     elif action == "MIST_ON":
#         mqtt_cmd = {"device": "MIST", "status": "ON"}
#     elif action == "MIST_OFF":
#         mqtt_cmd = {"device": "MIST", "status": "OFF"}
        
#     # --- Nhóm Đèn (LIGHT) ---
#     elif action == "LIGHT_ON":
#         mqtt_cmd = {"device": "LIGHT", "status": "ON"}
#     elif action == "LIGHT_OFF":
#         mqtt_cmd = {"device": "LIGHT", "status": "OFF"}
        
#     else:
#         # Nếu gửi action lạ (ví dụ: "HACK_ON")
#         raise HTTPException(
#             status_code=400, 
#             detail=f"Hành động '{action}' không hợp lệ."
#         )

#     # 3. Đóng gói thành chuỗi JSON chuẩn
#     payload_str = json.dumps(mqtt_cmd)
    
#     # 4. Xác định Topic điều khiển
#     # Topic này PHẢI KHỚP với topic mà ESP32 đang subscribe (k19/smartfarm/control)
#     # Bạn có thể dùng settings.MQTT_TOPIC_PUMP nếu trong .env đã đặt đúng, 
#     # hoặc hardcode chuỗi dưới đây để chắc chắn chạy được ngay.
#     target_topic = "k19/smartfarm/control" 

#     # 5. Gửi lệnh qua MQTT
#     is_sent = publish_command(target_topic, payload_str)
    
#     if not is_sent:
#         raise HTTPException(
#             status_code=503, 
#             detail="Lỗi kết nối MQTT Server. Không thể gửi lệnh."
#         )

#     # 6. Ghi nhật ký hoạt động (Action Log)
#     # Giúp truy vết xem ai đã bật/tắt vào giờ nào
#     try:
#         crud.create_action_log(
#             db=db,
#             device_id=device_id,
#             action=action,        # Lưu action gốc (PUMP_ON) để dễ đọc
#             trigger="MANUAL",     # Kích hoạt thủ công (qua App/Web)
#             reason="User controlled via Dashboard"
#         )
#     except Exception as e:
#         print(f"⚠️ Lỗi ghi log hành động: {e}") 
#         # Không raise lỗi ở đây để tránh báo Failed cho User dù lệnh đã gửi đi rồi

#     # 7. Trả về kết quả thành công
#     return {
#         "status": "success",
#         "message": f"Đã gửi lệnh {action} tới {device_id}",
#         "sent_payload": mqtt_cmd
#     }
    

# # @router.post("/{device_id}/control")
# # def control_device(
# #     device_id: str, 
# #     action: str, 
# #     db: Session = Depends(get_db)
# # ):
# #     """
# #     API để App Mobile gửi lệnh điều khiển (Bật/Tắt Bơm).
# #     - action: "PUMP_ON" | "PUMP_OFF" | "MIST_ON" | "MIST_OFF"
# #     """
# #     # 1. Kiểm tra thiết bị có tồn tại không
# #     db_device = crud.get_device(db, device_id=device_id)
# #     if not db_device:
# #         raise HTTPException(status_code=404, detail="Thiết bị không tồn tại")

# #     # 2. Gửi lệnh qua MQTT (Gửi xuống ESP32)
# #     # Cấu trúc lệnh gửi đi: {"device_id": "...", "cmd": "PUMP_ON"}
# #     command_payload = f'{{"device_id": "{device_id}", "cmd": "{action}"}}'
    
# #     # Gửi vào topic PUMP đã cấu hình
# #     publish_command(settings.MQTT_TOPIC_PUMP, command_payload)

# #     # 3. Ghi log hành động (Để chứng minh User đã bấm nút này)
# #     # Lưu ý: Import models ở trong hàm hoặc đầu file để lấy Enum ActionType
# #     # Ở đây mình lưu log dạng text đơn giản cho demo
# #     try:
# #         crud.create_action_log(
# #             db=db,
# #             device_id=device_id,
# #             action=action,        # Lưu action (cần khớp với Enum trong models)
# #             trigger="MANUAL",     # Người dùng bấm tay
# #             reason="User controlled via App"
# #         )
# #     except Exception as e:
# #         print(f"Lỗi ghi log: {e}")

# #     return {"status": "success", "message": f"Đã gửi lệnh {action} tới {device_id}"}