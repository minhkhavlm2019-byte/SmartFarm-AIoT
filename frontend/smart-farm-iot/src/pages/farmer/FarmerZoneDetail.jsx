import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { toast } from 'react-toastify';

const FarmerZoneDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [zone, setZone] = useState(null);
    const [devices, setDevices] = useState([]);
    
    const [settings, setSettings] = useState({
        mode: 'AUTO',
        pump_duration: 30,
        mist_duration: 60,
        min_soil_moisture: 40,
        max_soil_moisture: 70,
        heat_shock_temp: 35
    });

    const fetchZoneDetail = async () => {
        setIsLoading(true);
        try {
            const [zonesRes, devicesRes] = await Promise.all([
                api.zones.getAll(),
                api.devices.getAll()
            ]);

            const currentZone = zonesRes.find(z => z.zone_id === parseInt(id));
            if (!currentZone) {
                toast.error("Không tìm thấy khu vực này!");
                navigate('/farmer/dashboard');
                return;
            }

            setZone(currentZone);
            setDevices(devicesRes.filter(d => d.zone_id === parseInt(id)));

            if (currentZone.setting) {
                setSettings(prev => ({ ...prev, ...currentZone.setting }));
            }

        } catch (error) {
            console.error("Lỗi lấy chi tiết Zone:", error);
            toast.error("Mất kết nối dữ liệu vườn.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchZoneDetail();
        const interval = setInterval(fetchZoneDetail, 15000);
        return () => clearInterval(interval);
    }, [id]);

    const handleModeChange = async (newMode) => {
        const updatedSettings = { ...settings, mode: newMode };
        setSettings(updatedSettings); 
        setIsSaving(true);
        try {
            await api.zones.updateSettings(id, updatedSettings);
            toast.success(`Đã chuyển sang chế độ ${newMode === 'AUTO' ? 'AI TỰ ĐỘNG' : 'THỦ CÔNG'}`);
        } catch (error) {
            toast.error("Lỗi cập nhật chế độ!");
            setSettings(settings); 
        } finally {
            setIsSaving(false);
        }
    };

    const handleManualControl = async (actionType) => {
        if (settings.mode === 'AUTO') {
            toast.warning("Vui lòng chuyển sang chế độ THỦ CÔNG (MANUAL) để tự điều khiển!");
            return;
        }

        const primaryDevice = devices[0];
        if (!primaryDevice) {
            toast.error("Khu vực này chưa có thiết bị điều khiển.");
            return;
        }

        try {
            // Hiển thị toast info tương ứng với loại hành động
            let actionName = 'Lệnh';
            if (actionType === 'PUMP_ON') actionName = 'Tưới Nước';
            if (actionType === 'MIST_ON') actionName = 'Làm Mát';
            if (actionType === 'LIGHT_ON') actionName = 'Bật Đèn';
            if (actionType === 'LIGHT_OFF') actionName = 'Tắt Đèn';

            toast.info(`Đang gửi lệnh ${actionName}...`);
            await api.devices.control(primaryDevice.device_id, actionType);
            toast.success("Đã gửi lệnh thành công!");
        } catch (error) {
            toast.error("Thiết bị không phản hồi lệnh.");
        }
    };

    const handleSaveDurations = async () => {
        setIsSaving(true);
        try {
            await api.zones.updateSettings(id, settings);
            toast.success("Đã lưu cấu hình thành công!");
        } catch (error) {
            toast.error("Không thể lưu cấu hình.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSettingChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    };

    // --- TRÍCH XUẤT 4 THÔNG SỐ ---
    const primaryDevice = devices[0] || {};
    const currentSoilM = primaryDevice.hum_soil !== undefined && primaryDevice.hum_soil !== null ? primaryDevice.hum_soil : '--';
    const currentTemp = primaryDevice.temp !== undefined && primaryDevice.temp !== null ? primaryDevice.temp : '--';
    const currentAirHumid = primaryDevice.hum_air !== undefined && primaryDevice.hum_air !== null ? primaryDevice.hum_air : '--';
    const currentLight = primaryDevice.light !== undefined && primaryDevice.light !== null ? primaryDevice.light : '--';
    
    // Logic giao diện cơ bản
    const isDry = currentSoilM !== '--' && currentSoilM < 35;
    const isHot = currentTemp !== '--' && currentTemp >= 32;

    if (isLoading && !zone) {
        return <div className="p-20 text-center text-emerald-600 font-bold animate-pulse text-xl"><i className="fas fa-leaf animate-bounce mb-3 block text-4xl"></i> Đang vào vườn...</div>;
    }

    return (
        <div className="animate-fade-in max-w-5xl mx-auto pb-10 space-y-6">
            
            {/* 1. HEADER & ĐIỀU HƯỚNG */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/farmer/dashboard')} className="w-12 h-12 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-2xl flex items-center justify-center transition-colors border border-slate-100">
                        <i className="fas fa-arrow-left text-xl"></i>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">{zone?.name || 'Chi tiết Vườn'}</h2>
                        <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest mt-1">{zone?.crop_type || 'Khu vực Canh tác'}</p>
                    </div>
                </div>

                {/* CÔNG TẮC MODE */}
                <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center shadow-inner">
                    <button 
                        onClick={() => handleModeChange('AUTO')}
                        disabled={isSaving}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${settings.mode === 'AUTO' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <i className="fas fa-robot mr-2"></i> AI TỰ ĐỘNG
                    </button>
                    <button 
                        onClick={() => handleModeChange('MANUAL')}
                        disabled={isSaving}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${settings.mode === 'MANUAL' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <i className="fas fa-hand-paper mr-2"></i> THỦ CÔNG
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 2. CỘT TRÁI: CHỈ SỐ MÔI TRƯỜNG VÀ ĐIỀU KHIỂN */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Bảng chứa 4 thông số môi trường */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Thông số Vi khí hậu</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Độ ẩm đất */}
                            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isDry ? 'bg-rose-100 text-rose-500' : 'bg-blue-100 text-blue-500'}`}>
                                    <i className="fas fa-water"></i>
                                </div>
                                <span className={`text-xl font-black ${isDry ? 'text-rose-600' : 'text-blue-600'}`}>{currentSoilM}%</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Ẩm Đất</span>
                            </div>
                            
                            {/* Nhiệt độ */}
                            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isHot ? 'bg-rose-100 text-rose-500' : 'bg-amber-100 text-amber-500'}`}>
                                    <i className="fas fa-temperature-high"></i>
                                </div>
                                <span className={`text-xl font-black ${isHot ? 'text-rose-600' : 'text-amber-600'}`}>{currentTemp}°C</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Nhiệt độ</span>
                            </div>

                            {/* Độ ẩm khí */}
                            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-500 flex items-center justify-center mb-2">
                                    <i className="fas fa-cloud"></i>
                                </div>
                                <span className="text-xl font-black text-cyan-600">{currentAirHumid}%</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Ẩm Không Khí</span>
                            </div>

                            {/* Ánh sáng */}
                            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-500 flex items-center justify-center mb-2">
                                    <i className="fas fa-sun"></i>
                                </div>
                                <span className="text-xl font-black text-yellow-600">{currentLight}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Lux</span>
                            </div>
                        </div>
                    </div>

                    {/* Bảng Điều khiển Thủ công (Thêm nút Bật/Tắt Đèn) */}
                    <div className={`bg-white rounded-[2rem] p-6 shadow-sm border transition-colors ${settings.mode === 'MANUAL' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 opacity-60 grayscale'}`}>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Bảng Điều Khiển Tay</h3>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <button 
                                onClick={() => handleManualControl('PUMP_ON')}
                                disabled={settings.mode === 'AUTO'}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-blue-200 flex flex-col items-center gap-1"
                            >
                                <i className="fas fa-tint text-xl"></i> Bật Bơm
                            </button>
                            <button 
                                onClick={() => handleManualControl('MIST_ON')}
                                disabled={settings.mode === 'AUTO'}
                                className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-teal-200 flex flex-col items-center gap-1"
                            >
                                <i className="fas fa-wind text-xl"></i> Phun Sương
                            </button>
                        </div>
                        
                        {/* Hàng nút cho Đèn quang hợp */}
                        <div className="grid grid-cols-2 gap-3 border-t border-slate-200/60 pt-3">
                            <button 
                                onClick={() => handleManualControl('LIGHT_ON')}
                                disabled={settings.mode === 'AUTO'}
                                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-yellow-200 flex items-center justify-center gap-2"
                            >
                                <i className="far fa-lightbulb text-lg"></i> Bật Đèn
                            </button>
                            <button 
                                onClick={() => handleManualControl('LIGHT_OFF')}
                                disabled={settings.mode === 'AUTO'}
                                className="bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-lightbulb text-lg"></i> Tắt Đèn
                            </button>
                        </div>

                        {settings.mode === 'AUTO' && <p className="text-xs text-center text-slate-500 mt-4 font-medium">Chuyển sang chế độ THỦ CÔNG để mở khóa nút.</p>}
                    </div>
                </div>

                {/* 3. CỘT PHẢI: CÀI ĐẶT THỜI GIAN CHẠY & LOGIC AI */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden h-full">
                        <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 text-lg"><i className="fas fa-cog text-emerald-500 mr-2"></i>Thiết lập Thời gian & Ngưỡng</h3>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            
                            {/* KHU VỰC THÔNG BÁO AI */}
                            {settings.mode === 'AUTO' ? (
                                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 flex items-start gap-4">
                                    <div className="text-purple-500 text-4xl mt-1"><i className="fas fa-brain"></i></div>
                                    <div>
                                        <h4 className="font-black text-purple-800 text-lg">Mô hình AI đang kiểm soát</h4>
                                        <p className="text-purple-600 text-sm font-medium mt-1">
                                            Hệ thống Random Forest đang liên tục đọc dữ liệu cảm biến. AI tự động kích hoạt bơm hoặc phun sương dựa trên dữ liệu học thuật. Bạn không cần cấu hình ngưỡng thủ công.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                                    <h4 className="font-black text-blue-800 text-lg mb-2"><i className="fas fa-exclamation-triangle mr-2"></i>Chế độ Thủ công Đang Bật</h4>
                                    <p className="text-blue-600 text-sm font-medium">AI đã bị tạm ngưng. Hệ thống sẽ cảnh báo/chạy tự động (Fail-safe) dựa trên các ngưỡng truyền thống bạn cài đặt bên dưới.</p>
                                </div>
                            )}

                            {/* HIỂN THỊ CÁC Ô NHẬP NGƯỠNG KHI Ở CHẾ ĐỘ MANUAL */}
                            {settings.mode === 'MANUAL' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                        <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-thermometer-half text-rose-500 mr-2"></i>Ngưỡng Sốc Nhiệt</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" name="heat_shock_temp" value={settings.heat_shock_temp} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                                            <span className="text-sm font-bold text-slate-500 shrink-0">°C</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                        <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-water text-blue-400 mr-2"></i>Độ Ẩm Đất (Tối thiểu)</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" name="min_soil_moisture" value={settings.min_soil_moisture} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                            <span className="text-sm font-bold text-slate-500 shrink-0">%</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                        <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-tint text-blue-600 mr-2"></i>Độ Ẩm Đất (Tối đa)</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" name="max_soil_moisture" value={settings.max_soil_moisture} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                            <span className="text-sm font-bold text-slate-500 shrink-0">%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                {/* Cài đặt thời gian Bơm */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                    <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-clock text-blue-500 mr-2"></i>Thời gian Bơm (mỗi lần):</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" name="pump_duration" value={settings.pump_duration} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                        <span className="text-sm font-bold text-slate-500 shrink-0">giây</span>
                                    </div>
                                </div>

                                {/* Cài đặt thời gian Phun sương */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                    <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-clock text-teal-500 mr-2"></i>Thời gian Phun sương:</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" name="mist_duration" value={settings.mist_duration} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                        <span className="text-sm font-bold text-slate-500 shrink-0">giây</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button 
                                    onClick={handleSaveDurations}
                                    disabled={isSaving}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                                >
                                    {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                                    Lưu Cấu Hình
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FarmerZoneDetail;
// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { api } from '../../services/api';
// import { toast } from 'react-toastify';

// const FarmerZoneDetail = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
    
//     const [isLoading, setIsLoading] = useState(true);
//     const [isSaving, setIsSaving] = useState(false);
    
//     const [zone, setZone] = useState(null);
//     const [devices, setDevices] = useState([]);
    
//     // [ĐÃ SỬA]: Bổ sung thêm các thông số Ngưỡng vào State
//     const [settings, setSettings] = useState({
//         mode: 'AUTO',
//         pump_duration: 30,
//         mist_duration: 60,
//         min_soil_moisture: 40,
//         max_soil_moisture: 70,
//         heat_shock_temp: 35
//     });

//     const fetchZoneDetail = async () => {
//         setIsLoading(true);
//         try {
//             const [zonesRes, devicesRes] = await Promise.all([
//                 api.zones.getAll(),
//                 api.devices.getAll()
//             ]);

//             const currentZone = zonesRes.find(z => z.zone_id === parseInt(id));
//             if (!currentZone) {
//                 toast.error("Không tìm thấy khu vực này!");
//                 navigate('/farmer/dashboard');
//                 return;
//             }

//             setZone(currentZone);
//             setDevices(devicesRes.filter(d => d.zone_id === parseInt(id)));

//             if (currentZone.setting) {
//                 setSettings(prev => ({ ...prev, ...currentZone.setting }));
//             }

//         } catch (error) {
//             console.error("Lỗi lấy chi tiết Zone:", error);
//             toast.error("Mất kết nối dữ liệu vườn.");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchZoneDetail();
//         const interval = setInterval(fetchZoneDetail, 15000);
//         return () => clearInterval(interval);
//     }, [id]);

//     const handleModeChange = async (newMode) => {
//         const updatedSettings = { ...settings, mode: newMode };
//         setSettings(updatedSettings); 
//         setIsSaving(true);
//         try {
//             // [ĐÃ SỬA]: Gọi đúng API updateSettings
//             await api.zones.updateSettings(id, updatedSettings);
//             toast.success(`Đã chuyển sang chế độ ${newMode === 'AUTO' ? 'AI TỰ ĐỘNG' : 'THỦ CÔNG'}`);
//         } catch (error) {
//             toast.error("Lỗi cập nhật chế độ!");
//             setSettings(settings); 
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleManualControl = async (actionType) => {
//         if (settings.mode === 'AUTO') {
//             toast.warning("Vui lòng chuyển sang chế độ THỦ CÔNG (MANUAL) để tự điều khiển!");
//             return;
//         }

//         const primaryDevice = devices[0];
//         if (!primaryDevice) {
//             toast.error("Khu vực này chưa có thiết bị điều khiển.");
//             return;
//         }

//         try {
//             toast.info(`Đang gửi lệnh ${actionType === 'PUMP_ON' ? 'Tưới Nước' : 'Làm Mát'}...`);
//             await api.devices.control(primaryDevice.device_id, actionType);
//             toast.success("Đã gửi lệnh thành công!");
//         } catch (error) {
//             toast.error("Thiết bị không phản hồi lệnh.");
//         }
//     };

//     const handleSaveDurations = async () => {
//         setIsSaving(true);
//         try {
//             // [ĐÃ SỬA]: Gọi đúng API updateSettings
//             await api.zones.updateSettings(id, settings);
//             toast.success("Đã lưu cấu hình thành công!");
//         } catch (error) {
//             toast.error("Không thể lưu cấu hình.");
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleSettingChange = (e) => {
//         const { name, value } = e.target;
//         setSettings(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
//     };

//     const primaryDevice = devices[0] || {};
//     const currentSoilM = primaryDevice.hum_soil !== undefined && primaryDevice.hum_soil !== null ? primaryDevice.hum_soil : '--';
//     const currentTemp = primaryDevice.temp !== undefined && primaryDevice.temp !== null ? primaryDevice.temp : '--';
    
//     const isDry = currentSoilM !== '--' && currentSoilM < 35;
//     const isHot = currentTemp !== '--' && currentTemp >= 32;

//     if (isLoading && !zone) {
//         return <div className="p-20 text-center text-emerald-600 font-bold animate-pulse text-xl"><i className="fas fa-leaf animate-bounce mb-3 block text-4xl"></i> Đang vào vườn...</div>;
//     }

//     return (
//         <div className="animate-fade-in max-w-5xl mx-auto pb-10 space-y-6">
            
//             {/* 1. HEADER & ĐIỀU HƯỚNG */}
//             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
//                 <div className="flex items-center gap-4">
//                     <button onClick={() => navigate('/farmer/dashboard')} className="w-12 h-12 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-2xl flex items-center justify-center transition-colors border border-slate-100">
//                         <i className="fas fa-arrow-left text-xl"></i>
//                     </button>
//                     <div>
//                         <h2 className="text-2xl font-black text-slate-800">{zone?.name || 'Chi tiết Vườn'}</h2>
//                         <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest mt-1">{zone?.crop_type || 'Khu vực Canh tác'}</p>
//                     </div>
//                 </div>

//                 {/* CÔNG TẮC MODE */}
//                 <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center shadow-inner">
//                     <button 
//                         onClick={() => handleModeChange('AUTO')}
//                         disabled={isSaving}
//                         className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${settings.mode === 'AUTO' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:text-slate-700'}`}
//                     >
//                         <i className="fas fa-robot mr-2"></i> AI TỰ ĐỘNG
//                     </button>
//                     <button 
//                         onClick={() => handleModeChange('MANUAL')}
//                         disabled={isSaving}
//                         className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${settings.mode === 'MANUAL' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:text-slate-700'}`}
//                     >
//                         <i className="fas fa-hand-paper mr-2"></i> THỦ CÔNG
//                     </button>
//                 </div>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
//                 {/* 2. CHỈ SỐ MÔI TRƯỜNG THỰC TẾ */}
//                 <div className="lg:col-span-1 space-y-6">
//                     <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 text-center relative overflow-hidden">
//                         <div className={`absolute top-0 left-0 w-full h-1.5 ${isDry ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
//                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Độ Ẩm Đất</h3>
//                         <div className="relative inline-flex items-center justify-center">
//                             <svg className="w-32 h-32 transform -rotate-90">
//                                 <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
//                                 <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="351" strokeDashoffset={currentSoilM !== '--' ? 351 - (351 * currentSoilM) / 100 : 351} className={`${isDry ? 'text-rose-500' : 'text-blue-500'} transition-all duration-1000`} strokeLinecap="round" />
//                             </svg>
//                             <span className={`absolute text-3xl font-black ${isDry ? 'text-rose-600' : 'text-blue-600'}`}>
//                                 {currentSoilM}%
//                             </span>
//                         </div>
//                     </div>

//                     <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 text-center relative overflow-hidden">
//                         <div className={`absolute top-0 left-0 w-full h-1.5 ${isHot ? 'bg-rose-500' : 'bg-amber-400'}`}></div>
//                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Nhiệt độ Môi trường</h3>
//                         <div className={`text-5xl font-black mt-2 mb-2 ${isHot ? 'text-rose-600' : 'text-amber-500'}`}>
//                             {currentTemp}°C
//                         </div>
//                     </div>

//                     {/* Điều khiển Bơm thủ công */}
//                     <div className={`bg-white rounded-[2rem] p-6 shadow-sm border transition-colors ${settings.mode === 'MANUAL' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 opacity-60 grayscale'}`}>
//                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Bảng Điều Khiển Tay</h3>
//                         <div className="flex gap-3">
//                             <button 
//                                 onClick={() => handleManualControl('PUMP_ON')}
//                                 disabled={settings.mode === 'AUTO'}
//                                 className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all shadow-md shadow-blue-200 flex flex-col items-center gap-2"
//                             >
//                                 <i className="fas fa-tint text-2xl"></i> Bật Bơm
//                             </button>
//                             <button 
//                                 onClick={() => handleManualControl('MIST_ON')}
//                                 disabled={settings.mode === 'AUTO'}
//                                 className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all shadow-md shadow-teal-200 flex flex-col items-center gap-2"
//                             >
//                                 <i className="fas fa-wind text-2xl"></i> Phun Sương
//                             </button>
//                         </div>
//                         {settings.mode === 'AUTO' && <p className="text-xs text-center text-slate-500 mt-3 font-medium">Chuyển sang chế độ THỦ CÔNG để mở khóa nút.</p>}
//                     </div>
//                 </div>

//                 {/* 3. CÀI ĐẶT THỜI GIAN CHẠY & LOGIC AI */}
//                 <div className="lg:col-span-2">
//                     <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
//                         <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
//                             <h3 className="font-bold text-slate-800 text-lg"><i className="fas fa-cog text-emerald-500 mr-2"></i>Thiết lập Thời gian & Ngưỡng</h3>
//                         </div>
                        
//                         <div className="p-6 space-y-6">
                            
//                             {/* KHU VỰC THÔNG BÁO AI */}
//                             {settings.mode === 'AUTO' ? (
//                                 <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 flex items-start gap-4">
//                                     <div className="text-purple-500 text-4xl mt-1"><i className="fas fa-brain"></i></div>
//                                     <div>
//                                         <h4 className="font-black text-purple-800 text-lg">Mô hình AI đang kiểm soát</h4>
//                                         <p className="text-purple-600 text-sm font-medium mt-1">
//                                             Hệ thống Random Forest đang liên tục đọc dữ liệu cảm biến. AI tự động kích hoạt bơm hoặc phun sương dựa trên dữ liệu học thuật. Bạn không cần cấu hình ngưỡng thủ công.
//                                         </p>
//                                     </div>
//                                 </div>
//                             ) : (
//                                 <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
//                                     <h4 className="font-black text-blue-800 text-lg mb-2"><i className="fas fa-exclamation-triangle mr-2"></i>Chế độ Thủ công Đang Bật</h4>
//                                     <p className="text-blue-600 text-sm font-medium">AI đã bị tạm ngưng. Hệ thống sẽ cảnh báo/chạy tự động (Fail-safe) dựa trên các ngưỡng truyền thống bạn cài đặt bên dưới.</p>
//                                 </div>
//                             )}

//                             {/* [ĐÃ SỬA]: HIỂN THỊ CÁC Ô NHẬP NGƯỠNG KHI Ở CHẾ ĐỘ MANUAL */}
//                             {settings.mode === 'MANUAL' && (
//                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
//                                     <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
//                                         <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-thermometer-half text-rose-500 mr-2"></i>Ngưỡng Sốc Nhiệt</label>
//                                         <div className="flex items-center gap-2">
//                                             <input type="number" name="heat_shock_temp" value={settings.heat_shock_temp} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-rose-500" />
//                                             <span className="text-sm font-bold text-slate-500 shrink-0">°C</span>
//                                         </div>
//                                     </div>
//                                     <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
//                                         <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-water text-blue-400 mr-2"></i>Độ Ẩm Đất (Tối thiểu)</label>
//                                         <div className="flex items-center gap-2">
//                                             <input type="number" name="min_soil_moisture" value={settings.min_soil_moisture} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
//                                             <span className="text-sm font-bold text-slate-500 shrink-0">%</span>
//                                         </div>
//                                     </div>
//                                     <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
//                                         <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-tint text-blue-600 mr-2"></i>Độ Ẩm Đất (Tối đa)</label>
//                                         <div className="flex items-center gap-2">
//                                             <input type="number" name="max_soil_moisture" value={settings.max_soil_moisture} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
//                                             <span className="text-sm font-bold text-slate-500 shrink-0">%</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}

//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
//                                 {/* Cài đặt thời gian Bơm */}
//                                 <div className="bg-white p-5 rounded-2xl border border-slate-200">
//                                     <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-clock text-blue-500 mr-2"></i>Thời gian Bơm (mỗi lần):</label>
//                                     <div className="flex items-center gap-2">
//                                         <input type="number" name="pump_duration" value={settings.pump_duration} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
//                                         <span className="text-sm font-bold text-slate-500 shrink-0">giây</span>
//                                     </div>
//                                 </div>

//                                 {/* Cài đặt thời gian Phun sương */}
//                                 <div className="bg-white p-5 rounded-2xl border border-slate-200">
//                                     <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-clock text-teal-500 mr-2"></i>Thời gian Phun sương:</label>
//                                     <div className="flex items-center gap-2">
//                                         <input type="number" name="mist_duration" value={settings.mist_duration} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
//                                         <span className="text-sm font-bold text-slate-500 shrink-0">giây</span>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="flex justify-end pt-4">
//                                 <button 
//                                     onClick={handleSaveDurations}
//                                     disabled={isSaving}
//                                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
//                                 >
//                                     {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
//                                     Lưu Cấu Hình
//                                 </button>
//                             </div>

//                         </div>
//                     </div>
//                 </div>

//             </div>
//         </div>
//     );
// };

// export default FarmerZoneDetail;
// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { api } from '../../services/api';
// import { toast } from 'react-toastify';

// const FarmerZoneDetail = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
    
//     const [isLoading, setIsLoading] = useState(true);
//     const [isSaving, setIsSaving] = useState(false);
    
//     const [zone, setZone] = useState(null);
//     const [devices, setDevices] = useState([]);
    
//     const [settings, setSettings] = useState({
//         mode: 'AUTO',
//         pump_duration: 30,
//         mist_duration: 60
//     });

//     const fetchZoneDetail = async () => {
//         setIsLoading(true);
//         try {
//             const [zonesRes, devicesRes] = await Promise.all([
//                 api.zones.getAll(),
//                 api.devices.getAll()
//             ]);

//             const currentZone = zonesRes.find(z => z.zone_id === parseInt(id));
//             if (!currentZone) {
//                 toast.error("Không tìm thấy khu vực này!");
//                 navigate('/farmer/dashboard');
//                 return;
//             }

//             setZone(currentZone);
//             setDevices(devicesRes.filter(d => d.zone_id === parseInt(id)));

//             if (currentZone.setting) {
//                 setSettings(currentZone.setting);
//             }

//         } catch (error) {
//             console.error("Lỗi lấy chi tiết Zone:", error);
//             toast.error("Mất kết nối dữ liệu vườn.");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchZoneDetail();
//         const interval = setInterval(fetchZoneDetail, 15000);
//         return () => clearInterval(interval);
//     }, [id]);

//     // --- FIX 1: HÀM ĐỔI CHẾ ĐỘ CHUẨN REACT ---
//     const handleModeChange = async (newMode) => {
//         const updatedSettings = { ...settings, mode: newMode };
//         setSettings(updatedSettings); // Cập nhật UI ngay lập tức
//         setIsSaving(true);
//         try {
//             // Gửi thẳng updatedSettings xuống BE thay vì gọi state cũ
//             await api.zones.update(id, { setting: updatedSettings });
//             toast.success(`Đã chuyển sang chế độ ${newMode === 'AUTO' ? 'AI TỰ ĐỘNG' : 'THỦ CÔNG'}`);
//         } catch (error) {
//             toast.error("Lỗi cập nhật chế độ!");
//             // Rollback nếu lỗi
//             setSettings(settings); 
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleManualControl = async (actionType) => {
//         if (settings.mode === 'AUTO') {
//             toast.warning("Vui lòng chuyển sang chế độ THỦ CÔNG (MANUAL) để tự điều khiển!");
//             return;
//         }

//         const primaryDevice = devices[0];
//         if (!primaryDevice) {
//             toast.error("Khu vực này chưa có thiết bị điều khiển.");
//             return;
//         }

//         try {
//             toast.info(`Đang gửi lệnh ${actionType === 'PUMP_ON' ? 'Tưới Nước' : 'Làm Mát'}...`);
//             await api.devices.control(primaryDevice.device_id, actionType);
//             toast.success("Đã gửi lệnh thành công!");
//         } catch (error) {
//             toast.error("Thiết bị không phản hồi lệnh.");
//         }
//     };

//     const handleSaveDurations = async () => {
//         setIsSaving(true);
//         try {
//             await api.zones.update(id, { setting: settings });
//             toast.success("Đã lưu thời gian hoạt động thành công!");
//         } catch (error) {
//             toast.error("Không thể lưu cấu hình.");
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleSettingChange = (e) => {
//         const { name, value } = e.target;
//         setSettings(prev => ({ ...prev, [name]: isNaN(value) ? value : Number(value) }));
//     };

//     const primaryDevice = devices[0] || {};
//     const currentSoilM = primaryDevice.hum_soil !== undefined && primaryDevice.hum_soil !== null ? primaryDevice.hum_soil : '--';
//     const currentTemp = primaryDevice.temp !== undefined && primaryDevice.temp !== null ? primaryDevice.temp : '--';
    
//     // Logic giao diện cơ bản
//     const isDry = currentSoilM !== '--' && currentSoilM < 35;
//     const isHot = currentTemp !== '--' && currentTemp >= 32;

//     if (isLoading && !zone) {
//         return <div className="p-20 text-center text-emerald-600 font-bold animate-pulse text-xl"><i className="fas fa-leaf animate-bounce mb-3 block text-4xl"></i> Đang vào vườn...</div>;
//     }

//     return (
//         <div className="animate-fade-in max-w-5xl mx-auto pb-10 space-y-6">
            
//             {/* 1. HEADER & ĐIỀU HƯỚNG */}
//             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
//                 <div className="flex items-center gap-4">
//                     <button onClick={() => navigate('/farmer/dashboard')} className="w-12 h-12 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-2xl flex items-center justify-center transition-colors border border-slate-100">
//                         <i className="fas fa-arrow-left text-xl"></i>
//                     </button>
//                     <div>
//                         <h2 className="text-2xl font-black text-slate-800">{zone?.name || 'Chi tiết Vườn'}</h2>
//                         <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest mt-1">{zone?.crop_type || 'Khu vực Canh tác'}</p>
//                     </div>
//                 </div>

//                 {/* CÔNG TẮC MODE */}
//                 <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center shadow-inner">
//                     <button 
//                         onClick={() => handleModeChange('AUTO')}
//                         disabled={isSaving}
//                         className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${settings.mode === 'AUTO' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:text-slate-700'}`}
//                     >
//                         <i className="fas fa-robot mr-2"></i> AI TỰ ĐỘNG
//                     </button>
//                     <button 
//                         onClick={() => handleModeChange('MANUAL')}
//                         disabled={isSaving}
//                         className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${settings.mode === 'MANUAL' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:text-slate-700'}`}
//                     >
//                         <i className="fas fa-hand-paper mr-2"></i> THỦ CÔNG
//                     </button>
//                 </div>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
//                 {/* 2. CHỈ SỐ MÔI TRƯỜNG THỰC TẾ */}
//                 <div className="lg:col-span-1 space-y-6">
//                     <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 text-center relative overflow-hidden">
//                         <div className={`absolute top-0 left-0 w-full h-1.5 ${isDry ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
//                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Độ Ẩm Đất</h3>
//                         <div className="relative inline-flex items-center justify-center">
//                             <svg className="w-32 h-32 transform -rotate-90">
//                                 <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
//                                 <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="351" strokeDashoffset={currentSoilM !== '--' ? 351 - (351 * currentSoilM) / 100 : 351} className={`${isDry ? 'text-rose-500' : 'text-blue-500'} transition-all duration-1000`} strokeLinecap="round" />
//                             </svg>
//                             <span className={`absolute text-3xl font-black ${isDry ? 'text-rose-600' : 'text-blue-600'}`}>
//                                 {currentSoilM}%
//                             </span>
//                         </div>
//                     </div>

//                     <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 text-center relative overflow-hidden">
//                         <div className={`absolute top-0 left-0 w-full h-1.5 ${isHot ? 'bg-rose-500' : 'bg-amber-400'}`}></div>
//                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Nhiệt độ Môi trường</h3>
//                         <div className={`text-5xl font-black mt-2 mb-2 ${isHot ? 'text-rose-600' : 'text-amber-500'}`}>
//                             {currentTemp}°C
//                         </div>
//                     </div>

//                     {/* Điều khiển Bơm thủ công */}
//                     <div className={`bg-white rounded-[2rem] p-6 shadow-sm border transition-colors ${settings.mode === 'MANUAL' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 opacity-60 grayscale'}`}>
//                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Bảng Điều Khiển Tay</h3>
//                         <div className="flex gap-3">
//                             <button 
//                                 onClick={() => handleManualControl('PUMP_ON')}
//                                 disabled={settings.mode === 'AUTO'}
//                                 className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all shadow-md shadow-blue-200 flex flex-col items-center gap-2"
//                             >
//                                 <i className="fas fa-tint text-2xl"></i> Bật Bơm
//                             </button>
//                             <button 
//                                 onClick={() => handleManualControl('MIST_ON')}
//                                 disabled={settings.mode === 'AUTO'}
//                                 className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all shadow-md shadow-teal-200 flex flex-col items-center gap-2"
//                             >
//                                 <i className="fas fa-wind text-2xl"></i> Phun Sương
//                             </button>
//                         </div>
//                         {settings.mode === 'AUTO' && <p className="text-xs text-center text-slate-500 mt-3 font-medium">Chuyển sang chế độ THỦ CÔNG để mở khóa nút.</p>}
//                     </div>
//                 </div>

//                 {/* 3. CÀI ĐẶT THỜI GIAN CHẠY & LOGIC AI */}
//                 <div className="lg:col-span-2">
//                     <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
//                         <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
//                             <h3 className="font-bold text-slate-800 text-lg"><i className="fas fa-cog text-emerald-500 mr-2"></i>Thiết lập Thời gian vận hành</h3>
//                         </div>
                        
//                         <div className="p-6 space-y-6">
                            
//                             {/* KHU VỰC THÔNG BÁO AI (FIX 2) */}
//                             {settings.mode === 'AUTO' ? (
//                                 <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 flex items-start gap-4">
//                                     <div className="text-purple-500 text-4xl mt-1"><i className="fas fa-brain"></i></div>
//                                     <div>
//                                         <h4 className="font-black text-purple-800 text-lg">Mô hình AI đang kiểm soát</h4>
//                                         <p className="text-purple-600 text-sm font-medium mt-1">
//                                             Hệ thống Random Forest đang liên tục đọc dữ liệu cảm biến. Nó sẽ tự động kích hoạt <strong>Bơm rễ</strong> hoặc <strong>Phun sương</strong> dựa trên đặc tính sinh lý của cây {zone?.crop_type || 'xà lách'} để tránh sốc nhiệt. Bạn không cần cấu hình ngưỡng thủ công.
//                                         </p>
//                                     </div>
//                                 </div>
//                             ) : (
//                                 <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
//                                     <h4 className="font-black text-blue-800 text-lg mb-2"><i className="fas fa-exclamation-triangle mr-2"></i>Chế độ Thủ công Đang Bật</h4>
//                                     <p className="text-blue-600 text-sm font-medium">AI đã bị tạm ngưng. Bạn hoàn toàn chịu trách nhiệm trong việc theo dõi thông số và bấm nút bật/tắt thiết bị.</p>
//                                 </div>
//                             )}

//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
//                                 {/* Cài đặt thời gian Bơm */}
//                                 <div className="bg-white p-5 rounded-2xl border border-slate-200">
//                                     <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-tint text-blue-500 mr-2"></i>Thời gian chạy Bơm mỗi lần:</label>
//                                     <div className="flex items-center gap-2">
//                                         <input type="number" name="pump_duration" value={settings.pump_duration} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
//                                         <span className="text-sm font-bold text-slate-500 shrink-0">giây</span>
//                                     </div>
//                                 </div>

//                                 {/* Cài đặt thời gian Phun sương */}
//                                 <div className="bg-white p-5 rounded-2xl border border-slate-200">
//                                     <label className="text-sm font-bold text-slate-700 block mb-3"><i className="fas fa-wind text-teal-500 mr-2"></i>Thời gian chạy Phun sương:</label>
//                                     <div className="flex items-center gap-2">
//                                         <input type="number" name="mist_duration" value={settings.mist_duration} onChange={handleSettingChange} className="w-full text-center font-bold text-slate-800 border border-slate-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
//                                         <span className="text-sm font-bold text-slate-500 shrink-0">giây</span>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="flex justify-end pt-4">
//                                 <button 
//                                     onClick={handleSaveDurations}
//                                     disabled={isSaving}
//                                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
//                                 >
//                                     {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
//                                     Lưu Thời Gian
//                                 </button>
//                             </div>

//                         </div>
//                     </div>
//                 </div>

//             </div>
//         </div>
//     );
// };

// export default FarmerZoneDetail;
// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { api } from '../../services/api';
// import { toast } from 'react-toastify';

// const FarmerZoneDetail = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
    
//     const [isLoading, setIsLoading] = useState(true);
//     const [isSaving, setIsSaving] = useState(false);
    
//     const [zone, setZone] = useState(null);
//     const [devices, setDevices] = useState([]);
    
//     // State lưu cấu hình của Zone (Ngưỡng AI)
//     const [settings, setSettings] = useState({
//         mode: 'AUTO',
//         min_soil_moisture: 40,
//         max_soil_moisture: 70,
//         heat_shock_temp: 35,
//         pump_duration: 30,
//         mist_duration: 60
//     });

//     // --- FETCH DỮ LIỆU ---
//     const fetchZoneDetail = async () => {
//         setIsLoading(true);
//         try {
//             // Lấy toàn bộ zone và device (hoặc gọi API getById nếu backend có)
//             const [zonesRes, devicesRes] = await Promise.all([
//                 api.zones.getAll(),
//                 api.devices.getAll()
//             ]);

//             const currentZone = zonesRes.find(z => z.zone_id === parseInt(id));
//             if (!currentZone) {
//                 toast.error("Không tìm thấy khu vực này!");
//                 navigate('/farmer/dashboard');
//                 return;
//             }

//             setZone(currentZone);
//             setDevices(devicesRes.filter(d => d.zone_id === parseInt(id)));

//             // Nếu Backend trả về kèm object setting, ta cập nhật state
//             if (currentZone.setting) {
//                 setSettings(currentZone.setting);
//             }

//         } catch (error) {
//             console.error("Lỗi lấy chi tiết Zone:", error);
//             toast.error("Mất kết nối dữ liệu vườn.");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchZoneDetail();
//         const interval = setInterval(fetchZoneDetail, 15000); // 15s cập nhật cảm biến 1 lần
//         return () => clearInterval(interval);
//     }, [id]);

//     // --- XỬ LÝ ĐIỀU KHIỂN THỦ CÔNG ---
//     const handleManualControl = async (actionType) => {
//         if (settings.mode === 'AUTO') {
//             toast.warning("Vui lòng chuyển sang chế độ THỦ CÔNG (MANUAL) để tự điều khiển!");
//             return;
//         }

//         const primaryDevice = devices[0];
//         if (!primaryDevice) {
//             toast.error("Khu vực này chưa có thiết bị điều khiển.");
//             return;
//         }

//         try {
//             toast.info(`Đang gửi lệnh ${actionType === 'PUMP_ON' ? 'Tưới Nước' : 'Làm Mát'}...`);
//             await api.devices.control(primaryDevice.device_id, actionType);
//             toast.success("Đã gửi lệnh thành công!");
//         } catch (error) {
//             toast.error("Thiết bị không phản hồi lệnh.");
//         }
//     };

//     // --- XỬ LÝ LƯU CẤU HÌNH AI ---
//     const handleSaveSettings = async () => {
//         setIsSaving(true);
//         try {
//             // Gọi API cập nhật cấu hình cho Zone này
//             // Lưu ý: Đảm bảo backend có hàm update cấu hình (VD: PUT /zones/{id}/settings)
//             // Ở đây mình gọi tạm qua api.zones.update (bạn có thể điều chỉnh tùy BE của bạn)
//             await api.zones.update(id, { setting: settings });
//             toast.success("Đã lưu cấu hình AI thành công!");
//             fetchZoneDetail(); // Refresh lại data
//         } catch (error) {
//             toast.error("Không thể lưu cấu hình. Vui lòng thử lại.");
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleSettingChange = (e) => {
//         const { name, value } = e.target;
//         setSettings(prev => ({ ...prev, [name]: isNaN(value) ? value : Number(value) }));
//     };

//     // Lấy thông số từ thiết bị đầu tiên làm đại diện cho Vườn
//     const primaryDevice = devices[0] || {};
//     const currentSoilM = primaryDevice.hum_soil !== undefined && primaryDevice.hum_soil !== null ? primaryDevice.hum_soil : '--';
//     const currentTemp = primaryDevice.temp !== undefined && primaryDevice.temp !== null ? primaryDevice.temp : '--';
//     const isDry = currentSoilM !== '--' && currentSoilM < settings.min_soil_moisture;
//     const isHot = currentTemp !== '--' && currentTemp >= settings.heat_shock_temp;

//     if (isLoading && !zone) {
//         return <div className="p-20 text-center text-emerald-600 font-bold animate-pulse text-xl"><i className="fas fa-leaf animate-bounce mb-3 block text-4xl"></i> Đang vào vườn...</div>;
//     }

//     return (
//         <div className="animate-fade-in max-w-5xl mx-auto pb-10 space-y-6">
            
//             {/* 1. HEADER & ĐIỀU HƯỚNG */}
//             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
//                 <div className="flex items-center gap-4">
//                     <button onClick={() => navigate('/farmer/dashboard')} className="w-12 h-12 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-2xl flex items-center justify-center transition-colors border border-slate-100">
//                         <i className="fas fa-arrow-left text-xl"></i>
//                     </button>
//                     <div>
//                         <h2 className="text-2xl font-black text-slate-800">{zone?.name || 'Chi tiết Vườn'}</h2>
//                         <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest mt-1">{zone?.crop_type || 'Khu vực Canh tác'}</p>
//                     </div>
//                 </div>

//                 {/* Công tắc Mode (AUTO / MANUAL) */}
//                 <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center shadow-inner">
//                     <button 
//                         onClick={() => { setSettings({...settings, mode: 'AUTO'}); handleSaveSettings(); }}
//                         className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${settings.mode === 'AUTO' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:text-slate-700'}`}
//                     >
//                         <i className="fas fa-robot mr-2"></i> AI TỰ ĐỘNG
//                     </button>
//                     <button 
//                         onClick={() => { setSettings({...settings, mode: 'MANUAL'}); handleSaveSettings(); }}
//                         className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${settings.mode === 'MANUAL' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:text-slate-700'}`}
//                     >
//                         <i className="fas fa-hand-paper mr-2"></i> THỦ CÔNG
//                     </button>
//                 </div>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
//                 {/* 2. CHỈ SỐ MÔI TRƯỜNG THỰC TẾ */}
//                 <div className="lg:col-span-1 space-y-6">
//                     <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 text-center relative overflow-hidden">
//                         <div className={`absolute top-0 left-0 w-full h-1.5 ${isDry ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
//                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Độ Ẩm Đất</h3>
//                         <div className="relative inline-flex items-center justify-center">
//                             <svg className="w-32 h-32 transform -rotate-90">
//                                 <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
//                                 <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="351" strokeDashoffset={currentSoilM !== '--' ? 351 - (351 * currentSoilM) / 100 : 351} className={`${isDry ? 'text-rose-500' : 'text-blue-500'} transition-all duration-1000`} strokeLinecap="round" />
//                             </svg>
//                             <span className={`absolute text-3xl font-black ${isDry ? 'text-rose-600' : 'text-blue-600'}`}>
//                                 {currentSoilM}%
//                             </span>
//                         </div>
//                         <p className={`mt-4 text-sm font-bold ${isDry ? 'text-rose-500' : 'text-slate-500'}`}>
//                             {isDry ? 'Cảnh báo: Đất đang khô!' : 'Độ ẩm lý tưởng.'}
//                         </p>
//                     </div>

//                     <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 text-center relative overflow-hidden">
//                         <div className={`absolute top-0 left-0 w-full h-1.5 ${isHot ? 'bg-rose-500' : 'bg-amber-400'}`}></div>
//                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Nhiệt độ Môi trường</h3>
//                         <div className={`text-5xl font-black mt-2 mb-2 ${isHot ? 'text-rose-600' : 'text-amber-500'}`}>
//                             {currentTemp}°C
//                         </div>
//                         <p className={`mt-4 text-sm font-bold ${isHot ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`}>
//                             {isHot ? 'Sốc nhiệt: Cần phun sương!' : 'Nhiệt độ an toàn.'}
//                         </p>
//                     </div>

//                     {/* Điều khiển Bơm thủ công */}
//                     <div className={`bg-white rounded-[2rem] p-6 shadow-sm border transition-colors ${settings.mode === 'MANUAL' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 opacity-60 grayscale'}`}>
//                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Bảng Điều Khiển Tay</h3>
//                         <div className="flex gap-3">
//                             <button 
//                                 onClick={() => handleManualControl('PUMP_ON')}
//                                 disabled={settings.mode === 'AUTO'}
//                                 className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all shadow-md shadow-blue-200 flex flex-col items-center gap-2"
//                             >
//                                 <i className="fas fa-tint text-2xl"></i> Bật Bơm
//                             </button>
//                             <button 
//                                 onClick={() => handleManualControl('MIST_ON')}
//                                 disabled={settings.mode === 'AUTO'}
//                                 className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all shadow-md shadow-teal-200 flex flex-col items-center gap-2"
//                             >
//                                 <i className="fas fa-wind text-2xl"></i> Phun Sương
//                             </button>
//                         </div>
//                         {settings.mode === 'AUTO' && <p className="text-xs text-center text-slate-500 mt-3 font-medium">Chuyển sang chế độ THỦ CÔNG để mở khóa nút.</p>}
//                     </div>
//                 </div>

//                 {/* 3. CÀI ĐẶT NGƯỠNG AI (AI THRESHOLDS) */}
//                 <div className="lg:col-span-2">
//                     <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
//                         <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
//                             <h3 className="font-bold text-slate-800 text-lg"><i className="fas fa-brain text-emerald-500 mr-2"></i>Cấu hình AI Canh tác</h3>
//                             <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200">
//                                 {zone?.crop_type || 'Rau Thủy Canh'}
//                             </span>
//                         </div>
                        
//                         <div className="p-6 space-y-6">
//                             {/* Card Cài đặt Bơm Nước */}
//                             <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 relative overflow-hidden">
//                                 <i className="fas fa-water absolute -right-4 -bottom-4 text-7xl text-blue-100 opacity-50"></i>
//                                 <h4 className="font-bold text-blue-800 mb-4 flex items-center"><i className="fas fa-tint mr-2"></i> Logic Tưới Nước (Máy Bơm)</h4>
                                
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
//                                     <div>
//                                         <label className="block text-xs font-bold text-blue-600/70 uppercase mb-2">Đất Khô (Bắt đầu tưới khi &lt; %)</label>
//                                         <div className="flex items-center gap-3">
//                                             <input type="range" name="min_soil_moisture" min="10" max="60" value={settings.min_soil_moisture} onChange={handleSettingChange} className="flex-1 accent-blue-600" />
//                                             <span className="bg-white border border-blue-200 text-blue-700 font-bold px-3 py-1.5 rounded-lg w-16 text-center shadow-sm">{settings.min_soil_moisture}%</span>
//                                         </div>
//                                     </div>
//                                     <div>
//                                         <label className="block text-xs font-bold text-blue-600/70 uppercase mb-2">Đất Ẩm (Dừng tưới khi &gt; %)</label>
//                                         <div className="flex items-center gap-3">
//                                             <input type="range" name="max_soil_moisture" min="60" max="100" value={settings.max_soil_moisture} onChange={handleSettingChange} className="flex-1 accent-blue-600" />
//                                             <span className="bg-white border border-blue-200 text-blue-700 font-bold px-3 py-1.5 rounded-lg w-16 text-center shadow-sm">{settings.max_soil_moisture}%</span>
//                                         </div>
//                                     </div>
//                                     <div className="md:col-span-2 bg-white/60 p-3 rounded-xl border border-blue-100 flex items-center justify-between">
//                                         <label className="text-sm font-bold text-blue-800">Thời gian chạy Bơm mỗi lần:</label>
//                                         <div className="flex items-center gap-2">
//                                             <input type="number" name="pump_duration" value={settings.pump_duration} onChange={handleSettingChange} className="w-20 text-center font-bold text-blue-700 border border-blue-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
//                                             <span className="text-sm font-bold text-blue-600">giây</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Card Cài đặt Sốc Nhiệt */}
//                             <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 relative overflow-hidden">
//                                 <i className="fas fa-sun absolute -right-4 -bottom-4 text-7xl text-amber-100 opacity-50"></i>
//                                 <h4 className="font-bold text-amber-800 mb-4 flex items-center"><i className="fas fa-temperature-high mr-2"></i> Logic Làm Mát (Phun Sương)</h4>
                                
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
//                                     <div className="md:col-span-2">
//                                         <label className="block text-xs font-bold text-amber-600/70 uppercase mb-2">Ngưỡng Sốc Nhiệt (Bật phun sương khi &gt; °C)</label>
//                                         <div className="flex items-center gap-3">
//                                             <input type="range" name="heat_shock_temp" min="25" max="45" step="0.5" value={settings.heat_shock_temp} onChange={handleSettingChange} className="flex-1 accent-amber-500" />
//                                             <span className="bg-white border border-amber-200 text-amber-700 font-bold px-3 py-1.5 rounded-lg w-20 text-center shadow-sm">{settings.heat_shock_temp}°C</span>
//                                         </div>
//                                     </div>
//                                     <div className="md:col-span-2 bg-white/60 p-3 rounded-xl border border-amber-100 flex items-center justify-between">
//                                         <label className="text-sm font-bold text-amber-800">Thời gian chạy Phun sương:</label>
//                                         <div className="flex items-center gap-2">
//                                             <input type="number" name="mist_duration" value={settings.mist_duration} onChange={handleSettingChange} className="w-20 text-center font-bold text-amber-700 border border-amber-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
//                                             <span className="text-sm font-bold text-amber-600">giây</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Nút Lưu Cấu Hình */}
//                             <div className="flex justify-end pt-4 border-t border-slate-100">
//                                 <button 
//                                     onClick={handleSaveSettings}
//                                     disabled={isSaving}
//                                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50"
//                                 >
//                                     {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
//                                     Lưu Cấu Hình AI
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//             </div>
//         </div>
//     );
// };

// export default FarmerZoneDetail;