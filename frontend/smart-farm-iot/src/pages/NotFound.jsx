import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1 style={{ fontSize: '72px', color: '#e74c3c' }}>404</h1>
            <h2>Không tìm thấy trang</h2>
            <p>Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
            <Link to="/" style={{ color: '#27ae60', textDecoration: 'none', fontWeight: 'bold' }}>
                <i className="fas fa-arrow-left"></i> Quay về Trang chủ
            </Link>
        </div>
    );
};

export default NotFound;