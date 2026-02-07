from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from db.session import SessionLocal
from crud import device as crud
from schemas import device as schemas
from services.mqtt_service import publish_command
from core.config import settings

router = APIRouter()

# Dependency: Hàm lấy DB Session cho mỗi request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ================= 1. API LẤY THÔNG TIN (GET) =================

@router.get("/", response_model=List[schemas.DeviceResponse])
def read_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Lấy danh sách tất cả thiết bị đang có.
    Dùng cho màn hình Home của App.
    """
    devices = crud.get_devices(db, skip=skip, limit=limit)
    return devices

@router.get("/{device_id}", response_model=schemas.DeviceResponse)
def read_device(device_id: str, db: Session = Depends(get_db)):
    """
    Xem chi tiết 1 thiết bị cụ thể.
    """
    db_device = crud.get_device(db, device_id=device_id)
    if db_device is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    return db_device

@router.get("/{device_id}/history", response_model=List[schemas.SensorDataResponse])
def read_sensor_history(device_id: str, limit: int = 20, db: Session = Depends(get_db)):
    """
    QUAN TRỌNG: API lấy dữ liệu để vẽ biểu đồ (Chart).
    Mặc định lấy 20 điểm dữ liệu mới nhất.
    """
    history = crud.get_sensor_history(db, device_id=device_id, limit=limit)
    if not history:
        # Nếu chưa có dữ liệu thì trả về list rỗng, không báo lỗi
        return []
    return history

# ================= 2. API ĐIỀU KHIỂN (POST) =================
@router.get("/sensors/latest")
def read_latest_sensor_data(db: Session = Depends(get_db)):
    """
    API trả về dữ liệu TỔNG QUAN (Trung bình cộng của tất cả thiết bị).
    Trả về Object {} để Frontend dễ hiển thị.
    """
    devices = crud.get_devices(db)
    
    total_temp = 0
    total_hum = 0
    count = 0
    
    for dev in devices:
        # Lấy bản ghi mới nhất của từng thiết bị
        last_reading = crud.get_sensor_history(db, device_id=dev.id, limit=1)
        if last_reading:
            data = last_reading[0]
            total_temp += data.temp
            total_hum += data.hum_air
            count += 1
            
    if count > 0:
        return {
            "temp": round(total_temp / count, 1),   # Tính trung bình
            "hum_air": round(total_hum / count, 1),
            "online_count": count
        }
    
    # Nếu chưa có dữ liệu nào
    return {
        "temp": 0, 
        "hum_air": 0, 
        "online_count": 0
    }
# @router.get("/sensors/latest")
# def read_latest_sensor_data(db: Session = Depends(get_db)):
#     """
#     API lấy dữ liệu cảm biến mới nhất của TẤT CẢ thiết bị.
#     Dùng cho Dashboard tổng quan.
#     """
#     # Lấy danh sách thiết bị
#     devices = crud.get_devices(db)
#     results = []
    
#     for dev in devices:
#         # Lấy 1 bản ghi mới nhất của thiết bị đó
#         last_reading = crud.get_sensor_history(db, device_id=dev.id, limit=1)
#         if last_reading:
#             data = last_reading[0]
#             results.append({
#                 "device_id": dev.id,
#                 "temp": data.temp,
#                 "hum_air": data.hum_air,
#                 "hum_soil": data.hum_soil,
#                 "ts": data.ts
#             })
    
#     # Nếu chỉ có 1 thiết bị test, trả về object trực tiếp để Frontend dễ xử lý
#     # (Tùy logic frontend của bạn, ở đây mình trả về list)
#     return results
# ================= API ĐIỀU KHIỂN THIẾT BỊ (FULL) =================
@router.post("/{device_id}/control", status_code=200)
def control_device(
    device_id: str, 
    action: str, 
    db: Session = Depends(get_db)
) -> Any:
    """
    API điều khiển thiết bị (Bơm, Phun sương, Đèn).
    
    - Input action: "PUMP_ON" | "PUMP_OFF" | "MIST_ON" | "MIST_OFF" | "LIGHT_ON" | "LIGHT_OFF"
    - Output MQTT: {"device": "PUMP", "status": "ON"} (Format ESP32 yêu cầu)
    """
    
    # 1. Kiểm tra thiết bị có tồn tại trong DB không
    # (Nếu bạn muốn cho phép điều khiển cả thiết bị chưa đăng ký thì có thể bỏ qua bước này)
    db_device = crud.get_device(db, device_id=device_id)
    if not db_device:
        # Tùy chọn: Có thể báo lỗi hoặc chỉ warning. Ở đây mình báo lỗi 404.
        raise HTTPException(
            status_code=404, 
            detail=f"Thiết bị '{device_id}' không tồn tại trong hệ thống."
        )

    # 2. Xử lý logic chuyển đổi lệnh (Mapping)
    mqtt_cmd = {}
    
    # --- Nhóm Bơm (PUMP) ---
    if action == "PUMP_ON":
        mqtt_cmd = {"device": "PUMP", "status": "ON"}
    elif action == "PUMP_OFF":
        mqtt_cmd = {"device": "PUMP", "status": "OFF"}
    
    # --- Nhóm Phun sương (MIST) ---
    elif action == "MIST_ON":
        mqtt_cmd = {"device": "MIST", "status": "ON"}
    elif action == "MIST_OFF":
        mqtt_cmd = {"device": "MIST", "status": "OFF"}
        
    # --- Nhóm Đèn (LIGHT) ---
    elif action == "LIGHT_ON":
        mqtt_cmd = {"device": "LIGHT", "status": "ON"}
    elif action == "LIGHT_OFF":
        mqtt_cmd = {"device": "LIGHT", "status": "OFF"}
        
    else:
        # Nếu gửi action lạ (ví dụ: "HACK_ON")
        raise HTTPException(
            status_code=400, 
            detail=f"Hành động '{action}' không hợp lệ."
        )

    # 3. Đóng gói thành chuỗi JSON chuẩn
    payload_str = json.dumps(mqtt_cmd)
    
    # 4. Xác định Topic điều khiển
    # Topic này PHẢI KHỚP với topic mà ESP32 đang subscribe (k19/smartfarm/control)
    # Bạn có thể dùng settings.MQTT_TOPIC_PUMP nếu trong .env đã đặt đúng, 
    # hoặc hardcode chuỗi dưới đây để chắc chắn chạy được ngay.
    target_topic = "k19/smartfarm/control" 

    # 5. Gửi lệnh qua MQTT
    is_sent = publish_command(target_topic, payload_str)
    
    if not is_sent:
        raise HTTPException(
            status_code=503, 
            detail="Lỗi kết nối MQTT Server. Không thể gửi lệnh."
        )

    # 6. Ghi nhật ký hoạt động (Action Log)
    # Giúp truy vết xem ai đã bật/tắt vào giờ nào
    try:
        crud.create_action_log(
            db=db,
            device_id=device_id,
            action=action,        # Lưu action gốc (PUMP_ON) để dễ đọc
            trigger="MANUAL",     # Kích hoạt thủ công (qua App/Web)
            reason="User controlled via Dashboard"
        )
    except Exception as e:
        print(f"⚠️ Lỗi ghi log hành động: {e}") 
        # Không raise lỗi ở đây để tránh báo Failed cho User dù lệnh đã gửi đi rồi

    # 7. Trả về kết quả thành công
    return {
        "status": "success",
        "message": f"Đã gửi lệnh {action} tới {device_id}",
        "sent_payload": mqtt_cmd
    }

# @router.post("/{device_id}/control")
# def control_device(
#     device_id: str, 
#     action: str, 
#     db: Session = Depends(get_db)
# ):
#     """
#     API để App Mobile gửi lệnh điều khiển (Bật/Tắt Bơm).
#     - action: "PUMP_ON" | "PUMP_OFF" | "MIST_ON" | "MIST_OFF"
#     """
#     # 1. Kiểm tra thiết bị có tồn tại không
#     db_device = crud.get_device(db, device_id=device_id)
#     if not db_device:
#         raise HTTPException(status_code=404, detail="Thiết bị không tồn tại")

#     # 2. Gửi lệnh qua MQTT (Gửi xuống ESP32)
#     # Cấu trúc lệnh gửi đi: {"device_id": "...", "cmd": "PUMP_ON"}
#     command_payload = f'{{"device_id": "{device_id}", "cmd": "{action}"}}'
    
#     # Gửi vào topic PUMP đã cấu hình
#     publish_command(settings.MQTT_TOPIC_PUMP, command_payload)

#     # 3. Ghi log hành động (Để chứng minh User đã bấm nút này)
#     # Lưu ý: Import models ở trong hàm hoặc đầu file để lấy Enum ActionType
#     # Ở đây mình lưu log dạng text đơn giản cho demo
#     try:
#         crud.create_action_log(
#             db=db,
#             device_id=device_id,
#             action=action,        # Lưu action (cần khớp với Enum trong models)
#             trigger="MANUAL",     # Người dùng bấm tay
#             reason="User controlled via App"
#         )
#     except Exception as e:
#         print(f"Lỗi ghi log: {e}")

#     return {"status": "success", "message": f"Đã gửi lệnh {action} tới {device_id}"}