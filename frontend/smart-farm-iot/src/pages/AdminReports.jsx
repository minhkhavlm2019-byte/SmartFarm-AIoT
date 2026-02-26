import React, { useState, useEffect } from 'react';
import { api } from '../services/api'; 
import { toast } from 'react-toastify'; 
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { format } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const AdminReports = () => {
    const [chartData, setChartData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [chartsRes, logsRes] = await Promise.all([
                    api.reports.getCharts(), 
                    api.reports.getLogs(50)  
                ]);

                // Đảm bảo state luôn có giá trị hợp lệ
                setChartData(chartsRes || null);
                setLogs(Array.isArray(logsRes) ? logsRes : []); 
                
            } catch (error) {
                console.error("Lỗi tải báo cáo:", error);
                setLogs([]); 
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // ==========================================
    // HÀM XUẤT FILE EXCEL (CSV)
    // ==========================================
    const handleExportExcel = () => {
        const currentLogs = logs || [];
        
        if (currentLogs.length === 0) {
            toast.warning("Không có dữ liệu nhật ký để xuất!");
            return;
        }

        const headers = ['Thời gian', 'Thiết bị', 'Hành động', 'Nguồn kích hoạt', 'Lý do / Chi tiết'];

        const escapeCSV = (str) => {
            if (str === null || str === undefined) return '""';
            const stringified = String(str);
            if (stringified.search(/("|,|\n)/g) >= 0) {
                return `"${stringified.replace(/"/g, '""')}"`;
            }
            return stringified;
        };

        const csvRows = currentLogs.map(log => {
            const timeFormatted = log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss') : '--';
            const source = log.trigger === 'AI_MODEL' ? 'AI Tự động' : 'Thủ công';
            return [
                timeFormatted,
                log.device_id,
                log.action,
                source,
                log.reason || 'Không có chi tiết'
            ].map(escapeCSV).join(',');
        });

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const dateStr = format(new Date(), 'dd-MM-yyyy');
        link.setAttribute('href', url);
        link.setAttribute('download', `Bao_Cao_Tuoi_Tieu_${dateStr}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("✅ Đã xuất báo cáo thành công!");
    };

    if (isLoading) return <div className="p-10 text-center animate-pulse text-slate-500 font-bold">Đang tổng hợp dữ liệu báo cáo...</div>;

    // --- CẤU HÌNH BIỂU ĐỒ MÔI TRƯỜNG (4 THÔNG SỐ & 2 TRỤC Y) ---
    const envChartData = {
        labels: chartData?.env_trend?.labels || [],
        datasets: [
            {
                label: 'Nhiệt độ (°C)',
                data: chartData?.env_trend?.temp || [],
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                tension: 0.3,
                yAxisID: 'y', // Gắn vào trục trái
            },
            {
                label: 'Ẩm Đất (%)',
                data: chartData?.env_trend?.hum_soil || [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                tension: 0.3,
                yAxisID: 'y', // Gắn vào trục trái
            },
            {
                label: 'Ẩm Khí (%)',
                data: chartData?.env_trend?.hum_air || [],
                borderColor: 'rgb(6, 182, 212)', // Màu Cyan
                backgroundColor: 'rgba(6, 182, 212, 0.5)',
                tension: 0.3,
                yAxisID: 'y', // Gắn vào trục trái
            },
            {
                label: 'Ánh sáng (Lux)',
                data: chartData?.env_trend?.light || [],
                borderColor: 'rgb(234, 179, 8)', // Màu Vàng
                backgroundColor: 'rgba(234, 179, 8, 0.5)',
                tension: 0.3,
                yAxisID: 'y1', // Gắn vào TRỤC PHẢI
            },
        ],
    };

    // Cấu hình tuỳ chỉnh 2 Trục Y
    const envChartOptions = {
        maintainAspectRatio: false, 
        responsive: true,
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Nhiệt độ / Độ ẩm' },
                suggestedMax: 100 // Thường độ ẩm max là 100
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Ánh sáng (Lux)' },
                grid: { drawOnChartArea: false } // Không vẽ đường kẻ ngang cho trục này để tránh rối mắt
            },
        },
    };

    // --- CẤU HÌNH BIỂU ĐỒ AI ---
    const aiChartData = {
        labels: ['AI Tự động', 'Người can thiệp'],
        datasets: [
            {
                data: [chartData?.ai_efficiency?.ai || 0, chartData?.ai_efficiency?.manual || 0],
                backgroundColor: ['#10b981', '#f59e0b'], 
                borderWidth: 0,
            },
        ],
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10 max-w-7xl mx-auto">
            <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Báo cáo & Phân tích</h2>
                <p className="text-slate-500 font-medium mt-1">Tổng hợp hiệu suất hệ thống và lịch sử hoạt động</p>
            </div>

            {/* --- PHẦN 1: BIỂU ĐỒ (CHARTS) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <i className="fas fa-chart-line text-blue-500"></i> Xu hướng Môi trường (7 ngày)
                    </h3>
                    {/* Render biểu đồ với Options mới có 2 trục Y */}
                    <div className="h-64 w-full">
                        <Line options={envChartOptions} data={envChartData} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <i className="fas fa-robot text-emerald-500"></i> Hiệu suất AI
                    </h3>
                    <div className="h-48 w-full flex justify-center">
                        <Doughnut data={aiChartData} options={{ cutout: '70%', maintainAspectRatio: false }} />
                    </div>
                    <div className="mt-6 text-center text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p>Tỷ lệ AI tự động xử lý: <span className="font-black text-emerald-600 text-xl ml-2">
                            {Math.round((chartData?.ai_efficiency?.ai / ((chartData?.ai_efficiency?.ai + chartData?.ai_efficiency?.manual) || 1)) * 100) || 0}%
                        </span></p>
                    </div>
                </div>
            </div>

            {/* --- PHẦN 2: NHẬT KÝ HOẠT ĐỘNG (ACTION LOGS) --- */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <i className="fas fa-history text-slate-400"></i> Lịch sử Tưới tiêu (50 log gần nhất)
                    </h3>
                    
                    <button 
                        onClick={handleExportExcel}
                        className="text-sm font-bold text-emerald-700 hover:text-white bg-emerald-100 hover:bg-emerald-600 px-4 py-2 rounded-xl transition-all flex items-center shadow-sm"
                    >
                        <i className="fas fa-file-excel mr-2"></i> Xuất Excel
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-slate-400 font-bold uppercase text-xs border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Thời gian</th>
                                <th className="px-6 py-4">Thiết bị</th>
                                <th className="px-6 py-4">Hành động</th>
                                <th className="px-6 py-4">Nguồn kích hoạt</th>
                                <th className="px-6 py-4">Lý do / Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {(logs || []).map((log) => (
                                <tr key={log.log_id || Math.random()} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                        {log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss') : '--'}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700">
                                        {log.device_id || '--'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-black ${
                                            (log.action || '').includes('ON') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                        }`}>
                                            {log.action || '--'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.trigger === 'AI_MODEL' ? (
                                            <span className="flex items-center gap-1.5 text-purple-600 font-bold text-xs bg-purple-50 w-max px-2 py-1 rounded">
                                                <i className="fas fa-brain"></i> AI Auto
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-blue-600 font-bold text-xs bg-blue-50 w-max px-2 py-1 rounded">
                                                <i className="fas fa-user"></i> Thủ công
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                                        {log.reason || '--'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {(logs || []).length === 0 && (
                    <div className="p-16 text-center text-slate-400 font-medium">Chưa có dữ liệu lịch sử tưới tiêu.</div>
                )}
            </div>
        </div>
    );
};

export default AdminReports;
// import React, { useState, useEffect } from 'react';
// import { api } from '../services/api'; 
// import { toast } from 'react-toastify'; 
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   ArcElement
// } from 'chart.js';
// import { Line, Doughnut } from 'react-chartjs-2';
// import { format } from 'date-fns';

// ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

// const AdminReports = () => {
//     const [chartData, setChartData] = useState(null);
//     const [logs, setLogs] = useState([]);
//     const [isLoading, setIsLoading] = useState(true);

//     useEffect(() => {
//         const loadData = async () => {
//             try {
//                 const [chartsRes, logsRes] = await Promise.all([
//                     api.reports.getCharts(), // Đã sửa lại gọi qua file api.js cho chuẩn
//                     api.reports.getLogs(50)  // Đã sửa lại gọi qua file api.js cho chuẩn
//                 ]);

//                 // [SỬA QUAN TRỌNG]: Đảm bảo state luôn có giá trị hợp lệ, không bao giờ là undefined
//                 setChartData(chartsRes || null);
//                 // Bắt buộc logs phải là một mảng. Nếu API lỗi trả về undefined, ta gán []
//                 setLogs(Array.isArray(logsRes) ? logsRes : []); 
                
//             } catch (error) {
//                 console.error("Lỗi tải báo cáo:", error);
//                 // Nếu gọi API thất bại (Network Error), khởi tạo mảng rỗng để không bị lỗi map()
//                 setLogs([]); 
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         loadData();
//     }, []);

//     // ==========================================
//     // TÍNH NĂNG MỚI: HÀM XUẤT FILE EXCEL (CSV)
//     // ==========================================
//     const handleExportExcel = () => {
//         // [SỬA QUAN TRỌNG]: Thêm điều kiện dự phòng (logs || [])
//         const currentLogs = logs || [];
        
//         if (currentLogs.length === 0) {
//             toast.warning("Không có dữ liệu nhật ký để xuất!");
//             return;
//         }

//         // 1. Khai báo tiêu đề cột
//         const headers = ['Thời gian', 'Thiết bị', 'Hành động', 'Nguồn kích hoạt', 'Lý do / Chi tiết'];

//         // 2. Hàm dọn dẹp chuỗi để tránh gãy cấu trúc CSV
//         const escapeCSV = (str) => {
//             if (str === null || str === undefined) return '""';
//             const stringified = String(str);
//             if (stringified.search(/("|,|\n)/g) >= 0) {
//                 return `"${stringified.replace(/"/g, '""')}"`;
//             }
//             return stringified;
//         };

//         // 3. Map dữ liệu logs thành các dòng CSV
//         const csvRows = currentLogs.map(log => {
//             const timeFormatted = log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss') : '--';
//             const source = log.trigger === 'AI_MODEL' ? 'AI Tự động' : 'Thủ công';
//             return [
//                 timeFormatted,
//                 log.device_id,
//                 log.action,
//                 source,
//                 log.reason || 'Không có chi tiết'
//             ].map(escapeCSV).join(',');
//         });

//         // 4. Ghép nối và gắn BOM để hỗ trợ Tiếng Việt có dấu
//         const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
        
//         // 5. Tải file
//         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//         const url = URL.createObjectURL(blob);
//         const link = document.createElement('a');
        
//         const dateStr = format(new Date(), 'dd-MM-yyyy');
//         link.setAttribute('href', url);
//         link.setAttribute('download', `Bao_Cao_Tuoi_Tieu_${dateStr}.csv`);
        
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
        
//         toast.success("✅ Đã xuất báo cáo thành công!");
//     };

//     if (isLoading) return <div className="p-10 text-center animate-pulse text-slate-500 font-bold">Đang tổng hợp dữ liệu báo cáo...</div>;

//     // --- CẤU HÌNH BIỂU ĐỒ ---
//     const envChartData = {
//         labels: chartData?.env_trend?.labels || [],
//         datasets: [
//             {
//                 label: 'Nhiệt độ (°C)',
//                 data: chartData?.env_trend?.temp || [],
//                 borderColor: 'rgb(239, 68, 68)',
//                 backgroundColor: 'rgba(239, 68, 68, 0.5)',
//                 tension: 0.3,
//             },
//             {
//                 label: 'Độ ẩm (%)',
//                 data: chartData?.env_trend?.hum || [],
//                 borderColor: 'rgb(59, 130, 246)',
//                 backgroundColor: 'rgba(59, 130, 246, 0.5)',
//                 tension: 0.3,
//             },
//         ],
//     };

//     const aiChartData = {
//         labels: ['AI Tự động', 'Người can thiệp'],
//         datasets: [
//             {
//                 data: [chartData?.ai_efficiency?.ai || 0, chartData?.ai_efficiency?.manual || 0],
//                 backgroundColor: ['#10b981', '#f59e0b'], 
//                 borderWidth: 0,
//             },
//         ],
//     };

//     return (
//         <div className="space-y-8 animate-fade-in pb-10 max-w-7xl mx-auto">
//             <div>
//                 <h2 className="text-3xl font-black text-slate-800 tracking-tight">Báo cáo & Phân tích</h2>
//                 <p className="text-slate-500 font-medium mt-1">Tổng hợp hiệu suất hệ thống và lịch sử hoạt động</p>
//             </div>

//             {/* --- PHẦN 1: BIỂU ĐỒ (CHARTS) --- */}
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                 <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
//                     <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
//                         <i className="fas fa-chart-line text-blue-500"></i> Xu hướng Môi trường (7 ngày)
//                     </h3>
//                     <div className="h-64 w-full">
//                         <Line options={{ maintainAspectRatio: false, responsive: true }} data={envChartData} />
//                     </div>
//                 </div>

//                 <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
//                     <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
//                         <i className="fas fa-robot text-emerald-500"></i> Hiệu suất AI
//                     </h3>
//                     <div className="h-48 w-full flex justify-center">
//                         <Doughnut data={aiChartData} options={{ cutout: '70%', maintainAspectRatio: false }} />
//                     </div>
//                     <div className="mt-6 text-center text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
//                         <p>Tỷ lệ AI tự động xử lý: <span className="font-black text-emerald-600 text-xl ml-2">
//                             {Math.round((chartData?.ai_efficiency?.ai / ((chartData?.ai_efficiency?.ai + chartData?.ai_efficiency?.manual) || 1)) * 100) || 0}%
//                         </span></p>
//                     </div>
//                 </div>
//             </div>

//             {/* --- PHẦN 2: NHẬT KÝ HOẠT ĐỘNG (ACTION LOGS) --- */}
//             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
//                 <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
//                     <h3 className="font-bold text-slate-700 flex items-center gap-2">
//                         <i className="fas fa-history text-slate-400"></i> Lịch sử Tưới tiêu (50 log gần nhất)
//                     </h3>
                    
//                     <button 
//                         onClick={handleExportExcel}
//                         className="text-sm font-bold text-emerald-700 hover:text-white bg-emerald-100 hover:bg-emerald-600 px-4 py-2 rounded-xl transition-all flex items-center shadow-sm"
//                     >
//                         <i className="fas fa-file-excel mr-2"></i> Xuất Excel
//                     </button>
//                 </div>
                
//                 <div className="overflow-x-auto">
//                     <table className="w-full text-left text-sm">
//                         <thead className="bg-white text-slate-400 font-bold uppercase text-xs border-b border-slate-100">
//                             <tr>
//                                 <th className="px-6 py-4">Thời gian</th>
//                                 <th className="px-6 py-4">Thiết bị</th>
//                                 <th className="px-6 py-4">Hành động</th>
//                                 <th className="px-6 py-4">Nguồn kích hoạt</th>
//                                 <th className="px-6 py-4">Lý do / Chi tiết</th>
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-50 bg-white">
//                             {/* [SỬA QUAN TRỌNG]: Dùng (logs || []).map để chống lỗi crash UI */}
//                             {(logs || []).map((log) => (
//                                 <tr key={log.log_id || Math.random()} className="hover:bg-slate-50/80 transition-colors">
//                                     <td className="px-6 py-4 text-slate-500 font-mono text-xs">
//                                         {/* Thêm check timestamp có tồn tại không trước khi format */}
//                                         {log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss') : '--'}
//                                     </td>
//                                     <td className="px-6 py-4 font-bold text-slate-700">
//                                         {log.device_id || '--'}
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <span className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-black ${
//                                             (log.action || '').includes('ON') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
//                                         }`}>
//                                             {log.action || '--'}
//                                         </span>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         {log.trigger === 'AI_MODEL' ? (
//                                             <span className="flex items-center gap-1.5 text-purple-600 font-bold text-xs bg-purple-50 w-max px-2 py-1 rounded">
//                                                 <i className="fas fa-brain"></i> AI Auto
//                                             </span>
//                                         ) : (
//                                             <span className="flex items-center gap-1.5 text-blue-600 font-bold text-xs bg-blue-50 w-max px-2 py-1 rounded">
//                                                 <i className="fas fa-user"></i> Thủ công
//                                             </span>
//                                         )}
//                                     </td>
//                                     <td className="px-6 py-4 text-slate-600 text-xs font-medium">
//                                         {log.reason || '--'}
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//                 {/* [SỬA QUAN TRỌNG]: Kiểm tra độ dài an toàn */}
//                 {(logs || []).length === 0 && (
//                     <div className="p-16 text-center text-slate-400 font-medium">Chưa có dữ liệu lịch sử tưới tiêu.</div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default AdminReports;