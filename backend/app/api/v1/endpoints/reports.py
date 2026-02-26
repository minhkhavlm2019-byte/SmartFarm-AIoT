from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List, Any

from api import deps
from models import models
# Bạn cần tạo schema này hoặc dùng Dict tạm thời
from pydantic import BaseModel 

router = APIRouter()

# --- SCHEMA ĐƠN GIẢN CHO REPORT (Có thể để trong schemas/report.py) ---
class ChartDataPoint(BaseModel):
    label: str
    value: float

class DashboardData(BaseModel):
    env_trend: dict # { "labels": [], "temp": [], "hum": [] }
    ai_efficiency: dict # { "ai": 10, "manual": 5 }

# ================= API 1: BIỂU ĐỒ XU HƯỚNG (CHARTS) =================
@router.get("/charts", response_model=DashboardData)
def get_chart_data(
    days: int = 7, 
    db: Session = Depends(deps.get_db)
):
    """
    Trả về dữ liệu cho 2 biểu đồ:
    1. Biểu đồ môi trường (Line Chart): Nhiệt độ/Độ ẩm trung bình 7 ngày qua.
    2. Biểu đồ hiệu suất (Pie Chart): So sánh số lần AI tưới vs Người tưới.
    """
    # --- 1. Xử lý Biểu đồ Môi trường (Line Chart) ---
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Query lấy nhiệt độ/độ ẩm trung bình theo ngày (Dùng Python xử lý cho đơn giản & tương thích mọi DB)
    # Lấy dữ liệu thô
    logs = db.query(models.SensorData)\
        .filter(models.SensorData.timestamp >= start_date)\
        .all()

    # Gom nhóm theo ngày
    daily_data = {}
    for log in logs:
        day_str = log.timestamp.strftime("%d/%m") # VD: 18/02
        if day_str not in daily_data:
            daily_data[day_str] = {"temp_sum": 0, "hum_sum": 0, "count": 0}
        
        daily_data[day_str]["temp_sum"] += log.temp
        daily_data[day_str]["hum_sum"] += log.hum_air
        daily_data[day_str]["count"] += 1

    # Chuẩn hóa mảng trả về
    labels = []
    temp_values = []
    hum_values = []
    
    # Sắp xếp theo ngày
    sorted_keys = sorted(daily_data.keys(), key=lambda x: datetime.strptime(x + f"/{datetime.now().year}", "%d/%m/%Y"))

    for day in sorted_keys:
        item = daily_data[day]
        labels.append(day)
        temp_values.append(round(item["temp_sum"] / item["count"], 1))
        hum_values.append(round(item["hum_sum"] / item["count"], 1))

    # --- 2. Xử lý Biểu đồ Hiệu suất (Pie Chart) ---
    # Đếm số lần trigger bởi AI vs MANUAL trong 30 ngày qua
    ai_count = db.query(models.ActionLog)\
        .filter(models.ActionLog.trigger == "AI_MODEL")\
        .count()
        
    manual_count = db.query(models.ActionLog)\
        .filter(models.ActionLog.trigger == "MANUAL")\
        .count()

    return {
        "env_trend": {
            "labels": labels,
            "temp": temp_values,
            "hum": hum_values
        },
        "ai_efficiency": {
            "ai": ai_count,
            "manual": manual_count
        }
    }

# ================= API 2: NHẬT KÝ HOẠT ĐỘNG (ACTION LOGS) =================
@router.get("/logs")
def get_action_logs(
    skip: int = 0, 
    limit: int = 20, 
    db: Session = Depends(deps.get_db)
):
    """
    Lấy danh sách nhật ký hoạt động (Phân trang)
    """
    logs = db.query(models.ActionLog)\
        .order_by(desc(models.ActionLog.timestamp))\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    # Trả về list dict đơn giản
    return logs

@router.get("/charts")
@router.get("/charts")
def get_report_charts(db: Session = Depends(deps.get_db)):
    try:
        # --- 1. DỮ LIỆU BIỂU ĐỒ TRÒN (HIỆU SUẤT AI) ---
        ai_count = db.query(models.DeviceLog).filter(models.DeviceLog.trigger == 'AI_MODEL').count()
        manual_count = db.query(models.DeviceLog).filter(models.DeviceLog.trigger != 'AI_MODEL').count()

        # --- 2. DỮ LIỆU BIỂU ĐỒ ĐƯỜNG (XU HƯỚNG MÔI TRƯỜNG 7 NGÀY) ---
        seven_days_ago = datetime.now() - timedelta(days=7)
        sensor_data = db.query(models.SensorData).filter(models.SensorData.timestamp >= seven_days_ago).all()
        
        # Gom nhóm dữ liệu 4 thông số theo từng ngày
        daily_data = {}
        for record in sensor_data:
            day_str = record.timestamp.strftime("%d/%m")
            if day_str not in daily_data:
                daily_data[day_str] = {"temp": [], "hum_soil": [], "hum_air": [], "light": []} # Đã thêm 2 thông số
            
            if record.temp is not None: daily_data[day_str]["temp"].append(record.temp)
            if record.hum_soil is not None: daily_data[day_str]["hum_soil"].append(record.hum_soil)
            if record.hum_air is not None: daily_data[day_str]["hum_air"].append(record.hum_air)
            if record.light is not None: daily_data[day_str]["light"].append(record.light)

        labels, temps, hum_soils, hum_airs, lights = [], [], [], [], []

        # Hàm tiện ích tính trung bình an toàn
        def get_avg(day, key):
            if day in daily_data and len(daily_data[day][key]) > 0:
                return round(sum(daily_data[day][key]) / len(daily_data[day][key]), 1)
            return 0

        # Lấy 7 ngày gần nhất (từ cũ đến mới)
        for i in range(6, -1, -1):
            day_key = (datetime.now() - timedelta(days=i)).strftime("%d/%m")
            labels.append(day_key)
            temps.append(get_avg(day_key, "temp"))
            hum_soils.append(get_avg(day_key, "hum_soil"))
            hum_airs.append(get_avg(day_key, "hum_air")) # Lấy trung bình ẩm khí
            lights.append(get_avg(day_key, "light"))     # Lấy trung bình ánh sáng

        return {
            "env_trend": {
                "labels": labels,
                "temp": temps,
                "hum_soil": hum_soils,
                "hum_air": hum_airs,
                "light": lights
            },
            "ai_efficiency": {
                "ai": ai_count,
                "manual": manual_count
            }
        }
    except Exception as e:
        print("Lỗi API Charts:", e)
        raise HTTPException(status_code=500, detail="Lỗi trích xuất dữ liệu biểu đồ")

@router.get("/logs")
def get_report_logs(limit: int = 50, db: Session = Depends(deps.get_db)):
    """
    API 2: Lấy danh sách 50 hành động tưới tiêu gần nhất
    """
    try:
        # Lấy lịch sử giảm dần theo thời gian
        logs = db.query(models.DeviceLog).order_by(models.DeviceLog.timestamp.desc()).limit(limit).all()
        
        # Format lại cho đúng key mà React cần
        result = []
        for log in logs:
            result.append({
                "log_id": log.id, # (Hoặc log.log_id tùy DB của bạn)
                "timestamp": log.timestamp,
                "device_id": log.device_id,
                "action": log.action,    # VD: "PUMP_ON"
                "trigger": log.trigger,  # VD: "AI_MODEL" hoặc "MANUAL"
                "reason": log.reason     # VD: "Đất khô < 35%"
            })
        return result
    except Exception as e:
        print("Lỗi API Logs:", e)
        raise HTTPException(status_code=500, detail="Lỗi tải lịch sử")