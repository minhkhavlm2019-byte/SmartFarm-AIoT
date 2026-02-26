import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { toast } from 'react-toastify';

const TechDashboard = () => {
    // --- STATE QUẢN LÝ ---
    const [isLoading, setIsLoading] = useState(true);
    const [devices, setDevices] = useState([]);
    const [zones, setZones] = useState([]);
    
    // Trạng thái hệ thống
    const [systemHealth, setSystemHealth] = useState({
        mqtt: 'CONNECTED', 
        server: 'ONLINE',
        latency: 0 // ms
    });

    // --- LẤY DỮ LIỆU THỰC TẾ TỪ DB ---
    const fetchData = async () => {
        setIsLoading(true);
        const startTime = Date.now(); // Bắt đầu bấm giờ đo Ping (độ trễ)
        try {
            // Lấy danh sách zone và thiết bị từ Database
            const [zonesRes, devicesRes] = await Promise.all([
                api.zones.getAll(),
                api.devices.getAll()
            ]);
            
            const endTime = Date.now(); // Kết thúc bấm giờ
            
            setZones(zonesRes || []);
            setDevices(devicesRes || []);

            // Cập nhật trạng thái hệ thống bằng thông số thật
            setSystemHealth({
                server: 'ONLINE',
                mqtt: 'CONNECTED', // Giả định MQTT sống nếu API gọi được thiết bị
                latency: endTime - startTime // Ping thực tế đến API Server
            });
            
        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
            toast.error("Mất kết nối với máy chủ API!");
            setSystemHealth({ server: 'OFFLINE', mqtt: 'DISCONNECTED', latency: 999 });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto refresh mỗi 15 giây
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    // --- HÀM HỖ TRỢ & KPI ---
    // Lấy pin thực tế từ DB, nếu chưa có báo cáo pin thì mặc định 100%
    const getBattery = (dev) => dev.battery_level !== undefined && dev.battery_level !== null ? dev.battery_level : 100;

    const offlineDevices = devices.filter(d => d.status !== 'ONLINE');
    const lowBatteryDevices = devices.filter(d => getBattery(d) < 20);
    const totalZones = zones.length;

    // --- GỬI LỆNH ĐIỀU KHIỂN THỰC TẾ ---
    const handleQuickAction = async (deviceId, actionType) => {
        try {
            toast.info(`Đang gửi lệnh ${actionType} xuống mạch...`);
            
            // Gọi API thực tế truyền xuống thiết bị
            await api.devices.control(deviceId, actionType);
            
            toast.success(`Thiết bị ${deviceId} đã nhận lệnh ${actionType}!`);
        } catch (error) {
            console.error("Control Error:", error);
            toast.error("Lệnh thất bại. Mạch không phản hồi hoặc lỗi mạng.");
        }
    };

    if (isLoading && devices.length === 0) {
        return (
            <div className="flex flex-col h-screen items-center justify-center text-slate-400 font-bold animate-pulse">
                <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-emerald-500"></i>
                Đang kết nối Database và nạp dữ liệu kỹ thuật...
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6 pb-10 max-w-7xl mx-auto">
            
            {/* 1. HEADER & SYSTEM HEALTH BAR */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tech Dashboard</h2>
                    <p className="text-sm text-slate-500 font-medium">Trung tâm giám sát sức khỏe phần cứng</p>
                </div>

                {/* Status Indicators */}
                <div className="flex flex-wrap items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            {systemHealth.server === 'ONLINE' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${systemHealth.server === 'ONLINE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        </span>
                        <span className="text-xs font-bold text-slate-600 uppercase">API Server</span>
                    </div>
                    <div className="w-px h-4 bg-slate-300"></div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${systemHealth.mqtt === 'CONNECTED' ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                        </span>
                        <span className="text-xs font-bold text-slate-600 uppercase">MQTT Broker</span>
                    </div>
                    <div className="w-px h-4 bg-slate-300"></div>
                    <div className="text-xs font-mono text-slate-500 font-bold">
                        <i className="fas fa-network-wired mr-1"></i> {systemHealth.latency} ms
                    </div>
                </div>
            </div>

            {/* 2. URGENT KPIs (THẺ CẢNH BÁO KHẨN CẤP) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Thẻ 1: Mất kết nối (Màu Đỏ) */}
                <div className={`relative overflow-hidden rounded-2xl p-6 shadow-sm border ${offlineDevices.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}>
                    {offlineDevices.length > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500 rotate-45 translate-x-8 -translate-y-8"></div>}
                    <div className="flex justify-between items-center relative z-10">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Thiết bị Offline</p>
                            <h3 className={`text-4xl font-black ${offlineDevices.length > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                {offlineDevices.length}
                            </h3>
                        </div>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${offlineDevices.length > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                            <i className="fas fa-wifi"></i>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-4 font-medium">
                        {offlineDevices.length > 0 ? 'Cần kiểm tra nguồn/mạng ngay!' : 'Tất cả kết nối ổn định.'}
                    </p>
                </div>

                {/* Thẻ 2: Pin Yếu (Màu Cam) */}
                <div className={`rounded-2xl p-6 shadow-sm border ${lowBatteryDevices.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pin yếu (&lt;20%)</p>
                            <h3 className={`text-4xl font-black ${lowBatteryDevices.length > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                                {lowBatteryDevices.length}
                            </h3>
                        </div>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${lowBatteryDevices.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                            <i className="fas fa-battery-quarter"></i>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-4 font-medium">
                        {lowBatteryDevices.length > 0 ? 'Lên lịch sạc/thay pin sớm.' : 'Năng lượng thiết bị an toàn.'}
                    </p>
                </div>

                {/* Thẻ 3: Tổng quan Zone (Màu Xanh) */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Khu vực phụ trách</p>
                            <h3 className="text-4xl font-black text-slate-700">{totalZones}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
                            <i className="fas fa-map-marked-alt"></i>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-4 font-medium">Đang quản lý {devices.length} phần cứng.</p>
                </div>
            </div>

            {/* 3. BẢNG THEO DÕI & THAO TÁC NHANH (QUICK ACTIONS) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800"><i className="fas fa-microchip text-slate-400 mr-2"></i>Tình trạng phần cứng chi tiết</h3>
                    <button onClick={fetchData} className="text-sm text-blue-600 font-bold hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-lg transition-colors shadow-sm border border-blue-100">
                        <i className="fas fa-sync-alt mr-1"></i> Cập nhật ngay
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mạch / ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Trạng thái (Ping)</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Năng lượng (Pin)</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Test Khẩn Cấp (Relay)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {devices.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-10 text-slate-400 font-medium">Chưa có thiết bị nào được gán trong Database.</td></tr>
                            ) : devices.map(dev => {
                                const bat = getBattery(dev);
                                const isOffline = dev.status !== 'ONLINE';
                                
                                return (
                                    <tr key={dev.device_id} className={`transition-colors hover:bg-slate-50 ${isOffline ? 'bg-rose-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{dev.name}</div>
                                            <div className="text-xs font-mono text-slate-500 mt-1">{dev.device_id}</div>
                                            {/* Tìm tên Zone chứa mạch này */}
                                            <div className="text-[10px] uppercase font-bold text-emerald-600 mt-1">
                                                Zone: {zones.find(z => z.zone_id === dev.zone_id)?.name || 'Chưa gán'}
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4 text-center">
                                            {isOffline ? (
                                                <div className="inline-flex flex-col items-center">
                                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-sm animate-pulse">
                                                        <i className="fas fa-unlink mr-1"></i> OFFLINE
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 mt-1 font-medium">
                                                        Mất tín hiệu: {dev.last_seen ? new Date(dev.last_seen).toLocaleTimeString('vi-VN') : '--'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex flex-col items-center">
                                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                                                        <i className="fas fa-check-circle mr-1"></i> ONLINE
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 mt-1 font-medium">Ping ổn định</span>
                                                </div>
                                            )}
                                        </td>
                                        
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                                    <div 
                                                        className={`h-full rounded-full ${bat < 20 ? 'bg-rose-500' : (bat < 50 ? 'bg-amber-400' : 'bg-emerald-500')}`} 
                                                        style={{ width: `${bat}%` }}
                                                    ></div>
                                                </div>
                                                <span className={`text-xs font-bold ${bat < 20 ? 'text-rose-600' : 'text-slate-600'}`}>
                                                    {bat}%
                                                </span>
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    disabled={isOffline}
                                                    onClick={() => handleQuickAction(dev.device_id, 'PUMP_ON')}
                                                    className="group flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-blue-50 disabled:hover:text-blue-600 transition-all border border-blue-100 shadow-sm"
                                                    title="Ép bật Bơm"
                                                >
                                                    <i className="fas fa-water"></i>
                                                </button>
                                                <button 
                                                    disabled={isOffline}
                                                    onClick={() => handleQuickAction(dev.device_id, 'LIGHT_ON')}
                                                    className="group flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white disabled:opacity-30 disabled:hover:bg-amber-50 disabled:hover:text-amber-600 transition-all border border-amber-100 shadow-sm"
                                                    title="Ép bật Đèn"
                                                >
                                                    <i className="fas fa-lightbulb"></i>
                                                </button>
                                                <button 
                                                    disabled={isOffline}
                                                    onClick={() => handleQuickAction(dev.device_id, 'SYSTEM_REBOOT')}
                                                    className="group flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-all border border-slate-200 shadow-sm"
                                                    title="Gửi lệnh Reset Mạch (Watchdog)"
                                                >
                                                    <i className="fas fa-sync-alt group-hover:rotate-180 transition-transform duration-500"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default TechDashboard;
// import React, { useState, useEffect } from 'react';
// import { api } from '../../services/api';
// import { toast } from 'react-toastify';

// const TechDashboard = () => {
//     // --- STATE QUẢN LÝ ---
//     const [isLoading, setIsLoading] = useState(true);
//     const [devices, setDevices] = useState([]);
//     const [zones, setZones] = useState([]);
    
//     // Trạng thái hệ thống (Giả lập hoặc gọi từ API /health)
//     const [systemHealth, setSystemHealth] = useState({
//         mqtt: 'CONNECTED', // CONNECTED, DISCONNECTED, RECONNECTING
//         server: 'ONLINE',
//         latency: 45 // ms
//     });

//     // --- LẤY DỮ LIỆU ---
//     const fetchData = async () => {
//         setIsLoading(true);
//         try {
//             // Lấy danh sách zone và thiết bị KTV phụ trách
//             const [zonesRes, devicesRes] = await Promise.all([
//                 api.zones.getAll(),
//                 api.devices.getAll()
//             ]);
            
//             setZones(zonesRes);
//             setDevices(devicesRes);

//             // Giả lập check ping Server & MQTT (Thực tế backend nên có 1 endpoint trả về trạng thái này)
//             setSystemHealth(prev => ({ ...prev, latency: Math.floor(Math.random() * 30) + 20 }));
            
//         } catch (error) {
//             toast.error("Mất kết nối với máy chủ!");
//             setSystemHealth(prev => ({ ...prev, server: 'OFFLINE', mqtt: 'DISCONNECTED' }));
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchData();
//         // Auto refresh mỗi 15 giây
//         const interval = setInterval(fetchData, 15000);
//         return () => clearInterval(interval);
//     }, []);

//     // --- HÀM HỖ TRỢ & KPI ---
//     // Giả lập pin nếu DB chưa có cột battery_level
//     const getBattery = (dev) => dev.battery_level !== undefined ? dev.battery_level : (dev.device_id.length % 2 === 0 ? 88 : 12);

//     const offlineDevices = devices.filter(d => d.status !== 'ONLINE');
//     const lowBatteryDevices = devices.filter(d => getBattery(d) < 20);
//     const totalZones = zones.length;

//     // Hàm gửi lệnh Test (Điều khiển trực tiếp)
//     const handleQuickAction = async (deviceId, actionType) => {
//         try {
//             toast.info(`Đang gửi lệnh ${actionType} xuống mạch...`);
//             // await api.devices.control(deviceId, { action: actionType });
            
//             // Giả lập thành công sau 1s
//             setTimeout(() => {
//                 toast.success(`Thiết bị ${deviceId} đã phản hồi lệnh ${actionType}!`);
//             }, 1000);
//         } catch (error) {
//             toast.error("Lệnh thất bại. Mạch không phản hồi.");
//         }
//     };

//     if (isLoading && devices.length === 0) {
//         return <div className="flex h-screen items-center justify-center text-slate-400 font-bold animate-pulse">Đang nạp dữ liệu kỹ thuật...</div>;
//     }

//     return (
//         <div className="animate-fade-in space-y-6 pb-10 max-w-7xl mx-auto">
            
//             {/* 1. HEADER & SYSTEM HEALTH BAR */}
//             <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
//                 <div>
//                     <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tech Dashboard</h2>
//                     <p className="text-sm text-slate-500 font-medium">Trung tâm giám sát sức khỏe phần cứng</p>
//                 </div>

//                 {/* Status Indicators */}
//                 <div className="flex flex-wrap items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
//                     <div className="flex items-center gap-2">
//                         <span className="relative flex h-3 w-3">
//                             {systemHealth.server === 'ONLINE' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
//                             <span className={`relative inline-flex rounded-full h-3 w-3 ${systemHealth.server === 'ONLINE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
//                         </span>
//                         <span className="text-xs font-bold text-slate-600 uppercase">API Server</span>
//                     </div>
//                     <div className="w-px h-4 bg-slate-300"></div>
//                     <div className="flex items-center gap-2">
//                         <span className="relative flex h-3 w-3">
//                             <span className={`relative inline-flex rounded-full h-3 w-3 ${systemHealth.mqtt === 'CONNECTED' ? 'bg-blue-500' : 'bg-red-500'}`}></span>
//                         </span>
//                         <span className="text-xs font-bold text-slate-600 uppercase">MQTT Broker</span>
//                     </div>
//                     <div className="w-px h-4 bg-slate-300"></div>
//                     <div className="text-xs font-mono text-slate-500">
//                         <i className="fas fa-network-wired mr-1"></i> {systemHealth.latency}ms
//                     </div>
//                 </div>
//             </div>

//             {/* 2. URGENT KPIs (THẺ CẢNH BÁO KHẨN CẤP) */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                 {/* Thẻ 1: Mất kết nối (Màu Đỏ) */}
//                 <div className={`relative overflow-hidden rounded-2xl p-6 shadow-sm border ${offlineDevices.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}>
//                     {offlineDevices.length > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500 rotate-45 translate-x-8 -translate-y-8"></div>}
//                     <div className="flex justify-between items-center relative z-10">
//                         <div>
//                             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Thiết bị Offline</p>
//                             <h3 className={`text-4xl font-black ${offlineDevices.length > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
//                                 {offlineDevices.length}
//                             </h3>
//                         </div>
//                         <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${offlineDevices.length > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
//                             <i className="fas fa-wifi"></i>
//                         </div>
//                     </div>
//                     <p className="text-xs text-slate-500 mt-4 font-medium">
//                         {offlineDevices.length > 0 ? 'Cần kiểm tra nguồn/mạng ngay!' : 'Tất cả kết nối ổn định.'}
//                     </p>
//                 </div>

//                 {/* Thẻ 2: Pin Yếu (Màu Cam) */}
//                 <div className={`rounded-2xl p-6 shadow-sm border ${lowBatteryDevices.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
//                     <div className="flex justify-between items-center">
//                         <div>
//                             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pin yếu (&lt;20%)</p>
//                             <h3 className={`text-4xl font-black ${lowBatteryDevices.length > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
//                                 {lowBatteryDevices.length}
//                             </h3>
//                         </div>
//                         <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${lowBatteryDevices.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
//                             <i className="fas fa-battery-quarter"></i>
//                         </div>
//                     </div>
//                     <p className="text-xs text-slate-500 mt-4 font-medium">
//                         {lowBatteryDevices.length > 0 ? 'Lên lịch sạc/thay pin sớm.' : 'Năng lượng thiết bị an toàn.'}
//                     </p>
//                 </div>

//                 {/* Thẻ 3: Tổng quan Zone (Màu Xanh) */}
//                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
//                     <div className="flex justify-between items-center">
//                         <div>
//                             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Khu vực phụ trách</p>
//                             <h3 className="text-4xl font-black text-slate-700">{totalZones}</h3>
//                         </div>
//                         <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
//                             <i className="fas fa-map-marked-alt"></i>
//                         </div>
//                     </div>
//                     <p className="text-xs text-slate-500 mt-4 font-medium">Đang quản lý {devices.length} phần cứng.</p>
//                 </div>
//             </div>

//             {/* 3. BẢNG THEO DÕI & THAO TÁC NHANH (QUICK ACTIONS) */}
//             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
//                 <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
//                     <h3 className="font-bold text-slate-800"><i className="fas fa-microchip text-slate-400 mr-2"></i>Tình trạng phần cứng chi tiết</h3>
//                     <button onClick={fetchData} className="text-sm text-blue-600 font-bold hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-lg transition-colors">
//                         <i className="fas fa-sync-alt mr-1"></i> Cập nhật
//                     </button>
//                 </div>
                
//                 <div className="overflow-x-auto">
//                     <table className="w-full text-left">
//                         <thead className="bg-white border-b border-slate-100">
//                             <tr>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mạch / ID</th>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Trạng thái (Ping)</th>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Năng lượng (Pin)</th>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Test Khẩn Cấp (Relay)</th>
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-50">
//                             {devices.length === 0 ? (
//                                 <tr><td colSpan="4" className="text-center py-10 text-slate-400 font-medium">Chưa có thiết bị nào được gán.</td></tr>
//                             ) : devices.map(dev => {
//                                 const bat = getBattery(dev);
//                                 const isOffline = dev.status !== 'ONLINE';
                                
//                                 return (
//                                     <tr key={dev.device_id} className={`transition-colors hover:bg-slate-50 ${isOffline ? 'bg-rose-50/30' : ''}`}>
//                                         <td className="px-6 py-4">
//                                             <div className="font-bold text-slate-800">{dev.name}</div>
//                                             <div className="text-xs font-mono text-slate-500 mt-1">{dev.device_id}</div>
//                                             {/* Tìm tên Zone chứa mạch này */}
//                                             <div className="text-[10px] uppercase font-bold text-emerald-600 mt-1">
//                                                 Zone: {zones.find(z => z.zone_id === dev.zone_id)?.name || 'Chưa gán'}
//                                             </div>
//                                         </td>
                                        
//                                         <td className="px-6 py-4 text-center">
//                                             {isOffline ? (
//                                                 <div className="inline-flex flex-col items-center">
//                                                     <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-sm animate-pulse">
//                                                         <i className="fas fa-unlink mr-1"></i> OFFLINE
//                                                     </span>
//                                                     <span className="text-[10px] text-slate-400 mt-1 font-medium">
//                                                         Mất tín hiệu: {dev.last_seen ? new Date(dev.last_seen).toLocaleTimeString('vi-VN') : '--'}
//                                                     </span>
//                                                 </div>
//                                             ) : (
//                                                 <div className="inline-flex flex-col items-center">
//                                                     <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
//                                                         <i className="fas fa-check-circle mr-1"></i> ONLINE
//                                                     </span>
//                                                     <span className="text-[10px] text-slate-400 mt-1 font-medium">Ping ổn định</span>
//                                                 </div>
//                                             )}
//                                         </td>
                                        
//                                         <td className="px-6 py-4">
//                                             <div className="flex items-center gap-3">
//                                                 <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
//                                                     <div 
//                                                         className={`h-full rounded-full ${bat < 20 ? 'bg-rose-500' : (bat < 50 ? 'bg-amber-400' : 'bg-emerald-500')}`} 
//                                                         style={{ width: `${bat}%` }}
//                                                     ></div>
//                                                 </div>
//                                                 <span className={`text-xs font-bold ${bat < 20 ? 'text-rose-600' : 'text-slate-600'}`}>
//                                                     {bat}%
//                                                 </span>
//                                             </div>
//                                         </td>
                                        
//                                         <td className="px-6 py-4 text-right">
//                                             <div className="flex justify-end gap-2">
//                                                 <button 
//                                                     disabled={isOffline}
//                                                     onClick={() => handleQuickAction(dev.device_id, 'PUMP_ON')}
//                                                     className="group flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-blue-50 disabled:hover:text-blue-600 transition-all border border-blue-100"
//                                                     title="Ép bật Bơm"
//                                                 >
//                                                     <i className="fas fa-water"></i>
//                                                 </button>
//                                                 <button 
//                                                     disabled={isOffline}
//                                                     onClick={() => handleQuickAction(dev.device_id, 'LIGHT_ON')}
//                                                     className="group flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white disabled:opacity-30 disabled:hover:bg-amber-50 disabled:hover:text-amber-600 transition-all border border-amber-100"
//                                                     title="Ép bật Đèn"
//                                                 >
//                                                     <i className="fas fa-lightbulb"></i>
//                                                 </button>
//                                                 <button 
//                                                     disabled={isOffline}
//                                                     onClick={() => handleQuickAction(dev.device_id, 'REBOOT')}
//                                                     className="group flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-all border border-slate-200"
//                                                     title="Gửi lệnh Reset Mạch (Watchdog)"
//                                                 >
//                                                     <i className="fas fa-sync-alt group-hover:rotate-180 transition-transform duration-500"></i>
//                                                 </button>
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 );
//                             })}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>

//         </div>
//     );
// };

// export default TechDashboard;