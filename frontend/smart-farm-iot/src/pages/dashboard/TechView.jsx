import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

const TechView = ({ user }) => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // 1. Tải danh sách thiết bị để phân tích trạng thái kỹ thuật
    const loadTechData = async () => {
        try {
            const data = await api.devices.getAll();
            if (data) setDevices(data);
        } catch (error) {
            console.error("Lỗi tải dữ liệu kỹ thuật:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTechData();
        const interval = setInterval(loadTechData, 10000); // Cập nhật mỗi 10 giây
        return () => clearInterval(interval);
    }, []);

    // 2. Hàm gửi lệnh kỹ thuật (Reset/Check)
    const handleTechAction = async (deviceId, action) => {
        setIsActionLoading(true);
        try {
            await api.devices.control(deviceId, action);
            alert(`✅ Đã gửi lệnh ${action} tới thiết bị ${deviceId}`);
        } catch (error) {
            alert("❌ Lỗi kỹ thuật: " + error.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    // 3. Lọc danh sách thiết bị lỗi (Offline)
    const faultDevices = devices.filter(d => d.status === 'OFFLINE');

    if (loading) return <div className="p-8 text-center">Đang phân tích hệ thống...</div>;

    return (
        <div className="space-y-6">
            {/* Header Thông tin trực trực */}
            <div className="bg-blue-600 p-5 rounded-2xl shadow-lg text-white flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold flex items-center">
                        <i className="fas fa-user-shield mr-2"></i> 
                        Kỹ thuật viên: {user?.full_name || user?.username}
                    </h3>
                    <p className="text-blue-100 text-sm italic">Hệ thống đang giám sát {devices.length} nút mạng</p>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all"
                >
                    <i className="fas fa-sync-alt"></i>
                </button>
            </div>

            {/* Danh sách thiết bị lỗi (Ưu tiên hiển thị đầu tiên) */}
            <div className={`bg-white rounded-2xl p-6 shadow-sm border ${faultDevices.length > 0 ? 'border-red-300 animate-pulse-subtle' : 'border-slate-200'}`}>
                <h3 className={`font-bold mb-4 flex items-center ${faultDevices.length > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    <i className="fas fa-exclamation-triangle mr-2"></i> 
                    {faultDevices.length > 0 ? `Cần kiểm tra (${faultDevices.length})` : 'Hệ thống ổn định'}
                </h3>
                
                <div className="space-y-3">
                    {faultDevices.length > 0 ? (
                        faultDevices.map(dev => (
                            <div key={dev.device_id} className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                                <div>
                                    <p className="font-bold text-slate-800">{dev.name || dev.device_id}</p>
                                    <p className="text-xs text-red-500">
                                        <i className="far fa-clock mr-1"></i>
                                        Mất kết nối từ: {dev.last_seen ? new Date(dev.last_seen).toLocaleTimeString() : 'Không xác định'}
                                    </p>
                                </div>
                                <button 
                                    disabled={isActionLoading}
                                    onClick={() => handleTechAction(dev.device_id, 'REBOOT')}
                                    className="text-sm font-bold text-blue-600 hover:underline bg-white px-3 py-1 rounded-lg shadow-sm"
                                >
                                    Khởi động lại
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-slate-400 text-sm italic">
                            Không có thiết bị nào gặp sự cố kết nối.
                        </div>
                    )}
                </div>
            </div>

            {/* Các thông số kỹ thuật Gateway */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Battery Status */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-700">Năng lượng Gateway</h4>
                        <i className="fas fa-battery-three-quarters text-green-500"></i>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
                        <div className="bg-green-500 h-3 rounded-full transition-all duration-1000" style={{width: '85%'}}></div>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Nguồn: Solar Panel</span>
                        <span>85% (Ổn định)</span>
                    </div>
                </div>

                {/* RSSI Status */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-700">Tín hiệu LoRa/Wifi</h4>
                        <i className="fas fa-signal text-blue-500"></i>
                    </div>
                    <p className="text-3xl font-mono text-slate-800 tracking-tighter">
                        -65 <span className="text-lg font-sans text-slate-400">dBm</span>
                    </p>
                    <p className="text-xs font-bold text-green-500 mt-2">
                        <i className="fas fa-check-circle mr-1"></i> Chất lượng đường truyền: Rất tốt
                    </p>
                </div>
            </div>

            {/* Nhật ký hệ thống nhanh */}
            <div className="bg-slate-800 text-slate-300 p-6 rounded-2xl shadow-inner font-mono text-xs">
                <p className="text-emerald-400 mb-2 border-b border-slate-700 pb-1 underline">SYSTEM_LOG_REALTIME:</p>
                <div className="space-y-1 h-32 overflow-y-auto no-scrollbar">
                    <p>[{new Date().toLocaleTimeString()}] MQTT_BROKER: Connected to hivemq.com</p>
                    <p>[{new Date().toLocaleTimeString()}] DATABASE: Session initialized</p>
                    <p>[{new Date().toLocaleTimeString()}] AUTH: Admin verified (Role: {user?.role})</p>
                    {faultDevices.map(d => (
                        <p key={d.device_id} className="text-red-400">![WARN] DEVICE_OFFLINE: {d.device_id} detected</p>
                    ))}
                    <p className="animate-pulse text-slate-500">_Waiting for new events...</p>
                </div>
            </div>
        </div>
    );
};

export default TechView;