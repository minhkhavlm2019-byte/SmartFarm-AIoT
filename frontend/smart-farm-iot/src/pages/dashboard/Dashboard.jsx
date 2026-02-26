import React from 'react';
import { useAuth } from '../../context/AuthContext';

// 👇 LƯU Ý: Kiểm tra đường dẫn MainLayout của bạn
// Nếu bạn đã chuyển file theo hướng dẫn Clean Architecture thì dùng dòng dưới:
import MainLayout from '../../layouts/MainLayout'; 
// Nếu bạn vẫn để file ở thư mục cũ thì dùng dòng này: import MainLayout from '../../layouts/MainLayout';

// Import 3 giao diện con (Đảm bảo 3 file này nằm cùng thư mục với Dashboard.jsx)
import AdminView from './AdminView';
import TechView from './TechView';
import FarmerView from './FarmerView';
import TechDashboard from '../tech/TechDashboard'

const Dashboard = () => {
    const { user } = useAuth();

    // 1. Màn hình chờ khi chưa tải xong User (Tránh lỗi màn hình trắng)
    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">Đang tải dữ liệu người dùng...</p>
                </div>
            </div>
        );
    }

    // 2. Chuẩn hóa Role (Xử lý việc viết hoa/thường và khoảng trắng thừa)
    // Ví dụ: "ADMIN " -> "admin"
    const rawRole = user.role;
    const role = String(rawRole || '').trim().toLowerCase(); 

    // 👉 In ra Console để kiểm tra (Nhấn F12 -> Console)
    console.log("🔍 [DASHBOARD DEBUG]");
    console.log("   - User Name:", user.username || user.full_name);
    console.log("   - Raw Role (Server):", rawRole);
    console.log("   - Normalized Role (Logic):", role);

    // 3. Hàm quyết định hiển thị View nào
    const renderContent = () => {
        switch (role) {
            // --- TRƯỜNG HỢP ADMIN ---
            case 'admin':
            case 'administrator':
            case 'quan_tri':
                return <AdminView />;

            // --- TRƯỜNG HỢP KỸ THUẬT ---
            case 'tech':
            case 'technician':
            case 'ky_thuat':
                return <TechDashboard user={user} />;

            // --- TRƯỜNG HỢP NÔNG DÂN ---
            case 'farmer':
            case 'nong_dan':
            case 'user': // Mặc định user thường là nông dân
                return <FarmerView user={user} />;

            // --- TRƯỜNG HỢP LỖI (Role lạ) ---
            default:
                return (
                    <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 mb-4">
                            <i className="fas fa-user-lock text-2xl"></i>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Không xác định được quyền hạn</h3>
                        <p className="text-slate-500 mb-6">
                            Hệ thống không tìm thấy giao diện phù hợp cho tài khoản của bạn.
                        </p>
                        <div className="inline-block text-left bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm font-mono text-slate-600">
                            <p><strong>Username:</strong> {user.username}</p>
                            <p><strong>Received Role:</strong> "{rawRole}"</p>
                            <p><strong>Normalized:</strong> "{role}"</p>
                        </div>
                    </div>
                );
        }
    };

    // 4. Tạo tiêu đề động
    const getPageTitle = () => {
        if (role === 'admin') return 'Trung tâm Quản trị';
        if (role === 'tech') return 'Khu vực Kỹ thuật';
        return 'Theo dõi Vườn trồng';
    };

    return (
        <div className="w-full">
            {renderContent()}
        </div>
    );
};

export default Dashboard;
