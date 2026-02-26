import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { toast } from 'react-toastify';

const FarmerControl = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [zones, setZones] = useState([]);
    const [devices, setDevices] = useState([]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [zonesRes, devicesRes] = await Promise.all([
                api.zones.getAll(),
                api.devices.getAll()
            ]);
            setZones(zonesRes || []);
            setDevices(devicesRes || []);
        } catch (error) {
            toast.error("Lỗi lấy dữ liệu khu vực!");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (deviceId, action) => {
        try {
            toast.info(`Đang gửi lệnh...`);
            await api.devices.control(deviceId, action);
            toast.success("Lệnh đã được thực thi!");
        } catch (error) {
            // FIX 2: Bắt lỗi 429 (Chống spam API)
            if (error.response && error.response.status === 429) {
                toast.error("Hệ thống đang chống quá tải. Vui lòng đợi 1 phút trước khi bấm tiếp!");
            } else {
                toast.error("Điều khiển thất bại. Mạch Offline?");
            }
        }
    };

    if (isLoading) return <div className="p-20 text-center text-blue-500 font-bold animate-pulse">Đang nạp bảng điều khiển...</div>;

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-10 space-y-6">
            <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Trung tâm Điều khiển</h2>
                <p className="text-slate-500 font-medium mt-1">Bật tắt thủ công máy bơm, phun sương cho các khu vực.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {zones.map(zone => {
                    const device = devices.find(d => d.zone_id === zone.zone_id);
                    const isOffline = !device || device.status !== 'ONLINE';
                    
                    // FIX 1: Lấy mode chuẩn, nếu null thì mặc định ép về AUTO
                    const isAuto = (zone.setting?.mode || 'AUTO') === 'AUTO'; 

                    return (
                        <div key={zone.zone_id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-6 border-b border-slate-50 pb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{zone.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase">
                                        Mạch: {device ? device.name : 'Chưa có'}
                                    </p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isAuto ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                    {isAuto ? '🤖 ĐANG CHẠY AI (AUTO)' : '✋ CHẾ ĐỘ THỦ CÔNG'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => handleAction(device?.device_id, 'PUMP_ON')}
                                    disabled={isOffline || isAuto}
                                    className={`py-6 rounded-2xl font-bold transition-all flex flex-col items-center gap-3 group ${
                                        isOffline || isAuto 
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                        : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-200/50'
                                    }`}
                                >
                                    <i className={`fas fa-tint text-3xl ${!(isOffline || isAuto) && 'group-hover:scale-110 transition-transform'}`}></i> 
                                    <span>BẬT BƠM TƯỚI</span>
                                </button>
                                
                                <button 
                                    onClick={() => handleAction(device?.device_id, 'MIST_ON')}
                                    disabled={isOffline || isAuto}
                                    className={`py-6 rounded-2xl font-bold transition-all flex flex-col items-center gap-3 group ${
                                        isOffline || isAuto 
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200/50'
                                    }`}
                                >
                                    <i className={`fas fa-wind text-3xl ${!(isOffline || isAuto) && 'group-hover:scale-110 transition-transform'}`}></i> 
                                    <span>PHUN SƯƠNG</span>
                                </button>
                            </div>
                            
                            {/* KHÓA CHỨC NĂNG NẾU ĐANG LÀ AUTO HOẶC OFFLINE */}
                            {(isOffline || isAuto) && (
                                <div className={`text-center text-xs mt-4 font-medium flex items-center justify-center p-2 rounded-lg ${isOffline ? 'text-rose-500 bg-rose-50' : 'text-purple-600 bg-purple-50'}`}>
                                    <i className="fas fa-lock mr-2"></i>
                                    {isOffline 
                                        ? 'Không thể điều khiển do mất kết nối mạng.' 
                                        : 'Mô hình AI đang quản lý. Tắt chế độ AUTO ở Cài đặt Vườn để điều khiển tay.'
                                    }
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FarmerControl;
// import React, { useState, useEffect } from 'react';
// import { api } from '../../services/api';
// import { toast } from 'react-toastify';

// const FarmerControl = () => {
//     const [isLoading, setIsLoading] = useState(true);
//     const [zones, setZones] = useState([]);
//     const [devices, setDevices] = useState([]);

//     const fetchData = async () => {
//         setIsLoading(true);
//         try {
//             const [zonesRes, devicesRes] = await Promise.all([
//                 api.zones.getAll(),
//                 api.devices.getAll()
//             ]);
//             setZones(zonesRes || []);
//             setDevices(devicesRes || []);
//         } catch (error) {
//             toast.error("Lỗi lấy dữ liệu khu vực!");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchData();
//     }, []);

//     const handleAction = async (deviceId, action) => {
//         try {
//             toast.info(`Đang gửi lệnh...`);
//             await api.devices.control(deviceId, action);
//             toast.success("Lệnh đã được thực thi!");
//         } catch (error) {
//             toast.error("Điều khiển thất bại. Mạch Offline?");
//         }
//     };

//     if (isLoading) return <div className="p-20 text-center text-blue-500 font-bold animate-pulse">Đang nạp bảng điều khiển...</div>;

//     return (
//         <div className="animate-fade-in max-w-7xl mx-auto pb-10 space-y-6">
//             <div>
//                 <h2 className="text-3xl font-black text-slate-800 tracking-tight">Trung tâm Điều khiển</h2>
//                 <p className="text-slate-500 font-medium mt-1">Bật tắt thủ công máy bơm, phun sương cho các khu vực.</p>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                 {zones.map(zone => {
//                     const device = devices.find(d => d.zone_id === zone.zone_id);
//                     const isOffline = !device || device.status !== 'ONLINE';
                    
//                     // Lấy mode từ zone.setting, mặc định là AUTO nếu chưa có
//                     const isAuto = zone.setting?.mode === 'AUTO'; 

//                     return (
//                         <div key={zone.zone_id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
//                             <div className="flex justify-between items-start mb-6 border-b border-slate-50 pb-4">
//                                 <div>
//                                     <h3 className="text-xl font-bold text-slate-800">{zone.name}</h3>
//                                     <p className="text-xs font-bold text-slate-400 mt-1 uppercase">
//                                         Mạch: {device ? device.name : 'Chưa có'}
//                                     </p>
//                                 </div>
//                                 <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isAuto ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
//                                     {isAuto ? 'ĐANG CHẠY AI (AUTO)' : 'CHẾ ĐỘ THỦ CÔNG'}
//                                 </div>
//                             </div>

//                             <div className="grid grid-cols-2 gap-4">
//                                 <button 
//                                     onClick={() => handleAction(device?.device_id, 'PUMP_ON')}
//                                     disabled={isOffline || isAuto}
//                                     className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-6 rounded-2xl font-bold transition-all shadow-md shadow-blue-200/50 flex flex-col items-center gap-3 group"
//                                 >
//                                     <i className="fas fa-tint text-3xl group-hover:scale-110 transition-transform"></i> 
//                                     <span>BẬT BƠM TƯỚI</span>
//                                 </button>
                                
//                                 <button 
//                                     onClick={() => handleAction(device?.device_id, 'MIST_ON')}
//                                     disabled={isOffline || isAuto}
//                                     className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-6 rounded-2xl font-bold transition-all shadow-md shadow-amber-200/50 flex flex-col items-center gap-3 group"
//                                 >
//                                     <i className="fas fa-wind text-3xl group-hover:scale-110 transition-transform"></i> 
//                                     <span>PHUN SƯƠNG</span>
//                                 </button>
//                             </div>
                            
//                             {(isOffline || isAuto) && (
//                                 <p className="text-center text-xs text-rose-500 mt-4 font-medium flex items-center justify-center">
//                                     <i className="fas fa-lock mr-1"></i>
//                                     {isOffline ? 'Không thể điều khiển do mất kết nối mạng.' : 'Vui lòng tắt chế độ AUTO ở cài đặt Vườn để điều khiển tay.'}
//                                 </p>
//                             )}
//                         </div>
//                     );
//                 })}
//             </div>
//         </div>
//     );
// };

// export default FarmerControl;