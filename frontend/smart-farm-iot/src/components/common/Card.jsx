import React from 'react';

/**
 * Card Component (Dashboard Stats)
 * @param {string} title - Tiêu đề (VD: Nhiệt độ TB)
 * @param {string|number} value - Giá trị hiển thị
 * @param {string} icon - Class icon FontAwesome (VD: 'fas fa-thermometer-half')
 * @param {string} color - Màu của Icon
 */
const Card = ({ title, value, icon, color }) => {
    return (
        <div className="card">
            <i 
                className={icon} 
                style={{ color: color || '#333', fontSize: '24px', marginBottom: '10px' }}
            ></i>
            <h3>{title}</h3>
            <p className="value">{value}</p>
        </div>
    );
};

export default Card;