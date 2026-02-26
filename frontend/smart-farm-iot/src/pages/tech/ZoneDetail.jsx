import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TechZoneDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [zone, setZone] = useState(null);
    const [devices, setDevices] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Lấy thông tin Zone
                const allZones = await api.zones.getAll();
                const currentZone = allZones.find(z => z.zone_id === parseInt(id));
                setZone(currentZone);

                // 2. Lấy thiết bị trong Zone
                const allDevices = await api.devices.getAll();
                const zoneDevices = allDevices.filter(d => d.zone_id === parseInt(id));
                setDevices(zoneDevices);

                // 3. LẤY DỮ LIỆU THẬT TỪ DATABASE CHO BIỂU ĐỒ
                if (zoneDevices.length > 0) {
                    const primaryDevice = zoneDevices[0]; // Lấy thiết bị đầu tiên làm chuẩn vẽ biểu đồ
                    try {
                        const history = await api.devices.getHistory(primaryDevice.device_id, 20); // Lấy 20 lần đo gần nhất
                        
                        // Đảo ngược mảng để vẽ từ trái sang phải (cũ -> mới)
                        const formattedData = (history || []).reverse().map(item => ({
                            time: new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                            temp: item.temp !== null ? item.temp : 0,
                            humid_soil: item.hum_soil !== null ? item.hum_soil : 0,
                            humid_air: item.hum_air !== null ? item.hum_air : 0
                        }));
                        setChartData(formattedData);
                    } catch (error) {
                        console.error("Không thể tải lịch sử cảm biến:", error);
                        setChartData([]);
                    }
                } else {
                    setChartData([]); // Không có thiết bị thì biểu đồ rỗng
                }

            } catch (error) {
                console.error("Lỗi tải dữ liệu chi tiết:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchData();
        
        // Polling để cập nhật số liệu mới nhất mỗi 15 giây
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [id]);

    const getBattery = (dev) => dev.battery_level !== undefined ? dev.battery_level : 85;

    // --- TRÍCH XUẤT 4 THÔNG SỐ TỪ THIẾT BỊ ĐẦU TIÊN ---
    const primaryDevice = devices[0] || {};
    const temp = primaryDevice.temp !== undefined && primaryDevice.temp !== null ? primaryDevice.temp : '--';
    const humidSoil = primaryDevice.hum_soil !== undefined && primaryDevice.hum_soil !== null ? primaryDevice.hum_soil : '--';
    const humidAir = primaryDevice.hum_air !== undefined && primaryDevice.hum_air !== null ? primaryDevice.hum_air : '--';
    const light = primaryDevice.light !== undefined && primaryDevice.light !== null ? primaryDevice.light : '--';

    // Hàm tiện ích để xác định trạng thái cảm biến
    const getSensorStatus = (value, deviceStatus) => {
        if (deviceStatus === 'OFFLINE') return { text: "Mất kết nối mạch", color: "text-rose-500", icon: "fa-wifi-slash" };
        if (deviceStatus === 'ERROR') return { text: "Nghi ngờ lỗi phần cứng", color: "text-amber-500", icon: "fa-exclamation-triangle" };
        if (value === '--') return { text: "Lỗi đọc dữ liệu", color: "text-rose-500", icon: "fa-times-circle" };
        return { text: "Hoạt động tốt", color: "text-emerald-500", icon: "fa-check-circle" };
    };

    if (isLoading && !zone) return <div className="flex justify-center p-10 font-bold text-slate-400 animate-pulse">Đang tải biểu đồ...</div>;
    if (!zone) return <div className="text-center p-10 font-bold text-red-500">Khu vực không tồn tại!</div>;

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-10 space-y-6">
            
            {/* 1. HEADER & BACK BUTTON */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <button 
                    onClick={() => navigate('/tech/zones')} 
                    className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm"
                >
                    <i className="fas fa-arrow-left text-lg"></i>
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{zone.name}</h2>
                    <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-block mt-1 uppercase tracking-wider">
                        {zone.crop_type}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 2. KHU VỰC BIỂU ĐỒ (CHART) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800"><i className="fas fa-chart-area text-blue-500 mr-2"></i>Biến động Môi trường</h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Hôm nay</span>
                    </div>
                    
                    <div className="flex-1 w-full min-h-[300px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorHumidSoil" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                                    />
                                    <Area type="monotone" name="Nhiệt độ (°C)" dataKey="temp" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                                    <Area type="monotone" name="Ẩm Đất (%)" dataKey="humid_soil" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorHumidSoil)" />
                                    <Area type="monotone" name="Ẩm Khí (%)" dataKey="humid_air" stroke="#06b6d4" strokeWidth={2} fillOpacity={0} borderDasharray="5 5" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-2xl">
                                Chưa có dữ liệu lịch sử cho thiết bị này.
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. TÓM TẮT 4 CHỈ SỐ CẢM BIẾN */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Trạng thái Cảm biến</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {/* Nhiệt độ */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
                            <i className="fas fa-temperature-high text-amber-500 text-2xl mb-2"></i>
                            <h4 className="text-2xl font-black text-slate-800">{temp}°C</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 mb-2">Nhiệt độ</p>
                            <p className={`text-[9px] font-bold ${getSensorStatus(temp, primaryDevice.status).color}`}>
                                <i className={`fas ${getSensorStatus(temp, primaryDevice.status).icon} mr-1`}></i>
                                {getSensorStatus(temp, primaryDevice.status).text}
                            </p>
                        </div>

                        {/* Ẩm Đất */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
                            <i className="fas fa-water text-blue-500 text-2xl mb-2"></i>
                            <h4 className="text-2xl font-black text-slate-800">{humidSoil}%</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 mb-2">Ẩm Đất</p>
                            <p className={`text-[9px] font-bold ${getSensorStatus(humidSoil, primaryDevice.status).color}`}>
                                <i className={`fas ${getSensorStatus(humidSoil, primaryDevice.status).icon} mr-1`}></i>
                                {getSensorStatus(humidSoil, primaryDevice.status).text}
                            </p>
                        </div>

                        {/* Ẩm Khí */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
                            <i className="fas fa-cloud text-cyan-500 text-2xl mb-2"></i>
                            <h4 className="text-2xl font-black text-slate-800">{humidAir}%</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 mb-2">Ẩm Khí</p>
                            <p className={`text-[9px] font-bold ${getSensorStatus(humidAir, primaryDevice.status).color}`}>
                                <i className={`fas ${getSensorStatus(humidAir, primaryDevice.status).icon} mr-1`}></i>
                                {getSensorStatus(humidAir, primaryDevice.status).text}
                            </p>
                        </div>

                        {/* Ánh sáng */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
                            <i className="fas fa-sun text-yellow-500 text-2xl mb-2"></i>
                            <h4 className="text-2xl font-black text-slate-800">{light} <span className="text-xs">Lux</span></h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 mb-2">Ánh sáng</p>
                            <p className={`text-[9px] font-bold ${getSensorStatus(light, primaryDevice.status).color}`}>
                                <i className={`fas ${getSensorStatus(light, primaryDevice.status).icon} mr-1`}></i>
                                {getSensorStatus(light, primaryDevice.status).text}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. DANH SÁCH THIẾT BỊ TRONG ZONE NÀY */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mt-6">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">
                        <i className="fas fa-microchip text-emerald-500 mr-2"></i> Tình trạng Phần cứng ({devices.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Tên Thiết bị / MAC</th>
                                <th className="px-6 py-4 text-center">Trạng thái kết nối</th>
                                <th className="px-6 py-4">Nguồn điện / Pin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {devices.length === 0 ? (
                                <tr><td colSpan="3" className="text-center py-8 text-slate-400 font-medium">Khu vực này chưa lắp đặt thiết bị.</td></tr>
                            ) : devices.map(dev => {
                                const bat = getBattery(dev);
                                return (
                                    <tr key={dev.device_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-800 text-sm">{dev.name}</div>
                                            <div className="text-xs font-mono text-slate-400 mt-1">{dev.device_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {dev.status === 'ONLINE' && (
                                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-emerald-200">ONLINE</span>
                                            )}
                                            {dev.status === 'OFFLINE' && (
                                                <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-rose-200 animate-pulse">OFFLINE</span>
                                            )}
                                            {dev.status === 'ERROR' && (
                                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-amber-200">ERROR</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-24 h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                                    <div className={`h-full ${bat < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${bat}%` }}></div>
                                                </div>
                                                <span className="text-xs font-black text-slate-600">{bat}%</span>
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

export default TechZoneDetail;
// import React, { useEffect, useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { api } from '../../services/api';
// import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// const TechZoneDetail = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
    
//     const [zone, setZone] = useState(null);
//     const [devices, setDevices] = useState([]);
//     const [chartData, setChartData] = useState([]);
//     const [isLoading, setIsLoading] = useState(true);

//     useEffect(() => {
//         const fetchData = async () => {
//             setIsLoading(true);
//             try {
//                 // 1. Lấy thông tin Zone
//                 const allZones = await api.zones.getAll();
//                 const currentZone = allZones.find(z => z.zone_id === parseInt(id));
//                 setZone(currentZone);

//                 // 2. Lấy thiết bị trong Zone
//                 const allDevices = await api.devices.getAll();
//                 const zoneDevices = allDevices.filter(d => d.zone_id === parseInt(id));
//                 setDevices(zoneDevices);

//                 // 3. Giả lập dữ liệu biểu đồ cảm biến
//                 const mockData = Array.from({ length: 10 }).map((_, i) => ({
//                     time: `${8 + i}:00`,
//                     temp: 25 + Math.random() * 10,  
//                     humid_soil: 40 + Math.random() * 40,
//                     humid_air: 60 + Math.random() * 30
//                 }));
//                 setChartData(mockData);

//             } catch (error) {
//                 console.error("Lỗi tải dữ liệu chi tiết:", error);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchData();
        
//         // Polling để cập nhật số liệu mới nhất
//         const interval = setInterval(fetchData, 15000);
//         return () => clearInterval(interval);
//     }, [id]);

//     const getBattery = (dev) => dev.battery_level !== undefined ? dev.battery_level : 85;

//     // --- TRÍCH XUẤT 4 THÔNG SỐ TỪ THIẾT BỊ ĐẦU TIÊN ---
//     const primaryDevice = devices[0] || {};
//     const temp = primaryDevice.temp !== undefined && primaryDevice.temp !== null ? primaryDevice.temp : '--';
//     const humidSoil = primaryDevice.hum_soil !== undefined && primaryDevice.hum_soil !== null ? primaryDevice.hum_soil : '--';
//     const humidAir = primaryDevice.hum_air !== undefined && primaryDevice.hum_air !== null ? primaryDevice.hum_air : '--';
//     const light = primaryDevice.light !== undefined && primaryDevice.light !== null ? primaryDevice.light : '--';

//     // Hàm tiện ích để xác định trạng thái cảm biến
//     const getSensorStatus = (value, deviceStatus) => {
//         if (deviceStatus === 'OFFLINE') return { text: "Mất kết nối mạch", color: "text-rose-500", icon: "fa-wifi-slash" };
//         if (deviceStatus === 'ERROR') return { text: "Nghi ngờ lỗi phần cứng", color: "text-amber-500", icon: "fa-exclamation-triangle" };
//         if (value === '--') return { text: "Lỗi đọc dữ liệu", color: "text-rose-500", icon: "fa-times-circle" };
//         return { text: "Hoạt động tốt", color: "text-emerald-500", icon: "fa-check-circle" };
//     };

//     if (isLoading && !zone) return <div className="flex justify-center p-10 font-bold text-slate-400 animate-pulse">Đang tải biểu đồ...</div>;
//     if (!zone) return <div className="text-center p-10 font-bold text-red-500">Khu vực không tồn tại!</div>;

//     return (
//         <div className="animate-fade-in max-w-7xl mx-auto pb-10 space-y-6">
            
//             {/* 1. HEADER & BACK BUTTON */}
//             <div className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
//                 <button 
//                     onClick={() => navigate('/tech/zones')} 
//                     className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm"
//                 >
//                     <i className="fas fa-arrow-left text-lg"></i>
//                 </button>
//                 <div>
//                     <h2 className="text-2xl font-black text-slate-800 tracking-tight">{zone.name}</h2>
//                     <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-block mt-1 uppercase tracking-wider">
//                         {zone.crop_type}
//                     </p>
//                 </div>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
//                 {/* 2. KHU VỰC BIỂU ĐỒ (CHART) */}
//                 <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
//                     <div className="flex justify-between items-center mb-6">
//                         <h3 className="text-lg font-bold text-slate-800"><i className="fas fa-chart-area text-blue-500 mr-2"></i>Biến động Môi trường</h3>
//                         <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Hôm nay</span>
//                     </div>
                    
//                     <div className="flex-1 w-full min-h-[300px]">
//                         <ResponsiveContainer width="100%" height="100%">
//                             <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
//                                 <defs>
//                                     <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
//                                         <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
//                                         <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
//                                     </linearGradient>
//                                     <linearGradient id="colorHumidSoil" x1="0" y1="0" x2="0" y2="1">
//                                         <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
//                                         <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
//                                     </linearGradient>
//                                 </defs>
//                                 <XAxis dataKey="time" stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} />
//                                 <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} />
//                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//                                 <Tooltip 
//                                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
//                                     labelStyle={{ fontWeight: 'bold', color: '#334155' }}
//                                 />
//                                 <Area type="monotone" name="Nhiệt độ (°C)" dataKey="temp" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
//                                 <Area type="monotone" name="Ẩm Đất (%)" dataKey="humid_soil" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorHumidSoil)" />
//                                 <Area type="monotone" name="Ẩm Khí (%)" dataKey="humid_air" stroke="#06b6d4" strokeWidth={2} fillOpacity={0} borderDasharray="5 5" />
//                             </AreaChart>
//                         </ResponsiveContainer>
//                     </div>
//                 </div>

//                 {/* 3. TÓM TẮT 4 CHỈ SỐ CẢM BIẾN (Dành cho Kỹ thuật viên) */}
//                 <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
//                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Trạng thái Cảm biến</h3>
                    
//                     <div className="grid grid-cols-2 gap-4">
//                         {/* Nhiệt độ */}
//                         <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
//                             <i className="fas fa-temperature-high text-amber-500 text-2xl mb-2"></i>
//                             <h4 className="text-2xl font-black text-slate-800">{temp}°C</h4>
//                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 mb-2">Nhiệt độ</p>
//                             <p className={`text-[9px] font-bold ${getSensorStatus(temp, primaryDevice.status).color}`}>
//                                 <i className={`fas ${getSensorStatus(temp, primaryDevice.status).icon} mr-1`}></i>
//                                 {getSensorStatus(temp, primaryDevice.status).text}
//                             </p>
//                         </div>

//                         {/* Ẩm Đất */}
//                         <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
//                             <i className="fas fa-water text-blue-500 text-2xl mb-2"></i>
//                             <h4 className="text-2xl font-black text-slate-800">{humidSoil}%</h4>
//                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 mb-2">Ẩm Đất</p>
//                             <p className={`text-[9px] font-bold ${getSensorStatus(humidSoil, primaryDevice.status).color}`}>
//                                 <i className={`fas ${getSensorStatus(humidSoil, primaryDevice.status).icon} mr-1`}></i>
//                                 {getSensorStatus(humidSoil, primaryDevice.status).text}
//                             </p>
//                         </div>

//                         {/* Ẩm Khí */}
//                         <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
//                             <i className="fas fa-cloud text-cyan-500 text-2xl mb-2"></i>
//                             <h4 className="text-2xl font-black text-slate-800">{humidAir}%</h4>
//                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 mb-2">Ẩm Khí</p>
//                             <p className={`text-[9px] font-bold ${getSensorStatus(humidAir, primaryDevice.status).color}`}>
//                                 <i className={`fas ${getSensorStatus(humidAir, primaryDevice.status).icon} mr-1`}></i>
//                                 {getSensorStatus(humidAir, primaryDevice.status).text}
//                             </p>
//                         </div>

//                         {/* Ánh sáng */}
//                         <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center">
//                             <i className="fas fa-sun text-yellow-500 text-2xl mb-2"></i>
//                             <h4 className="text-2xl font-black text-slate-800">{light} <span className="text-xs">Lux</span></h4>
//                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 mb-2">Ánh sáng</p>
//                             <p className={`text-[9px] font-bold ${getSensorStatus(light, primaryDevice.status).color}`}>
//                                 <i className={`fas ${getSensorStatus(light, primaryDevice.status).icon} mr-1`}></i>
//                                 {getSensorStatus(light, primaryDevice.status).text}
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* 4. DANH SÁCH THIẾT BỊ TRONG ZONE NÀY */}
//             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mt-6">
//                 <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
//                     <h3 className="font-bold text-slate-800">
//                         <i className="fas fa-microchip text-emerald-500 mr-2"></i> Tình trạng Phần cứng ({devices.length})
//                     </h3>
//                 </div>
//                 <div className="overflow-x-auto">
//                     <table className="w-full text-left">
//                         <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
//                             <tr>
//                                 <th className="px-6 py-4">Tên Thiết bị / MAC</th>
//                                 <th className="px-6 py-4 text-center">Trạng thái kết nối</th>
//                                 <th className="px-6 py-4">Nguồn điện / Pin</th>
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-50">
//                             {devices.length === 0 ? (
//                                 <tr><td colSpan="3" className="text-center py-8 text-slate-400 font-medium">Khu vực này chưa lắp đặt thiết bị.</td></tr>
//                             ) : devices.map(dev => {
//                                 const bat = getBattery(dev);
//                                 return (
//                                     <tr key={dev.device_id} className="hover:bg-slate-50 transition-colors">
//                                         <td className="px-6 py-4">
//                                             <div className="font-black text-slate-800 text-sm">{dev.name}</div>
//                                             <div className="text-xs font-mono text-slate-400 mt-1">{dev.device_id}</div>
//                                         </td>
//                                         <td className="px-6 py-4 text-center">
//                                             {dev.status === 'ONLINE' && (
//                                                 <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-emerald-200">ONLINE</span>
//                                             )}
//                                             {dev.status === 'OFFLINE' && (
//                                                 <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-rose-200 animate-pulse">OFFLINE</span>
//                                             )}
//                                             {dev.status === 'ERROR' && (
//                                                 <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-amber-200">ERROR</span>
//                                             )}
//                                         </td>
//                                         <td className="px-6 py-4">
//                                             <div className="flex items-center gap-3">
//                                                 <div className="w-24 h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
//                                                     <div className={`h-full ${bat < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${bat}%` }}></div>
//                                                 </div>
//                                                 <span className="text-xs font-black text-slate-600">{bat}%</span>
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

// export default TechZoneDetail;