// src/components/routes/TechRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const TechRoute = () => {
    // Lấy role từ localStorage (hoặc Context/Redux tùy hệ thống của bạn)
    const userRole = localStorage.getItem('user_role');
    
    // Nếu role đúng là 'technology', cho phép đi tiếp (Outlet render các component con)
    // Nếu không, đá về trang chủ (hoặc trang báo lỗi 403 Không có quyền)
    const isTech = userRole === 'TECH';

    // Nếu đúng là TECH thì mở cửa cho đi tiếp (Outlet), sai thì đá về '/'
    return isTech ? <Outlet /> : <Navigate to="/" replace />;
};

export default TechRoute;