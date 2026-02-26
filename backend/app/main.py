import threading
import asyncio
from datetime import datetime, timedelta # [THÊM MỚI] Để tính toán thời gian
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import các module của dự án
from core.config import settings
from db.init_db import init_db
from db.session import SessionLocal
from services.mqtt_service import client as mqtt_client 
from api.v1.api import api_router

from services.irrigation_logic import auto_irrigation_task 
from models.models import Device # [THÊM MỚI] Import model Device để check DB

# ========================================================
# [THÊM MỚI] TIẾN TRÌNH WATCHDOG (CHÓ CANH GÁC)
# ========================================================
async def watchdog_task():
    """Hàm chạy ngầm kiểm tra mạch rớt mạng mỗi 60 giây"""
    while True:
        await asyncio.sleep(60) # Cứ 1 phút đi tuần 1 lần
        
        db = SessionLocal()
        try:
            # Quy định: 5 phút không có tín hiệu -> Tuyên án OFFLINE
            timeout_threshold = datetime.now() - timedelta(minutes=5)
            
            # Tìm các mạch đang ONLINE nhưng đã bặt vô âm tín quá 5 phút
            offline_devices = db.query(Device).filter(
                Device.status == "ONLINE",
                Device.last_seen < timeout_threshold
            ).all()
            
            for dev in offline_devices:
                dev.status = "OFFLINE"
                print(f"🚨 [WATCHDOG] CẢNH BÁO: Thiết bị '{dev.name}' đã mất kết nối!")
            
            if offline_devices:
                db.commit() # Lưu thay đổi vào DB
                
        except Exception as e:
            print(f"❌ Lỗi Watchdog: {e}")
        finally:
            db.close() # Rất quan trọng: Phải đóng DB để không tràn RAM

# --- CẤU HÌNH VÒNG ĐỜI ỨNG DỤNG (LIFESPAN) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ================= KHỞI ĐỘNG (STARTUP) =================
    print("🚀 System Starting...")

    try:
        db = SessionLocal()
        init_db(db)
        db.close()
        print("✅ Database initialized")
    except Exception as e:
        print(f"❌ Database Init Error: {e}")

    try:
        mqtt_thread = threading.Thread(target=mqtt_client.loop_forever)
        mqtt_thread.daemon = True 
        mqtt_thread.start()
        print("📡 MQTT Service Started")
    except Exception as e:
        print(f"❌ MQTT Start Error: {e}")

    try:
        ai_task = asyncio.create_task(auto_irrigation_task())
        print("🤖 AI Auto-Irrigation Task Started")
    except Exception as e:
        print(f"❌ AI Task Start Error: {e}")

    # [THÊM MỚI] Xích con chó canh gác vào hệ thống
    try:
        watchdog_process = asyncio.create_task(watchdog_task())
        print("🐕 Watchdog Task Started (Scanning every 60s)")
    except Exception as e:
        print(f"❌ Watchdog Task Start Error: {e}")

    yield # <--- Server chạy tại đây (Chờ request)

    # ================= TẮT (SHUTDOWN) =================
    print("🛑 System Shutting down...")
    
    try:
        ai_task.cancel()
        watchdog_process.cancel() # [THÊM MỚI] Tắt chó canh gác
        print("🛑 Background Tasks Stopped")
    except Exception:
        pass

    try:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("📴 MQTT Disconnected")
    except Exception as e:
        pass

# --- KHỞI TẠO APP ---
app = FastAPI(
    title=getattr(settings, "PROJECT_NAME", "Smart Farm AIoT System"),
    lifespan=lifespan
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

api_prefix = getattr(settings, "API_V1_STR", "/api/v1")
app.include_router(api_router, prefix=api_prefix)

@app.get("/")
def root():
    return {"message": "Welcome to Smart Farm AIoT System API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
# import threading
# import asyncio # [THÊM MỚI] Dùng để chạy đa luồng cho các hàm async
# from contextlib import asynccontextmanager
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# # Import các module của dự án
# from core.config import settings
# from db.init_db import init_db
# from db.session import SessionLocal
# from services.mqtt_service import client as mqtt_client 
# from api.v1.api import api_router

# # [THÊM MỚI] Import tiến trình AI Giám sát tự động
# from services.irrigation_logic import auto_irrigation_task 

# # --- CẤU HÌNH VÒNG ĐỜI ỨNG DỤNG (LIFESPAN) ---
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
#     try:
#         mqtt_thread = threading.Thread(target=mqtt_client.loop_forever)
#         mqtt_thread.daemon = True 
#         mqtt_thread.start()
#         print("📡 MQTT Service Started")
#     except Exception as e:
#         print(f"❌ MQTT Start Error: {e}")

#     # 3. [THÊM MỚI] KHỞI CHẠY BỘ NÃO AI TỰ ĐỘNG
#     try:
#         # Dùng asyncio.create_task để vòng lặp while True chạy ngầm mà không làm đơ Server
#         ai_task = asyncio.create_task(auto_irrigation_task())
#         print("🤖 AI Auto-Irrigation Task Started")
#     except Exception as e:
#         print(f"❌ AI Task Start Error: {e}")

#     yield # <--- Server chạy tại đây (Chờ request)

#     # ================= TẮT (SHUTDOWN) =================
#     print("🛑 System Shutting down...")
    
#     # [THÊM MỚI] Tắt tiến trình AI cho gọn gàng
#     try:
#         ai_task.cancel()
#         print("🛑 AI Auto-Irrigation Task Stopped")
#     except Exception:
#         pass

#     try:
#         mqtt_client.loop_stop()
#         mqtt_client.disconnect()
#         print("📴 MQTT Disconnected")
#     except Exception as e:
#         pass

# # --- KHỞI TẠO APP ---
# app = FastAPI(
#     title=getattr(settings, "PROJECT_NAME", "Smart Farm AIoT System"),
#     lifespan=lifespan
# )

# # --- CẤU HÌNH CORS (QUAN TRỌNG CHO REACT) ---
# origins = [
#     "http://localhost:5173", # Vite React
#     "http://127.0.0.1:5173",
#     "http://localhost:3000",
#     "*" # Cho phép tất cả (Cân nhắc khi deploy thật)
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins, 
#     allow_credentials=True,
#     allow_methods=["*"], 
#     allow_headers=["*"], 
# )

# # --- ĐĂNG KÝ ROUTER ---
# api_prefix = getattr(settings, "API_V1_STR", "/api/v1")
# app.include_router(api_router, prefix=api_prefix)

# @app.get("/")
# def root():
#     return {
#         "message": "Welcome to Smart Farm AIoT System API",
#         "docs": "/docs",
#         "redoc": "/redoc"
#     }

# if __name__ == "__main__":
#     import uvicorn
#     # reload=True giúp server tự restart khi bạn sửa code
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
# import threading
# from contextlib import asynccontextmanager
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# # Import các module của dự án
# from core.config import settings
# from db.init_db import init_db
# from db.session import SessionLocal
# from services.mqtt_service import client as mqtt_client 
# from api.v1.api import api_router

# from services.irrigation_logic import auto_irrigation_task

# # --- CẤU HÌNH VÒNG ĐỜI ỨNG DỤNG (LIFESPAN) ---
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
#     try:
#         mqtt_thread = threading.Thread(target=mqtt_client.loop_forever)
#         mqtt_thread.daemon = True 
#         mqtt_thread.start()
#         print("📡 MQTT Service Started")
#     except Exception as e:
#         print(f"❌ MQTT Start Error: {e}")

#     yield # <--- Server chạy tại đây (Chờ request)

#     # ================= TẮT (SHUTDOWN) =================
#     print("🛑 System Shutting down...")
#     try:
#         mqtt_client.loop_stop()
#         mqtt_client.disconnect()
#         print("📴 MQTT Disconnected")
#     except Exception as e:
#         pass

# # --- KHỞI TẠO APP ---
# app = FastAPI(
#     title=getattr(settings, "PROJECT_NAME", "Smart Farm AIoT System"),
#     lifespan=lifespan
# )

# # --- CẤU HÌNH CORS (QUAN TRỌNG CHO REACT) ---
# origins = [
#     "http://localhost:5173", # Vite React
#     "http://127.0.0.1:5173",
#     "http://localhost:3000",
#     "*" # Cho phép tất cả (Cân nhắc khi deploy thật)
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins, 
#     allow_credentials=True,
#     allow_methods=["*"], 
#     allow_headers=["*"], 
# )

# # --- ĐĂNG KÝ ROUTER ---
# api_prefix = getattr(settings, "API_V1_STR", "/api/v1")
# app.include_router(api_router, prefix=api_prefix)

# @app.get("/")
# def root():
#     return {
#         "message": "Welcome to Smart Farm AIoT System API",
#         "docs": "/docs",
#         "redoc": "/redoc"
#     }

# if __name__ == "__main__":
#     import uvicorn
#     # reload=True giúp server tự restart khi bạn sửa code
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
# import threading
# import os
# from contextlib import asynccontextmanager
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles
# from fastapi.responses import FileResponse

# # Import các module của dự án
# from core.config import settings
# from db.init_db import init_db
# from db.session import SessionLocal
# from services.mqtt_service import client as mqtt_client 
# from api.v1.api import api_router

# # --- CẤU HÌNH VÒNG ĐỜI ỨNG DỤNG (LIFESPAN) ---
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # ================= KHỞI ĐỘNG =================
#     print(" System Starting...")

#     # 1. Khởi tạo Database
#     try:
#         db = SessionLocal()
#         init_db(db)
#         db.close()
#         print("Database initialized")
#     except Exception as e:
#         print(f"Database Init Error: {e}")

#     # 2. Khởi chạy MQTT Daemon Thread
#     try:
#         mqtt_thread = threading.Thread(target=mqtt_client.loop_forever)
#         mqtt_thread.daemon = True 
#         mqtt_thread.start()
#         print("MQTT Service Started")
#     except Exception as e:
#         print(f"MQTT Start Error: {e}")

#     yield # <--- Server chạy tại đây

#     # ================= TẮT =================
#     print("System Shutting down...")
#     try:
#         mqtt_client.loop_stop()
#         mqtt_client.disconnect()
#         print("MQTT Disconnected")
#     except Exception as e:
#         pass

# # --- KHỞI TẠO APP ---
# project_title = getattr(settings, "PROJECT_NAME", "Smart Farm AIoT System")

# app = FastAPI(
#     title=project_title,
#     lifespan=lifespan
# )

# # --- 1. CẤU HÌNH CORS (QUAN TRỌNG CHO REACT JS) ---
# # React dev server thường chạy ở port 5173 (Vite) hoặc 3000 (CRA)
# origins = [
#     "http://localhost:5173", # Vite React Default
#     "http://localhost:3000", # Create React App Default
#     "http://127.0.0.1:5173",
#     "*" # Cho phép tất cả (chỉ dùng khi dev, production nên giới hạn lại)
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins, 
#     allow_credentials=True,
#     allow_methods=["*"], 
#     allow_headers=["*"], 
# )

# # --- 2. ĐĂNG KÝ API ROUTER ---
# # API phải được đăng ký TRƯỚC các route tĩnh để tránh bị override
# api_prefix = getattr(settings, "API_V1_STR", "/api/v1")
# app.include_router(api_router, prefix=api_prefix)


# # --- 3. CẤU HÌNH PHỤC VỤ REACT FRONTEND (SPA MODE) ---
# # Logic: React build ra thư mục 'dist' (hoặc 'build'). FastAPI sẽ phục vụ thư mục đó.

# # Tìm đường dẫn gốc
# current_file_path = os.path.abspath(__file__)
# backend_app_dir = os.path.dirname(current_file_path) # backend/app
# backend_dir = os.path.dirname(backend_app_dir)       # backend
# project_root = os.path.dirname(backend_dir)          # ROOT

# # Đường dẫn tới thư mục build của React (Thường là 'dist' nếu dùng Vite, 'build' nếu dùng CRA)
# # Hãy đảm bảo bạn đã chạy lệnh `npm run build` trong thư mục frontend
# frontend_dist_dir = os.path.join(project_root, "frontend", "dist") 

# # Kiểm tra xem thư mục build có tồn tại không
# if os.path.exists(frontend_dist_dir):
#     print(f"Frontend build found at: {frontend_dist_dir}")
    
#     # A. Mount thư mục assets (css, js, images)
#     # React Vite build thường gom static vào thư mục assets
#     app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_dir, "assets")), name="assets")

#     # B. Catch-all Route cho SPA (Single Page Application)
#     # Mọi đường dẫn không phải API (VD: /dashboard, /login) đều trả về index.html
#     # React Router ở phía client sẽ lo việc hiển thị nội dung đúng.
#     @app.get("/{full_path:path}")
#     async def serve_react_app(full_path: str):
#         # Nếu file tồn tại thực sự (vd favicon.ico), trả về file đó
#         file_path = os.path.join(frontend_dist_dir, full_path)
#         if os.path.exists(file_path) and os.path.isfile(file_path):
#             return FileResponse(file_path)
        
#         # Nếu không, trả về index.html để React Router xử lý
#         return FileResponse(os.path.join(frontend_dist_dir, "index.html"))

# else:
#     print(f"WARNING: Frontend build directory NOT found at {frontend_dist_dir}")
#     print("Please run 'npm run build' in frontend folder if you want to serve UI via FastAPI.")
    
#     @app.get("/")
#     def root():
#         return {
#             "message": "API is running",
#             "instruction": "Frontend not connected/built. Access docs at /docs"
#         }

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
#==========================
# import threading
# import os
# from contextlib import asynccontextmanager
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles
# from fastapi.responses import FileResponse

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
#     print("System Starting...")

#     # 1. Khởi tạo Database & Admin
#     try:
#         db = SessionLocal()
#         init_db(db)
#         db.close()
#         print("Database initialized")
#     except Exception as e:
#         print(f"Database Init Error: {e}")

#     # 2. Khởi chạy MQTT trong luồng riêng (Daemon Thread)
#     # Phải dùng Thread để không chặn API Server
#     try:
#         mqtt_thread = threading.Thread(target=mqtt_client.loop_forever)
#         mqtt_thread.daemon = True # Tự tắt khi chương trình chính tắt
#         mqtt_thread.start()
#         print("MQTT Service Started in Background")
#     except Exception as e:
#         print(f"MQTT Start Error: {e}")

#     yield # <--- Server chạy tại đây

#     # ================= TẮT (SHUTDOWN) =================
#     print("System Shutting down...")
#     try:
#         mqtt_client.loop_stop()
#         mqtt_client.disconnect()
#         print("MQTT Disconnected")
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

# # --- CẤU HÌNH FRONTEND (STATIC FILES) ---

# # 1. Xác định đường dẫn thư mục frontend (Ngang hàng với backend)
# # backend/app/main.py -> backend/app -> backend -> ROOT -> frontend
# current_file_path = os.path.abspath(__file__)
# project_root = os.path.dirname(os.path.dirname(os.path.dirname(current_file_path)))
# frontend_dir = os.path.join(project_root, "frontend")

# # Kiểm tra thư mục frontend có tồn tại không để báo lỗi dễ debug
# if os.path.exists(frontend_dir):
#     print(f"Frontend directory found at: {frontend_dir}")
    
#     # 2. Mount các thư mục tài nguyên (assets, pages)
#     # Giúp HTML load được css/js qua đường dẫn /assets/... và /pages/...
#     app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")
#     app.mount("/pages", StaticFiles(directory=os.path.join(frontend_dir, "pages")), name="pages")

#     # 3. Route cho Trang chủ (Login)
#     @app.get("/")
#     async def read_root():
#         return FileResponse(os.path.join(frontend_dir, "index.html"))

#     # 4. Route phục vụ các file HTML gốc (đề phòng trường hợp gọi trực tiếp)
#     @app.get("/index.html")
#     async def read_index():
#         return FileResponse(os.path.join(frontend_dir, "index.html"))

#     @app.get("/dashboard.html")
#     async def read_dashboard():
#         return FileResponse(os.path.join(frontend_dir, "dashboard.html"))

#     @app.get("/dashboard")
#     async def read_dashboard_route():
#         return FileResponse(os.path.join(frontend_dir, "dashboard.html"))

# else:
#     print(f"WARNING: Frontend directory NOT found at {frontend_dir}")
#     @app.get("/")
#     def root():
#         return {"message": "Frontend not found, but API is running."}

# # Đoạn này giúp bạn chạy file bằng lệnh: python main.py
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
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