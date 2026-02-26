import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Button from '../components/common/Button';

const ZoneDetail = () => {
    const { id } = useParams(); // Lấy zone_id từ URL
    const navigate = useNavigate();
    const [devices, setDevices] = useState([]);
    const [zoneName, setZoneName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Lấy thông tin Zone để hiện tên
                // (Giả sử bạn có api lấy chi tiết zone, nếu chưa thì lọc từ list)
                const allZones = await api.zones.getAll();
                const currentZone = allZones.find(z => z.zone_id === parseInt(id));
                if (currentZone) setZoneName(currentZone.name);

                // 2. Lấy tất cả thiết bị và lọc theo Zone ID
                // (Tốt hơn là Backend nên có api /zones/{id}/devices, nhưng ở đây mình lọc ở Client cho nhanh)
                const allDevices = await api.devices.getAll();
                const zoneDevices = allDevices.filter(d => d.zone_id === parseInt(id));
                setDevices(zoneDevices);
            } catch (error) {
                console.error("Lỗi tải dữ liệu:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    // Hàm giả lập tính % Pin (Nếu backend chưa gửi về, ta random hoặc lấy từ sensor_data)
    const getBatteryLevel = (device) => {
        // Logic thực tế: lấy từ device.sensor_data.voltage
        // Ở đây mình giả lập để demo giao diện
        return device.status === 'ONLINE' ? 85 : 0; 
    };

    return (
        <div className="animate-fade-in p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <button onClick={() => navigate('/admin/zones')} className="text-slate-500 hover:text-slate-700 mb-2">
                        <i className="fas fa-arrow-left"></i> Quay lại danh sách
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800">Quản lý: {zoneName}</h2>
                    <p className="text-slate-500">Giám sát trạng thái thiết bị trong khu vực</p>
                </div>
                <Button variant="on" onClick={() => alert("Tính năng thêm thiết bị vào Zone")}>
                    <i className="fas fa-plus"></i> Thêm Thiết Bị
                </Button>
            </div>

            {loading ? <p>Đang tải...</p> : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase">Tên Thiết Bị</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase">Trạng thái</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase">Dung lượng Pin</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase">Cập nhật cuối</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {devices.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">Khu vực này chưa có thiết bị nào.</td></tr>
                            ) : devices.map(dev => (
                                <tr key={dev.device_id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-700">
                                        {dev.name} <br/>
                                        <span className="text-xs font-mono text-slate-400 font-normal">{dev.device_id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${dev.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {dev.status === 'ONLINE' ? 'Đang hoạt động' : 'Mất kết nối'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${getBatteryLevel(dev) > 20 ? 'bg-green-500' : 'bg-red-500'}`} 
                                                    style={{width: `${getBatteryLevel(dev)}%`}}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-bold">{getBatteryLevel(dev)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {dev.last_seen ? new Date(dev.last_seen).toLocaleString('vi-VN') : '--'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ZoneDetail;