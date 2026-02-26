import asyncio
import json # [THÊM MỚI] Để đóng gói lệnh gửi cho ESP32
import joblib
import pandas as pd
import os
from datetime import datetime, timedelta

from db.session import SessionLocal
from models import models
from core.email_service import send_alert_email
from services.mqtt_service import publish_command # [THÊM MỚI] Gọi hàm gửi MQTT

# Import bộ Logger xịn sò của bạn
from core.logger import get_logger

# Khởi tạo logger cho riêng module này
logger = get_logger("AI_Irrigation")

# 1. TẢI BỘ NÃO AI (MÔ HÌNH RANDOM FOREST)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ai_models", "model_tuoi_xalach.pkl")

try:
    ai_model = joblib.load(MODEL_PATH)
    logger.info("🤖 Logic Tự động: Đã nạp thành công bộ não AI!")
except Exception as e:
    logger.error(f"❌ Logic Tự động: Lỗi load model AI: {e}")
    ai_model = None

# 2. BỘ NHỚ LƯU TRẠNG THÁI (STATE MACHINE)
# incident_states: Chống spam email
# device_states: Chống spam ghi Log vào Database (Chỉ ghi khi thay đổi trạng thái)
incident_states = {}
device_states = {} 

# =========================================================================
# HÀM CHẠY NGẦM ĐỂ TỰ ĐỘNG BẬT/TẮT BƠM
# =========================================================================
async def execute_pump_timer(device_id: str, zone_id: int, duration_seconds: int):
    """Tiến trình độc lập: Bật bơm -> Đếm ngược -> Tắt bơm -> Cập nhật DB"""
    try:
        logger.info(f"🚰 [TIMER] Bắt đầu đếm ngược tưới {duration_seconds}s cho thiết bị {device_id}")
        
        # --- GỬI LỆNH BẬT MÁY BƠM ---
        topic = "k19/doan_tot_nghiep/project_xalach/control"
        payload_on = json.dumps({"device": "PUMP", "status": "ON"})
        publish_command(topic, payload_on)
        
        # Ngủ đông không làm đơ server
        await asyncio.sleep(duration_seconds)
        
        # --- GỬI LỆNH TẮT MÁY BƠM SAU KHI HẾT GIỜ ---
        payload_off = json.dumps({"device": "PUMP", "status": "OFF"})
        publish_command(topic, payload_off)
        logger.info(f"🛑 [TIMER] Đã gửi MQTT tắt bơm {device_id} sau {duration_seconds} giây.")
        
        # Mở kết nối DB riêng cho luồng này để cập nhật trạng thái kết thúc
        db = SessionLocal()
        try:
            # 1. Ghi log Tắt bơm do hết giờ
            new_log = models.ActionLog(
                device_id=device_id,
                action=models.ActionType.PUMP_OFF,
                trigger=models.TriggerSource.SYSTEM,
                reason=f"Hoàn thành chu kỳ tưới {duration_seconds}s",
                level=models.LogLevel.INFO
            )
            db.add(new_log)
            
            # 2. Cập nhật Digital Twin: Báo cho Web biết là Bơm đã tắt
            dev = db.query(models.Device).filter(models.Device.device_id == device_id).first()
            if dev:
                dev.pump_state = False
            
            db.commit()

            # 3. Xóa trạng thái PUMP_ON trong bộ nhớ để AI có thể kích hoạt lại nếu đất vẫn khô
            if zone_id in device_states and device_states[zone_id] == "PUMP_ON":
                device_states[zone_id] = "IDLE"
                
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ [TIMER] Lỗi tiến trình bơm: {e}", exc_info=True)
# =========================================================================


async def auto_irrigation_task():
    """Vòng lặp chạy ngầm vô tận giám sát toàn bộ hệ thống"""
    logger.info("🌱 Khởi động tiến trình AI Giám sát, Xử lý sự cố và Ghi Log...")
    topic_control = "k19/doan_tot_nghiep/project_xalach/control"
    
    while True:
        try:
            db = SessionLocal()
            zones = db.query(models.Zone).all()
            now = datetime.now()
            
            for zone in zones:
                # 1. KIỂM TRA CHẾ ĐỘ (Chỉ chạy AI khi Zone đang bật AUTO)
                setting = zone.setting
                current_mode = setting.mode if setting else "MANUAL"
                if current_mode != "AUTO":
                    continue # Nếu Nông dân đang bật THỦ CÔNG thì AI bỏ qua
                
                # 2. TÌM THIẾT BỊ TRONG VƯỜN
                device = db.query(models.Device).filter(models.Device.zone_id == zone.zone_id).first()
                if not device or device.status != 'ONLINE':
                    continue # Bỏ qua nếu vườn chưa có mạch hoặc mạch rớt mạng
                
                # 3. LẤY DỮ LIỆU CẢM BIẾN MỚI NHẤT TỪ BẢNG SensorData
                latest_data = db.query(models.SensorData).filter(
                    models.SensorData.device_id == device.device_id
                ).order_by(models.SensorData.timestamp.desc()).first()

                if not latest_data or latest_data.temp is None or latest_data.hum_soil is None:
                    continue # Bỏ qua nếu mạch chưa gửi data nào lên
                
                # Trích xuất 4 thông số cho AI
                temp = latest_data.temp
                hum_soil = latest_data.hum_soil
                hum_air = latest_data.hum_air if latest_data.hum_air is not None else 60.0
                hour = now.hour
                
                # Lấy Email Nông dân để gửi cảnh báo
                farmer = db.query(models.User).filter(models.User.user_id == zone.farmer_id).first()
                farmer_email = farmer.email if farmer else None
                farmer_name = farmer.full_name if farmer else "Nông dân"

                # Lấy trạng thái hiện tại của thiết bị
                current_state = device_states.get(zone.zone_id, "IDLE")

                # 4. ĐƯA DỮ LIỆU VÀO AI SUY LUẬN
                if ai_model:
                    input_df = pd.DataFrame(
                        [[temp, hum_air, hum_soil, hour]], 
                        columns=['temp', 'hum_air', 'hum_soil', 'hour']
                    )
                    prediction = int(ai_model.predict(input_df)[0])
                    
                    # =======================================================
                    # KỊCH BẢN 1: AI PHÁT HIỆN SỐC NHIỆT (Class 2)
                    # =======================================================
                    if prediction == 2:
                        if current_state != "MIST_ON":
                            new_log = models.ActionLog(
                                device_id=device.device_id,
                                action=models.ActionType.MIST_ON,
                                trigger=models.TriggerSource.AI_MODEL,
                                reason=f"Nhiệt độ cao ({temp}°C) gây Sốc nhiệt. AI bật phun sương.",
                                level=models.LogLevel.WARN
                            )
                            db.add(new_log)
                            
                            device.mist_state = True
                            db.commit()
                            device_states[zone.zone_id] = "MIST_ON"
                            logger.warning(f"📝 [Log DB]: Ghi nhận bật Phun sương tại {zone.name}")

                            # --- GỬI LỆNH MQTT BẬT PHUN SƯƠNG ---
                            payload_mist_on = json.dumps({"device": "MIST", "status": "ON"})
                            publish_command(topic_control, payload_mist_on)
                        
                        if zone.zone_id not in incident_states:
                            # ---> GIAI ĐOẠN 1: MỚI XẢY RA - GỬI MAIL CẢNH BÁO
                            incident_states[zone.zone_id] = {
                                "start_time": now,
                                "escalated": False
                            }
                            logger.warning(f"⚠️ [Vườn {zone.name}]: Bắt đầu Sốc nhiệt ({temp}°C). Gửi mail Cảnh báo.")
                            
                            subject = f"⚠️ CẢNH BÁO: Vượt ngưỡng nhiệt độ tại {zone.name}"
                            body = f"""
                                <h3 style="color: #f39c12;">Hệ thống phát hiện vượt ngưỡng nhiệt độ!</h3>
                                <p>Chào <b>{farmer_name}</b>,</p>
                                <p>Nhiệt độ tại <b>{zone.name}</b> hiện đang ở mức <b>{temp}°C</b> (Nguy cơ sốc nhiệt).</p>
                                <p>🤖 AI đã <b>tự động BẬT hệ thống phun sương</b> để làm mát.</p>
                                <p>Hệ thống sẽ liên tục theo dõi và báo cáo kết quả cho bạn.</p>
                            """
                            send_alert_email(farmer_email, subject, body)
                            
                        else:
                            # ---> GIAI ĐOẠN 2: SỰ CỐ KÉO DÀI - GỬI MAIL YÊU CẦU HỖ TRỢ
                            incident_duration = now - incident_states[zone.zone_id]["start_time"]
                            
                            # Cảnh báo leo thang nếu quá 15 phút không giảm nhiệt
                            if incident_duration > timedelta(minutes=15) and not incident_states[zone.zone_id]["escalated"]:
                                logger.error(f"🚨 [Vườn {zone.name}]: Đã 15p không giảm. Gửi mail Hỗ trợ khẩn cấp.")
                                incident_states[zone.zone_id]["escalated"] = True # Đánh dấu đã kêu cứu
                                
                                subject = f"🚨 KHẨN CẤP: Yêu cầu hỗ trợ tại {zone.name}"
                                body = f"""
                                    <h3 style="color: #c0392b;">Xử lý tự động KHÔNG thành công!</h3>
                                    <p>Chào <b>{farmer_name}</b>,</p>
                                    <p>Hệ thống đã phun sương suốt 15 phút qua nhưng nhiệt độ tại <b>{zone.name}</b> vẫn chưa giảm (Hiện tại: <b>{temp}°C</b>).</p>
                                    <p><b>Nguyên nhân có thể:</b> Máy bơm bị hỏng, bồn hết nước, hoặc thời tiết quá khắc nghiệt.</p>
                                    <p>Vui lòng <b>ra vườn kiểm tra ngay lập tức</b> để cứu cây!</p>
                                """
                                send_alert_email(farmer_email, subject, body)

                    # =======================================================
                    # KỊCH BẢN 2: TRẠNG THÁI AN TOÀN HOẶC CHỈ TƯỚI BÌNH THƯỜNG
                    # =======================================================
                    elif prediction in [0, 1]:
                        if prediction == 1:
                            # Lấy thời gian bơm từ cấu hình Zone
                            pump_duration = setting.pump_duration if setting and setting.pump_duration else 60

                            if current_state != "PUMP_ON":
                                new_log = models.ActionLog(
                                    device_id=device.device_id,
                                    action=models.ActionType.PUMP_ON,
                                    trigger=models.TriggerSource.AI_MODEL,
                                    reason=f"Đất khô ({hum_soil}%). AI bật máy bơm tưới gốc ({pump_duration}s).",
                                    level=models.LogLevel.INFO
                                )
                                db.add(new_log)
                                
                                device.pump_state = True
                                db.commit()
                                
                                device_states[zone.zone_id] = "PUMP_ON"
                                logger.info(f"📝 [Log DB]: Ghi nhận bật Máy bơm tại {zone.name}")

                                # Gọi hàm đếm ngược chạy ngầm (Hàm này chứa lệnh PUMP ON và PUMP OFF)
                                asyncio.create_task(execute_pump_timer(device.device_id, zone.zone_id, pump_duration))
                            
                        elif prediction == 0:
                            if current_state == "PUMP_ON":
                                new_log = models.ActionLog(
                                    device_id=device.device_id,
                                    action=models.ActionType.PUMP_OFF,
                                    trigger=models.TriggerSource.AI_MODEL,
                                    reason=f"Độ ẩm đất đạt mức an toàn ({hum_soil}%). AI tắt bơm sớm.",
                                    level=models.LogLevel.SUCCESS
                                )
                                db.add(new_log)
                                device.pump_state = False 
                                db.commit()
                                
                                device_states[zone.zone_id] = "IDLE"
                                logger.info(f"📝 [Log DB]: Ghi nhận tắt Máy bơm tại {zone.name}")
                                
                                # --- GỬI LỆNH MQTT TẮT MÁY BƠM ---
                                payload_pump_off = json.dumps({"device": "PUMP", "status": "OFF"})
                                publish_command(topic_control, payload_pump_off)
                                
                            elif current_state == "MIST_ON":
                                new_log = models.ActionLog(
                                    device_id=device.device_id,
                                    action=models.ActionType.MIST_OFF,
                                    trigger=models.TriggerSource.AI_MODEL,
                                    reason=f"Nhiệt độ đã giảm xuống an toàn ({temp}°C). AI tắt phun sương.",
                                    level=models.LogLevel.SUCCESS
                                )
                                db.add(new_log)
                                device.mist_state = False 
                                db.commit()
                                
                                device_states[zone.zone_id] = "IDLE"
                                logger.info(f"📝 [Log DB]: Ghi nhận tắt Phun sương tại {zone.name}")
                                
                                # --- GỬI LỆNH MQTT TẮT PHUN SƯƠNG ---
                                payload_mist_off = json.dumps({"device": "MIST", "status": "OFF"})
                                publish_command(topic_control, payload_mist_off)

                        # ---> GIAI ĐOẠN 3: XỬ LÝ THÀNH CÔNG - GỬI MAIL XÁC NHẬN
                        if zone.zone_id in incident_states:
                            incident_duration = now - incident_states[zone.zone_id]["start_time"]
                            mins = int(incident_duration.total_seconds() / 60)
                            
                            logger.info(f"✅ [Vườn {zone.name}]: Nhiệt độ đã ổn định. Gửi mail Thành công.")
                            
                            subject = f"✅ ĐÃ XỬ LÝ: Nhiệt độ tại {zone.name} đã ổn định"
                            body = f"""
                                <h3 style="color: #27ae60;">Sự cố đã được khắc phục thành công!</h3>
                                <p>Chào <b>{farmer_name}</b>,</p>
                                <p>Nhiệt độ tại <b>{zone.name}</b> đã giảm xuống mức an toàn (Hiện tại: <b>{temp}°C</b>).</p>
                                <p>Hệ thống AI đã làm mát thành công trong vòng <b>{mins} phút</b>.</p>
                                <p>Hệ thống phun sương đã được tắt và chuyển về trạng thái giám sát bình thường.</p>
                            """
                            send_alert_email(farmer_email, subject, body)
                            
                            del incident_states[zone.zone_id]
            
        except Exception as e:
            logger.error(f"❌ Lỗi trong vòng lặp AI: {e}", exc_info=True)
        finally:
            db.close() 
            
        # Hệ thống ngủ 60 giây trước khi quét lượt tiếp theo
        await asyncio.sleep(60)
# import asyncio
# import joblib
# import pandas as pd
# import os
# from datetime import datetime, timedelta

# from db.session import SessionLocal
# from models import models
# from core.email_service import send_alert_email

# # [THÊM MỚI] Import bộ Logger xịn sò của bạn
# from core.logger import get_logger

# # Khởi tạo logger cho riêng module này
# logger = get_logger("AI_Irrigation")

# # 1. TẢI BỘ NÃO AI (MÔ HÌNH RANDOM FOREST)
# BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# MODEL_PATH = os.path.join(BASE_DIR, "ai_models", "model_tuoi_xalach.pkl")

# try:
#     ai_model = joblib.load(MODEL_PATH)
#     logger.info("🤖 Logic Tự động: Đã nạp thành công bộ não AI!")
# except Exception as e:
#     logger.error(f"❌ Logic Tự động: Lỗi load model AI: {e}")
#     ai_model = None

# # 2. BỘ NHỚ LƯU TRẠNG THÁI (STATE MACHINE)
# # incident_states: Chống spam email
# # device_states: Chống spam ghi Log vào Database (Chỉ ghi khi thay đổi trạng thái)
# incident_states = {}
# device_states = {} # [THÊM MỚI]

# # =========================================================================
# # [THÊM MỚI CƠ CHẾ HẸN GIỜ] HÀM CHẠY NGẦM ĐỂ TỰ ĐỘNG TẮT BƠM
# # =========================================================================
# async def execute_pump_timer(device_id: str, zone_id: int, duration_seconds: int):
#     """Tiến trình độc lập: Bật bơm -> Đếm ngược -> Tắt bơm -> Cập nhật DB"""
#     try:
#         logger.info(f"🚰 [TIMER] Bắt đầu đếm ngược tưới {duration_seconds}s cho thiết bị {device_id}")
        
#         # Mở comment dòng này nếu bạn đã có hàm publish_command
#         # publish_command(device_id, 'PUMP_ON')
        
#         # Ngủ đông không làm đơ server
#         await asyncio.sleep(duration_seconds)
        
#         # Hết giờ -> Gửi lệnh Tắt
#         # publish_command(device_id, 'PUMP_OFF')
#         logger.info(f"🛑 [TIMER] Đã tắt bơm {device_id} sau {duration_seconds} giây.")
        
#         # Mở kết nối DB riêng cho luồng này để cập nhật trạng thái kết thúc
#         db = SessionLocal()
#         try:
#             # 1. Ghi log Tắt bơm do hết giờ
#             new_log = models.ActionLog(
#                 device_id=device_id,
#                 action=models.ActionType.PUMP_OFF,
#                 trigger=models.TriggerSource.SYSTEM,
#                 reason=f"Hoàn thành chu kỳ tưới {duration_seconds}s",
#                 level=models.LogLevel.INFO
#             )
#             db.add(new_log)
            
#             # 2. Cập nhật Digital Twin: Báo cho Web biết là Bơm đã tắt
#             dev = db.query(models.Device).filter(models.Device.device_id == device_id).first()
#             if dev:
#                 dev.pump_state = False
            
#             db.commit()

#             # 3. Xóa trạng thái PUMP_ON trong bộ nhớ để AI có thể kích hoạt lại nếu đất vẫn khô
#             if zone_id in device_states and device_states[zone_id] == "PUMP_ON":
#                 device_states[zone_id] = "IDLE"
                
#         finally:
#             db.close()
            
#     except Exception as e:
#         logger.error(f"❌ [TIMER] Lỗi tiến trình bơm: {e}", exc_info=True)
# # =========================================================================


# async def auto_irrigation_task():
#     """Vòng lặp chạy ngầm vô tận giám sát toàn bộ hệ thống"""
#     logger.info("🌱 Khởi động tiến trình AI Giám sát, Xử lý sự cố và Ghi Log...")
    
#     while True:
#         try:
#             db = SessionLocal()
#             zones = db.query(models.Zone).all()
#             now = datetime.now()
            
#             for zone in zones:
#                 # 1. KIỂM TRA CHẾ ĐỘ (Chỉ chạy AI khi Zone đang bật AUTO)
#                 setting = zone.setting
#                 current_mode = setting.mode if setting else "MANUAL"
#                 if current_mode != "AUTO":
#                     continue # Nếu Nông dân đang bật THỦ CÔNG thì AI bỏ qua
                
#                 # 2. TÌM THIẾT BỊ TRONG VƯỜN
#                 device = db.query(models.Device).filter(models.Device.zone_id == zone.zone_id).first()
#                 if not device or device.status != 'ONLINE':
#                     continue # Bỏ qua nếu vườn chưa có mạch hoặc mạch rớt mạng
                
#                 # 3. LẤY DỮ LIỆU CẢM BIẾN MỚI NHẤT TỪ BẢNG SensorData
#                 latest_data = db.query(models.SensorData).filter(
#                     models.SensorData.device_id == device.device_id
#                 ).order_by(models.SensorData.timestamp.desc()).first()

#                 if not latest_data or latest_data.temp is None or latest_data.hum_soil is None:
#                     continue # Bỏ qua nếu mạch chưa gửi data nào lên
                
#                 # Trích xuất 4 thông số cho AI
#                 temp = latest_data.temp
#                 hum_soil = latest_data.hum_soil
#                 hum_air = latest_data.hum_air if latest_data.hum_air is not None else 60.0
#                 hour = now.hour
                
#                 # Lấy Email Nông dân để gửi cảnh báo
#                 farmer = db.query(models.User).filter(models.User.user_id == zone.farmer_id).first()
#                 farmer_email = farmer.email if farmer else None
#                 farmer_name = farmer.full_name if farmer else "Nông dân"

#                 # [THÊM MỚI] Lấy trạng thái hiện tại của thiết bị
#                 current_state = device_states.get(zone.zone_id, "IDLE")

#                 # 4. ĐƯA DỮ LIỆU VÀO AI SUY LUẬN
#                 if ai_model:
#                     input_df = pd.DataFrame(
#                         [[temp, hum_air, hum_soil, hour]], 
#                         columns=['temp', 'hum_air', 'hum_soil', 'hour']
#                     )
#                     prediction = int(ai_model.predict(input_df)[0])
                    
#                     # =======================================================
#                     # KỊCH BẢN 1: AI PHÁT HIỆN SỐC NHIỆT (Class 2)
#                     # =======================================================
#                     if prediction == 2:
#                         # [THÊM MỚI] Ghi Log Database nếu vừa bật Phun Sương
#                         if current_state != "MIST_ON":
#                             new_log = models.ActionLog(
#                                 device_id=device.device_id,
#                                 action=models.ActionType.MIST_ON,
#                                 trigger=models.TriggerSource.AI_MODEL,
#                                 reason=f"Nhiệt độ cao ({temp}°C) gây Sốc nhiệt. AI bật phun sương.",
#                                 level=models.LogLevel.WARN
#                             )
#                             db.add(new_log)
                            
#                             # [THÊM MỚI CƠ CHẾ DIGITAL TWIN]: Cập nhật vào bảng Device
#                             device.mist_state = True
                            
#                             db.commit()
#                             device_states[zone.zone_id] = "MIST_ON"
#                             logger.warning(f"📝 [Log DB]: Ghi nhận bật Phun sương tại {zone.name}")

#                         # TODO: Mở comment dòng dưới để gửi lệnh bật phun sương xuống ESP32
#                         # publish_command(device.device_id, 'MIST_ON')
                        
#                         if zone.zone_id not in incident_states:
#                             # ---> GIAI ĐOẠN 1: MỚI XẢY RA - GỬI MAIL CẢNH BÁO
#                             incident_states[zone.zone_id] = {
#                                 "start_time": now,
#                                 "escalated": False
#                             }
#                             logger.warning(f"⚠️ [Vườn {zone.name}]: Bắt đầu Sốc nhiệt ({temp}°C). Gửi mail Cảnh báo.")
                            
#                             subject = f"⚠️ CẢNH BÁO: Vượt ngưỡng nhiệt độ tại {zone.name}"
#                             body = f"""
#                                 <h3 style="color: #f39c12;">Hệ thống phát hiện vượt ngưỡng nhiệt độ!</h3>
#                                 <p>Chào <b>{farmer_name}</b>,</p>
#                                 <p>Nhiệt độ tại <b>{zone.name}</b> hiện đang ở mức <b>{temp}°C</b> (Nguy cơ sốc nhiệt).</p>
#                                 <p>🤖 AI đã <b>tự động BẬT hệ thống phun sương</b> để làm mát.</p>
#                                 <p>Hệ thống sẽ liên tục theo dõi và báo cáo kết quả cho bạn.</p>
#                             """
#                             send_alert_email(farmer_email, subject, body)
                            
#                         else:
#                             # ---> GIAI ĐOẠN 2: SỰ CỐ KÉO DÀI - GỬI MAIL YÊU CẦU HỖ TRỢ
#                             incident_duration = now - incident_states[zone.zone_id]["start_time"]
                            
#                             # Cảnh báo leo thang nếu quá 15 phút không giảm nhiệt
#                             if incident_duration > timedelta(minutes=15) and not incident_states[zone.zone_id]["escalated"]:
#                                 logger.error(f"🚨 [Vườn {zone.name}]: Đã 15p không giảm. Gửi mail Hỗ trợ khẩn cấp.")
#                                 incident_states[zone.zone_id]["escalated"] = True # Đánh dấu đã kêu cứu
                                
#                                 subject = f"🚨 KHẨN CẤP: Yêu cầu hỗ trợ tại {zone.name}"
#                                 body = f"""
#                                     <h3 style="color: #c0392b;">Xử lý tự động KHÔNG thành công!</h3>
#                                     <p>Chào <b>{farmer_name}</b>,</p>
#                                     <p>Hệ thống đã phun sương suốt 15 phút qua nhưng nhiệt độ tại <b>{zone.name}</b> vẫn chưa giảm (Hiện tại: <b>{temp}°C</b>).</p>
#                                     <p><b>Nguyên nhân có thể:</b> Máy bơm bị hỏng, bồn hết nước, hoặc thời tiết quá khắc nghiệt.</p>
#                                     <p>Vui lòng <b>ra vườn kiểm tra ngay lập tức</b> để cứu cây!</p>
#                                 """
#                                 send_alert_email(farmer_email, subject, body)

#                     # =======================================================
#                     # KỊCH BẢN 2: TRẠNG THÁI AN TOÀN HOẶC CHỈ TƯỚI BÌNH THƯỜNG
#                     # =======================================================
#                     elif prediction in [0, 1]:
#                         if prediction == 1:
#                             # [THÊM MỚI CƠ CHẾ HẸN GIỜ] Lấy thời gian bơm từ cấu hình Zone
#                             pump_duration = setting.pump_duration if setting and setting.pump_duration else 60

#                             # Ghi Log Database nếu vừa bật Máy Bơm
#                             if current_state != "PUMP_ON":
#                                 new_log = models.ActionLog(
#                                     device_id=device.device_id,
#                                     action=models.ActionType.PUMP_ON,
#                                     trigger=models.TriggerSource.AI_MODEL,
#                                     reason=f"Đất khô ({hum_soil}%). AI bật máy bơm tưới gốc ({pump_duration}s).",
#                                     level=models.LogLevel.INFO
#                                 )
#                                 db.add(new_log)
                                
#                                 # [THÊM MỚI CƠ CHẾ DIGITAL TWIN]: Cập nhật vào bảng Device
#                                 device.pump_state = True
#                                 db.commit()
                                
#                                 device_states[zone.zone_id] = "PUMP_ON"
#                                 logger.info(f"📝 [Log DB]: Ghi nhận bật Máy bơm tại {zone.name}")

#                                 # [THÊM MỚI CƠ CHẾ HẸN GIỜ]: Gọi hàm đếm ngược chạy ngầm
#                                 asyncio.create_task(execute_pump_timer(device.device_id, zone.zone_id, pump_duration))

#                             # Class 1: Đất khô -> Gửi lệnh bật máy bơm tưới gốc
#                             # Lệnh này đã được chuyển vào trong hàm execute_pump_timer để chạy đồng bộ
                            
#                         elif prediction == 0:
#                             # Ghi Log Database khi TẮT thiết bị (Chuyển về IDLE)
#                             # Lưu ý: Nếu timer tắt bơm, nó đã đổi state thành IDLE rồi, nên đoạn này sẽ bị bỏ qua -> Rất logic!
#                             if current_state == "PUMP_ON":
#                                 new_log = models.ActionLog(
#                                     device_id=device.device_id,
#                                     action=models.ActionType.PUMP_OFF,
#                                     trigger=models.TriggerSource.AI_MODEL,
#                                     reason=f"Độ ẩm đất đạt mức an toàn ({hum_soil}%). AI tắt bơm sớm.",
#                                     level=models.LogLevel.SUCCESS
#                                 )
#                                 db.add(new_log)
#                                 device.pump_state = False # [THÊM MỚI] Cập nhật Digital Twin
#                                 db.commit()
                                
#                                 device_states[zone.zone_id] = "IDLE"
#                                 logger.info(f"📝 [Log DB]: Ghi nhận tắt Máy bơm tại {zone.name}")
#                                 # publish_command(device.device_id, 'PUMP_OFF')
                                
#                             elif current_state == "MIST_ON":
#                                 new_log = models.ActionLog(
#                                     device_id=device.device_id,
#                                     action=models.ActionType.MIST_OFF,
#                                     trigger=models.TriggerSource.AI_MODEL,
#                                     reason=f"Nhiệt độ đã giảm xuống an toàn ({temp}°C). AI tắt phun sương.",
#                                     level=models.LogLevel.SUCCESS
#                                 )
#                                 db.add(new_log)
#                                 device.mist_state = False # [THÊM MỚI] Cập nhật Digital Twin
#                                 db.commit()
                                
#                                 device_states[zone.zone_id] = "IDLE"
#                                 logger.info(f"📝 [Log DB]: Ghi nhận tắt Phun sương tại {zone.name}")
#                                 # publish_command(device.device_id, 'MIST_OFF')

#                         # ---> GIAI ĐOẠN 3: XỬ LÝ THÀNH CÔNG - GỬI MAIL XÁC NHẬN
#                         # Kiểm tra xem vườn này có phải vừa thoát khỏi sự cố Sốc nhiệt không?
#                         if zone.zone_id in incident_states:
#                             incident_duration = now - incident_states[zone.zone_id]["start_time"]
#                             mins = int(incident_duration.total_seconds() / 60)
                            
#                             logger.info(f"✅ [Vườn {zone.name}]: Nhiệt độ đã ổn định. Gửi mail Thành công.")
                            
#                             subject = f"✅ ĐÃ XỬ LÝ: Nhiệt độ tại {zone.name} đã ổn định"
#                             body = f"""
#                                 <h3 style="color: #27ae60;">Sự cố đã được khắc phục thành công!</h3>
#                                 <p>Chào <b>{farmer_name}</b>,</p>
#                                 <p>Nhiệt độ tại <b>{zone.name}</b> đã giảm xuống mức an toàn (Hiện tại: <b>{temp}°C</b>).</p>
#                                 <p>Hệ thống AI đã làm mát thành công trong vòng <b>{mins} phút</b>.</p>
#                                 <p>Hệ thống phun sương đã được tắt và chuyển về trạng thái giám sát bình thường.</p>
#                             """
#                             send_alert_email(farmer_email, subject, body)
                            
#                             # Cực kỳ quan trọng: Xóa sự cố khỏi bộ nhớ để reset trạng thái
#                             del incident_states[zone.zone_id]
            
#         except Exception as e:
#             # Dùng exc_info=True để log ghi chi tiết dòng gây lỗi
#             logger.error(f"❌ Lỗi trong vòng lặp AI: {e}", exc_info=True)
#         finally:
#             db.close() # Luôn đóng kết nối sau khi quét xong 1 vòng
            
#         # Hệ thống ngủ 60 giây trước khi quét lượt tiếp theo
#         await asyncio.sleep(60)
# import asyncio
# import joblib
# import pandas as pd
# import os
# from datetime import datetime, timedelta

# from db.session import SessionLocal
# from models import models
# from core.email_service import send_alert_email

# # [THÊM MỚI] Import bộ Logger xịn sò của bạn
# from core.logger import get_logger

# # Khởi tạo logger cho riêng module này
# logger = get_logger("AI_Irrigation")

# # 1. TẢI BỘ NÃO AI (MÔ HÌNH RANDOM FOREST)
# BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# MODEL_PATH = os.path.join(BASE_DIR, "ai_models", "model_tuoi_xalach.pkl")

# try:
#     ai_model = joblib.load(MODEL_PATH)
#     logger.info("🤖 Logic Tự động: Đã nạp thành công bộ não AI!")
# except Exception as e:
#     logger.error(f"❌ Logic Tự động: Lỗi load model AI: {e}")
#     ai_model = None

# # 2. BỘ NHỚ LƯU TRẠNG THÁI (STATE MACHINE)
# # incident_states: Chống spam email
# # device_states: Chống spam ghi Log vào Database (Chỉ ghi khi thay đổi trạng thái)
# incident_states = {}
# device_states = {} # [THÊM MỚI]

# async def auto_irrigation_task():
#     """Vòng lặp chạy ngầm vô tận giám sát toàn bộ hệ thống"""
#     logger.info("🌱 Khởi động tiến trình AI Giám sát, Xử lý sự cố và Ghi Log...")
    
#     while True:
#         try:
#             db = SessionLocal()
#             zones = db.query(models.Zone).all()
#             now = datetime.now()
            
#             for zone in zones:
#                 # 1. KIỂM TRA CHẾ ĐỘ (Chỉ chạy AI khi Zone đang bật AUTO)
#                 setting = zone.setting
#                 current_mode = setting.mode if setting else "MANUAL"
#                 if current_mode != "AUTO":
#                     continue # Nếu Nông dân đang bật THỦ CÔNG thì AI bỏ qua
                
#                 # 2. TÌM THIẾT BỊ TRONG VƯỜN
#                 device = db.query(models.Device).filter(models.Device.zone_id == zone.zone_id).first()
#                 if not device or device.status != 'ONLINE':
#                     continue # Bỏ qua nếu vườn chưa có mạch hoặc mạch rớt mạng
                
#                 # 3. LẤY DỮ LIỆU CẢM BIẾN MỚI NHẤT TỪ BẢNG SensorData
#                 latest_data = db.query(models.SensorData).filter(
#                     models.SensorData.device_id == device.device_id
#                 ).order_by(models.SensorData.timestamp.desc()).first()

#                 if not latest_data or latest_data.temp is None or latest_data.hum_soil is None:
#                     continue # Bỏ qua nếu mạch chưa gửi data nào lên
                
#                 # Trích xuất 4 thông số cho AI
#                 temp = latest_data.temp
#                 hum_soil = latest_data.hum_soil
#                 hum_air = latest_data.hum_air if latest_data.hum_air is not None else 60.0
#                 hour = now.hour
                
#                 # Lấy Email Nông dân để gửi cảnh báo
#                 farmer = db.query(models.User).filter(models.User.user_id == zone.farmer_id).first()
#                 farmer_email = farmer.email if farmer else None
#                 farmer_name = farmer.full_name if farmer else "Nông dân"

#                 # [THÊM MỚI] Lấy trạng thái hiện tại của thiết bị
#                 current_state = device_states.get(zone.zone_id, "IDLE")

#                 # 4. ĐƯA DỮ LIỆU VÀO AI SUY LUẬN
#                 if ai_model:
#                     input_df = pd.DataFrame(
#                         [[temp, hum_air, hum_soil, hour]], 
#                         columns=['temp', 'hum_air', 'hum_soil', 'hour']
#                     )
#                     prediction = int(ai_model.predict(input_df)[0])
                    
#                     # =======================================================
#                     # KỊCH BẢN 1: AI PHÁT HIỆN SỐC NHIỆT (Class 2)
#                     # =======================================================
#                     if prediction == 2:
#                         # [THÊM MỚI] Ghi Log Database nếu vừa bật Phun Sương
#                         if current_state != "MIST_ON":
#                             new_log = models.ActionLog(
#                                 device_id=device.device_id,
#                                 action=models.ActionType.MIST_ON,
#                                 trigger=models.TriggerSource.AI_MODEL,
#                                 reason=f"Nhiệt độ cao ({temp}°C) gây Sốc nhiệt. AI bật phun sương.",
#                                 level=models.LogLevel.WARN
#                             )
#                             db.add(new_log)
#                             db.commit()
#                             device_states[zone.zone_id] = "MIST_ON"
#                             logger.warning(f"📝 [Log DB]: Ghi nhận bật Phun sương tại {zone.name}")

#                         # TODO: Mở comment dòng dưới để gửi lệnh bật phun sương xuống ESP32
#                         # publish_command(device.device_id, 'MIST_ON')
                        
#                         if zone.zone_id not in incident_states:
#                             # ---> GIAI ĐOẠN 1: MỚI XẢY RA - GỬI MAIL CẢNH BÁO
#                             incident_states[zone.zone_id] = {
#                                 "start_time": now,
#                                 "escalated": False
#                             }
#                             logger.warning(f"⚠️ [Vườn {zone.name}]: Bắt đầu Sốc nhiệt ({temp}°C). Gửi mail Cảnh báo.")
                            
#                             subject = f"⚠️ CẢNH BÁO: Vượt ngưỡng nhiệt độ tại {zone.name}"
#                             body = f"""
#                                 <h3 style="color: #f39c12;">Hệ thống phát hiện vượt ngưỡng nhiệt độ!</h3>
#                                 <p>Chào <b>{farmer_name}</b>,</p>
#                                 <p>Nhiệt độ tại <b>{zone.name}</b> hiện đang ở mức <b>{temp}°C</b> (Nguy cơ sốc nhiệt).</p>
#                                 <p>🤖 AI đã <b>tự động BẬT hệ thống phun sương</b> để làm mát.</p>
#                                 <p>Hệ thống sẽ liên tục theo dõi và báo cáo kết quả cho bạn.</p>
#                             """
#                             send_alert_email(farmer_email, subject, body)
                            
#                         else:
#                             # ---> GIAI ĐOẠN 2: SỰ CỐ KÉO DÀI - GỬI MAIL YÊU CẦU HỖ TRỢ
#                             incident_duration = now - incident_states[zone.zone_id]["start_time"]
                            
#                             # Cảnh báo leo thang nếu quá 15 phút không giảm nhiệt
#                             if incident_duration > timedelta(minutes=15) and not incident_states[zone.zone_id]["escalated"]:
#                                 logger.error(f"🚨 [Vườn {zone.name}]: Đã 15p không giảm. Gửi mail Hỗ trợ khẩn cấp.")
#                                 incident_states[zone.zone_id]["escalated"] = True # Đánh dấu đã kêu cứu
                                
#                                 subject = f"🚨 KHẨN CẤP: Yêu cầu hỗ trợ tại {zone.name}"
#                                 body = f"""
#                                     <h3 style="color: #c0392b;">Xử lý tự động KHÔNG thành công!</h3>
#                                     <p>Chào <b>{farmer_name}</b>,</p>
#                                     <p>Hệ thống đã phun sương suốt 15 phút qua nhưng nhiệt độ tại <b>{zone.name}</b> vẫn chưa giảm (Hiện tại: <b>{temp}°C</b>).</p>
#                                     <p><b>Nguyên nhân có thể:</b> Máy bơm bị hỏng, bồn hết nước, hoặc thời tiết quá khắc nghiệt.</p>
#                                     <p>Vui lòng <b>ra vườn kiểm tra ngay lập tức</b> để cứu cây!</p>
#                                 """
#                                 send_alert_email(farmer_email, subject, body)

#                     # =======================================================
#                     # KỊCH BẢN 2: TRẠNG THÁI AN TOÀN HOẶC CHỈ TƯỚI BÌNH THƯỜNG
#                     # =======================================================
#                     elif prediction in [0, 1]:
#                         if prediction == 1:
#                             # [THÊM MỚI] Ghi Log Database nếu vừa bật Máy Bơm
#                             if current_state != "PUMP_ON":
#                                 new_log = models.ActionLog(
#                                     device_id=device.device_id,
#                                     action=models.ActionType.PUMP_ON,
#                                     trigger=models.TriggerSource.AI_MODEL,
#                                     reason=f"Đất khô ({hum_soil}%). AI bật máy bơm tưới gốc.",
#                                     level=models.LogLevel.INFO
#                                 )
#                                 db.add(new_log)
#                                 db.commit()
#                                 device_states[zone.zone_id] = "PUMP_ON"
#                                 logger.info(f"📝 [Log DB]: Ghi nhận bật Máy bơm tại {zone.name}")

#                             # Class 1: Đất khô -> Gửi lệnh bật máy bơm tưới gốc
#                             # publish_command(device.device_id, 'PUMP_ON')
                            
#                         elif prediction == 0:
#                             # [THÊM MỚI] Ghi Log Database khi TẮT thiết bị (Chuyển về IDLE)
#                             if current_state == "PUMP_ON":
#                                 new_log = models.ActionLog(
#                                     device_id=device.device_id,
#                                     action=models.ActionType.PUMP_OFF,
#                                     trigger=models.TriggerSource.AI_MODEL,
#                                     reason=f"Độ ẩm đất đạt mức an toàn ({hum_soil}%). AI tắt bơm.",
#                                     level=models.LogLevel.SUCCESS
#                                 )
#                                 db.add(new_log)
#                                 db.commit()
#                                 device_states[zone.zone_id] = "IDLE"
#                                 logger.info(f"📝 [Log DB]: Ghi nhận tắt Máy bơm tại {zone.name}")
#                                 # publish_command(device.device_id, 'PUMP_OFF')
                                
#                             elif current_state == "MIST_ON":
#                                 new_log = models.ActionLog(
#                                     device_id=device.device_id,
#                                     action=models.ActionType.MIST_OFF,
#                                     trigger=models.TriggerSource.AI_MODEL,
#                                     reason=f"Nhiệt độ đã giảm xuống an toàn ({temp}°C). AI tắt phun sương.",
#                                     level=models.LogLevel.SUCCESS
#                                 )
#                                 db.add(new_log)
#                                 db.commit()
#                                 device_states[zone.zone_id] = "IDLE"
#                                 logger.info(f"📝 [Log DB]: Ghi nhận tắt Phun sương tại {zone.name}")
#                                 # publish_command(device.device_id, 'MIST_OFF')

#                         # ---> GIAI ĐOẠN 3: XỬ LÝ THÀNH CÔNG - GỬI MAIL XÁC NHẬN
#                         # Kiểm tra xem vườn này có phải vừa thoát khỏi sự cố Sốc nhiệt không?
#                         if zone.zone_id in incident_states:
#                             incident_duration = now - incident_states[zone.zone_id]["start_time"]
#                             mins = int(incident_duration.total_seconds() / 60)
                            
#                             logger.info(f"✅ [Vườn {zone.name}]: Nhiệt độ đã ổn định. Gửi mail Thành công.")
                            
#                             subject = f"✅ ĐÃ XỬ LÝ: Nhiệt độ tại {zone.name} đã ổn định"
#                             body = f"""
#                                 <h3 style="color: #27ae60;">Sự cố đã được khắc phục thành công!</h3>
#                                 <p>Chào <b>{farmer_name}</b>,</p>
#                                 <p>Nhiệt độ tại <b>{zone.name}</b> đã giảm xuống mức an toàn (Hiện tại: <b>{temp}°C</b>).</p>
#                                 <p>Hệ thống AI đã làm mát thành công trong vòng <b>{mins} phút</b>.</p>
#                                 <p>Hệ thống phun sương đã được tắt và chuyển về trạng thái giám sát bình thường.</p>
#                             """
#                             send_alert_email(farmer_email, subject, body)
                            
#                             # Cực kỳ quan trọng: Xóa sự cố khỏi bộ nhớ để reset trạng thái
#                             del incident_states[zone.zone_id]
            
#         except Exception as e:
#             # [THÊM MỚI] Dùng exc_info=True để log ghi chi tiết dòng gây lỗi
#             logger.error(f"❌ Lỗi trong vòng lặp AI: {e}", exc_info=True)
#         finally:
#             db.close() # Luôn đóng kết nối sau khi quét xong 1 vòng
            
#         # Hệ thống ngủ 60 giây trước khi quét lượt tiếp theo
#         await asyncio.sleep(60)