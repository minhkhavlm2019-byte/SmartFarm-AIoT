import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import Button from '../components/common/Button';
import StatusTag from '../components/common/StatusTag';
import Header from '../components/layout/Header';

// import React, { useState, useEffect } from 'react';
// import { api } from '../services/api';
import { toast } from 'react-toastify';

// Component con: Hiển thị từng Node
const NodeControlCard = ({ device, onUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [localSettings, setLocalSettings] = useState({
        // Giả lập state ban đầu, thực tế lấy từ device.settings
        mode: device.mode || 'MANUAL', // 'AUTO' hoặc 'MANUAL'
        threshold_temp: device.threshold_temp || 35,
        threshold_soil: device.threshold_soil || 40,
        pump_status: device.pump_status || 'OFF',
        mist_status: device.mist_status || 'OFF',
        light_status: device.light_status || 'OFF',
    });

    // Hàm xử lý bật tắt chế độ AI
    const toggleMode = async () => {
        const newMode = localSettings.mode === 'MANUAL' ? 'AUTO' : 'MANUAL';
        try {
            // Gọi API cập nhật chế độ
            await api.devices.updateSettings(device.device_id, { mode: newMode });
            setLocalSettings(prev => ({ ...prev, mode: newMode }));
            toast.info(`Đã chuyển sang chế độ ${newMode === 'AUTO' ? 'Tự động (AI)' : 'Thủ công'}`);
        } catch (error) {
            toast.error("Lỗi cập nhật chế độ");
        }
    };

    // Hàm xử lý điều khiển thủ công (Manual Control)
    const handleManualControl = async (type, action) => {
        // QUY TẮC ƯU TIÊN: Nếu đang AUTO mà bấm nút -> Chuyển về MANUAL ngay lập tức
        if (localSettings.mode === 'AUTO') {
            if (!window.confirm("Hệ thống đang chạy Tự động. Bạn có muốn chuyển sang Thủ công để điều khiển không?")) {
                return;
            }
            await toggleMode(); // Chuyển về Manual trước
        }

        try {
            // Gửi lệnh điều khiển: PUMP_ON, PUMP_OFF...
            await api.devices.control(device.device_id, `${type}_${action}`);
            
            // Cập nhật UI ngay lập tức (Optimistic UI)
            setLocalSettings(prev => ({
                ...prev,
                [`${type.toLowerCase()}_status`]: action
            }));
            toast.success(`Đã gửi lệnh ${type} ${action}`);
        } catch (error) {
            toast.error("Gửi lệnh thất bại");
        }
    };

    // Hàm lưu ngưỡng cài đặt
    const saveThresholds = async () => {
        try {
            await api.devices.updateSettings(device.device_id, {
                threshold_temp: localSettings.threshold_temp,
                threshold_soil: localSettings.threshold_soil
            });
            toast.success("Đã cập nhật ngưỡng cho AI");
        } catch (error) {
            toast.error("Lỗi lưu cài đặt");
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4 transition-all hover:shadow-md">
            {/* --- HEADER CỦA NODE (Luôn hiển thị) --- */}
            <div 
                className="p-5 flex items-center justify-between cursor-pointer bg-slate-50/50 hover:bg-slate-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${device.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                        <i className="fas fa-server"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700 text-lg">{device.name}</h3>
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                            <span className={device.status === 'ONLINE' ? 'text-emerald-600' : 'text-slate-400'}>
                                {device.status || 'OFFLINE'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className={localSettings.mode === 'AUTO' ? 'text-blue-600' : 'text-orange-500'}>
                                {localSettings.mode === 'AUTO' ? 'AI CONTROL' : 'MANUAL'}
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* Mũi tên xổ xuống */}
                <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <i className="fas fa-chevron-down"></i>
                </div>
            </div>

            {/* --- PHẦN MỞ RỘNG (CHI TIẾT ĐIỀU KHIỂN) --- */}
            {isExpanded && (
                <div className="p-6 border-t border-slate-100 animate-fade-in bg-white">
                    
                    {/* 1. Toggle Chế độ Auto/Manual */}
                    <div className="flex items-center justify-between mb-8 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <div>
                            <h4 className="font-bold text-slate-700">Chế độ hoạt động</h4>
                            <p className="text-xs text-slate-500 mt-1">
                                {localSettings.mode === 'AUTO' 
                                    ? 'AI (Random Forest) đang tự động điều khiển thiết bị dựa trên cảm biến.' 
                                    : 'Bạn đang toàn quyền điều khiển thủ công.'}
                            </p>
                        </div>
                        <button 
                            onClick={toggleMode}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${localSettings.mode === 'AUTO' ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ${localSettings.mode === 'AUTO' ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* 2. Cài đặt Ngưỡng (Thresholds) cho AI */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">
                                <i className="fas fa-sliders-h mr-2 text-slate-400"></i>
                                Cấu hình Ngưỡng (AI Input)
                            </h4>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Độ ẩm đất tối thiểu (%)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={localSettings.threshold_soil}
                                        onChange={(e) => setLocalSettings({...localSettings, threshold_soil: e.target.value})}
                                    />
                                    <span className="text-xs text-slate-400 self-center">Dưới mức này `{'->'}` Bật Bơm</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nhiệt độ tối đa (°C)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                        value={localSettings.threshold_temp}
                                        onChange={(e) => setLocalSettings({...localSettings, threshold_temp: e.target.value})}
                                    />
                                    <span className="text-xs text-slate-400 self-center">Trên mức này `{'->'}` Bật Phun sương</span>
                                </div>
                            </div>
                            
                            <button onClick={saveThresholds} className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-all">
                                Lưu cấu hình
                            </button>
                        </div>

                        {/* 3. Bảng điều khiển Thủ công (Manual Controls) */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">
                                <i className="fas fa-gamepad mr-2 text-slate-400"></i>
                                Điều khiển Thiết bị
                            </h4>
                            
                            {/* Nút Bơm */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <i className="fas fa-water text-blue-500 text-xl w-6 text-center"></i>
                                    <span className="font-medium text-slate-700">Máy Bơm</span>
                                </div>
                                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                                    <button 
                                        onClick={() => handleManualControl('PUMP', 'ON')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${localSettings.pump_status === 'ON' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-blue-500'}`}
                                    >
                                        ON
                                    </button>
                                    <button 
                                        onClick={() => handleManualControl('PUMP', 'OFF')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${localSettings.pump_status === 'OFF' ? 'bg-slate-200 text-slate-600 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        OFF
                                    </button>
                                </div>
                            </div>

                            {/* Nút Phun sương */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <i className="fas fa-cloud-rain text-cyan-500 text-xl w-6 text-center"></i>
                                    <span className="font-medium text-slate-700">Phun sương</span>
                                </div>
                                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                                    <button 
                                        onClick={() => handleManualControl('MIST', 'ON')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${localSettings.mist_status === 'ON' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-cyan-500'}`}
                                    >
                                        ON
                                    </button>
                                    <button 
                                        onClick={() => handleManualControl('MIST', 'OFF')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${localSettings.mist_status === 'OFF' ? 'bg-slate-200 text-slate-600 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        OFF
                                    </button>
                                </div>
                            </div>

                            {/* Nút Đèn */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <i className="fas fa-lightbulb text-yellow-500 text-xl w-6 text-center"></i>
                                    <span className="font-medium text-slate-700">Đèn chiếu sáng</span>
                                </div>
                                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                                    <button 
                                        onClick={() => handleManualControl('LIGHT', 'ON')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${localSettings.light_status === 'ON' ? 'bg-yellow-400 text-white shadow-md' : 'text-slate-400 hover:text-yellow-500'}`}
                                    >
                                        ON
                                    </button>
                                    <button 
                                        onClick={() => handleManualControl('LIGHT', 'OFF')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${localSettings.light_status === 'OFF' ? 'bg-slate-200 text-slate-600 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        OFF
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Component chính: Render danh sách
const SmartControl = () => {
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDevices = async () => {
            try {
                const data = await api.devices.getAll();
                setDevices(data);
            } catch (err) {
                toast.error("Không thể tải danh sách thiết bị");
            } finally {
                setIsLoading(false);
            }
        };
        loadDevices();
    }, []);

    if (isLoading) return <div className="p-10 text-center animate-pulse">Đang tải trung tâm điều khiển...</div>;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800">Trung tâm Điều khiển</h2>
                <p className="text-slate-500">Quản lý thiết bị IoT & Cấu hình AI tự động</p>
            </div>

            <div className="space-y-4">
                {devices.map(device => (
                    <NodeControlCard key={device.device_id} device={device} />
                ))}
            </div>
            
            {devices.length === 0 && (
                <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
                    <p className="text-slate-400">Chưa có Node nào được kích hoạt.</p>
                </div>
            )}
        </div>
    );
};

export default SmartControl;
// const Devices = () => {
//     const [devices, setDevices] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [showModal, setShowModal] = useState(false);
    
//     // State cho form thêm mới
//     const [newDevice, setNewDevice] = useState({ id: '', name: '' });

//     const loadDevices = async () => {
//         setLoading(true);
//         const data = await api.devices.getAll();
//         if (data) setDevices(data);
//         setLoading(false);
//     };

//     useEffect(() => {
//         loadDevices();
//         // Auto refresh mỗi 5s để cập nhật trạng thái Online/Offline
//         const interval = setInterval(() => {
//              // Chỉ refresh ngầm (không hiện loading spinner)
//              api.devices.getAll().then(data => {
//                  if(data) setDevices(data);
//              });
//         }, 5000);
//         return () => clearInterval(interval);
//     }, []);

//     const handleControl = async (id, action) => {
//         await api.devices.control(id, action);
//         alert(`Đã gửi lệnh: ${action}`);
//     };

//     const handleSubmit = async () => {
//         if (!newDevice.id) return alert("Nhập ID thiết bị!");
        
//         const payload = {
//             device_id: newDevice.id,
//             name: newDevice.name || `Device ${newDevice.id}`,
//             zone_id: null
//         };

//         const res = await api.devices.create(payload);
//         if (res) {
//             alert("Thêm thành công!");
//             setShowModal(false);
//             setNewDevice({ id: '', name: '' });
//             loadDevices();
//         }
//     };

//     return (
//         <>
//             <Header title="Danh sách Thiết bị IoT" />
            
//             <div className="tab-content" style={{ display: 'block' }}>
//                 <div style={{ marginBottom: '15px' }}>
//                     <Button onClick={() => setShowModal(true)} isAdminOnly variant="on" style={{ marginRight: '10px' }}>
//                         <i className="fas fa-plus"></i> Thêm Thiết Bị
//                     </Button>
//                     <Button onClick={loadDevices} variant="sm">
//                         <i className="fas fa-sync"></i> Làm mới
//                     </Button>
//                 </div>

//                 <table className="data-table">
//                     <thead>
//                         <tr>
//                             <th>ID Thiết bị</th>
//                             <th>Tên</th>
//                             <th>Khu vực (Zone)</th>
//                             <th>Trạng thái</th>
//                             <th>Hành động</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {loading ? (
//                             <tr><td colspan="5">Đang tải dữ liệu...</td></tr>
//                         ) : devices.length === 0 ? (
//                             <tr><td colspan="5">Chưa có thiết bị nào.</td></tr>
//                         ) : (
//                             devices.map(dev => (
//                                 <tr key={dev.device_id}>
//                                     <td>{dev.device_id}</td>
//                                     <td>{dev.name}</td>
//                                     <td>{dev.zone_id ? `Zone ${dev.zone_id}` : 'Chưa gán'}</td>
//                                     <td><StatusTag status={dev.status} /></td>
//                                     <td>
//                                         <Button variant="sm" onClick={() => handleControl(dev.device_id, 'PUMP_ON')} style={{marginRight: 5}}>Bật</Button>
//                                         <Button variant="danger" className="btn-sm" onClick={() => handleControl(dev.device_id, 'PUMP_OFF')}>Tắt</Button>
//                                     </td>
//                                 </tr>
//                             ))
//                         )}
//                     </tbody>
//                 </table>
//             </div>

//             {/* Modal Thêm Mới (Viết inline đơn giản) */}
//             {showModal && (
//                 <div className="modal-overlay" style={{
//                     position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', 
//                     display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000
//                 }}>
//                     <div className="modal-content" style={{background:'white', padding:'20px', borderRadius:'8px', width:'300px'}}>
//                         <h3>Thêm Thiết Bị Mới</h3>
//                         <input 
//                             type="text" placeholder="ID (VD: ESP32_01)" 
//                             value={newDevice.id} onChange={e => setNewDevice({...newDevice, id: e.target.value})}
//                             style={{display:'block', width:'100%', marginBottom:'10px', padding:'8px'}}
//                         />
//                         <input 
//                             type="text" placeholder="Tên hiển thị" 
//                             value={newDevice.name} onChange={e => setNewDevice({...newDevice, name: e.target.value})}
//                             style={{display:'block', width:'100%', marginBottom:'10px', padding:'8px'}}
//                         />
//                         <div style={{textAlign:'right'}}>
//                             <Button variant="off" onClick={() => setShowModal(false)} style={{marginRight: 10}}>Hủy</Button>
//                             <Button variant="on" onClick={handleSubmit}>Lưu</Button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// export default Devices;