import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
    return (
        // Sử dụng class .login-container từ file css cũ để căn giữa
        <div className="login-container">
            {/* Outlet sẽ hiển thị Login.jsx */}
            <Outlet />
        </div>
    );
};

export default AuthLayout;