import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Nhớ check đường dẫn này

const FarmerRoute = () => {
    const { user } = useAuth();

    // In ra console để xem Backend thực sự trả về role chữ gì
    console.log("Quyền của user hiện tại là:", user?.role);

    // Dùng .toLowerCase() để phòng hờ DB trả về 'FARMER', 'Farmer' hay 'farmer' đều qua được hết
    const isFarmer = user?.role?.toLowerCase() === 'farmer';

    // Nếu đúng nông dân thì mở cửa (Outlet), sai thì đá về '/'
    return isFarmer ? <Outlet /> : <Navigate to="/" replace />;
};

export default FarmerRoute;