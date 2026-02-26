import React, { useState, useEffect } from 'react';
import { api } from '../../services/api'; 
import { toast } from 'react-toastify';

const SystemLogs = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // States cho bộ lọc
    const [filterLevel, setFilterLevel] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Hàm gọi API lấy Log
    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await api.logs.getAll(); 
            setLogs(data);
        } catch (error) {
            toast.error("Không thể tải nhật ký hệ thống.");
            console.error("Fetch Logs Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Hàm thiết kế màu sắc cho từng mức cảnh báo
    const getLevelBadge = (level) => {
        switch(level) {
            case 'ERROR': return <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-black tracking-widest border border-rose-200">ERROR</span>;
            case 'WARN': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-black tracking-widest border border-amber-200">WARN</span>;
            case 'SUCCESS': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black tracking-widest border border-emerald-200">SUCCESS</span>;
            case 'INFO': default: return <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-black tracking-widest border border-blue-100">INFO</span>;
        }
    };

    // Hàm an toàn để Parse JSON
    const safeParseJSON = (jsonString) => {
        if (!jsonString) return null;
        try {
            return JSON.stringify(JSON.parse(jsonString), null, 2);
        } catch (e) {
            return jsonString; 
        }
    };

    // Lọc dữ liệu
    const filteredLogs = logs.filter(log => {
        const matchLevel = filterLevel === 'ALL' || log.level === filterLevel;
        const safeMessage = log.message || "";
        const safeSource = log.source || "";
        const safeEventType = log.event_type || "";
        
        const matchSearch = safeMessage.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            safeSource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            safeEventType.toLowerCase().includes(searchTerm.toLowerCase());
        return matchLevel && matchSearch;
    });

    // ==========================================
    // TÍNH NĂNG MỚI: HÀM XUẤT FILE CSV
    // ==========================================
    const exportToCSV = () => {
        if (filteredLogs.length === 0) {
            toast.warning("Không có dữ liệu để xuất!");
            return;
        }

        // 1. Tạo mảng chứa tiêu đề cột
        const headers = ['ID', 'Thời gian', 'Mức độ', 'Nguồn', 'Sự kiện', 'Nội dung', 'Dữ liệu gốc (Payload)'];

        // 2. Hàm Escape chuỗi an toàn cho CSV (Xử lý dấu phẩy, ngoặc kép, và JSON)
        const escapeCSV = (str) => {
            if (str === null || str === undefined) return '""';
            const stringified = String(str);
            // Nếu chuỗi chứa dấu phẩy, ngoặc kép, hoặc xuống dòng -> phải bọc trong ngoặc kép "" 
            // Đồng thời nhân đôi các ngoặc kép bên trong lên để Excel không hiểu nhầm
            if (stringified.search(/("|,|\n)/g) >= 0) {
                return `"${stringified.replace(/"/g, '""')}"`;
            }
            return stringified;
        };

        // 3. Trích xuất và định dạng từng dòng dữ liệu từ filteredLogs
        const csvRows = filteredLogs.map(log => {
            const timeFormatted = new Date(log.timestamp).toLocaleString('vi-VN');
            return [
                log.id,
                timeFormatted,
                log.level,
                log.source,
                log.event_type,
                log.message,
                log.payload // Dữ liệu JSON dễ làm gãy CSV nhất đã được hàm escapeCSV bảo vệ
            ].map(escapeCSV).join(',');
        });

        // 4. Ghép nối Header và Data, thêm BOM (\uFEFF) để Excel hiển thị đúng tiếng Việt có dấu
        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
        
        // 5. Tạo file và ép trình duyệt tải xuống
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Đặt tên file có kèm ngày tháng hiện tại
        const dateStr = new Date().toISOString().slice(0, 10);
        link.setAttribute('href', url);
        link.setAttribute('download', `SystemLogs_${dateStr}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("✅ Đã tải xuống file CSV thành công!");
    };

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-10">
            {/* 1. HEADER & ACTIONS */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Nhật ký Hệ thống (Logs)</h2>
                    <p className="text-slate-500 font-medium mt-1">Truy vết sự kiện phần cứng, lỗi mạng và phản hồi thiết bị.</p>
                </div>
                <div className="flex gap-2">
                    {/* ĐÃ GẮN HÀM XUẤT CSV VÀO ĐÂY */}
                    <button 
                        onClick={exportToCSV} 
                        className="bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-xl font-bold transition-colors text-sm shadow-sm flex items-center"
                    >
                        <i className="fas fa-download mr-2"></i> Xuất CSV
                    </button>
                    <button onClick={fetchLogs} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold transition-colors text-sm shadow-sm flex items-center">
                        <i className="fas fa-sync-alt mr-2"></i> Làm mới
                    </button>
                </div>
            </div>

            {/* 2. BỘ LỌC (FILTERS) */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm theo Device ID, Hành động, Nội dung..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {['ALL', 'ERROR', 'WARN', 'INFO'].map(level => (
                        <button 
                            key={level}
                            onClick={() => setFilterLevel(level)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${filterLevel === level ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                            {level === 'ALL' ? 'Tất cả' : level}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. DANH SÁCH NHẬT KÝ (LOG TRACE) */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-20 text-center text-slate-400 font-mono animate-pulse">
                        <i className="fas fa-circle-notch fa-spin text-3xl mb-3 block"></i>
                        Fetching system logs from database...
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-20 text-center text-slate-400 font-medium">Không tìm thấy nhật ký phù hợp với bộ lọc.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredLogs.map(log => (
                            <div key={log.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 md:gap-6 group">
                                
                                {/* Cột Thời gian & Level */}
                                <div className="md:w-48 flex-shrink-0 flex flex-col items-start gap-2">
                                    <div className="text-xs font-mono text-slate-400">
                                        {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour12: false })} <br/>
                                        <span className="text-[10px]">{new Date(log.timestamp).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    {getLevelBadge(log.level)}
                                </div>

                                {/* Cột Nội dung chính */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                            {log.source}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                            <i className="fas fa-caret-right text-[10px] mr-1"></i> {log.event_type}
                                        </span>
                                    </div>
                                    <p className={`text-sm font-medium ${log.level === 'ERROR' ? 'text-rose-700' : 'text-slate-700'}`}>
                                        {log.message}
                                    </p>
                                    
                                    {/* Khối Payload (Dữ liệu JSON thô) */}
                                    {log.payload && (
                                        <div className="mt-3 relative">
                                            <pre className="text-[11px] font-mono bg-slate-800 text-emerald-400 p-3 rounded-xl overflow-x-auto border border-slate-700 shadow-inner">
                                                {safeParseJSON(log.payload)}
                                            </pre>
                                            <button 
                                                className="absolute top-2 right-2 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Copy Payload"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(log.payload);
                                                    toast.success("Đã copy Payload vào bộ nhớ đệm!");
                                                }}
                                            >
                                                <i className="far fa-copy"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemLogs;