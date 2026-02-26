import React from 'react';

/**
 * Button Component
 * @param {string} variant - Loại nút: 'primary' (xanh lá), 'danger' (đỏ), 'login' (mặc định)
 * @param {boolean} isAdminOnly - Nếu true, chỉ Admin mới thấy nút này
 * @param {function} onClick - Hàm xử lý khi click
 */
const Button = ({ 
    children, 
    onClick, 
    variant = 'primary', 
    className = '', 
    isAdminOnly = false,
    disabled = false,
    ...props 
}) => {
    // Logic kiểm tra quyền Admin ngay tại nút bấm
    const role = localStorage.getItem('user_role');
    if (isAdminOnly && role !== 'admin') {
        return null; // Không render gì cả nếu không có quyền
    }

    // Map variant sang class CSS tương ứng trong file index.css
    let baseClass = 'btn-login'; // Class mặc định
    if (variant === 'primary' || variant === 'on') baseClass = 'btn-on';
    if (variant === 'danger' || variant === 'off') baseClass = 'btn-off';
    if (variant === 'sm') baseClass = 'btn-sm'; // Nút nhỏ

    return (
        <button 
            className={`${baseClass} ${className}`} 
            onClick={onClick} 
            disabled={disabled}
            style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;