import threading
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Import các module của dự án
from core.config import settings
from db.init_db import init_db
from db.session import SessionLocal
# Lưu ý: Import biến 'client' từ mqtt_service để tự điều khiển luồng
from services.mqtt_service import client as mqtt_client 
from api.v1.api import api_router

# --- CẤU HÌNH VÒNG ĐỜI ỨNG DỤNG (LIFESPAN) ---
# Thay thế cho @app.on_event("startup") đã lỗi thời
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ================= KHỞI ĐỘNG (STARTUP) =================
    print("System Starting...")

    # 1. Khởi tạo Database & Admin
    try:
        db = SessionLocal()
        init_db(db)
        db.close()
        print("Database initialized")
    except Exception as e:
        print(f"Database Init Error: {e}")

    # 2. Khởi chạy MQTT trong luồng riêng (Daemon Thread)
    # Phải dùng Thread để không chặn API Server
    try:
        mqtt_thread = threading.Thread(target=mqtt_client.loop_forever)
        mqtt_thread.daemon = True # Tự tắt khi chương trình chính tắt
        mqtt_thread.start()
        print("MQTT Service Started in Background")
    except Exception as e:
        print(f"MQTT Start Error: {e}")

    yield # <--- Server chạy tại đây

    # ================= TẮT (SHUTDOWN) =================
    print("System Shutting down...")
    try:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("MQTT Disconnected")
    except Exception as e:
        pass

# --- KHỞI TẠO APP ---
# Kiểm tra xem settings có PROJECT_NAME không, nếu không dùng tên mặc định
project_title = getattr(settings, "PROJECT_NAME", "Smart Farm AIoT System")

app = FastAPI(
    title=project_title,
    lifespan=lifespan # Gắn hàm lifespan vào đây
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# 3. Đăng ký các API Router
# Kiểm tra xem settings có API_V1_STR không, nếu lỗi thì sửa trong core/config.py
api_prefix = getattr(settings, "API_V1_STR", "/api/v1")
app.include_router(api_router, prefix=api_prefix)

# --- CẤU HÌNH FRONTEND (STATIC FILES) ---

# 1. Xác định đường dẫn thư mục frontend (Ngang hàng với backend)
# backend/app/main.py -> backend/app -> backend -> ROOT -> frontend
current_file_path = os.path.abspath(__file__)
project_root = os.path.dirname(os.path.dirname(os.path.dirname(current_file_path)))
frontend_dir = os.path.join(project_root, "frontend")

# Kiểm tra thư mục frontend có tồn tại không để báo lỗi dễ debug
if os.path.exists(frontend_dir):
    print(f"Frontend directory found at: {frontend_dir}")
    
    # 2. Mount các thư mục tài nguyên (assets, pages)
    # Giúp HTML load được css/js qua đường dẫn /assets/... và /pages/...
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")
    app.mount("/pages", StaticFiles(directory=os.path.join(frontend_dir, "pages")), name="pages")

    # 3. Route cho Trang chủ (Login)
    @app.get("/")
    async def read_root():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    # 4. Route phục vụ các file HTML gốc (đề phòng trường hợp gọi trực tiếp)
    @app.get("/index.html")
    async def read_index():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/dashboard.html")
    async def read_dashboard():
        return FileResponse(os.path.join(frontend_dir, "dashboard.html"))

    @app.get("/dashboard")
    async def read_dashboard_route():
        return FileResponse(os.path.join(frontend_dir, "dashboard.html"))

else:
    print(f"WARNING: Frontend directory NOT found at {frontend_dir}")
    @app.get("/")
    def root():
        return {"message": "Frontend not found, but API is running."}

# Đoạn này giúp bạn chạy file bằng lệnh: python main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
# import threading
# from contextlib import asynccontextmanager
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# # Import các module của dự án
# from core.config import settings
# from db.init_db import init_db
# from db.session import SessionLocal
# # Lưu ý: Import biến 'client' từ mqtt_service để tự điều khiển luồng
# from services.mqtt_service import client as mqtt_client 
# from api.v1.api import api_router

# # --- CẤU HÌNH VÒNG ĐỜI ỨNG DỤNG (LIFESPAN) ---
# # Thay thế cho @app.on_event("startup") đã lỗi thời
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # ================= KHỞI ĐỘNG (STARTUP) =================
#     print("🚀 System Starting...")

#     # 1. Khởi tạo Database & Admin
#     try:
#         db = SessionLocal()
#         init_db(db)
#         db.close()
#         print("✅ Database initialized")
#     except Exception as e:
#         print(f"❌ Database Init Error: {e}")

#     # 2. Khởi chạy MQTT trong luồng riêng (Daemon Thread)
#     # Phải dùng Thread để không chặn API Server
#     try:
#         mqtt_thread = threading.Thread(target=mqtt_client.loop_forever)
#         mqtt_thread.daemon = True # Tự tắt khi chương trình chính tắt
#         mqtt_thread.start()
#         print("📡 MQTT Service Started in Background")
#     except Exception as e:
#         print(f"❌ MQTT Start Error: {e}")

#     yield # <--- Server chạy tại đây

#     # ================= TẮT (SHUTDOWN) =================
#     print("🛑 System Shutting down...")
#     try:
#         mqtt_client.loop_stop()
#         mqtt_client.disconnect()
#         print("📴 MQTT Disconnected")
#     except Exception as e:
#         pass

# # --- KHỞI TẠO APP ---
# # Kiểm tra xem settings có PROJECT_NAME không, nếu không dùng tên mặc định
# project_title = getattr(settings, "PROJECT_NAME", "Smart Farm AIoT System")

# app = FastAPI(
#     title=project_title,
#     lifespan=lifespan # Gắn hàm lifespan vào đây
# )

# # Cấu hình CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"], 
#     allow_credentials=True,
#     allow_methods=["*"], 
#     allow_headers=["*"], 
# )

# # 3. Đăng ký các API Router
# # Kiểm tra xem settings có API_V1_STR không, nếu lỗi thì sửa trong core/config.py
# api_prefix = getattr(settings, "API_V1_STR", "/api/v1")
# app.include_router(api_router, prefix=api_prefix)

# @app.get("/")
# def root():
#     return {"message": "Welcome to Smart Farm AIoT System"}

# # Đoạn này giúp bạn chạy file bằng lệnh: python main.py
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)