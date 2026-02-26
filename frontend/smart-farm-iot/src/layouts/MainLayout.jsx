import React, { useState } from 'react';
// 👇 1. IMPORT Outlet
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const MainLayout = ({ title }) => { 
    const { user, logout, updateUser, isAdmin } = useAuth();
    const isTech = user?.role === 'TECH';
    const isFarmer = user?.role === 'FARMER';
    const location = useLocation();
    const navigate = useNavigate();

    // --- LOGIC MODAL PROFILE ---
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: ''
    });

    // --- LOGIC MODAL ĐĂNG XUẤT (MỚI) ---
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleOpenModal = () => {
        setFormData({
            full_name: user?.full_name || user?.name || '', 
            email: user?.email || '', 
            password: ''
        });
        setShowModal(true);
    };

    const handleUpdate = async () => {
        try {
            const payload = {
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password || null
            };
            const updatedUser = await api.users.updateProfile(payload);
            if (updatedUser) {
                alert("✅ Cập nhật thông tin thành công!");
                updateUser({ ...user, full_name: updatedUser.full_name, email: updatedUser.email });
                setShowModal(false);
            }
        } catch (error) {
            alert("Lỗi cập nhật: " + error.message);
        }
    };

    // --- CÁC HÀM XỬ LÝ ĐĂNG XUẤT ---
    const handleLogoutClick = () => {
        setShowLogoutModal(true); // Chỉ mở modal, chưa đăng xuất
    };

    const confirmLogout = () => {
        setShowLogoutModal(false);
        logout();
        navigate('/login');
    };

    const cancelLogout = () => {
        setShowLogoutModal(false);
    };

    const isActive = (path) => location.pathname === path 
        ? "bg-white/10 text-white shadow-sm border border-white/5" 
        : "text-emerald-100 hover:bg-white/5 hover:text-white";

    if (!user) return null;

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-50">
            
            {/* ================= SIDEBAR ================= */}
            <aside className="w-80 bg-gradient-to-b from-emerald-900 to-teal-900 text-white flex flex-col shadow-2xl z-20 transition-all duration-300 hidden md:flex">
                {/* Logo */}
                <Link to="/" className="h-24 flex items-center px-8 border-b border-white/10 hover:bg-white/5 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg mr-4">
                        <i className="fas fa-leaf text-xl text-white"></i>
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Lettuce<span className="text-emerald-300">IoT</span></h1>
                        <p className="text-[10px] uppercase tracking-widest text-emerald-200/80 font-bold">Smart Farm</p>
                    </div>
                </Link>

                {/* Menu Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
                    {isFarmer && (
                        <>
                            {/* NHÓM: TỔNG QUAN */}
                            <p className="px-4 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2">Tổng quan</p>
                            <Link to="/farmer/dashboard" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/farmer/dashboard')}`}>
                                <i className="fas fa-home w-6 text-slate-400 group-hover:text-emerald-500"></i> 
                                <span className="font-medium ml-3">Tổng quan Nông trại</span>
                            </Link>
                            <Link to="/farmer/weather" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/farmer/weather')}`}>
                                <i className="fas fa-cloud-sun w-6 text-slate-400 group-hover:text-emerald-500"></i> 
                                <span className="font-medium ml-3">Thời tiết</span>
                            </Link>

                            {/* NHÓM: NGHIỆP VỤ */}
                            <p className="px-4 text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 mt-6">Nghiệp vụ</p>
                            <Link to="/farmer/monitor" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/farmer/monitor')}`}>
                                <i className="fas fa-chart-line w-6 text-slate-400 group-hover:text-emerald-500"></i> 
                                <span className="font-medium ml-3">Giám sát</span>
                            </Link>
                            <Link to="/farmer/control" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/farmer/control')}`}>
                                <i className="fas fa-gamepad w-6 text-slate-400 group-hover:text-emerald-500"></i> 
                                <span className="font-medium ml-3">Điều khiển</span>
                            </Link>
                            <Link to="/farmer/history" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/farmer/history')}`}>
                                <i className="fas fa-history w-6 text-slate-400 group-hover:text-emerald-500"></i> 
                                <span className="font-medium ml-3">Nhật ký Tưới tiêu</span>
                            </Link>
                        </>
                    )}
                    {isTech && (
                        <>
                            <p className="px-4 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2 mt-2">Nghiệp vụ Kỹ thuật</p>
                            <Link to="/tech/devices" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/tech/dashboard')}`}>
                                <i className="fas fa-desktop w-6"></i> <span className="font-medium ml-3">Bảng Kỹ Thuật</span>
                            </Link>
                            <Link to="/tech/zones" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/tech/zones')}`}>
                                <i className="fas fa-network-wired w-6"></i> <span className="font-medium ml-3">Khu vực phụ trách</span>
                            </Link>
                            <Link to="/tech/logs" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/tech/logs')}`}>
                                <i className="fas fa-terminal w-6 text-slate-400 group-hover:text-emerald-600"></i> <span className="font-medium ml-3">Nhật ký Hệ thống</span>
                            </Link>
                        </>
                    )}
                    {isAdmin && (
                        <>
                            <Link to="/" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/')}`}>
                                <i className="fas fa-home w-6 text-slate-400 group-hover:text-emerald-500"></i> 
                                <span className="font-medium ml-3">Tổng quan</span>
                            </Link>
                            <p className="px-4 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2 mt-6">Quản trị</p>
                            <Link to="/users" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/users')}`}>
                                <i className="fas fa-users-cog w-6"></i> <span className="font-medium ml-3">Người dùng</span>
                            </Link>
                            <Link to="/admin/devices" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/admin/devices')}`}>
                                <i className="fas fa-microchip w-6"></i> <span className="font-medium ml-3">Thiết bị</span>
                            </Link>
                            <Link to="/admin/zones" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/admin/zones')}`}>
                                <i className="fas fa-layer-group w-6"></i> <span className="font-medium ml-3">Khu vực</span>
                            </Link>
                            <Link to="/admin/reports" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/admin/reports')}`}>
                                <i className="fas fa-chart-pie w-6"></i> <span className="font-medium ml-3">Báo cáo & Thống kê</span>
                            </Link>
                        </>
                    )}
                </nav>

                {/* Footer User Profile */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center justify-between bg-emerald-800/50 p-3 rounded-xl border border-white/5">
                        <div onClick={handleOpenModal} className="flex items-center flex-1 group cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="ml-3 overflow-hidden">
                                <p className="text-sm font-semibold text-white group-hover:text-emerald-200 transition-colors truncate w-24">
                                    {user.full_name || user.username}
                                </p>
                                <p className="text-xs text-emerald-300 group-hover:underline">Sửa hồ sơ</p>
                            </div>
                        </div>
                        {/* ĐÃ ĐỔI: Gọi handleLogoutClick thay vì handleLogout */}
                        <button onClick={handleLogoutClick} className="pl-3 ml-2 border-l border-white/10 text-emerald-300 hover:text-red-400 transition-colors">
                            <i className="fas fa-sign-out-alt text-lg"></i>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ================= MAIN CONTENT ================= */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Header Mobile & Title */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10 sticky top-0 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{title || 'Hệ thống quản lý'}</h2>
                        <p className="text-sm text-slate-500">Giám sát & Điều khiển thời gian thực</p>
                    </div>
                    {/* Nút menu mobile (nếu cần phát triển sau) */}
                    <div className="md:hidden text-emerald-600 text-xl"><i className="fas fa-bars"></i></div>
                </header>

                {/* Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-slate-50 relative">
                    {/* 👇 2. ĐẶT Outlet Ở ĐÂY */}
                    {/* Outlet sẽ hiển thị nội dung của Dashboard, Devices, Zones... tùy theo URL */}
                    <Outlet /> 
                </div>
            </main>

            {/* ================= MODAL EDIT PROFILE ================= */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform scale-100 transition-all">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Cập nhật Hồ sơ</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Họ và tên</label>
                                <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu mới (Tùy chọn)</label>
                                <input type="password" placeholder="Để trống nếu không đổi" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold transition-all">Hủy bỏ</button>
                            <button onClick={handleUpdate} className="px-4 py-2 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg transition-all">Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL XÁC NHẬN ĐĂNG XUẤT ================= */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-4 transform transition-all scale-100">
                        
                        {/* Icon và Tiêu đề */}
                        <div className="text-center mb-6 mt-2">
                            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
                                <i className="fas fa-sign-out-alt"></i>
                            </div>
                            <h3 className="text-xl font-black text-slate-800">Xác nhận đăng xuất</h3>
                            <p className="text-slate-500 font-medium mt-2 text-sm">
                                Bạn có chắc chắn muốn thoát khỏi phiên làm việc hiện tại không?
                            </p>
                        </div>
                        
                        {/* 2 Nút bấm */}
                        <div className="flex gap-3">
                            <button
                                onClick={cancelLogout}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-rose-200"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MainLayout;
// import React, { useState } from 'react';
// // 👇 1. IMPORT Outlet
// import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { api } from '../services/api';

// const MainLayout = ({ title }) => { 
//     const { user, logout, updateUser, isAdmin } = useAuth();
//     const isTech = user?.role === 'TECH';
//     const isFarmer = user?.role === 'FARMER';
//     const location = useLocation();
//     const navigate = useNavigate();

//     // --- LOGIC MODAL PROFILE ---
//     const [showModal, setShowModal] = useState(false);
//     const [formData, setFormData] = useState({
//         full_name: '',
//         email: '',
//         password: ''
//     });

//     const handleOpenModal = () => {
//         setFormData({
//             full_name: user?.full_name || user?.name || '', 
//             email: user?.email || '', 
//             password: ''
//         });
//         setShowModal(true);
//     };

//     const handleUpdate = async () => {
//         try {
//             const payload = {
//                 full_name: formData.full_name,
//                 email: formData.email,
//                 password: formData.password || null
//             };
//             const updatedUser = await api.users.updateProfile(payload);
//             if (updatedUser) {
//                 alert("✅ Cập nhật thông tin thành công!");
//                 updateUser({ ...user, full_name: updatedUser.full_name, email: updatedUser.email });
//                 setShowModal(false);
//             }
//         } catch (error) {
//             alert("Lỗi cập nhật: " + error.message);
//         }
//     };

//     const handleLogout = () => {
//         if (window.confirm("Bạn muốn đăng xuất?")) {
//             logout();
//             navigate('/login');
//         }
//     };

//     const isActive = (path) => location.pathname === path 
//         ? "bg-white/10 text-white shadow-sm border border-white/5" 
//         : "text-emerald-100 hover:bg-white/5 hover:text-white";

//     if (!user) return null;

//     return (
//         <div className="flex h-screen w-full overflow-hidden bg-slate-50">
            
//             {/* ================= SIDEBAR ================= */}
//             <aside className="w-80 bg-gradient-to-b from-emerald-900 to-teal-900 text-white flex flex-col shadow-2xl z-20 transition-all duration-300 hidden md:flex">
//                 {/* Logo */}
//                 <Link to="/" className="h-24 flex items-center px-8 border-b border-white/10 hover:bg-white/5 transition-all">
//                     <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg mr-4">
//                         <i className="fas fa-leaf text-xl text-white"></i>
//                     </div>
//                     <div>
//                         <h1 className="text-2xl font-extrabold tracking-tight">Lettuce<span className="text-emerald-300">IoT</span></h1>
//                         <p className="text-[10px] uppercase tracking-widest text-emerald-200/80 font-bold">Smart Farm</p>
//                     </div>
//                 </Link>

//                 {/* Menu Navigation */}
//                 <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
//                    {/* <p className="px-4 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2">Tổng quan</p>
                    
//                      1. Dashboard (Giám sát) *
//                     <Link to="/" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/')}`}>
//                         <i className="fas fa-chart-pie w-6"></i> <span className="font-medium ml-3">Giám sát</span>
//                     </Link>

//                     {/* 2. Điều khiển (Mới cập nhật) 
//                     <Link to="/devices" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/devices')}`}>
//                         <i className="fas fa-gamepad w-6"></i> <span className="font-medium ml-3">Điều khiển</span>
//                     </Link>

//                     {/* 3. Khu vực (Zone) 
//                     <Link to="/zones" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/zones')}`}>
//                         <i className="fas fa-map-marked-alt w-6"></i> <span className="font-medium ml-3">Khu vực (Zone)</span>
//                     </Link>

//                     {/* Các mục khác giữ nguyên nếu cần */}
//                     {/* <Link to="/weather" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/weather')}`}>
//                         <i className="fas fa-cloud-sun w-6"></i> <span className="font-medium ml-3">Thời tiết</span>
//                     </Link> */}
//                     {isFarmer && (
//                         <>
//                             {/* NHÓM: TỔNG QUAN */}
//                             <p className="px-4 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2">Tổng quan</p>
//                             <Link to="/farmer/dashboard" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/farmer/dashboard')}`}>
//                                 <i className="fas fa-home w-6 text-slate-400 group-hover:text-emerald-500"></i> 
//                                 <span className="font-medium ml-3">Tổng quan Nông trại</span>
//                             </Link>
//                             <Link to="/farmer/weather" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/farmer/weather')}`}>
//                                 <i className="fas fa-cloud-sun w-6 text-slate-400 group-hover:text-emerald-500"></i> 
//                                 <span className="font-medium ml-3">Thời tiết</span>
//                             </Link>

//                             {/* NHÓM: NGHIỆP VỤ */}
//                             <p className="px-4 text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 mt-6">Nghiệp vụ</p>
//                             <Link to="/farmer/monitor" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/farmer/monitor')}`}>
//                                 <i className="fas fa-chart-line w-6 text-slate-400 group-hover:text-emerald-500"></i> 
//                                 <span className="font-medium ml-3">Giám sát</span>
//                             </Link>
//                             <Link to="/farmer/control" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/farmer/control')}`}>
//                                 <i className="fas fa-gamepad w-6 text-slate-400 group-hover:text-emerald-500"></i> 
//                                 <span className="font-medium ml-3">Điều khiển</span>
//                             </Link>
//                             <Link to="/farmer/history" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/farmer/history')}`}>
//                                 <i className="fas fa-history w-6 text-slate-400 group-hover:text-emerald-500"></i> 
//                                 <span className="font-medium ml-3">Nhật ký Tưới tiêu</span>
//                             </Link>
//                         </>
//                     )}
//                     {isTech && (
//                         <>
//                             <p className="px-4 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2 mt-2">Nghiệp vụ Kỹ thuật</p>
//                             <Link to="/tech/devices" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/tech/dashboard')}`}>
//                                 <i className="fas fa-desktop w-6"></i> <span className="font-medium ml-3">Bảng Kỹ Thuật</span>
//                             </Link>
//                             <Link to="/tech/zones" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/tech/zones')}`}>
//                                 <i className="fas fa-network-wired w-6"></i> <span className="font-medium ml-3">Khu vực phụ trách</span>
//                             </Link>
//                             <Link to="/tech/logs" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/tech/logs')}`}>
//                                 <i className="fas fa-terminal w-6 text-slate-400 group-hover:text-emerald-600"></i> <span className="font-medium ml-3">Nhật ký Hệ thống</span>
//                             </Link>
//                         </>
//                     )}
//                     {isAdmin && (
//                         <>
//                             <p className="px-4 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2 mt-6">Quản trị</p>
//                             <Link to="/users" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/users')}`}>
//                                 <i className="fas fa-users-cog w-6"></i> <span className="font-medium ml-3">Người dùng</span>
//                             </Link>
//                             <Link to="/admin/devices" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/admin/devices')}`}>
//                                 <i className="fas fa-microchip w-6"></i> <span className="font-medium ml-3">Thiết bị</span>
//                             </Link>
//                             <Link to="/admin/zones" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/admin/zones')}`}>
//                                 <i className="fas fa-layer-group w-6"></i> <span className="font-medium ml-3">Khu vực</span>
//                             </Link>
//                             <Link to="/admin/reports" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/admin/reports')}`}>
//                                 <i className="fas fa-chart-pie w-6"></i> <span className="font-medium ml-3">Báo cáo & Thống kê</span>
//                             </Link>
//                         </>
//                     )}
//                 </nav>

//                 {/* Footer User Profile */}
//                 <div className="p-4 border-t border-white/10">
//                     <div className="flex items-center justify-between bg-emerald-800/50 p-3 rounded-xl border border-white/5">
//                         <div onClick={handleOpenModal} className="flex items-center flex-1 group cursor-pointer">
//                             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
//                                 {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
//                             </div>
//                             <div className="ml-3 overflow-hidden">
//                                 <p className="text-sm font-semibold text-white group-hover:text-emerald-200 transition-colors truncate w-24">
//                                     {user.full_name || user.username}
//                                 </p>
//                                 <p className="text-xs text-emerald-300 group-hover:underline">Sửa hồ sơ</p>
//                             </div>
//                         </div>
//                         <button onClick={handleLogout} className="pl-3 ml-2 border-l border-white/10 text-emerald-300 hover:text-red-400 transition-colors">
//                             <i className="fas fa-sign-out-alt text-lg"></i>
//                         </button>
//                     </div>
//                 </div>
//             </aside>

//             {/* ================= MAIN CONTENT ================= */}
//             <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
//                 {/* Header Mobile & Title */}
//                 <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10 sticky top-0 shadow-sm">
//                     <div>
//                         <h2 className="text-xl font-bold text-slate-800">{title || 'Hệ thống quản lý'}</h2>
//                         <p className="text-sm text-slate-500">Giám sát & Điều khiển thời gian thực</p>
//                     </div>
//                     {/* Nút menu mobile (nếu cần phát triển sau) */}
//                     <div className="md:hidden text-emerald-600 text-xl"><i className="fas fa-bars"></i></div>
//                 </header>

//                 {/* Content Scrollable Area */}
//                 <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-slate-50 relative">
//                     {/* 👇 2. ĐẶT Outlet Ở ĐÂY */}
//                     {/* Outlet sẽ hiển thị nội dung của Dashboard, Devices, Zones... tùy theo URL */}
//                     <Outlet /> 
//                 </div>
//             </main>

//             {/* Modal Edit Profile */}
//             {showModal && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
//                     <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform scale-100 transition-all">
//                         <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Cập nhật Hồ sơ</h3>
//                         <div className="space-y-4">
//                             <div>
//                                 <label className="block text-sm font-bold text-slate-700 mb-1">Họ và tên</label>
//                                 <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
//                                 <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu mới (Tùy chọn)</label>
//                                 <input type="password" placeholder="Để trống nếu không đổi" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
//                             </div>
//                         </div>
//                         <div className="flex justify-end gap-3 mt-6">
//                             <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold transition-all">Hủy bỏ</button>
//                             <button onClick={handleUpdate} className="px-4 py-2 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg transition-all">Lưu thay đổi</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default MainLayout;
// import React, { useState } from 'react';
// // 👇 1. THÊM Outlet VÀO ĐÂY
// import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { api } from '../services/api';

// const MainLayout = ({ title }) => { // Bỏ props children vì không dùng nữa
//     const { user, logout, updateUser, isAdmin } = useAuth();
//     const location = useLocation();
//     const navigate = useNavigate();

//     // --- LOGIC MODAL PROFILE ---
//     const [showModal, setShowModal] = useState(false);
//     const [formData, setFormData] = useState({
//         full_name: '',
//         email: '',
//         password: ''
//     });

//     const handleOpenModal = () => {
//         setFormData({
//             full_name: user?.full_name || user?.name || '', 
//             email: user?.email || '', 
//             password: ''
//         });
//         setShowModal(true);
//     };

//     const handleUpdate = async () => {
//         try {
//             const payload = {
//                 full_name: formData.full_name,
//                 email: formData.email,
//                 password: formData.password || null
//             };
//             const updatedUser = await api.users.updateProfile(payload);
//             if (updatedUser) {
//                 alert("✅ Cập nhật thông tin thành công!");
//                 updateUser({ ...user, full_name: updatedUser.full_name, email: updatedUser.email });
//                 setShowModal(false);
//             }
//         } catch (error) {
//             alert("Lỗi cập nhật: " + error.message);
//         }
//     };

//     const handleLogout = () => {
//         if (window.confirm("Bạn muốn đăng xuất?")) {
//             logout();
//             navigate('/login');
//         }
//     };

//     const isActive = (path) => location.pathname === path 
//         ? "bg-white/10 text-white shadow-sm border border-white/5" 
//         : "text-emerald-100 hover:bg-white/5 hover:text-white";

//     if (!user) return null;

//     return (
//         <div className="flex h-screen w-full overflow-hidden bg-slate-50">
            
//             {/* ================= SIDEBAR ================= */}
//             <aside className="w-80 bg-gradient-to-b from-emerald-900 to-teal-900 text-white flex flex-col shadow-2xl z-20 transition-all duration-300 hidden md:flex">
//                 {/* Logo */}
//                 <Link to="/" className="h-24 flex items-center px-8 border-b border-white/10 hover:bg-white/5 transition-all">
//                     <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg mr-4">
//                         <i className="fas fa-leaf text-xl text-white"></i>
//                     </div>
//                     <div>
//                         <h1 className="text-2xl font-extrabold tracking-tight">Lettuce<span className="text-emerald-300">IoT</span></h1>
//                         <p className="text-[10px] uppercase tracking-widest text-emerald-200/80 font-bold">Smart Farm</p>
//                     </div>
//                 </Link>

//                 {/* Menu Navigation */}
//                 <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
//                     <p className="px-4 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2">Tổng quan</p>
                    
//                     <Link to="/" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/')}`}>
//                         <i className="fas fa-chart-pie w-6"></i> <span className="font-medium ml-3">Dashboard</span>
//                     </Link>

//                     <Link to="/control" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/control')}`}>
//                         <i className="fas fa-toggle-on w-6"></i> <span className="font-medium ml-3">Điều khiển</span>
//                     </Link>

//                     <Link to="/weather" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/weather')}`}>
//                         <i className="fas fa-cloud-sun w-6"></i> <span className="font-medium ml-3">Thời tiết</span>
//                     </Link>

//                     <Link to="/history" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/history')}`}>
//                         <i className="fas fa-history w-6"></i> <span className="font-medium ml-3">Lịch sử</span>
//                     </Link>

//                     {isAdmin && (
//                         <>
//                             <p className="px-4 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2 mt-6">Quản trị</p>
//                             <Link to="/users" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/users')}`}>
//                                 <i className="fas fa-users-cog w-6"></i> <span className="font-medium ml-3">Người dùng</span>
//                             </Link>
//                             <Link to="/config" className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive('/config')}`}>
//                                 <i className="fas fa-cogs w-6"></i> <span className="font-medium ml-3">Cấu hình</span>
//                             </Link>
//                         </>
//                     )}
//                 </nav>

//                 {/* Footer User Profile */}
//                 <div className="p-4 border-t border-white/10">
//                     <div className="flex items-center justify-between bg-emerald-800/50 p-3 rounded-xl border border-white/5">
//                         <div onClick={handleOpenModal} className="flex items-center flex-1 group cursor-pointer">
//                             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
//                                 {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
//                             </div>
//                             <div className="ml-3">
//                                 <p className="text-sm font-semibold text-white group-hover:text-emerald-200 transition-colors">
//                                     {user.full_name || user.username}
//                                 </p>
//                                 <p className="text-xs text-emerald-300 group-hover:underline">Sửa hồ sơ</p>
//                             </div>
//                         </div>
//                         <button onClick={handleLogout} className="pl-3 ml-2 border-l border-white/10 text-emerald-300 hover:text-red-400 transition-colors">
//                             <i className="fas fa-sign-out-alt text-lg"></i>
//                         </button>
//                     </div>
//                 </div>
//             </aside>

//             {/* ================= MAIN CONTENT ================= */}
//             <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
//                 <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10 sticky top-0">
//                     <div>
//                         <h2 className="text-xl font-bold text-slate-800">{title || 'Hệ thống quản lý'}</h2>
//                         <p className="text-sm text-slate-500">Giám sát & Điều khiển thời gian thực</p>
//                     </div>
//                     <div className="md:hidden text-emerald-600 text-xl"><i className="fas fa-bars"></i></div>
//                 </header>

//                 <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-slate-50">
//                     {/* 👇 2. THAY {children} BẰNG <Outlet /> */}
//                     {/* Đây là nơi React Router sẽ bơm Dashboard/Users/Devices vào */}
//                     <Outlet /> 
//                 </div>
//             </main>

//             {/* Modal Edit Profile giữ nguyên */}
//             {showModal && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
//                    {/* ... (Nội dung modal giữ nguyên như cũ) ... */}
//                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform scale-100 transition-all">
//                         <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Cập nhật Hồ sơ</h3>
//                         <div className="space-y-4">
//                             <div>
//                                 <label className="block text-sm font-bold text-slate-700 mb-1">Họ và tên</label>
//                                 <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
//                                 <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu mới (Tùy chọn)</label>
//                                 <input type="password" placeholder="Để trống nếu không đổi" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
//                             </div>
//                         </div>
//                         <div className="flex justify-end gap-3 mt-6">
//                             <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold transition-all">Hủy bỏ</button>
//                             <button onClick={handleUpdate} className="px-4 py-2 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg transition-all">Lưu thay đổi</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default MainLayout;
// import React from 'react';
// import { Outlet } from 'react-router-dom';
// import Sidebar from '../components/layout/Sidebar';
// import Header from '../components/layout/Header';
// import { useAuth } from '../context/AuthContext';

// const MainLayout = () => {
//     // Nếu chưa load xong user thì khoan hãy render (để tránh lỗi null)
//     const { user } = useAuth();
//     if (!user) return null; 

//     return (
//         <div className="wrapper">
//             {/* Sidebar cố định bên trái */}
//             <Sidebar />

//             {/* Phần nội dung chính bên phải */}
//             <main className="content">
//                 {/* Header nằm trên cùng của phần content */}
//                 {/* Lưu ý: Bạn có thể đặt Header ở đây hoặc trong từng trang con tùy thích. 
//                     Để linh hoạt tiêu đề, mình thường để Header trong từng trang con (Dashboard.jsx) 
//                     hoặc dùng Context để set Title. Ở đây mình để Header mặc định. */}
                
//                 {/* <Header /> -> Nếu muốn Header cố định thì uncomment dòng này */}
                
//                 {/* Outlet là nơi React Router bơm nội dung trang con vào (Dashboard, Devices...) */}
//                 <Outlet />
//             </main>
//         </div>
//     );
// };

// export default MainLayout;