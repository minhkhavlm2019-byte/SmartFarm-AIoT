import React, { useEffect, useState } from 'react';
import { api } from '../../services/api'; // Import api để gọi về server

const AdminView = () => {
    // 1. State lưu dữ liệu từ API
    const [stats, setStats] = useState({
        totalZones: 0,
        totalUsers: 0,
        onlinePercent: 0,
        alerts: 0
    });
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);

    // 2. useEffect: Gọi API khi trang vừa tải
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Gọi song song 3 API để tiết kiệm thời gian
                const [zonesData, usersData, devicesData] = await Promise.all([
                    api.zones.getAll().catch(() => []),    // Lấy danh sách Zone
                    api.users.getAll().catch(() => []),    // Lấy danh sách User
                    api.devices.getAll().catch(() => [])   // Lấy danh sách Thiết bị
                ]);

                // Tính toán số liệu thống kê
                const onlineCount = devicesData.filter(d => d.status === 'ONLINE').length;
                const percent = devicesData.length > 0 
                    ? Math.round((onlineCount / devicesData.length) * 100) 
                    : 0;

                // Cập nhật State
                setStats({
                    totalZones: zonesData.length,
                    totalUsers: usersData.length,
                    onlinePercent: percent,
                    alerts: 0 // (Bạn có thể thêm logic đếm cảnh báo nếu muốn)
                });

                setZones(zonesData); // Lưu danh sách zone để vẽ bảng

            } catch (error) {
                console.error("Lỗi tải dữ liệu Admin:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Đang tải dữ liệu hệ thống...</div>;
    }

    return (
        <div className="space-y-6">
            {/* 1. Thống kê tổng quan */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
                    <p className="text-sm text-slate-500">Tổng số Zone</p>
                    <h3 className="text-3xl font-bold text-indigo-600">{stats.totalZones}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
                    <p className="text-sm text-slate-500">Nhân sự (Tech/Farmer)</p>
                    <h3 className="text-3xl font-bold text-slate-700">{stats.totalUsers}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
                    <p className="text-sm text-slate-500">Thiết bị Online</p>
                    <h3 className={`text-3xl font-bold ${stats.onlinePercent > 50 ? 'text-green-600' : 'text-orange-500'}`}>
                        {stats.onlinePercent}%
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
                    <p className="text-sm text-slate-500">Cảnh báo hệ thống</p>
                    <h3 className="text-3xl font-bold text-red-500">{stats.alerts}</h3>
                </div>
            </div>

            {/* 2. Danh sách các Zone và người phụ trách */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Quản lý Khu vực (Zones)</h3>
                
                {zones.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                        Chưa có Zone nào. Hãy thêm mới!
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Tên Zone</th>
                                <th className="px-4 py-3">Mô tả</th>
                                <th className="px-4 py-3">Ngày tạo</th>
                                <th className="px-4 py-3">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Map dữ liệu từ API thật */}
                            {zones.map((zone) => (
                                <tr key={zone.id} className="border-b hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-indigo-900">{zone.name}</td>
                                    <td className="px-4 py-3 text-slate-600">{zone.description || 'Không có mô tả'}</td>
                                    {/* Giả sử API trả về field created_at */}
                                    <td className="px-4 py-3 text-slate-500">
                                        {zone.created_at ? new Date(zone.created_at).toLocaleDateString('vi-VN') : '--'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                                            Hoạt động
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminView;