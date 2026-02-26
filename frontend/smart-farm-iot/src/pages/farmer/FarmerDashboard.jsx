import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { toast } from 'react-toastify';

const FarmerDashboard = () => {
    // ---------------------------------------------------------
    // 1. KHAI BÁO STATE (TRẠNG THÁI) CỦA COMPONENT
    // ---------------------------------------------------------
    const [isLoading, setIsLoading] = useState(true);          
    const [zones, setZones] = useState([]);                    
    const [devices, setDevices] = useState([]);                  
    const [alerts, setAlerts] = useState([]);                    
    const [farmStats, setFarmStats] = useState({                 
        avgTemp: '--', 
        avgHumid: '--',     // Độ ẩm đất
        avgAirHumid: '--',  // ĐÃ THÊM: Độ ẩm không khí
        avgLight: '--'      // ĐÃ THÊM: Ánh sáng
    });

    // ---------------------------------------------------------
    // 2. HÀM TẢI DỮ LIỆU TỪ BACKEND
    // ---------------------------------------------------------
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [zonesRes, devicesRes] = await Promise.all([
                api.zones.getAll(),
                api.devices.getAll()
            ]);
            
            setZones(zonesRes || []);
            setDevices(devicesRes || []);

            // === BẮT ĐẦU XỬ LÝ DỮ LIỆU ===
            const newAlerts = [];
            let totalTemp = 0, validTempCount = 0;
            let totalHumid = 0, validHumidCount = 0;
            let totalAirHumid = 0, validAirHumidCount = 0; // Thêm đếm ẩm KK
            let totalLight = 0, validLightCount = 0;       // Thêm đếm ánh sáng

            (devicesRes || []).forEach(dev => {
                const soilMoisture = dev.hum_soil; 
                const temp = dev.temp;
                const airHumid = dev.hum_air;
                const light = dev.light;

                if (soilMoisture !== undefined && soilMoisture !== null) {
                    totalHumid += soilMoisture;
                    validHumidCount++;
                    if (soilMoisture < 40) {
                        newAlerts.push(`Khu vực "${dev.name}" đang bị khô (Độ ẩm đất: ${soilMoisture}%).`);
                    }
                }

                if (temp !== undefined && temp !== null) {
                    totalTemp += temp;
                    validTempCount++;
                    if (temp > 35) {
                        newAlerts.push(`Cảnh báo sốc nhiệt tại "${dev.name}" (Nhiệt độ: ${temp}°C). Hãy kiểm tra hệ thống phun sương.`);
                    }
                }

                if (airHumid !== undefined && airHumid !== null) {
                    totalAirHumid += airHumid;
                    validAirHumidCount++;
                }

                if (light !== undefined && light !== null) {
                    totalLight += light;
                    validLightCount++;
                }
            });

            // Tính trung bình cộng cho Banner
            const avgTemp = validTempCount > 0 ? (totalTemp / validTempCount).toFixed(1) : '--';
            const avgHumid = validHumidCount > 0 ? Math.round(totalHumid / validHumidCount) : '--';
            const avgAirHumid = validAirHumidCount > 0 ? Math.round(totalAirHumid / validAirHumidCount) : '--';
            const avgLight = validLightCount > 0 ? Math.round(totalLight / validLightCount) : '--';
            
            setFarmStats({ avgTemp, avgHumid, avgAirHumid, avgLight });
            setAlerts(newAlerts);

        } catch (error) {
            console.error("Lỗi lấy dữ liệu Dashboard:", error);
            toast.error("Không thể kết nối đến máy chủ nông trại!");
        } finally {
            setIsLoading(false); 
        }
    };

    // ---------------------------------------------------------
    // 3. VÒNG LẶP CẬP NHẬT (POLLING)
    // ---------------------------------------------------------
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); 
        return () => clearInterval(interval); 
    }, []);

    // ---------------------------------------------------------
    // 4. HÀM XỬ LÝ KHI BẤM NÚT "TƯỚI NGAY"
    // ---------------------------------------------------------
    const handleWaterNow = async (zoneId) => {
        try {
            toast.info("Đang truyền tín hiệu bơm xuống mạch...");
            const deviceInZone = devices.find(d => d.zone_id === zoneId);
            
            if (deviceInZone) {
                await api.devices.control(deviceInZone.device_id, 'PUMP_ON');
                toast.success("✅ Đã bật máy bơm thành công!");
            } else {
                toast.warning("Khu vực này chưa lắp đặt bo mạch điều khiển.");
            }
        } catch (error) {
            if (error.response && error.response.status === 429) {
                toast.error("Hệ thống chống quá tải. Vui lòng đợi 1 phút trước khi bơm tiếp.");
            } else {
                toast.error("Lỗi: Không thể bật bơm. Kiểm tra lại kết nối mạng của mạch.");
            }
        }
    };

    // ---------------------------------------------------------
    // 5. GIAO DIỆN KHI ĐANG LOADING
    // ---------------------------------------------------------
    if (isLoading && zones.length === 0) {
        return (
            <div className="flex flex-col h-screen items-center justify-center text-emerald-600 font-bold animate-pulse">
                <i className="fas fa-seedling text-5xl mb-4"></i>
                Đang nạp dữ liệu môi trường thực tế...
            </div>
        );
    }

    // ---------------------------------------------------------
    // 6. GIAO DIỆN CHÍNH CỦA DASHBOARD
    // ---------------------------------------------------------
    return (
        <div className="animate-fade-in space-y-6 pb-10 max-w-7xl mx-auto">
            
            {/* === HEADER (BANNER TỔNG QUAN) === */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-3xl p-6 lg:p-8 text-white shadow-lg shadow-emerald-200 flex flex-col xl:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <i className="fas fa-leaf absolute -bottom-10 -right-10 text-[150px] text-white/10 -rotate-12"></i>
                
                <div className="relative z-10 text-center xl:text-left">
                    <h2 className="text-3xl font-black tracking-tight mb-2">Chào ngày mới, Nông dân! ☀️</h2>
                    <p className="text-emerald-50 font-medium text-lg">Hệ thống AI đang tự động theo dõi {zones.length} khu vực canh tác.</p>
                </div>
                
                {/* ĐÃ SỬA: Thêm 2 khối trung bình cộng & dùng lưới hiển thị đẹp mắt hơn */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
                    <div className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-2xl text-center border border-white/30">
                        <div className="text-[10px] lg:text-xs font-bold text-emerald-100 uppercase tracking-widest mb-1">Nhiệt độ TB</div>
                        <div className="text-xl lg:text-2xl font-black">{farmStats.avgTemp !== '--' ? `${farmStats.avgTemp}°C` : '--'}</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-2xl text-center border border-white/30">
                        <div className="text-[10px] lg:text-xs font-bold text-emerald-100 uppercase tracking-widest mb-1">Ẩm Đất TB</div>
                        <div className="text-xl lg:text-2xl font-black">{farmStats.avgHumid !== '--' ? `${farmStats.avgHumid}%` : '--'}</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-2xl text-center border border-white/30">
                        <div className="text-[10px] lg:text-xs font-bold text-emerald-100 uppercase tracking-widest mb-1">Ẩm Khí TB</div>
                        <div className="text-xl lg:text-2xl font-black">{farmStats.avgAirHumid !== '--' ? `${farmStats.avgAirHumid}%` : '--'}</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-2xl text-center border border-white/30">
                        <div className="text-[10px] lg:text-xs font-bold text-emerald-100 uppercase tracking-widest mb-1">Ánh sáng TB</div>
                        <div className="text-xl lg:text-2xl font-black">{farmStats.avgLight !== '--' ? `${farmStats.avgLight}` : '--'} <span className="text-sm font-medium opacity-80">Lux</span></div>
                    </div>
                </div>
            </div>

            {/* === KHU VỰC CẢNH BÁO (ALERTS) === */}
            {alerts.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm flex items-start">
                    <div className="flex-shrink-0">
                        <i className="fas fa-exclamation-triangle text-amber-500 text-xl mt-0.5"></i>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Cảnh báo môi trường khẩn cấp</h3>
                        <div className="mt-2 text-sm text-amber-700 space-y-1 font-medium">
                            {alerts.map((alert, idx) => (
                                <p key={idx}>- {alert}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* === DANH SÁCH CÁC KHU VỰC CANH TÁC (ZONE CARDS) === */}
            <div className="flex justify-between items-end mt-8 mb-4">
                <h3 className="text-2xl font-black text-slate-800"><i className="fas fa-map-marked-alt text-emerald-500 mr-2"></i> Các khu vực bạn quản lý</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {zones.length === 0 ? (
                    <div className="col-span-full bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300">
                        <p className="text-slate-500 font-medium">Bạn chưa được phân công quản lý khu vực nào. Hãy liên hệ Admin.</p>
                    </div>
                ) : 
                
                zones.map(zone => {
                    const zoneDevices = devices.filter(d => d.zone_id === zone.zone_id);
                    const primaryDevice = zoneDevices[0] || {};
                    
                    const soilM = primaryDevice.hum_soil !== undefined && primaryDevice.hum_soil !== null ? primaryDevice.hum_soil : '--';
                    const temp = primaryDevice.temp !== undefined && primaryDevice.temp !== null ? primaryDevice.temp : '--';
                    const airHumid = primaryDevice.hum_air !== undefined && primaryDevice.hum_air !== null ? primaryDevice.hum_air : '--';
                    const light = primaryDevice.light !== undefined && primaryDevice.light !== null ? primaryDevice.light : '--';
                    
                    const isDry = soilM !== '--' && soilM < 40;
                    const isOffline = primaryDevice.status !== 'ONLINE';
                    const isAutoMode = (zone.setting?.mode || 'AUTO') === 'AUTO';
                    const isActionDisabled = isOffline || isAutoMode;

                    return (
                        <div key={zone.zone_id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow group flex flex-col justify-between">
                            
                            {/* --- Phần 1: Hình ảnh bìa --- */}
                            <div>
                                <div className="h-32 bg-slate-100 relative overflow-hidden">
                                    <img src={`https://images.unsplash.com/photo-1592424001807-6f81c9646b9a?auto=format&fit=crop&q=80&w=800`} alt="Farm" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                    <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
                                        <h4 className="text-white font-black text-xl truncate pr-2">{zone.name}</h4>
                                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider whitespace-nowrap shadow-sm">
                                            {zone.crop_type || 'Chưa xác định'}
                                        </span>
                                    </div>
                                    
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        {isOffline && (
                                            <span className="bg-rose-500/90 backdrop-blur-sm text-white text-[9px] px-2 py-1 rounded shadow">
                                                <i className="fas fa-wifi-slash mr-1"></i> OFFLINE
                                            </span>
                                        )}
                                        {isAutoMode && !isOffline && (
                                            <span className="bg-purple-500/90 backdrop-blur-sm text-white text-[9px] px-2 py-1 rounded shadow">
                                                <i className="fas fa-robot mr-1"></i> AI AUTO
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* --- Phần 2: Thẻ hiển thị Cảm biến (Grid 2x2 cho 4 thông số) --- */}
                                <div className="p-5 pb-0">
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {/* Cục 1: Độ ẩm đất */}
                                        <div className={`flex flex-col rounded-2xl p-3 border ${isDry ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'}`}>
                                            <span className="text-[10px] font-bold uppercase text-slate-500 mb-1 truncate">
                                                <i className="fas fa-water mr-1 opacity-70"></i> Ẩm đất
                                            </span>
                                            <span className={`text-xl font-black ${isDry ? 'text-rose-600' : 'text-blue-600'}`}>
                                                {soilM !== '--' ? `${soilM}%` : '--'}
                                            </span>
                                        </div>
                                        {/* Cục 2: Nhiệt độ */}
                                        <div className="flex flex-col bg-amber-50 border border-amber-100 rounded-2xl p-3">
                                            <span className="text-[10px] font-bold uppercase text-slate-500 mb-1 truncate">
                                                <i className="fas fa-temperature-high mr-1 opacity-70"></i> Nhiệt độ
                                            </span>
                                            <span className="text-xl font-black text-amber-600">
                                                {temp !== '--' ? `${temp}°C` : '--'}
                                            </span>
                                        </div>
                                        {/* Cục 3: Độ ẩm không khí */}
                                        <div className="flex flex-col bg-cyan-50 border border-cyan-100 rounded-2xl p-3">
                                            <span className="text-[10px] font-bold uppercase text-slate-500 mb-1 truncate">
                                                <i className="fas fa-cloud mr-1 opacity-70"></i> Ẩm không khí
                                            </span>
                                            <span className="text-xl font-black text-cyan-600">
                                                {airHumid !== '--' ? `${airHumid}%` : '--'}
                                            </span>
                                        </div>
                                        {/* Cục 4: Ánh sáng */}
                                        <div className="flex flex-col bg-yellow-50 border border-yellow-100 rounded-2xl p-3">
                                            <span className="text-[10px] font-bold uppercase text-slate-500 mb-1 truncate">
                                                <i className="fas fa-sun mr-1 opacity-70"></i> Ánh sáng
                                            </span>
                                            <span className="text-xl font-black text-yellow-600">
                                                {light !== '--' ? `${light}` : '--'} <span className="text-xs">Lux</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- Phần 3: Nút Hành động --- */}
                            <div className="p-5 pt-0 mt-auto">
                                {isActionDisabled && (
                                    <p className="text-[10px] text-center text-slate-400 mb-2 font-medium">
                                        <i className="fas fa-lock mr-1"></i> 
                                        {isOffline ? 'Không thể bơm do mất kết nối.' : 'AI đang quản lý bơm nước.'}
                                    </p>
                                )}
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleWaterNow(zone.zone_id)}
                                        disabled={isActionDisabled}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-colors flex justify-center items-center group/btn ${
                                            isActionDisabled 
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                            : 'bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100'
                                        }`}
                                    >
                                        <i className={`fas fa-tint mr-2 ${!isActionDisabled && 'group-hover/btn:animate-bounce'}`}></i> 
                                        Tưới Ngay
                                    </button>
                                    
                                    <Link 
                                        to={`/farmer/zones/${zone.zone_id}`}
                                        className="w-14 flex items-center justify-center bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-100 rounded-xl transition-colors"
                                        title="Chi tiết và Cài đặt"
                                    >
                                        <i className="fas fa-chevron-right"></i>
                                    </Link>
                                </div>
                            </div>
                            
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FarmerDashboard;

// import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import { api } from '../../services/api';
// import { toast } from 'react-toastify';

// const FarmerDashboard = () => {
//     // ---------------------------------------------------------
//     // 1. KHAI BÁO STATE (TRẠNG THÁI) CỦA COMPONENT
//     // ---------------------------------------------------------
//     const [isLoading, setIsLoading] = useState(true);          // Trạng thái đang tải dữ liệu (quay vòng vòng)
//     const [zones, setZones] = useState([]);                    // Danh sách các khu vực (vườn) của nông dân
//     const [devices, setDevices] = useState([]);                  // Danh sách các thiết bị cảm biến/điều khiển
//     const [alerts, setAlerts] = useState([]);                    // Mảng chứa các câu cảnh báo (ví dụ: đất khô, sốc nhiệt)
//     const [farmStats, setFarmStats] = useState({                 // Thống kê tổng quan để hiện trên banner
//         avgTemp: '--', 
//         avgHumid: '--' 
//     });

//     // ---------------------------------------------------------
//     // 2. HÀM TẢI DỮ LIỆU TỪ BACKEND
//     // ---------------------------------------------------------
//     const fetchData = async () => {
//         setIsLoading(true);
//         try {
//             // Lấy dữ liệu Zone và Device song song (cùng lúc) để tăng tốc độ
//             const [zonesRes, devicesRes] = await Promise.all([
//                 api.zones.getAll(),
//                 api.devices.getAll()
//             ]);
            
//             setZones(zonesRes || []);
//             setDevices(devicesRes || []);

//             // === BẮT ĐẦU XỬ LÝ DỮ LIỆU ĐỂ TẠO CẢNH BÁO VÀ THỐNG KÊ ===
//             const newAlerts = [];
//             let totalTemp = 0;
//             let totalHumid = 0;
//             let validTempCount = 0;
//             let validHumidCount = 0;

//             // Lặp qua từng thiết bị để gom thông số
//             (devicesRes || []).forEach(dev => {
//                 const soilMoisture = dev.hum_soil; 
//                 const temp = dev.temp;

//                 // Nếu thiết bị có gửi số liệu độ ẩm đất
//                 if (soilMoisture !== undefined && soilMoisture !== null) {
//                     totalHumid += soilMoisture;
//                     validHumidCount++;
//                     // Luật cảnh báo 1: Đất quá khô (< 40%)
//                     if (soilMoisture < 40) {
//                         newAlerts.push(`Khu vực "${dev.name}" đang bị khô (Độ ẩm đất: ${soilMoisture}%).`);
//                     }
//                 }

//                 // Nếu thiết bị có gửi số liệu nhiệt độ
//                 if (temp !== undefined && temp !== null) {
//                     totalTemp += temp;
//                     validTempCount++;
//                     // Luật cảnh báo 2: Trời quá nóng (> 35 độ) -> Nguy cơ sốc nhiệt
//                     if (temp > 35) {
//                         newAlerts.push(`Cảnh báo sốc nhiệt tại "${dev.name}" (Nhiệt độ: ${temp}°C). Hãy kiểm tra hệ thống phun sương.`);
//                     }
//                 }
//             });

//             // Tính trung bình cộng Nhiệt độ và Độ ẩm cho toàn trang trại (Để hiển thị ở Banner xanh lá)
//             const avgTemp = validTempCount > 0 ? (totalTemp / validTempCount).toFixed(1) : '--';
//             const avgHumid = validHumidCount > 0 ? Math.round(totalHumid / validHumidCount) : '--';
            
//             setFarmStats({ avgTemp, avgHumid });
//             setAlerts(newAlerts);

//         } catch (error) {
//             console.error("Lỗi lấy dữ liệu Dashboard:", error);
//             toast.error("Không thể kết nối đến máy chủ nông trại!");
//         } finally {
//             setIsLoading(false); // Tắt hiệu ứng loading
//         }
//     };

//     // ---------------------------------------------------------
//     // 3. VÒNG LẶP CẬP NHẬT (POLLING)
//     // ---------------------------------------------------------
//     // Hàm này chạy 1 lần khi trang vừa mở lên
//     useEffect(() => {
//         fetchData();
//         // Cứ mỗi 30 giây (30000ms), tự động gọi lại fetchData() để lấy số liệu mới nhất
//         const interval = setInterval(fetchData, 30000); 
//         return () => clearInterval(interval); // Dọn dẹp interval khi nông dân rời khỏi trang này
//     }, []);

//     // ---------------------------------------------------------
//     // 4. HÀM XỬ LÝ KHI BẤM NÚT "TƯỚI NGAY"
//     // ---------------------------------------------------------
//     const handleWaterNow = async (zoneId) => {
//         try {
//             toast.info("Đang truyền tín hiệu bơm xuống mạch...");
            
//             // Tìm mạch điều khiển thuộc cái Vườn (Zone) mà nông dân vừa bấm
//             const deviceInZone = devices.find(d => d.zone_id === zoneId);
            
//             if (deviceInZone) {
//                 // Gọi API bắn lệnh MQTT PUMP_ON xuống mạch
//                 await api.devices.control(deviceInZone.device_id, 'PUMP_ON');
//                 toast.success("✅ Đã bật máy bơm thành công!");
//             } else {
//                 toast.warning("Khu vực này chưa lắp đặt bo mạch điều khiển.");
//             }
//         } catch (error) {
//             // FIX: Bắt lỗi Rate Limiting (429) nếu bấm quá nhanh
//             if (error.response && error.response.status === 429) {
//                 toast.error("Hệ thống chống quá tải. Vui lòng đợi 1 phút trước khi bơm tiếp.");
//             } else {
//                 toast.error("Lỗi: Không thể bật bơm. Kiểm tra lại kết nối mạng của mạch.");
//             }
//         }
//     };

//     // ---------------------------------------------------------
//     // 5. GIAO DIỆN KHI ĐANG LOADING
//     // ---------------------------------------------------------
//     if (isLoading && zones.length === 0) {
//         return (
//             <div className="flex flex-col h-screen items-center justify-center text-emerald-600 font-bold animate-pulse">
//                 <i className="fas fa-seedling text-5xl mb-4"></i>
//                 Đang nạp dữ liệu môi trường thực tế...
//             </div>
//         );
//     }

//     // ---------------------------------------------------------
//     // 6. GIAO DIỆN CHÍNH CỦA DASHBOARD
//     // ---------------------------------------------------------
//     return (
//         <div className="animate-fade-in space-y-6 pb-10 max-w-7xl mx-auto">
            
//             {/* === HEADER (BANNER TỔNG QUAN) === */}
//             <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-3xl p-8 text-white shadow-lg shadow-emerald-200 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
//                 <i className="fas fa-leaf absolute -bottom-10 -right-10 text-[150px] text-white/10 -rotate-12"></i>
                
//                 <div className="relative z-10">
//                     <h2 className="text-3xl font-black tracking-tight mb-2">Chào ngày mới, Nông dân! ☀️</h2>
//                     <p className="text-emerald-50 font-medium text-lg">Hệ thống AI đang tự động theo dõi thời gian thực {zones.length} khu vực canh tác của bạn.</p>
//                 </div>
                
//                 {/* 2 Khối hiển thị trung bình cộng đã tính ở trên */}
//                 <div className="relative z-10 flex gap-4">
//                     <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl text-center border border-white/30">
//                         <div className="text-sm font-bold text-emerald-100 uppercase tracking-widest mb-1">Nhiệt độ TB</div>
//                         <div className="text-3xl font-black">{farmStats.avgTemp !== '--' ? `${farmStats.avgTemp}°C` : '--'}</div>
//                     </div>
//                     <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl text-center border border-white/30">
//                         <div className="text-sm font-bold text-emerald-100 uppercase tracking-widest mb-1">Độ ẩm Đất</div>
//                         <div className="text-3xl font-black">{farmStats.avgHumid !== '--' ? `${farmStats.avgHumid}%` : '--'}</div>
//                     </div>
//                 </div>
//             </div>

//             {/* === KHU VỰC CẢNH BÁO (ALERTS) === */}
//             {/* Chỉ hiển thị (render) cục này khi mảng alerts có dữ liệu */}
//             {alerts.length > 0 && (
//                 <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm flex items-start">
//                     <div className="flex-shrink-0">
//                         <i className="fas fa-exclamation-triangle text-amber-500 text-xl mt-0.5"></i>
//                     </div>
//                     <div className="ml-3">
//                         <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Cảnh báo môi trường khẩn cấp</h3>
//                         <div className="mt-2 text-sm text-amber-700 space-y-1 font-medium">
//                             {alerts.map((alert, idx) => (
//                                 <p key={idx}>- {alert}</p>
//                             ))}
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* === DANH SÁCH CÁC KHU VỰC CANH TÁC (ZONE CARDS) === */}
//             <div className="flex justify-between items-end mt-8 mb-4">
//                 <h3 className="text-2xl font-black text-slate-800"><i className="fas fa-map-marked-alt text-emerald-500 mr-2"></i> Các khu vực bạn quản lý</h3>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
//                 {/* Nếu nông dân chưa được Admin giao quản lý vườn nào */}
//                 {zones.length === 0 ? (
//                     <div className="col-span-full bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300">
//                         <p className="text-slate-500 font-medium">Bạn chưa được phân công quản lý khu vực nào. Hãy liên hệ Admin.</p>
//                     </div>
//                 ) : 
                
//                 // Duyệt qua từng Vườn để tạo thành các Thẻ (Card)
//                 zones.map(zone => {
//                     // Lấy thiết bị MỚI NHẤT thuộc Vườn này (để lấy data hiển thị lên card)
//                     const zoneDevices = devices.filter(d => d.zone_id === zone.zone_id);
//                     const primaryDevice = zoneDevices[0] || {};
                    
//                     // Trích xuất số liệu
//                     const soilM = primaryDevice.hum_soil !== undefined && primaryDevice.hum_soil !== null ? primaryDevice.hum_soil : '--';
//                     const temp = primaryDevice.temp !== undefined && primaryDevice.temp !== null ? primaryDevice.temp : '--';
                    
//                     // Logic màu sắc: Nếu đất < 40% thì báo đỏ
//                     const isDry = soilM !== '--' && soilM < 40;

//                     // FIX QUAN TRỌNG: KIỂM TRA CHẾ ĐỘ AI VÀ TRẠNG THÁI MẠCH
//                     // 1. Kiểm tra xem mạch có bị mất điện/mất WiFi không?
//                     const isOffline = primaryDevice.status !== 'ONLINE';
//                     // 2. Kiểm tra vườn này đang chạy AI hay nông dân tự bấm? (Mặc định là AUTO)
//                     const isAutoMode = (zone.setting?.mode || 'AUTO') === 'AUTO';
                    
//                     // Biến gộp: Phải KHÓA (Disable) nút bấm nếu đang là AI hoặc Mạch bị Offline
//                     const isActionDisabled = isOffline || isAutoMode;

//                     return (
//                         <div key={zone.zone_id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow group flex flex-col justify-between">
                            
//                             {/* --- Phần 1: Hình ảnh bìa của Vườn --- */}
//                             <div>
//                                 <div className="h-32 bg-slate-100 relative overflow-hidden">
//                                     <img src={`https://images.unsplash.com/photo-1592424001807-6f81c9646b9a?auto=format&fit=crop&q=80&w=800`} alt="Farm" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
//                                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
//                                     <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
//                                         <h4 className="text-white font-black text-xl truncate pr-2">{zone.name}</h4>
//                                         <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider whitespace-nowrap shadow-sm">
//                                             {zone.crop_type || 'Chưa xác định'}
//                                         </span>
//                                     </div>
                                    
//                                     {/* Nhãn báo trạng thái góc trên bên phải ảnh */}
//                                     <div className="absolute top-3 right-3 flex gap-2">
//                                         {isOffline && (
//                                             <span className="bg-rose-500/90 backdrop-blur-sm text-white text-[9px] px-2 py-1 rounded shadow">
//                                                 <i className="fas fa-wifi-slash mr-1"></i> OFFLINE
//                                             </span>
//                                         )}
//                                         {isAutoMode && !isOffline && (
//                                             <span className="bg-purple-500/90 backdrop-blur-sm text-white text-[9px] px-2 py-1 rounded shadow">
//                                                 <i className="fas fa-robot mr-1"></i> AI AUTO
//                                             </span>
//                                         )}
//                                     </div>
//                                 </div>

//                                 {/* --- Phần 2: Thẻ hiển thị Cảm biến --- */}
//                                 <div className="p-5 pb-0">
//                                     <div className="grid grid-cols-2 gap-4 mb-4">
//                                         <div className={`flex flex-col rounded-2xl p-3 border ${isDry ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'}`}>
//                                             <span className="text-[10px] font-bold uppercase text-slate-500 mb-1">
//                                                 <i className="fas fa-water mr-1 opacity-70"></i> Ẩm đất
//                                             </span>
//                                             <span className={`text-2xl font-black ${isDry ? 'text-rose-600' : 'text-blue-600'}`}>
//                                                 {soilM !== '--' ? `${soilM}%` : '--'}
//                                             </span>
//                                         </div>
//                                         <div className="flex flex-col bg-amber-50 border border-amber-100 rounded-2xl p-3">
//                                             <span className="text-[10px] font-bold uppercase text-slate-500 mb-1">
//                                                 <i className="fas fa-temperature-high mr-1 opacity-70"></i> Nhiệt độ
//                                             </span>
//                                             <span className="text-2xl font-black text-amber-600">
//                                                 {temp !== '--' ? `${temp}°C` : '--'}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* --- Phần 3: Nút Hành động (Nằm ở đáy Card) --- */}
//                             <div className="p-5 pt-0 mt-auto">
//                                 {/* Nếu bị khóa, hiển thị dòng giải thích nhỏ */}
//                                 {isActionDisabled && (
//                                     <p className="text-[10px] text-center text-slate-400 mb-2 font-medium">
//                                         <i className="fas fa-lock mr-1"></i> 
//                                         {isOffline ? 'Không thể bơm do mất kết nối.' : 'AI đang quản lý bơm nước.'}
//                                     </p>
//                                 )}
                                
//                                 <div className="flex gap-2">
//                                     {/* Nút Tưới Ngay (Đã FIX logic Disable) */}
//                                     <button 
//                                         onClick={() => handleWaterNow(zone.zone_id)}
//                                         disabled={isActionDisabled}
//                                         className={`flex-1 py-3 rounded-xl font-bold transition-colors flex justify-center items-center group/btn ${
//                                             isActionDisabled 
//                                             ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
//                                             : 'bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100'
//                                         }`}
//                                     >
//                                         <i className={`fas fa-tint mr-2 ${!isActionDisabled && 'group-hover/btn:animate-bounce'}`}></i> 
//                                         Tưới Ngay
//                                     </button>
                                    
//                                     {/* Nút Đi tới Trang Cài đặt Chi tiết Vườn */}
//                                     <Link 
//                                         to={`/farmer/zones/${zone.zone_id}`}
//                                         className="w-14 flex items-center justify-center bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-100 rounded-xl transition-colors"
//                                         title="Chi tiết và Cài đặt"
//                                     >
//                                         <i className="fas fa-chevron-right"></i>
//                                     </Link>
//                                 </div>
//                             </div>
                            
//                         </div>
//                     );
//                 })}
//             </div>
//         </div>
//     );
// };

// export default FarmerDashboard;
