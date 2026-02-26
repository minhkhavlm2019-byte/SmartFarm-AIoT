import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const FarmerHistory = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // Gọi API lấy nhật ký hoạt động (Bảng action_logs)
                // Chú ý: Cần BE hỗ trợ API dạng api.get('/action_logs') hoặc api.logs.getAll()
                const data = await api.get('/action_logs?limit=50'); 
                setLogs(data || []);
            } catch (error) {
                console.error("Chưa có API logs hoặc lỗi:", error);
                // Tạo data giả lập (Mock) nếu Backend chưa có API này để test UI
                setLogs([
                    { log_id: 1, timestamp: new Date().toISOString(), trigger: 'AI_MODEL', action: 'PUMP_ON', reason: 'Độ ẩm đất 38% < Ngưỡng 40%' },
                    { log_id: 2, timestamp: new Date(Date.now() - 3600000).toISOString(), trigger: 'MANUAL', action: 'MIST_ON', reason: 'Nông dân điều khiển tay' },
                    { log_id: 3, timestamp: new Date(Date.now() - 7200000).toISOString(), trigger: 'FAILSAFE', action: 'MIST_ON', reason: 'Sốc nhiệt 38°C > 35°C' }
                ]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const getLogStyle = (trigger, action) => {
        if (trigger === 'AI_MODEL') return { icon: 'fas fa-robot', color: 'text-purple-500', bg: 'bg-purple-100' };
        if (trigger === 'FAILSAFE') return { icon: 'fas fa-shield-alt', color: 'text-rose-500', bg: 'bg-rose-100' };
        if (action.includes('PUMP')) return { icon: 'fas fa-tint', color: 'text-blue-500', bg: 'bg-blue-100' };
        if (action.includes('MIST')) return { icon: 'fas fa-wind', color: 'text-teal-500', bg: 'bg-teal-100' };
        return { icon: 'fas fa-hand-paper', color: 'text-slate-500', bg: 'bg-slate-100' };
    };

    if (isLoading) return <div className="p-20 text-center animate-pulse">Đang tải nhật ký...</div>;

    return (
        <div className="animate-fade-in max-w-5xl mx-auto pb-10 space-y-6">
            <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Nhật ký Hoạt động</h2>
                <p className="text-slate-500 font-medium mt-1">Lịch sử tưới tiêu và các quyết định của AI trong 24h qua.</p>
            </div>

            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                    {logs.map(log => {
                        const style = getLogStyle(log.trigger, log.action);
                        const time = new Date(log.timestamp);
                        
                        return (
                            <div key={log.log_id} className="relative pl-8 group">
                                {/* Dấu chấm tròn trên Timeline */}
                                <span className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white ${style.bg} ${style.color} shadow-sm group-hover:scale-110 transition-transform`}>
                                    <i className={`${style.icon} text-xs`}></i>
                                </span>
                                
                                <div className="bg-slate-50 hover:bg-slate-100 transition-colors p-4 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-slate-800 text-lg">
                                            {log.action === 'PUMP_ON' ? 'Bắt đầu Tưới nước' : log.action === 'PUMP_OFF' ? 'Ngừng Tưới' : log.action === 'MIST_ON' ? 'Bật Phun sương' : log.action}
                                        </h4>
                                        <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">
                                            {time.toLocaleTimeString('vi-VN')} - {time.toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 text-sm font-medium mb-3">{log.reason}</p>
                                    
                                    {/* Nhãn Tag Ai ra lệnh */}
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-md ${log.trigger === 'AI_MODEL' ? 'bg-purple-100 text-purple-700' : log.trigger === 'MANUAL' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                            Nguồn: {log.trigger === 'AI_MODEL' ? 'AI Tự Động' : log.trigger === 'MANUAL' ? 'Người dùng bấm' : 'Hệ thống Khẩn cấp'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">ID: {log.device_id || 'ESP32_01'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FarmerHistory;