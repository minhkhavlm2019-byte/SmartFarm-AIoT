import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { toast } from 'react-toastify';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const FarmerMonitor = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [zones, setZones] = useState([]);
    const [devices, setDevices] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [zonesRes, devicesRes] = await Promise.all([
                    api.zones.getAll(),
                    api.devices.getAll()
                ]);
                setZones(zonesRes || []);
                setDevices(devicesRes || []);
                if (zonesRes && zonesRes.length > 0) {
                    setSelectedZone(zonesRes[0].zone_id); 
                }
            } catch (error) {
                toast.error("Lỗi lấy dữ liệu giám sát!");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // Lấy dữ liệu biểu đồ khi đổi Zone
    useEffect(() => {
        if (!selectedZone) return;
        const fetchHistory = async () => {
            const deviceInZone = devices.find(d => d.zone_id === selectedZone);
            if (deviceInZone) {
                try {
                    const history = await api.devices.getHistory(deviceInZone.device_id, 20);
                    const formattedData = (history || []).reverse().map(item => ({
                        time: new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        temp: item.temp,
                        hum_soil: item.hum_soil,
                        hum_air: item.hum_air, // Đã bổ sung
                        light: item.light      // Đã bổ sung
                    }));
                    setChartData(formattedData);
                } catch (error) {
                    console.log("Không có lịch sử cho thiết bị này");
                }
            } else {
                setChartData([]);
            }
        };
        fetchHistory();
        const interval = setInterval(fetchHistory, 30000); 
        return () => clearInterval(interval);
    }, [selectedZone, devices]);

    const currentDevice = devices.find(d => d.zone_id === selectedZone) || {};

    if (isLoading) return <div className="p-20 text-center text-emerald-500 font-bold animate-pulse">Đang nạp dữ liệu cảm biến...</div>;

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-10 space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Giám sát Vi khí hậu</h2>
                    <p className="text-slate-500 font-medium mt-1">Theo dõi các chỉ số môi trường theo thời gian thực.</p>
                </div>
                <select 
                    className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={selectedZone || ''}
                    onChange={(e) => setSelectedZone(Number(e.target.value))}
                >
                    {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.name}</option>)}
                </select>
            </div>

            {/* ĐÃ SỬA: Chuyển grid thành 5 cột cho màn hình lớn (lg:grid-cols-5) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
                
                {/* 1. Nhiệt độ */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-xl"><i className="fas fa-temperature-high"></i></div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Nhiệt độ</p>
                        <h3 className="text-2xl font-black text-slate-800">{currentDevice.temp ?? '--'}°C</h3>
                    </div>
                </div>

                {/* 2. Độ ẩm không khí (MỚI THÊM) */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-500 flex items-center justify-center text-xl"><i className="fas fa-cloud"></i></div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Độ ẩm Khí</p>
                        <h3 className="text-2xl font-black text-slate-800">{currentDevice.hum_air ?? '--'}%</h3>
                    </div>
                </div>

                {/* 3. Độ ẩm Đất */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xl"><i className="fas fa-water"></i></div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Độ ẩm Đất</p>
                        <h3 className="text-2xl font-black text-slate-800">{currentDevice.hum_soil ?? '--'}%</h3>
                    </div>
                </div>

                {/* 4. Ánh sáng (MỚI THÊM) */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center text-xl"><i className="fas fa-sun"></i></div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Ánh sáng</p>
                        <h3 className="text-2xl font-black text-slate-800">{currentDevice.light ?? '--'} <span className="text-sm font-bold text-slate-500">Lux</span></h3>
                    </div>
                </div>

                {/* 5. Trạng thái mạch */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2 col-span-2 lg:col-span-1">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl"><i className="fas fa-wifi"></i></div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Kết nối</p>
                        <h3 className={`text-base md:text-lg mt-1 font-black ${currentDevice.status === 'ONLINE' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {currentDevice.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Biểu đồ */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><i className="fas fa-chart-area text-emerald-500 mr-2"></i> Biểu đồ biến thiên (20 lần đo gần nhất)</h3>
                <div className="h-80 w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} domain={['auto', 'auto']} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} domain={[0, 100]} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                                
                                <Line yAxisId="left" type="monotone" dataKey="temp" name="Nhiệt độ (°C)" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                <Line yAxisId="right" type="monotone" dataKey="hum_soil" name="Ẩm đất (%)" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                {/* Thêm đường biểu diễn Độ ẩm không khí vào biểu đồ */}
                                <Line yAxisId="right" type="monotone" dataKey="hum_air" name="Ẩm KK (%)" stroke="#06b6d4" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-2xl">Chưa có dữ liệu biểu đồ</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FarmerMonitor;
// import React, { useState, useEffect } from 'react';
// import { api } from '../../services/api';
// import { toast } from 'react-toastify';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// const FarmerMonitor = () => {
//     const [isLoading, setIsLoading] = useState(true);
//     const [zones, setZones] = useState([]);
//     const [devices, setDevices] = useState([]);
//     const [selectedZone, setSelectedZone] = useState(null);
//     const [chartData, setChartData] = useState([]);

//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const [zonesRes, devicesRes] = await Promise.all([
//                     api.zones.getAll(),
//                     api.devices.getAll()
//                 ]);
//                 setZones(zonesRes || []);
//                 setDevices(devicesRes || []);
//                 if (zonesRes && zonesRes.length > 0) {
//                     setSelectedZone(zonesRes[0].zone_id); // Chọn Zone đầu tiên làm mặc định
//                 }
//             } catch (error) {
//                 toast.error("Lỗi lấy dữ liệu giám sát!");
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchInitialData();
//     }, []);

//     // Lấy dữ liệu biểu đồ khi đổi Zone
//     useEffect(() => {
//         if (!selectedZone) return;
//         const fetchHistory = async () => {
//             const deviceInZone = devices.find(d => d.zone_id === selectedZone);
//             if (deviceInZone) {
//                 try {
//                     // Giả sử API getHistory trả về mảng dữ liệu lịch sử
//                     const history = await api.devices.getHistory(deviceInZone.device_id, 20);
//                     // Đảo ngược mảng để vẽ từ cũ -> mới, format lại giờ
//                     const formattedData = (history || []).reverse().map(item => ({
//                         time: new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
//                         temp: item.temp,
//                         hum_soil: item.hum_soil,
//                     }));
//                     setChartData(formattedData);
//                 } catch (error) {
//                     console.log("Không có lịch sử cho thiết bị này");
//                 }
//             } else {
//                 setChartData([]);
//             }
//         };
//         fetchHistory();
//         const interval = setInterval(fetchHistory, 30000); // 30s update biểu đồ
//         return () => clearInterval(interval);
//     }, [selectedZone, devices]);

//     // Tìm thiết bị của Zone đang chọn để lấy số hiện tại
//     const currentDevice = devices.find(d => d.zone_id === selectedZone) || {};

//     if (isLoading) return <div className="p-20 text-center text-emerald-500 font-bold animate-pulse">Đang nạp dữ liệu cảm biến...</div>;

//     return (
//         <div className="animate-fade-in max-w-7xl mx-auto pb-10 space-y-6">
//             <div className="flex justify-between items-end">
//                 <div>
//                     <h2 className="text-3xl font-black text-slate-800 tracking-tight">Giám sát Vi khí hậu</h2>
//                     <p className="text-slate-500 font-medium mt-1">Theo dõi biểu đồ nhiệt độ và độ ẩm theo thời gian thực.</p>
//                 </div>
//                 {/* Chọn Khu Vực */}
//                 <select 
//                     className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
//                     value={selectedZone || ''}
//                     onChange={(e) => setSelectedZone(Number(e.target.value))}
//                 >
//                     {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.name}</option>)}
//                 </select>
//             </div>

//             {/* Các thẻ chỉ số hiện tại */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
//                     <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl"><i className="fas fa-temperature-high"></i></div>
//                     <div>
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nhiệt độ hiện tại</p>
//                         <h3 className="text-3xl font-black text-slate-800">{currentDevice.temp ?? '--'}°C</h3>
//                     </div>
//                 </div>
//                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
//                     <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl"><i className="fas fa-water"></i></div>
//                     <div>
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Độ ẩm Đất</p>
//                         <h3 className="text-3xl font-black text-slate-800">{currentDevice.hum_soil ?? '--'}%</h3>
//                     </div>
//                 </div>
//                 <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
//                     <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl"><i className="fas fa-wifi"></i></div>
//                     <div>
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái mạch</p>
//                         <h3 className={`text-xl font-black ${currentDevice.status === 'ONLINE' ? 'text-emerald-500' : 'text-rose-500'}`}>
//                             {currentDevice.status === 'ONLINE' ? 'ĐANG KẾT NỐI' : 'MẤT KẾT NỐI'}
//                         </h3>
//                     </div>
//                 </div>
//             </div>

//             {/* Biểu đồ */}
//             <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
//                 <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><i className="fas fa-chart-area text-emerald-500 mr-2"></i> Biểu đồ biến thiên (20 lần đo gần nhất)</h3>
//                 <div className="h-80 w-full">
//                     {chartData.length > 0 ? (
//                         <ResponsiveContainer width="100%" height="100%">
//                             <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
//                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//                                 <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
//                                 <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} domain={['auto', 'auto']} />
//                                 <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} domain={[0, 100]} />
//                                 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
//                                 <Legend wrapperStyle={{ paddingTop: '20px' }}/>
//                                 <Line yAxisId="left" type="monotone" dataKey="temp" name="Nhiệt độ (°C)" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
//                                 <Line yAxisId="right" type="monotone" dataKey="hum_soil" name="Ẩm đất (%)" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
//                             </LineChart>
//                         </ResponsiveContainer>
//                     ) : (
//                         <div className="h-full flex items-center justify-center text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-2xl">Chưa có dữ liệu biểu đồ</div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default FarmerMonitor;