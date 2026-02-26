import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const { logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        if (window.confirm("Bạn muốn đăng xuất?")) {
            logout();
            navigate('/login');
        }
    };

    return (
        <nav className="sidebar">
            <div className="logo">
                <h3>🌱 Smart Farm</h3>
            </div>
            <ul>
                <li>
                    <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>
                        <i className="fas fa-home"></i> Trang Chủ
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/zones" className={({ isActive }) => isActive ? "active" : ""}>
                        <i className="fas fa-layer-group"></i> Quản lý Zone
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/devices" className={({ isActive }) => isActive ? "active" : ""}>
                        <i className="fas fa-microchip"></i> Thiết bị IoT
                    </NavLink>
                </li>
                
                {/* Chỉ hiển thị menu Người dùng nếu là Admin */}
                {isAdmin && (
                    <li>
                        <NavLink to="/users" className={({ isActive }) => isActive ? "active" : ""}>
                            <i className="fas fa-users"></i> Người dùng
                        </NavLink>
                    </li>
                )}

                <li onClick={handleLogout} className="logout" style={{ cursor: 'pointer' }}>
                    <i className="fas fa-sign-out-alt"></i> Đăng xuất
                </li>
            </ul>
        </nav>
    );
};

export default Sidebar;