TechDashboard.jsx (Trang chủ KTV): Nơi đập vào mắt đầu tiên khi login. Hiển thị các KPI khẩn cấp (Bao nhiêu máy mất kết nối, bao nhiêu máy sắp sập nguồn) và các nút thao tác nhanh.

TechZones.jsx (Danh sách Khu vực): Hiển thị các nhà màng/vườn mà KTV này được phân công quản lý (hiển thị dạng thẻ/card cho dễ nhìn).

ZoneDetail.jsx (Chi tiết Khu vực): Khi KTV bấm vào 1 thẻ ở trang số 2 thì sẽ nhảy sang đây. Nơi này dùng để soi biểu đồ cảm biến, xem danh sách thiết bị cụ thể của riêng vườn đó. (Trang này hôm trước chúng ta đã làm nháp được một phần rồi).

TechDeviceManagement.jsx (Kho Thiết Bị): Nơi làm việc với phần cứng. Dùng để khai báo thiết bị mới, đổi địa chỉ MAC (device_id) khi thay bo mạch bị hỏng, và nhập hệ số hiệu chuẩn (Calibration) nếu cảm biến bị lệch.

SystemLogs.jsx (Nhật ký Hệ thống): Bảng "điều tra phá án". Nơi xem lại toàn bộ lịch sử thiết bị như: lúc nào thì mất mạng, Watchdog reset lúc mấy giờ, AI hay Nông dân đã ra lệnh bơm nước...