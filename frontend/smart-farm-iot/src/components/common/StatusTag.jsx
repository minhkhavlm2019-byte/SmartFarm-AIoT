import React from 'react';

/**
 * StatusTag Component
 * @param {string} status - Trạng thái: 'ONLINE', 'OFFLINE', 'ACTIVE'...
 */
const StatusTag = ({ status }) => {
    // Chuẩn hóa input về chữ hoa để so sánh
    const safeStatus = (status || 'UNKNOWN').toUpperCase();
    
    // Xác định class màu sắc
    // 'online' -> Xanh lá (trong CSS)
    // 'offline' -> Đỏ (trong CSS)
    const isOnline = safeStatus === 'ONLINE' || safeStatus === 'ACTIVE' || safeStatus === 'HOẠT ĐỘNG';
    const className = isOnline ? 'online' : 'offline';

    return (
        <span className={`tag ${className}`}>
            {status || '---'}
        </span>
    );
};

export default StatusTag;