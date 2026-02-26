import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler // Import Filler để tô màu nền biểu đồ
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Đăng ký các thành phần ChartJS (Bắt buộc)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * RealtimeChart Component
 * @param {Array} data - Mảng lịch sử (history) từ API trả về
 */
const RealtimeChart = ({ historyData }) => {
    // Nếu chưa có dữ liệu thì không vẽ gì cả
    if (!historyData || historyData.length === 0) {
        return <div style={{textAlign: 'center', padding: '20px'}}>Đang chờ dữ liệu...</div>;
    }

    // Xử lý dữ liệu: Đảo ngược mảng để dữ liệu mới nhất nằm bên phải
    // (Giả sử API trả về mới nhất trước, cũ nhất sau)
    const reversedData = [...historyData].reverse();

    const labels = reversedData.map(item => 
        new Date(item.timestamp).toLocaleTimeString('vi-VN')
    );
    const tempData = reversedData.map(item => item.temp);
    const humData = reversedData.map(item => item.hum_air);

    // Cấu hình dữ liệu cho ChartJS
    const chartData = {
        labels: labels,
        datasets: [
            {
                label: 'Nhiệt độ (°C)',
                data: tempData,
                borderColor: '#e74c3c', // Màu đỏ
                backgroundColor: 'rgba(231, 76, 60, 0.2)',
                fill: true,
                tension: 0.4, // Đường cong mềm mại
            },
            {
                label: 'Độ ẩm (%)',
                data: humData,
                borderColor: '#3498db', // Màu xanh dương
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    // Cấu hình hiển thị (Tắt animation để Realtime mượt hơn)
    const options = {
        responsive: true,
        maintainAspectRatio: false, // Để chart tự co giãn theo div cha
        animation: {
            duration: 0 // Tắt hiệu ứng vẽ lại để tránh bị nháy khi cập nhật liên tục
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true, // Trục Y bắt đầu từ 0
            }
        }
    };

    // Style inline để đảm bảo chart không bị vỡ layout
    return (
        <div style={{ height: '300px', width: '100%' }}>
            <Line data={chartData} options={options} />
        </div>
    );
};

export default RealtimeChart;