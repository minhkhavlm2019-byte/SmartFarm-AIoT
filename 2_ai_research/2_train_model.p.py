import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib

print("=== BƯỚC 2: HUẤN LUYỆN MÔ HÌNH AI CHO XÀ LÁCH ===")

# 1. Load dữ liệu đã được Setup ở Bước 1
data_file = 'lettuce_dataset_ready.csv'
print(f"Đang tải bộ dữ liệu huấn luyện: {data_file}...")
df = pd.read_csv(data_file)

# Tách Features (đầu vào) và Target (đầu ra)
feature_names = ['temp', 'hum_air', 'hum_soil', 'hour']
X = df[feature_names]
y = df['target_action']

# 2. Chia tập Train / Test (Tỉ lệ 80/20)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 3. Cấu hình và Huấn luyện Thuật toán Rừng Ngẫu Nhiên (Random Forest)
print("Đang huấn luyện AI...")
rf_model = RandomForestClassifier(
    n_estimators=100,      
    max_depth=8,           # Chiều sâu 8 giúp mô hình không bị quá phức tạp, tốc độ suy luận < 1ms
    random_state=42,       
    class_weight='balanced'
)

# Tiến hành cho máy học
rf_model.fit(X_train, y_train)

# 4. Đánh giá mô hình
print("\n--- KẾT QUẢ ĐÁNH GIÁ TRÊN TẬP TEST ---")
y_pred = rf_model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)
print(f"Độ chính xác tổng thể (Accuracy): {accuracy * 100:.2f}%\n")

target_names = ['IDLE (0)', 'WATERING (1)', 'MIST_COOLING (2)']
print("Báo cáo phân loại chi tiết:")
print(classification_report(y_test, y_pred, target_names=target_names))

# 5. Lưu mô hình (Lưu ý: Tên file model_tuoi_xalach.pkl bám sát tài liệu đồ án)
model_filename = 'model_tuoi_xalach.pkl'
joblib.dump(rf_model, model_filename)
print(f"✅ Đã lưu tệp mô hình thành công tại: {model_filename}")

# ==========================================
# KHỐI TEST THỬ MÔ PHỎNG THỰC TẾ (ĐÃ FIX WARNING)
# ==========================================
print("\n--- TEST MÔ HÌNH VỚI DỮ LIỆU CẢM BIẾN ---")
# Cấu trúc list test: [temp, hum_air, hum_soil, hour]
test_cases = [
    {"name": "Trưa hè nắng nóng", "data": [35.0, 50.0, 60.0, 12]}, # Kì vọng: 2 (Phun sương)
    {"name": "Sáng sớm đất khô",  "data": [25.0, 65.0, 20.0, 8]},  # Kì vọng: 1 (Tưới nhỏ giọt)
    {"name": "Đêm khuya đất khô", "data": [22.0, 80.0, 20.0, 22]}, # Kì vọng: 0 (IDLE - Hạn chế tưới đêm)
    {"name": "Chiều mát đất ẩm",  "data": [24.0, 70.0, 50.0, 16]}  # Kì vọng: 0 (IDLE)
]

# Vòng lặp test từng trường hợp
for case in test_cases:
    # Bọc mảng dữ liệu thành DataFrame kèm tên cột để triệt tiêu UserWarning
    input_df = pd.DataFrame([case["data"]], columns=feature_names)
    
    # Cho AI dự đoán
    pred = rf_model.predict(input_df)[0]
    action_name = target_names[pred]
    
    # In kết quả
    print(f"[{case['name']}] -> Nhiệt: {case['data'][0]}°C, Ẩm đất: {case['data'][2]}%, Giờ: {case['data'][3]}h")
    print(f"   => AI Quyết định: {action_name}\n")
