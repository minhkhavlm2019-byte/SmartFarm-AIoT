import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import Button from '../common/Button';

const Header = ({ title }) => {
    const { user, updateUser } = useAuth();
    
    // State cho Modal và Form
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '' // Mật khẩu mới
    });

    // Mở Modal và điền sẵn tên hiện tại
    const handleOpenModal = () => {
        setFormData({
            full_name: user?.name || '', // Lấy tên từ Context
            email: '', // Email nên gọi API lấy chi tiết nếu cần, tạm thời để trống
            password: ''
        });
        setShowModal(true);
    };

    const handleUpdate = async () => {
        // Gọi API
        const payload = {
            full_name: formData.full_name,
            email: formData.email,
            password: formData.password || null // Nếu rỗng thì gửi null để không đổi pass
        };

        try {
            const updatedUser = await api.users.updateProfile(payload);
            if (updatedUser) {
                alert("✅ Cập nhật thông tin thành công!");
                
                // Cập nhật lại Context để Header hiển thị tên mới ngay lập tức
                updateUser({ name: updatedUser.full_name });
                
                setShowModal(false);
            }
        } catch (error) {
            alert("Lỗi cập nhật: " + error.message);
        }
    };

    return (
        <>
            <header>
                <h2>{title || "Tổng quan Hệ thống"}</h2>
                
                <div className="user-info">
                    Xin chào, 
                    {/* Bấm vào tên để mở Modal */}
                    <span 
                        onClick={handleOpenModal} 
                        style={{ fontWeight: 'bold', color: '#27ae60', cursor: 'pointer', marginLeft: '5px', textDecoration: 'underline' }}
                        title="Bấm để sửa thông tin"
                    >
                        {user?.name || 'User'}
                    </span>
                </div>
            </header>

            {/* --- MODAL CHỈNH SỬA THÔNG TIN --- */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', 
                    zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'
                }}>
                    <div style={{background:'white', padding:'25px', borderRadius:'8px', width:'350px'}}>
                        <h3 style={{marginTop:0, color:'#3498db'}}>Cập nhật Hồ sơ</h3>
                        
                        <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>Họ và Tên:</label>
                        <input 
                            type="text" 
                            value={formData.full_name}
                            onChange={e => setFormData({...formData, full_name: e.target.value})}
                            style={{width:'100%', padding:'8px', marginBottom:'15px'}}
                        />

                        <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>Email:</label>
                        <input 
                            type="email" 
                            placeholder="Nhập email mới..."
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            style={{width:'100%', padding:'8px', marginBottom:'15px'}}
                        />

                        <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>Đổi Mật khẩu (Tùy chọn):</label>
                        <input 
                            type="password" 
                            placeholder="Để trống nếu không muốn đổi"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            style={{width:'100%', padding:'8px', marginBottom:'15px', border:'1px solid #ccc'}}
                        />

                        <div style={{textAlign:'right', display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                            <Button variant="off" onClick={() => setShowModal(false)}>Hủy</Button>
                            <Button variant="on" onClick={handleUpdate}>Cập nhật</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
// import React from 'react';
// import { useAuth } from '../../context/AuthContext';

// const Header = ({ title }) => {
//     const { user } = useAuth();

//     return (
//         <header>
//             {/* Title có thể thay đổi tùy trang truyền vào */}
//             <h2>{title || "Tổng quan Hệ thống"}</h2>
            
//             <div className="user-info">
//                 Xin chào, <span id="display-name" style={{ fontWeight: 'bold', color: '#27ae60' }}>
//                     {user?.name || 'Admin'}
//                 </span>
//             </div>
//         </header>
//     );
// };

// export default Header;