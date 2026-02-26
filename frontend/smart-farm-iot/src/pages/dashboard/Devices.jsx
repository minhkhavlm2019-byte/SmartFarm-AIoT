import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import Header from '../components/layout/Header';

const Devices = () => {
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    // 1. Tải danh sách
    const loadDevices = async () => {
        try {
            const data = await api.devices.getAll();
            setDevices(data || []);
        } catch (error) {
            toast.error("Lỗi kết nối máy chủ");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDevices();
    }, []);

    // 2. Điều khiển
    const handleControl = async (deviceId, deviceType, action) => {
        const command = `${deviceType}_${action}`;
        setProcessingId(deviceId);
        try {
            await api.devices.control(deviceId, command);
            toast.success(`Đã gửi lệnh: ${action === 'ON' ? 'Bật' : 'Tắt'}`);
        } catch (error) {
            toast.error("Gửi lệnh thất bại!");
        } finally {
            setProcessingId(null);
        }
    };

    // 3. Báo hỏng (Mock API)
    const handleReport = (deviceName) => {
        const note = prompt(`Mô tả lỗi của ${deviceName} để kỹ thuật viên kiểm tra:`);
        if (note) {
            // Gọi API báo lỗi ở đây (nếu có)
            // await api.issues.create({ device: deviceName, note: note });
            toast.info("Đã gửi thông báo cho kỹ thuật viên. Họ sẽ liên hệ bác sớm!");
        }
    };

    if (isLoading) return <div className="p-10 text-center">Đang tải thiết bị...</div>;

    return (
        <>
            <Header title="Điều khiển Thiết bị" />
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.map(device => {
                    const isOnline = (device.status || 'ONLINE') === 'ONLINE';

                    return (
                        <div key={device.device_id} className={`rounded-2xl shadow-sm border-2 overflow-hidden transition-all
                            ${isOnline ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-200 opacity-80'}
                        `}>
                            {/* Header Card */}
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{device.name}</h3>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {isOnline ? '● Đang hoạt động' : '● Mất kết nối'}
                                    </span>
                                </div>
                                {/* Nút Báo hỏng */}
                                <button 
                                    onClick={() => handleReport(device.name)}
                                    className="text-orange-500 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                                    title="Báo cho kỹ thuật viên"
                                >
                                    <i className="fas fa-tools"></i> Báo hỏng
                                </button>
                            </div>

                            {/* Body Controls */}
                            <div className="p-5 space-y-4 relative">
                                {/* Nếu mất kết nối thì che mờ và không cho bấm */}
                                {!isOnline && (
                                    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold shadow-sm text-sm border border-red-100">
                                            <i className="fas fa-exclamation-triangle mr-1"></i> Thiết bị ngoại tuyến
                                        </div>
                                    </div>
                                )}

                                <ControlRow 
                                    label="Máy Bơm" icon="fas fa-water" color="blue" 
                                    isLoading={processingId === device.device_id}
                                    onOn={() => handleControl(device.device_id, 'PUMP', 'ON')}
                                    onOff={() => handleControl(device.device_id, 'PUMP', 'OFF')}
                                />
                                
                                <ControlRow 
                                    label="Đèn Sáng" icon="fas fa-lightbulb" color="yellow" 
                                    isLoading={processingId === device.device_id}
                                    onOn={() => handleControl(device.device_id, 'LIGHT', 'ON')}
                                    onOff={() => handleControl(device.device_id, 'LIGHT', 'OFF')}
                                />
                                
                                <ControlRow 
                                    label="Phun Sương" icon="fas fa-cloud-showers-heavy" color="cyan" 
                                    isLoading={processingId === device.device_id}
                                    onOn={() => handleControl(device.device_id, 'MIST', 'ON')}
                                    onOff={() => handleControl(device.device_id, 'MIST', 'OFF')}
                                />
                            </div>
                        </div>
                    );
                })}

                {devices.length === 0 && (
                     <div className="col-span-full text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">Chưa có thiết bị nào.</p>
                    </div>
                )}
            </div>
        </>
    );
};

// Component nút bấm
const ControlRow = ({ label, icon, color, isLoading, onOn, onOff }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-${color}-50 text-${color}-600 flex items-center justify-center text-lg shadow-sm`}>
                <i className={icon}></i>
            </div>
            <span className="font-bold text-slate-700">{label}</span>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={onOn} disabled={isLoading}
                className={`w-16 py-2 rounded-lg font-bold text-white shadow-sm active:scale-95 transition-all
                    bg-${color}-500 hover:bg-${color}-600 disabled:opacity-50`}
            >
                BẬT
            </button>
            <button 
                onClick={onOff} disabled={isLoading}
                className="w-16 py-2 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
                TẮT
            </button>
        </div>
    </div>
);

export default Devices;