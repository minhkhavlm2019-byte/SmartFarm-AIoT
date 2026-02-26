import pandas as pd

print("=== BƯỚC 1: XÂY DỰNG DATASET CHO CÂY XÀ LÁCH ===")

# 1. Tải dữ liệu thô ban đầu
input_file = 'dataset_processed.csv'
output_file = 'lettuce_dataset_ready.csv'

print(f"Đang tải dữ liệu từ {input_file}...")
df = pd.read_csv(input_file)

# 2. Khai báo hàm gán nhãn dựa trên sinh lý cây Xà Lách
def labeling_lettuce(row):
    temp = row['temp']
    hum_soil = row['hum_soil']
    hour = row['hour']
    
    # Xà lách hạn chế tưới đêm để tránh nấm bệnh (Giả sử đêm là từ 18h tối đến 5h sáng)
    is_night = (hour >= 18) or (hour <= 5)
    
    # Ưu tiên 1: CẢNH BÁO SỐC NHIỆT (Class 2)
    # Nhiệt độ >= 32 độ C -> Bật phun sương làm mát ngay lập tức
    if temp >= 32.0:
        return 2 
        
    # Ưu tiên 2: TƯỚI TIÊU BÌNH THƯỜNG (Class 1)
    # Đất khô (< 35%), trời không quá nóng và KHÔNG PHẢI BAN ĐÊM -> Mở nhỏ giọt tưới gốc
    elif hum_soil < 35.0 and not is_night:
        return 1 
        
    # Ưu tiên 3: IDLE - KHÔNG LÀM GÌ CẢ (Class 0)
    # Các trường hợp còn lại: Đất đủ ẩm, hoặc đang là ban đêm không cần tưới
    else:
        return 0

# 3. Tạo cột nhãn mục tiêu (target) mới
print("Đang áp dụng luật Sinh học để gán nhãn 3 mức: IDLE(0), WATERING(1), MIST_COOLING(2)...")
df['target_action'] = df.apply(labeling_lettuce, axis=1)

# Xóa cột 'label' cũ (nhị phân 0-1) nếu không cần thiết nữa
if 'label' in df.columns:
    df = df.drop(columns=['label'])

# 4. Hiển thị thống kê và Lưu file
print("\nThống kê số lượng các nhãn trong Dataset mới:")
print(df['target_action'].value_counts().rename({
    0: '0 - IDLE (Không tưới)',
    1: '1 - WATERING (Tưới nhỏ giọt)',
    2: '2 - MIST_COOLING (Phun sương)'
}))

df.to_csv(output_file, index=False)
print(f"\n✅ Đã lưu bộ dữ liệu chuẩn bị cho AI tại: {output_file}")
