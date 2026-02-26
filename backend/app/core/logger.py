# core/logger.py
import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime

# 1. Cấu hình thư mục lưu log
LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# Tên file log theo ngày: logs/app_2024-02-18.log
log_filename = datetime.now().strftime(f"{LOG_DIR}/app_%Y-%m-%d.log")

# 2. Định dạng log (Format)
# Thời gian - Tên Module - Mức độ - Nội dung
formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

def get_logger(name: str):
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG) # Ghi lại tất cả từ Debug trở lên

    # Tránh add handler nhiều lần khi reload
    if not logger.handlers:
        # --- A. Handler ghi ra File (Quan trọng để xem lại) ---
        # Max 5MB/file, lưu tối đa 3 file cũ (backupCount=3)
        file_handler = RotatingFileHandler(
            log_filename, maxBytes=5*1024*1024, backupCount=3, encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO) # File chỉ lưu thông tin quan trọng

        # --- B. Handler hiện ra Console (Để dev nhìn thấy ngay) ---
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(logging.DEBUG)

        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger