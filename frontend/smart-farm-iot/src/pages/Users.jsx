import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Header from '../components/layout/Header';

const Users = () => {
    const [users, setUsers] = useState([]);
    const { isAdmin } = useAuth(); // Lấy quyền từ Context
    
    // State quản lý Modal và Form
    const [showModal, setShowModal] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'FARMER' // Mặc định chọn Farmer
    });

    // Nếu không phải admin thì chặn (dù Route đã chặn, check thêm cho chắc)
    if (!isAdmin) return <div style={{color:'red', padding:'20px'}}>Bạn không có quyền truy cập trang này.</div>;

    // Hàm tải danh sách User
    const loadUsers = async () => {
        try {
            const data = await api.users.getAll();
            if(data) setUsers(data);
        } catch (error) {
            console.error("Lỗi tải danh sách người dùng:", error);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Hàm xử lý khi bấm nút "Lưu" thêm user mới
    const handleSubmit = async () => {
        // 1. Kiểm tra dữ liệu
        if(!newUser.username || !newUser.password) {
            alert("Vui lòng nhập Tên đăng nhập và Mật khẩu!");
            return;
        }

        try {
            // 2. Gọi API tạo mới
            const result = await api.users.create(newUser);
            
            // 3. Xử lý kết quả
            if (result) {
                alert("✅ Tạo người dùng thành công!");
                setShowModal(false); // Đóng modal
                setNewUser({ username: '', password: '', full_name: '', role: 'FARMER' }); // Reset form
                loadUsers(); // Tải lại danh sách
            }
        } catch (error) {
            alert("❌ Lỗi: " + (error.response?.data?.detail || "Không thể tạo người dùng"));
        }
    };

    // ==========================================
    // TÍNH NĂNG MỚI: XỬ LÝ KHÓA / MỞ KHÓA TÀI KHOẢN
    // ==========================================
    const handleToggleLock = async (userId, currentLockStatus, role) => {
        // Chặn không cho khóa chính Admin
        const roleRaw = (role || '').toString().toLowerCase();
        if (roleRaw.includes('admin')) {
            alert("🛡️ Không thể khóa tài khoản Quản trị viên tối cao!");
            return;
        }

        const actionText = currentLockStatus ? "MỞ KHÓA" : "KHÓA";
        
        // Hiện hộp thoại xác nhận
        if (window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản này không?`)) {
            try {
                await api.users.toggleLock(userId);
                alert(`✅ Đã ${actionText} tài khoản thành công!`);
                loadUsers(); // Tải lại bảng để cập nhật icon ổ khóa ngay lập tức
            } catch (error) {
                alert("❌ Có lỗi xảy ra: " + (error.response?.data?.detail || error.message));
            }
        }
    };

    return (
        <>
            <Header title="Quản lý Người dùng" />
            
            <div style={{ padding: '20px' }}>
                {/* Nút mở Modal */}
                <Button variant="on" style={{ marginBottom: '20px' }} onClick={() => setShowModal(true)}>
                    <i className="fas fa-user-plus"></i> Thêm Người Dùng
                </Button>

                <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '12px' }}>ID</th>
                            <th style={{ padding: '12px' }}>Username</th>
                            <th style={{ padding: '12px' }}>Họ tên</th>
                            <th style={{ padding: '12px' }}>Quyền hạn</th>
                            <th style={{ padding: '12px' }}>Trạng thái</th>
                            <th style={{ padding: '12px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => {
                            const roleRaw = (u.role || '').toString().toLowerCase();
                            let roleDisplay = u.role;
                            let roleBg = '#95a5a6'; 

                            if (roleRaw.includes('admin')) {
                                roleDisplay = 'ADMIN';
                                roleBg = '#e74c3c'; 
                            } else if (roleRaw.includes('farmer')) {
                                roleDisplay = 'FARMER';
                                roleBg = '#f39c12'; 
                            }

                            const roleStyle = {
                                padding: '5px 10px', borderRadius: '15px', fontSize: '12px', 
                                color: 'white', fontWeight: 'bold', background: roleBg
                            };

                            return (
                                <tr key={u.user_id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px' }}>{u.user_id}</td>
                                    <td style={{ padding: '12px' }}><strong>{u.username}</strong></td>
                                    <td style={{ padding: '12px' }}>{u.full_name || '---'}</td>
                                    <td style={{ padding: '12px' }}><span style={roleStyle}>{roleDisplay}</span></td>
                                    
                                    {/* CỘT TRẠNG THÁI HIỂN THỊ */}
                                    <td style={{ padding: '12px' }}>
                                        {u.is_locked ? (
                                            <span style={{ color: '#e74c3c', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <i className="fas fa-lock"></i> Đã khóa
                                            </span>
                                        ) : (
                                            <span style={{ color: '#27ae60', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <i className="fas fa-unlock"></i> Hoạt động
                                            </span>
                                        )}
                                        {/* Hiển thị cảnh báo nếu đang nhập sai nửa chừng */}
                                        {u.failed_login_attempts > 0 && !u.is_locked && (
                                            <div style={{ fontSize: '11px', color: '#f39c12', marginTop: '4px', fontWeight: 'bold' }}>
                                                (Đã sai pass {u.failed_login_attempts}/5 lần)
                                            </div>
                                        )}
                                    </td>

                                    {/* CỘT NÚT BẤM THAO TÁC */}
                                    <td style={{ padding: '12px' }}>
                                        {/* Ẩn nút khóa đối với Admin */}
                                        {!roleRaw.includes('admin') && (
                                            <button 
                                                onClick={() => handleToggleLock(u.user_id, u.is_locked, u.role)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    backgroundColor: u.is_locked ? '#27ae60' : '#e74c3c',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <i className={`fas ${u.is_locked ? 'fa-key' : 'fa-ban'}`}></i>
                                                {u.is_locked ? ' Mở khóa' : ' Khóa user'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL THÊM USER (GIỮ NGUYÊN) --- */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', 
                    zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'
                }}>
                    <div className="modal-content" style={{background:'white', padding:'25px', borderRadius:'8px', width:'350px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'}}>
                        <h3 style={{marginTop:0, color:'#27ae60', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
                            <i className="fas fa-user-plus"></i> Tạo Tài Khoản
                        </h3>
                        
                        <div style={{marginBottom: '15px'}}>
                            <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Tên đăng nhập (*)</label>
                            <input 
                                type="text" 
                                value={newUser.username}
                                onChange={e => setNewUser({...newUser, username: e.target.value})}
                                style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
                            />
                        </div>

                        <div style={{marginBottom: '15px'}}>
                            <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Mật khẩu (*)</label>
                            <input 
                                type="password" 
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
                            />
                        </div>

                        <div style={{marginBottom: '15px'}}>
                            <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Họ và Tên</label>
                            <input 
                                type="text" 
                                value={newUser.full_name}
                                onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                                style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
                            />
                        </div>

                        <div style={{marginBottom: '20px'}}>
                            <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Quyền hạn (Role)</label>
                            <select 
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value})}
                                style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
                            >
                                <option value="FARMER">Nông dân (Farmer)</option>
                                <option value="ADMIN">Quản trị viên (Admin)</option>
                                <option value="TECH">Kỹ thuật viên (Tech)</option>
                                
                            </select>
                        </div>
                        
                        <div style={{textAlign:'right', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                            <Button variant="off" onClick={() => setShowModal(false)}>Hủy bỏ</Button>
                            <Button variant="on" onClick={handleSubmit}>Lưu lại</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Users;
// import React, { useEffect, useState } from 'react';
// import { api } from '../services/api';
// import { useAuth } from '../context/AuthContext';
// import Button from '../components/common/Button';
// import Header from '../components/layout/Header';

// const Users = () => {
//     const [users, setUsers] = useState([]);
//     const { isAdmin } = useAuth(); // Lấy quyền từ Context
    
//     // State quản lý Modal và Form
//     const [showModal, setShowModal] = useState(false);
//     const [newUser, setNewUser] = useState({
//         username: '',
//         password: '',
//         full_name: '',
//         role: 'FARMER' // Mặc định chọn Farmer
//     });

//     // Nếu không phải admin thì chặn (dù Route đã chặn, check thêm cho chắc)
//     if (!isAdmin) return <div style={{color:'red', padding:'20px'}}>Bạn không có quyền truy cập trang này.</div>;

//     // Hàm tải danh sách User
//     const loadUsers = async () => {
//         try {
//             const data = await api.users.getAll();
//             if(data) setUsers(data);
//         } catch (error) {
//             console.error("Lỗi tải danh sách người dùng:", error);
//         }
//     };

//     useEffect(() => {
//         loadUsers();
//     }, []);

//     // Hàm xử lý khi bấm nút "Lưu" thêm người dùng
//     const handleSubmit = async () => {
//         if(!newUser.username || !newUser.password) {
//             alert("Vui lòng nhập Tên đăng nhập và Mật khẩu!");
//             return;
//         }

//         try {
//             const result = await api.users.create(newUser);
//             if (result) {
//                 alert("✅ Tạo người dùng thành công!");
//                 setShowModal(false); 
//                 setNewUser({ username: '', password: '', full_name: '', role: 'FARMER' }); 
//                 loadUsers(); 
//             }
//         } catch (error) {
//             alert("❌ Lỗi khi tạo người dùng: " + (error.response?.data?.detail || "Vui lòng thử lại."));
//         }
//     };

//     // ==========================================
//     // TÍNH NĂNG MỚI: HÀM XỬ LÝ KHÓA / MỞ KHÓA
//     // ==========================================
//     const handleToggleLock = async (userId, username, role, currentLockStatus) => {
//         // Chặn UI không cho bấm khóa admin
//         const roleRaw = (role || '').toString().toLowerCase();
//         if (roleRaw.includes('admin')) {
//             alert("⚠️ Không thể khóa tài khoản Admin tối cao!");
//             return;
//         }

//         const actionText = currentLockStatus ? "MỞ KHÓA" : "KHÓA";
//         if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản "${username}" không?`)) {
//             return;
//         }

//         try {
//             await api.users.toggleLock(userId);
//             alert(`✅ Đã ${actionText} tài khoản ${username} thành công!`);
//             loadUsers(); // Tải lại bảng để cập nhật trạng thái mới
//         } catch (error) {
//             alert("❌ Có lỗi xảy ra: " + (error.response?.data?.detail || "Vui lòng thử lại."));
//         }
//     };

//     return (
//         <>
//             <Header title="Quản lý Người dùng" />
            
//             <div style={{ padding: '20px' }}>
//                 <Button variant="on" style={{ marginBottom: '20px' }} onClick={() => setShowModal(true)}>
//                     <i className="fas fa-user-plus"></i> Thêm Người Dùng
//                 </Button>

//                 <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
//                     <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
//                         <tr>
//                             <th style={{ padding: '12px 15px' }}>ID</th>
//                             <th style={{ padding: '12px 15px' }}>Username</th>
//                             <th style={{ padding: '12px 15px' }}>Họ tên</th>
//                             <th style={{ padding: '12px 15px' }}>Quyền hạn</th>
//                             <th style={{ padding: '12px 15px' }}>Ngày tạo</th>
//                             <th style={{ padding: '12px 15px', textAlign: 'center' }}>Trạng thái</th>
//                             <th style={{ padding: '12px 15px', textAlign: 'center' }}>Thao tác</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {users.map(u => {
//                             const roleRaw = (u.role || '').toString().toLowerCase();
//                             let roleDisplay = u.role;
//                             let roleBg = '#95a5a6'; 
//                             const isAdminUser = roleRaw.includes('admin');

//                             if (isAdminUser) {
//                                 roleDisplay = 'ADMIN';
//                                 roleBg = '#e74c3c'; 
//                             } else if (roleRaw.includes('farmer')) {
//                                 roleDisplay = 'FARMER';
//                                 roleBg = '#f39c12'; 
//                             }

//                             const roleStyle = {
//                                 padding: '5px 10px', borderRadius: '15px', fontSize: '11px', 
//                                 color: 'white', fontWeight: 'bold', background: roleBg, letterSpacing: '0.5px'
//                             };

//                             // Trạng thái Khóa / Mở
//                             const isLocked = u.is_locked;

//                             return (
//                                 <tr key={u.user_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
//                                     <td style={{ padding: '12px 15px' }}>{u.user_id}</td>
//                                     <td style={{ padding: '12px 15px' }}><strong>{u.username}</strong></td>
//                                     <td style={{ padding: '12px 15px' }}>{u.full_name || '---'}</td>
//                                     <td style={{ padding: '12px 15px' }}><span style={roleStyle}>{roleDisplay}</span></td>
//                                     <td style={{ padding: '12px 15px', fontSize: '14px', color: '#64748b' }}>
//                                         {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '---'}
//                                     </td>
                                    
//                                     {/* Cột Trạng thái */}
//                                     <td style={{ padding: '12px 15px', textAlign: 'center' }}>
//                                         {isLocked ? (
//                                             <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '13px', backgroundColor: '#fee2e2', padding: '4px 8px', borderRadius: '6px' }}>
//                                                 <i className="fas fa-lock"></i> Đã khóa
//                                             </span>
//                                         ) : (
//                                             <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '13px', backgroundColor: '#d1fae5', padding: '4px 8px', borderRadius: '6px' }}>
//                                                 <i className="fas fa-check-circle"></i> Hoạt động
//                                             </span>
//                                         )}
//                                         {/* Hiển thị thêm số lần đăng nhập sai nếu có */}
//                                         {!isLocked && u.failed_login_attempts > 0 && (
//                                             <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px', fontWeight: 'bold' }}>
//                                                 (Sai {u.failed_login_attempts}/5 lần)
//                                             </div>
//                                         )}
//                                     </td>

//                                     {/* Cột Thao tác */}
//                                     <td style={{ padding: '12px 15px', textAlign: 'center' }}>
//                                         <button 
//                                             onClick={() => handleToggleLock(u.user_id, u.username, u.role, isLocked)}
//                                             disabled={isAdminUser} // Không cho phép bấm nút với tài khoản Admin
//                                             style={{
//                                                 padding: '6px 12px',
//                                                 border: 'none',
//                                                 borderRadius: '6px',
//                                                 cursor: isAdminUser ? 'not-allowed' : 'pointer',
//                                                 fontWeight: 'bold',
//                                                 fontSize: '12px',
//                                                 color: 'white',
//                                                 backgroundColor: isAdminUser ? '#cbd5e1' : (isLocked ? '#10b981' : '#ef4444'),
//                                                 transition: 'all 0.2s'
//                                             }}
//                                             title={isAdminUser ? "Không thể khóa Admin" : (isLocked ? "Bấm để Mở khóa" : "Bấm để Khóa")}
//                                         >
//                                             {isLocked ? <><i className="fas fa-unlock"></i> Mở khóa</> : <><i className="fas fa-ban"></i> Khóa tài khoản</>}
//                                         </button>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>
//             </div>

//             {/* --- MODAL THÊM USER (Giữ nguyên) --- */}
//             {showModal && (
//                 <div className="modal-overlay" style={{
//                     position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', 
//                     zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'
//                 }}>
//                     <div className="modal-content" style={{background:'white', padding:'25px', borderRadius:'8px', width:'350px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'}}>
//                         <h3 style={{marginTop:0, color:'#27ae60', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
//                             <i className="fas fa-user-plus"></i> Tạo Tài Khoản
//                         </h3>
                        
//                         <div style={{marginBottom: '15px'}}>
//                             <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Tên đăng nhập (*)</label>
//                             <input 
//                                 type="text" 
//                                 value={newUser.username}
//                                 onChange={e => setNewUser({...newUser, username: e.target.value})}
//                                 style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
//                             />
//                         </div>

//                         <div style={{marginBottom: '15px'}}>
//                             <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Mật khẩu (*)</label>
//                             <input 
//                                 type="password" 
//                                 value={newUser.password}
//                                 onChange={e => setNewUser({...newUser, password: e.target.value})}
//                                 style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
//                             />
//                         </div>

//                         <div style={{marginBottom: '15px'}}>
//                             <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Họ và Tên</label>
//                             <input 
//                                 type="text" 
//                                 value={newUser.full_name}
//                                 onChange={e => setNewUser({...newUser, full_name: e.target.value})}
//                                 style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
//                             />
//                         </div>

//                         <div style={{marginBottom: '20px'}}>
//                             <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Quyền hạn (Role)</label>
//                             <select 
//                                 value={newUser.role}
//                                 onChange={e => setNewUser({...newUser, role: e.target.value})}
//                                 style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
//                             >
//                                 <option value="FARMER">Nông dân (Farmer)</option>
//                                 <option value="ADMIN">Quản trị viên (Admin)</option>
//                                 <option value="TECH">Kỹ thuật viên (Tech)</option>
                                
//                             </select>
//                         </div>
                        
//                         <div style={{textAlign:'right', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
//                             <Button variant="off" onClick={() => setShowModal(false)}>Hủy bỏ</Button>
//                             <Button variant="on" onClick={handleSubmit}>Lưu lại</Button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// export default Users;
// import React, { useEffect, useState } from 'react';
// import { api } from '../services/api';
// import { useAuth } from '../context/AuthContext';
// import Button from '../components/common/Button';
// import Header from '../components/layout/Header';

// const Users = () => {
//     const [users, setUsers] = useState([]);
//     const { isAdmin } = useAuth(); // Lấy quyền từ Context
    
//     // State quản lý Modal và Form
//     const [showModal, setShowModal] = useState(false);
//     const [newUser, setNewUser] = useState({
//         username: '',
//         password: '',
//         full_name: '',
//         role: 'FARMER' // Mặc định chọn Farmer
//     });

//     // Nếu không phải admin thì chặn (dù Route đã chặn, check thêm cho chắc)
//     if (!isAdmin) return <div style={{color:'red', padding:'20px'}}>Bạn không có quyền truy cập trang này.</div>;

//     // Hàm tải danh sách User
//     const loadUsers = async () => {
//         const data = await api.users.getAll();
//         if(data) setUsers(data);
//     };

//     useEffect(() => {
//         loadUsers();
//     }, []);

//     // Hàm xử lý khi bấm nút "Lưu"
//     const handleSubmit = async () => {
//         // 1. Kiểm tra dữ liệu
//         if(!newUser.username || !newUser.password) {
//             alert("Vui lòng nhập Tên đăng nhập và Mật khẩu!");
//             return;
//         }

//         // 2. Gọi API tạo mới
//         const result = await api.users.create(newUser);
        
//         // 3. Xử lý kết quả
//         if (result) {
//             alert("✅ Tạo người dùng thành công!");
//             setShowModal(false); // Đóng modal
//             setNewUser({ username: '', password: '', full_name: '', role: 'FARMER' }); // Reset form
//             loadUsers(); // Tải lại danh sách
//         }
//     };

//     return (
//         <>
//             <Header title="Quản lý Người dùng" />
            
//             <div style={{ padding: '20px' }}>
//                 {/* Nút mở Modal */}
//                 <Button variant="on" style={{ marginBottom: '20px' }} onClick={() => setShowModal(true)}>
//                     <i className="fas fa-user-plus"></i> Thêm Người Dùng
//                 </Button>

//                 <table className="data-table">
//                     <thead>
//                         <tr>
//                             <th>ID</th>
//                             <th>Username</th>
//                             <th>Họ tên</th>
//                             <th>Email</th>
//                             <th>Quyền hạn</th>
//                             <th>Ngày tạo</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {users.map(u => {
//                             // Xử lý hiển thị Role đẹp mắt
//                             // Chuyển về lowercase để so sánh cho an toàn (admin, ADMIN, Admin...)
//                             const roleRaw = (u.role || '').toString().toLowerCase();
//                             let roleDisplay = u.role;
//                             let roleBg = '#95a5a6'; // Màu xám mặc định

//                             if (roleRaw.includes('admin')) {
//                                 roleDisplay = 'ADMIN';
//                                 roleBg = '#e74c3c'; // Đỏ
//                             } else if (roleRaw.includes('farmer')) {
//                                 roleDisplay = 'FARMER';
//                                 roleBg = '#f39c12'; // Vàng cam
//                             }

//                             const roleStyle = {
//                                 padding: '5px 10px', borderRadius: '15px', fontSize: '12px', 
//                                 color: 'white', fontWeight: 'bold', background: roleBg
//                             };

//                             return (
//                                 <tr key={u.user_id}>
//                                     <td>{u.user_id}</td>
//                                     <td><strong>{u.username}</strong></td>
//                                     <td>{u.full_name || '---'}</td>
//                                     <td>{u.email || '---'}</td>
//                                     <td><span style={roleStyle}>{roleDisplay}</span></td>
//                                     <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '---'}</td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>
//             </div>

//             {/* --- MODAL THÊM USER --- */}
//             {showModal && (
//                 <div className="modal-overlay" style={{
//                     position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', 
//                     zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'
//                 }}>
//                     <div className="modal-content" style={{background:'white', padding:'25px', borderRadius:'8px', width:'350px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'}}>
//                         <h3 style={{marginTop:0, color:'#27ae60', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
//                             <i className="fas fa-user-plus"></i> Tạo Tài Khoản
//                         </h3>
                        
//                         <div style={{marginBottom: '15px'}}>
//                             <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Tên đăng nhập (*)</label>
//                             <input 
//                                 type="text" 
//                                 value={newUser.username}
//                                 onChange={e => setNewUser({...newUser, username: e.target.value})}
//                                 style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
//                             />
//                         </div>

//                         <div style={{marginBottom: '15px'}}>
//                             <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Mật khẩu (*)</label>
//                             <input 
//                                 type="password" 
//                                 value={newUser.password}
//                                 onChange={e => setNewUser({...newUser, password: e.target.value})}
//                                 style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
//                             />
//                         </div>

//                         <div style={{marginBottom: '15px'}}>
//                             <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Họ và Tên</label>
//                             <input 
//                                 type="text" 
//                                 value={newUser.full_name}
//                                 onChange={e => setNewUser({...newUser, full_name: e.target.value})}
//                                 style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
//                             />
//                         </div>

//                         <div style={{marginBottom: '20px'}}>
//                             <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Quyền hạn (Role)</label>
//                             <select 
//                                 value={newUser.role}
//                                 onChange={e => setNewUser({...newUser, role: e.target.value})}
//                                 style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'4px'}}
//                             >
//                                 <option value="FARMER">Nông dân (Farmer)</option>
//                                 <option value="ADMIN">Quản trị viên (Admin)</option>
//                                 <option value="TECH">Kỹ thuật viên (Tech)</option>
                                
//                             </select>
//                         </div>
                        
//                         <div style={{textAlign:'right', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
//                             <Button variant="off" onClick={() => setShowModal(false)}>Hủy bỏ</Button>
//                             <Button variant="on" onClick={handleSubmit}>Lưu lại</Button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// export default Users;
// import React, { useEffect, useState } from 'react';
// import { api } from '../services/api';
// import { useAuth } from '../context/AuthContext';
// import Button from '../components/common/Button';
// import Header from '../components/layout/Header';

// const Users = () => {
//     const [users, setUsers] = useState([]);
//     const { isAdmin } = useAuth(); // Lấy quyền từ Context

//     // Nếu không phải admin thì return null hoặc thông báo (Dù Route đã chặn, nhưng check thêm cho chắc)
//     if (!isAdmin) return <div style={{color:'red', padding:'20px'}}>Bạn không có quyền truy cập trang này.</div>;

//     useEffect(() => {
//         api.users.getAll().then(data => {
//             if(data) setUsers(data);
//         });
//     }, []);

//     return (
//         <>
//             <Header title="Quản lý Người dùng" />
            
//             <div style={{ padding: '20px' }}>
//                 {/* Nút thêm user (Có thể làm Modal sau) */}
//                 <Button variant="on" style={{ marginBottom: '20px' }}>
//                     <i className="fas fa-user-plus"></i> Thêm Người Dùng
//                 </Button>

//                 <table className="data-table">
//                     <thead>
//                         <tr>
//                             <th>ID</th>
//                             <th>Username</th>
//                             <th>Họ tên</th>
//                             <th>Email</th>
//                             <th>Quyền hạn</th>
//                             <th>Ngày tạo</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {users.map(u => {
//                             const roleClass = (u.role || '').toLowerCase() === 'admin' ? 'role-admin' : 'role-farmer';
//                             const roleStyle = {
//                                 padding: '5px 10px', borderRadius: '15px', fontSize: '12px', color: 'white', fontWeight: 'bold',
//                                 background: roleClass === 'role-admin' ? '#e74c3c' : '#f39c12'
//                             };

//                             return (
//                                 <tr key={u.user_id}>
//                                     <td>{u.user_id}</td>
//                                     <td><strong>{u.username}</strong></td>
//                                     <td>{u.full_name}</td>
//                                     <td>{u.email}</td>
//                                     <td><span style={roleStyle}>{u.role}</span></td>
//                                     <td>{new Date(u.created_at).toLocaleDateString()}</td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>
//             </div>
//         </>
//     );
// };

// export default Users;