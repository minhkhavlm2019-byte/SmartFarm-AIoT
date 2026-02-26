import React, { useEffect, useState, useRef } from 'react';
import RealtimeChart from '../../components/charts/RealtimeChart';
import { api } from '../../services/api';

const FarmerView = ({ user }) => {
    // State
    const [gardens, setGardens] = useState([]);
    const [selectedGarden, setSelectedGarden] = useState(null);
    const [stats, setStats] = useState({ temp: 0, hum: 0, soil: 0, light: 0 });
    const [historyData, setHistoryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const pollingRef = useRef(null);

    // 1. Lấy danh sách tất cả các vườn thuộc quản lý
    useEffect(() => {
        const fetchGardens = async () => {
            try {
                const data = await api.devices.getAll();
                // data trả về: [{device_id, name, status, location, ...}]
                if (data && data.length > 0) {
                    setGardens(data);
                    setSelectedGarden(data[0]); // Mặc định chọn cái đầu để hiện chi tiết
                }
            } catch (error) {
                console.error("Lỗi tải vườn:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchGardens();
    }, []);

    // 2. Polling dữ liệu chi tiết cho vườn ĐANG CHỌN
    useEffect(() => {
        if (!selectedGarden) return;

        const fetchData = async () => {
            try {
                const history = await api.devices.getHistory(selectedGarden.device_id, 20);
                if (history && history.length > 0) {
                    setHistoryData([...history].reverse());
                    const latest = history[0];
                    setStats({
                        temp: latest.temp ?? 0,
                        hum: latest.hum_air ?? 0,
                        soil: latest.hum_soil ?? 0,
                        light: latest.light ?? 0
                    });
                }
            } catch (error) {
                console.error("Lỗi polling:", error);
            }
        };

        fetchData();
        pollingRef.current = setInterval(fetchData, 3000);
        return () => clearInterval(pollingRef.current);
    }, [selectedGarden]);

    // --- RENDER ---
    
    // 1. Loading
    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-64 text-emerald-600">
            <i className="fas fa-spinner fa-spin text-3xl mb-3"></i>
            <p>Đang tải dữ liệu vườn...</p>
        </div>
    );

    // 2. Không có dữ liệu
    if (gardens.length === 0) return (
        <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <i className="fas fa-seedling text-4xl text-slate-300 mb-3"></i>
            <h3 className="text-lg font-bold text-slate-600">Bạn chưa quản lý vườn nào</h3>
            <p className="text-slate-500">Vui lòng liên hệ Kỹ thuật viên để được cấp quyền.</p>
        </div>
    );

    return (
        <div className="space-y-8 fade-in">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Tổng quan Nông Trại</h2>
                <p className="text-slate-500">Xin chào, bác {user?.full_name}. Chúc bác một vụ mùa bội thu!</p>
            </div>

            {/* PHẦN 1: DANH SÁCH CÁC KHU VỰC (Tổng quan) */}
            <div>
                <h3 className="font-bold text-slate-700 mb-3 flex items-center">
                    <i className="fas fa-th-large mr-2 text-emerald-600"></i> Khu vực quản lý
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {gardens.map(garden => {
                        const isSelected = selectedGarden?.device_id === garden.device_id;
                        // Giả sử API trả về status: 'ONLINE' hoặc 'OFFLINE'
                        const isOnline = (garden.status || 'ONLINE') === 'ONLINE'; 

                        return (
                            <button
                                key={garden.device_id}
                                onClick={() => setSelectedGarden(garden)}
                                className={`p-4 rounded-xl text-left transition-all border relative overflow-hidden
                                    ${isSelected 
                                        ? 'bg-emerald-600 text-white shadow-lg border-emerald-600 transform scale-105' 
                                        : 'bg-white text-slate-600 hover:bg-emerald-50 border-slate-200'
                                    }
                                `}
                            >
                                <div className="font-bold truncate">{garden.name}</div>
                                <div className="text-xs opacity-80 mb-2">{garden.location || 'Chưa định vị'}</div>
                                
                                {/* Trạng thái đèn báo */}
                                <div className="flex items-center gap-2 text-xs font-bold">
                                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`}></span>
                                    {isOnline ? 'Hoạt động' : 'Mất kết nối'}
                                </div>

                                {/* Icon trang trí */}
                                <i className={`fas fa-leaf absolute bottom-[-10px] right-[-10px] text-6xl opacity-10 
                                    ${isSelected ? 'text-white' : 'text-emerald-800'}`}></i>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* PHẦN 2: CHI TIẾT VƯỜN ĐANG CHỌN */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">
                            Chi tiết: {selectedGarden?.name}
                        </h3>
                        <p className="text-sm text-slate-500">Dữ liệu cập nhật trực tiếp từ cảm biến</p>
                    </div>
                    {/* Nút chuyển nhanh sang trang điều khiển */}
                    <a href="/dashboard/devices" className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-bold shadow-sm hover:shadow-md transition-all border border-emerald-100 flex items-center gap-2">
                        <i className="fas fa-gamepad"></i> Điều khiển thiết bị này
                    </a>
                </div>

                {/* Thẻ thông số */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard label="Nhiệt độ" value={stats.temp} unit="°C" icon="fas fa-thermometer-half" color="red" />
                    <StatCard label="Độ ẩm KK" value={stats.hum} unit="%" icon="fas fa-tint" color="blue" />
                    <StatCard label="Độ ẩm Đất" value={stats.soil} unit="%" icon="fas fa-seedling" color="emerald" />
                    <StatCard label="Ánh sáng" value={stats.light} unit=" Lux" icon="fas fa-sun" color="yellow" />
                </div>

                {/* Biểu đồ */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="h-80 w-full">
                        <RealtimeChart historyData={historyData} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component thẻ nhỏ
const StatCard = ({ label, value, unit, icon, color }) => (
    <div className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 border-${color}-500 flex justify-between items-center`}>
        <div>
            <p className="text-slate-400 text-xs font-bold uppercase">{label}</p>
            <p className={`text-2xl font-bold text-slate-700`}>{value}{unit}</p>
        </div>
        <div className={`w-10 h-10 rounded-full bg-${color}-50 text-${color}-500 flex items-center justify-center text-lg`}>
            <i className={icon}></i>
        </div>
    </div>
);

export default FarmerView;
// import React, { useEffect, useState, useRef } from 'react';
// import RealtimeChart from '../../components/charts/RealtimeChart';
// import { api } from '../../services/api';
// import { toast } from 'react-toastify'; // Khuyên dùng thư viện này để thông báo đẹp hơn

// const FarmerView = ({ user }) => {
//     // --- 1. STATE QUẢN LÝ DỮ LIỆU ---
//     const [gardens, setGardens] = useState([]);          // Danh sách vườn (thiết bị) của nông dân
//     const [selectedGarden, setSelectedGarden] = useState(null); // Vườn đang xem hiện tại
    
//     // Dữ liệu cảm biến & Biểu đồ
//     const [stats, setStats] = useState({ temp: 0, hum: 0, soil: 0, light: 0 });
//     const [historyData, setHistoryData] = useState([]);
    
//     // Trạng thái Loading
//     const [isLoadingList, setIsLoadingList] = useState(true); // Loading danh sách vườn
//     const [isProcessing, setIsProcessing] = useState(false);  // Loading khi bấm nút điều khiển

//     // Ref để quản lý Interval (giúp xóa timer khi component unmount)
//     const pollingRef = useRef(null);

//     // --- 2. LOGIC KHỞI TẠO: LẤY DANH SÁCH VƯỜN ---
//     useEffect(() => {
//         const fetchMyGardens = async () => {
//             try {
//                 // Gọi API lấy danh sách thiết bị
//                 // Backend sẽ tự động lọc trả về các thiết bị thuộc sở hữu của User này
//                 const data = await api.devices.getAll();
                
//                 if (data && data.length > 0) {
//                     setGardens(data);
//                     setSelectedGarden(data[0]); // Mặc định chọn vườn đầu tiên
//                 }
//             } catch (error) {
//                 console.error("Lỗi tải danh sách vườn:", error);
//                 toast.error("Không thể tải danh sách vườn của bạn.");
//             } finally {
//                 setIsLoadingList(false);
//             }
//         };

//         fetchMyGardens();
//     }, []); // Chỉ chạy 1 lần khi trang web vừa mở

//     // --- 3. LOGIC POLLING: TỰ ĐỘNG CẬP NHẬT SỐ LIỆU ---
//     useEffect(() => {
//         // Nếu chưa chọn vườn nào thì không làm gì cả
//         if (!selectedGarden) return;

//         const fetchData = async () => {
//             try {
//                 // Gọi API lấy lịch sử dữ liệu của VƯỜN ĐANG CHỌN (selectedGarden.device_id)
//                 const history = await api.devices.getHistory(selectedGarden.device_id, 20);
                
//                 if (history && history.length > 0) {
//                     // Cập nhật biểu đồ (Đảo ngược mảng để cũ nhất bên trái, mới nhất bên phải)
//                     setHistoryData([...history].reverse());

//                     // Cập nhật thẻ số liệu (Lấy phần tử đầu tiên - mới nhất)
//                     const latest = history[0];
//                     setStats({
//                         temp: latest.temp ?? 0,
//                         hum: latest.hum_air ?? 0,        // Khớp key Backend
//                         soil: latest.hum_soil ?? 0,      // Khớp key Backend
//                         light: latest.light_level ?? 0   // Khớp key Backend
//                     });
//                 }
//             } catch (error) {
//                 console.error("Lỗi cập nhật số liệu:", error);
//                 // Không toast lỗi ở đây để tránh spam thông báo mỗi 3 giây
//             }
//         };

//         // Gọi ngay lập tức lần đầu
//         fetchData();

//         // Thiết lập vòng lặp 3 giây
//         pollingRef.current = setInterval(fetchData, 3000);

//         // Cleanup: Xóa vòng lặp khi user đổi vườn hoặc thoát trang
//         return () => {
//             if (pollingRef.current) clearInterval(pollingRef.current);
//         };
//     }, [selectedGarden]); // Chạy lại mỗi khi selectedGarden thay đổi

//     // --- 4. LOGIC ĐIỀU KHIỂN THIẾT BỊ ---
//     const handleControl = async (deviceType, action) => {
//         if (!selectedGarden) return;

//         // Mapping lệnh gửi xuống Backend
//         // Ví dụ: deviceType='PUMP', action='ON' -> Command: 'PUMP_ON'
//         const command = `${deviceType}_${action}`; 
        
//         // Xác nhận trước khi thực hiện
//         const confirmMsg = action === 'ON' ? 'Bật' : 'Tắt';
//         const deviceName = deviceType === 'PUMP' ? 'Máy Bơm' : 'Đèn';
        
//         // if (!window.confirm(`Bạn có chắc muốn ${confirmMsg} ${deviceName} không?`)) return;

//         setIsProcessing(true);
//         try {
//             // Gửi lệnh thật xuống Backend
//             await api.devices.control(selectedGarden.device_id, command);
            
//             toast.success(`✅ Đã gửi lệnh: ${command}`);
            
//             // Mẹo: Đợi 1s rồi cập nhật lại số liệu để thấy phản hồi nhanh hơn
//             setTimeout(() => {
//                 // Gọi lại hàm fetch data (hoặc trigger effect)
//                 // Ở đây đơn giản là chờ polling tiếp theo
//             }, 1000);

//         } catch (error) {
//             console.error("Lỗi điều khiển:", error);
//             toast.error("❌ Lỗi: " + (error.response?.data?.detail || "Không gửi được lệnh"));
//         } finally {
//             setIsProcessing(false);
//         }
//     };

//     // --- 5. RENDER GIAO DIỆN ---

//     // Màn hình Loading
//     if (isLoadingList) return (
//         <div className="flex justify-center items-center h-64 text-emerald-600">
//             <i className="fas fa-spinner fa-spin text-3xl mr-3"></i> Đang tải dữ liệu vườn...
//         </div>
//     );

//     // Màn hình khi không có vườn nào
//     if (gardens.length === 0) return (
//         <div className="p-8 text-center bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200">
//             <h3 className="text-xl font-bold mb-2">Chưa có vườn nào được gán cho bạn!</h3>
//             <p>Vui lòng liên hệ Quản trị viên để được cấp quyền quản lý thiết bị.</p>
//         </div>
//     );

//     return (
//         <div className="space-y-6 fade-in">
//             {/* Header: Chọn Vườn */}
//             <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-4">
//                 <div className="flex items-center gap-3">
//                     <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
//                         <i className="fas fa-tractor text-xl"></i>
//                     </div>
//                     <div>
//                         <h2 className="text-xl font-bold text-slate-800">Quản lý Nông Trại</h2>
//                         <p className="text-sm text-slate-500">Xin chào, {user?.full_name || 'Nông dân'}</p>
//                     </div>
//                 </div>

//                 <div className="flex items-center gap-3 w-full md:w-auto">
//                     <label className="font-medium text-slate-700 whitespace-nowrap">Chọn khu vực:</label>
//                     <select 
//                         className="w-full md:w-64 px-4 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
//                         value={selectedGarden?.device_id || ''}
//                         onChange={(e) => {
//                             const garden = gardens.find(g => g.device_id === e.target.value);
//                             setSelectedGarden(garden);
//                         }}
//                     >
//                         {gardens.map(garden => (
//                             <option key={garden.device_id} value={garden.device_id}>
//                                 {garden.name || garden.device_id} - {garden.location || 'Chưa định vị'}
//                             </option>
//                         ))}
//                     </select>
//                 </div>
//             </div>

//             {/* Thông số môi trường */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//                 <StatCard label="Nhiệt độ" value={stats.temp} unit="°C" icon="fas fa-thermometer-half" color="red" />
//                 <StatCard label="Độ ẩm KK" value={stats.hum} unit="%" icon="fas fa-tint" color="blue" />
//                 <StatCard label="Độ ẩm Đất" value={stats.soil} unit="%" icon="fas fa-seedling" color="emerald" />
//                 <StatCard label="Ánh sáng" value={stats.light} unit=" Lux" icon="fas fa-sun" color="yellow" />
//             </div>

//             {/* Khu vực Điều khiển & Biểu đồ */}
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
//                 {/* Bảng Điều khiển */}
//                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-1 h-full">
//                     <h3 className="font-bold text-slate-800 mb-6 flex items-center border-b pb-3">
//                         <i className="fas fa-gamepad mr-2 text-emerald-600"></i> Điều khiển Thiết bị
//                     </h3>
                    
//                     <div className="space-y-6">
//                         {/* Control Item: Máy Bơm */}
//                         <ControlItem 
//                             label="Hệ thống Tưới (Bơm)" 
//                             icon="fas fa-water" 
//                             color="blue"
//                             isLoading={isProcessing}
//                             onOn={() => handleControl('PUMP', 'ON')}
//                             onOff={() => handleControl('PUMP', 'OFF')}
//                         />

//                         {/* Control Item: Đèn */}
//                         <ControlItem 
//                             label="Đèn Chiếu Sáng" 
//                             icon="fas fa-lightbulb" 
//                             color="yellow"
//                             isLoading={isProcessing}
//                             onOn={() => handleControl('LIGHT', 'ON')}
//                             onOff={() => handleControl('LIGHT', 'OFF')}
//                         />
//                          {/* Control Item: Phun Sương */}
//                          <ControlItem 
//                             label="Phun Sương" 
//                             icon="fas fa-cloud-showers-heavy" 
//                             color="cyan"
//                             isLoading={isProcessing}
//                             onOn={() => handleControl('MIST', 'ON')}
//                             onOff={() => handleControl('MIST', 'OFF')}
//                         />
//                     </div>
//                 </div>

//                 {/* Biểu đồ */}
//                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 h-full">
//                     <div className="flex justify-between items-center mb-4">
//                         <h3 className="font-bold text-slate-800">
//                             <i className="fas fa-chart-line mr-2 text-emerald-600"></i> 
//                             Biểu đồ Giám sát ({selectedGarden?.name})
//                         </h3>
//                         <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
//                             Cập nhật: 3s
//                         </span>
//                     </div>
//                     <div className="h-80 w-full">
//                         <RealtimeChart historyData={historyData} />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // --- SUB COMPONENTS (Giúp code gọn hơn) ---

// const StatCard = ({ label, value, unit, icon, color }) => (
//     <div className={`bg-white p-5 rounded-2xl shadow-sm border border-${color}-100 flex items-center justify-between hover:shadow-md transition-all duration-300`}>
//         <div>
//             <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
//             <p className={`text-2xl font-bold text-${color}-600`}>{value}{unit}</p>
//         </div>
//         <div className={`w-12 h-12 rounded-full bg-${color}-50 text-${color}-500 flex items-center justify-center text-xl`}>
//             <i className={icon}></i>
//         </div>
//     </div>
// );

// const ControlItem = ({ label, icon, color, isLoading, onOn, onOff }) => (
//     <div className={`p-4 rounded-xl bg-${color}-50 border border-${color}-100`}>
//         <div className="flex items-center gap-2 mb-3">
//             <i className={`${icon} text-${color}-600`}></i>
//             <span className={`font-bold text-${color}-900`}>{label}</span>
//         </div>
//         <div className="grid grid-cols-2 gap-3">
//             <button 
//                 onClick={onOn} disabled={isLoading}
//                 className={`py-2 rounded-lg font-bold text-white bg-${color}-500 hover:bg-${color}-600 transition-all shadow-sm active:scale-95 disabled:opacity-50`}
//             >
//                 BẬT
//             </button>
//             <button 
//                 onClick={onOff} disabled={isLoading}
//                 className="py-2 rounded-lg font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
//             >
//                 TẮT
//             </button>
//         </div>
//     </div>
// );

// export default FarmerView;
// import React, { useEffect, useState } from 'react';
// import RealtimeChart from '../../components/charts/RealtimeChart';
// import { api } from '../../services/api';

// const FarmerView = ({ user }) => {
//     // 1. State lưu dữ liệu cảm biến
//     const [stats, setStats] = useState({ temp: 0, hum: 0, soil: 0, light: 0 });
//     const [historyData, setHistoryData] = useState([]);
    
//     // State hiệu ứng loading cho nút bấm
//     const [isWatering, setIsWatering] = useState(false);
//     const [isLighting, setIsLighting] = useState(false);

//     // 2. Giả lập lấy dữ liệu theo Zone của nông dân (Ví dụ: user.zone_id)
//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 // Gọi API lấy dữ liệu thiết bị (Giả sử Zone A là thiết bị đầu tiên hoặc ID cố định)
//                 // Trong thực tế bạn sẽ truyền user.zone_id vào API này
//                 const history = await api.devices.getHistory('ESP32_01', 20); 
                
//                 if (history && history.length > 0) {
//                     setHistoryData(history);
//                     // Lấy mẫu mới nhất cập nhật lên thẻ
//                     const latest = history[0];
//                     setStats({
//                         temp: latest.temp,
//                         hum: latest.hum_air,
//                         soil: latest.soil_moisture,
//                         light: latest.light_level
//                     });
//                 }
//             } catch (error) {
//                 console.error("Lỗi tải dữ liệu nông dân:", error);
//             }
//         };

//         fetchData(); // Gọi ngay
//         const interval = setInterval(fetchData, 3000); // Lặp lại mỗi 3s
//         return () => clearInterval(interval);
//     }, []);

//     // 3. Hàm xử lý điều khiển thiết bị
//     const handleControl = (type) => {
//         if (type === 'water') {
//             if(window.confirm("Bác có chắc muốn mở van tưới trong 5 phút không?")) {
//                 setIsWatering(true);
//                 // Gọi API điều khiển tại đây...
//                 setTimeout(() => { 
//                     alert("Đã gửi lệnh tưới thành công! Hệ thống đang hoạt động.");
//                     setIsWatering(false); 
//                 }, 1000); // Giả lập delay mạng
//             }
//         } 
//         else if (type === 'light') {
//             setIsLighting(true);
//             // Gọi API điều khiển...
//             setTimeout(() => { 
//                 setIsLighting(false); 
//             }, 1000);
//         }
//     };

//     // --- Component con hiển thị thẻ (Style Xanh lá chủ đạo) ---
//     const FarmerStatCard = ({ label, value, unit, icon }) => (
//         <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-between hover:shadow-md transition-all">
//             <div>
//                 <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
//                 <p className="text-2xl font-bold text-slate-800">{value}{unit}</p>
//             </div>
//             <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
//                 <i className={icon}></i>
//             </div>
//         </div>
//     );

//     return (
//         <div className="space-y-6">
//             {/* Lời chào & Thông báo */}
//             <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-emerald-800 flex items-start gap-3">
//                 <i className="fas fa-leaf text-2xl mt-1"></i>
//                 <div>
//                     <h3 className="font-bold">Chào bác {user?.full_name || 'Nông dân'}, chúc một ngày tốt lành!</h3>
//                     <p className="text-sm opacity-90">
//                         Thời tiết tại <strong>Zone A</strong> hôm nay rất thuận lợi. Độ ẩm đất đang ở mức ổn định ({stats.soil}%).
//                     </p>
//                 </div>
//             </div>

//             {/* 4 Thẻ môi trường */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//                 <FarmerStatCard label="Nhiệt độ" value={stats.temp} unit="°C" icon="fas fa-temperature-high" />
//                 <FarmerStatCard label="Độ ẩm KK" value={stats.hum} unit="%" icon="fas fa-tint" />
//                 <FarmerStatCard label="Độ ẩm Đất" value={stats.soil} unit="%" icon="fas fa-seedling" />
//                 <FarmerStatCard label="Ánh sáng" value={stats.light} unit=" Lux" icon="fas fa-sun" />
//             </div>

//             {/* Khu vực điều khiển nhanh */}
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
//                 {/* Cột Trái: Nút bấm to */}
//                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-1">
//                     <h3 className="font-bold text-slate-800 mb-4 flex items-center">
//                         <i className="fas fa-gamepad mr-2 text-emerald-600"></i> Tác vụ nhanh
//                     </h3>
                    
//                     <div className="space-y-4">
//                         <button 
//                             onClick={() => handleControl('water')}
//                             disabled={isWatering}
//                             className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3
//                                 ${isWatering ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}
//                             `}
//                         >
//                             {isWatering ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-tint"></i>}
//                             {isWatering ? 'Đang gửi lệnh...' : 'Tưới Ngay (5 phút)'}
//                         </button>

//                         <button 
//                             onClick={() => handleControl('light')}
//                             disabled={isLighting}
//                             className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3
//                                 ${isLighting ? 'bg-slate-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200'}
//                             `}
//                         >
//                             {isLighting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-lightbulb"></i>}
//                             {isLighting ? 'Đang xử lý...' : 'Bật/Tắt Đèn'}
//                         </button>
//                     </div>
                    
//                     <div className="mt-4 text-xs text-slate-400 text-center">
//                         *Lưu ý: Hệ thống sẽ tự động tắt bơm sau khi đủ độ ẩm.
//                     </div>
//                 </div>

//                 {/* Cột Phải: Biểu đồ (Quan trọng với nông dân) */}
//                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
//                     <div className="flex justify-between items-center mb-4">
//                         <h3 className="font-bold text-slate-800">
//                             <i className="fas fa-chart-area mr-2 text-emerald-600"></i> 
//                             Biến động độ ẩm đất
//                         </h3>
//                         <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">Real-time</span>
//                     </div>
                    
//                     <div className="h-64 w-full">
//                         {/* Truyền dữ liệu thật vào biểu đồ */}
//                         <RealtimeChart historyData={historyData} />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default FarmerView;