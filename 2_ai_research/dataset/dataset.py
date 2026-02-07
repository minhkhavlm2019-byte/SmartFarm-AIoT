import pandas as pd
import os
import random

# --- CẤU HÌNH ĐƯỜNG DẪN THÔNG MINH ---
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

input_path_root = os.path.join(project_root, 'irrigation_prediction.csv')
input_path_tools = os.path.join(current_dir, 'irrigation_prediction.csv')

if os.path.exists(input_path_root):
    INPUT_FILE = input_path_root
elif os.path.exists(input_path_tools):
    INPUT_FILE = input_path_tools
else:
    INPUT_FILE = None

OUTPUT_FILE = os.path.join(current_dir, 'dataset_processed.csv')

# --------------------------------------

def simulate_hour(temp):
    """
    Hàm giả lập giờ dựa trên nhiệt độ để dữ liệu logic hơn.
    - Nóng (>30 độ): Thường là trưa (10h - 15h)
    - Mát (<25 độ): Thường là đêm hoặc sáng sớm (19h - 06h)
    - Còn lại: Các giờ khác
    """
    if temp > 32:
        return random.randint(11, 14) # Trưa nắng gắt
    elif temp > 28:
        return random.randint(9, 16)  # Ban ngày
    elif temp < 22:
        # Random đêm: 20h -> 23h HOẶC 0h -> 5h
        return random.choice([random.randint(20, 23), random.randint(0, 5)])
    else:
        # Random sáng sớm hoặc chiều tà
        return random.choice([random.randint(6, 9), random.randint(16, 19)])

def process_data():
    if INPUT_FILE is None:
        print(f"❌ LỖI: Không tìm thấy file 'irrigation_prediction.csv'!")
        return

    print(f"📂 Đang đọc dữ liệu từ: {INPUT_FILE}")
    df = pd.read_csv(INPUT_FILE)

    # 1. Chọn cột gốc
    selected_cols = ['Temperature_C', 'Humidity', 'Soil_Moisture', 'Irrigation_Need']
    if not all(col in df.columns for col in selected_cols):
        print("❌ File CSV thiếu cột dữ liệu cần thiết.")
        return

    df_new = df[selected_cols].copy()

    # 2. Đổi tên cho gọn
    df_new.rename(columns={
        'Temperature_C': 'temp',
        'Humidity': 'hum_air',
        'Soil_Moisture': 'hum_soil',
        'Irrigation_Need': 'label_text'
    }, inplace=True)

    # 3. --- QUAN TRỌNG: TẠO CỘT THỜI GIAN (HOUR) ---
    print("⏳ Đang giả lập dữ liệu thời gian (Hour)...")
    # Áp dụng hàm simulate_hour cho từng dòng dựa vào cột temp
    df_new['hour'] = df_new['temp'].apply(simulate_hour)

    # 4. Mã hóa nhãn
    def encode_label(val):
        return 0 if val == 'Low' else 1
    
    df_new['label'] = df_new['label_text'].apply(encode_label)
    
    # 5. Lấy dữ liệu cuối cùng (Thêm cột hour)
    df_final = df_new[['temp', 'hum_air', 'hum_soil', 'hour', 'label']]

    # Lưu file
    df_final.to_csv(OUTPUT_FILE, index=False)
    
    print(f"✅ XỬ LÝ THÀNH CÔNG!")
    print(f"💾 File mới: {OUTPUT_FILE}")
    print("-" * 30)
    print(df_final.head())

if __name__ == "__main__":
    process_data()