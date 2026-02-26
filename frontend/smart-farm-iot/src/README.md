src/
├── assets/                 # Chứa file tĩnh (Ảnh, Icon, CSS global)
│   ├── css/
│   │   └── index.css       # (Copy nội dung style.css cũ vào đây)
│   └── images/
│       └── logo.png
│
├── components/             # Các thành phần UI tái sử dụng (LEGO blocks)
│   ├── common/             # Các component nhỏ dùng chung
│   │   ├── Button.jsx      # Nút bấm (btn-on, btn-off)
│   │   ├── StatusTag.jsx   # Nhãn trạng thái (Online/Offline)
│   │   └── Card.jsx        # Thẻ thông số (Nhiệt độ, độ ẩm)
│   ├── layout/             # Các phần khung giao diện
│   │   ├── Sidebar.jsx     # (Tách từ nav cũ)
│   │   └── Header.jsx      # (Phần hiển thị "Xin chào Admin")
│   └── charts/
│       └── RealtimeChart.jsx # Biểu đồ (Tách riêng để dễ quản lý)
│
├── context/                # Quản lý trạng thái toàn cục (Thay cho localStorage rải rác)
│   └── AuthContext.jsx     # Lưu Token, Role, Hàm Login/Logout
│
├── layouts/                # Bố cục trang
│   ├── MainLayout.jsx      # Bố cục có Sidebar (Dùng cho Dashboard, Users...)
│   └── AuthLayout.jsx      # Bố cục trống (Dùng cho trang Login)
│
├── pages/                  # Các trang màn hình chính (Views)
│   ├── Dashboard.jsx       # (Thay cho dashboard.html)
│   ├── Devices.jsx         # (Thay cho pages/devices.html)
│   ├── Zones.jsx           # (Thay cho pages/zones.html)
│   ├── Users.jsx           # (Thay cho pages/users.html)
│   ├── Login.jsx           # (Thay cho index.html)
│   └── NotFound.jsx        # Trang báo lỗi 404
│
├── services/               # Gọi API (Logic tách biệt)
│   └── api.js              # (Thay cho assets/js/api.js)
│
├── utils/                  # Các hàm tiện ích
│   └── formatters.js       # Hàm format ngày tháng, tiền tệ...
│
├── App.jsx                 # Nơi khai báo Router (Đường dẫn)
└── main.jsx                # Điểm khởi chạy React (Mount vào DOM)

Để chuyển đổi code từ thuần sang ReactJS một cách mượt mà và ít gặp lỗi "cái này thiếu cái kia" (dependency errors), bạn nên viết code theo quy trình **Bottom-Up (Từ dưới lên trên)**. Tức là cái gì cơ bản, độc lập viết trước; cái gì phụ thuộc vào người khác thì viết sau.

Dưới đây là thứ tự viết code tối ưu nhất cho cấu trúc bạn đã đưa ra:

### GIAI ĐOẠN 1: NỀN TẢNG (Foundation)

*Viết những file không phụ thuộc vào ai cả.*

1. **`src/assets/css/index.css`**:
* Copy toàn bộ nội dung `style.css` cũ vào đây.
* Import nó vào `main.jsx` ngay lập tức để đảm bảo ứng dụng có giao diện đàng hoàng.


2. **`src/utils/formatters.js`**:
* Viết các hàm format ngày tháng, tiền tệ. File này độc lập hoàn toàn.


3. **`src/services/api.js`**:
* Chuyển các hàm `fetchAPI` cũ sang dạng module (export const).
* Đây là "xương sống" dữ liệu, các trang khác đều cần nó để chạy.



### GIAI ĐOẠN 2: THÀNH PHẦN CƠ BẢN (Atomic Components)

*Những viên gạch nhỏ để xây nhà.*

4. **`src/components/common/*`** (`Button.jsx`, `StatusTag.jsx`, `Card.jsx`):
* Viết xong các nút bấm, thẻ hiển thị trạng thái.
* Những cái này chỉ nhận `props` và hiển thị, rất dễ test.


5. **`src/components/charts/RealtimeChart.jsx`**:
* Cài đặt `react-chartjs-2`.
* Viết component biểu đồ nhận dữ liệu đầu vào là mảng history.



### GIAI ĐOẠN 3: QUẢN LÝ TRẠNG THÁI (State Management)

*Bộ não của ứng dụng.*

6. **`src/context/AuthContext.jsx`**:
* Xây dựng `AuthProvider`.
* Viết logic: Kiểm tra `localStorage`, hàm `login()` (gọi api.js), hàm `logout()`.
* Lý do viết lúc này: Vì Sidebar và các trang sau này đều cần biết "User là ai?" để hiển thị.



### GIAI ĐOẠN 4: KHUNG GIAO DIỆN (Layouts)

*Dựng khung nhà và vách ngăn.*

7. **`src/components/layout/Sidebar.jsx`** & **`Header.jsx`**:
* Sidebar cần dùng `AuthContext` (để check role ẩn menu) và `Link` (để chuyển trang).


8. **`src/layouts/AuthLayout.jsx`**:
* Layout đơn giản cho trang Login (chỉ có `Outlet` nằm giữa background).


9. **`src/layouts/MainLayout.jsx`**:
* Gom `Sidebar` và `Header` vào đây.
* Đặt `Outlet` vào phần nội dung chính.



### GIAI ĐOẠN 5: CÁC TRANG CHỨC NĂNG (Pages)

*Lắp nội thất vào từng phòng.*

10. **`src/pages/Login.jsx`**:
* Viết form đăng nhập.
* Kết nối với `AuthContext` để gọi hàm `login`.


11. **`src/pages/Dashboard.jsx`**:
* Import `RealtimeChart`, `Card`.
* Dùng `useEffect` gọi `api.js` lấy dữ liệu.


12. **`src/pages/Devices.jsx`**, **`Zones.jsx`**, **`Users.jsx`**:
* Tương tự Dashboard, chuyển logic từ file JS cũ sang.


13. **`src/pages/NotFound.jsx`**:
* Trang báo lỗi đơn giản.



### GIAI ĐOẠN 6: KẾT NỐI (Routing & Entry Point)

*Đấu điện và mở cửa.*

14. **`src/App.jsx`**:
* Khai báo `BrowserRouter`, `Routes`.
* Định nghĩa các `Route` trỏ đến các Pages đã viết ở Giai đoạn 5.
* Bọc `AuthProvider` ra ngoài cùng.


15. **`src/main.jsx`**:
* File này thường Vite tự tạo, chỉ cần kiểm tra xem đã import CSS và render `App` chưa.



---

### 💡 Mẹo thực chiến (Pro Tip):

Đừng viết hết 100% rồi mới chạy thử. Hãy làm theo kiểu **"Cuốn chiếu"**:

1. Setup `api.js` và `AuthContext`.
2. Viết `Login.jsx` + `App.jsx` -> **Chạy thử:** Đăng nhập được, lưu token được là OK.
3. Viết `MainLayout` + `Sidebar`.
4. Viết `Dashboard.jsx` -> **Chạy thử:** Thấy biểu đồ hiện lên là thành công lớn.
5. Sau đó mới làm tiếp các trang Devices, Users...

Cách này giúp bạn debug lỗi ngay lập tức nếu có vấn đề, thay vì viết xong cả đống rồi không biết lỗi ở đâu.