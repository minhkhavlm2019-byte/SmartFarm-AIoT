import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Gọi hàm login từ Context (đã có sẵn logic gọi API)
        const result = await login(username, password);
        
        if (result.success) {
            // 👇 LOGIC PHÂN LUỒNG QUYỀN (ROLE-BASED REDIRECTION) 👇
            // Lấy role từ dữ liệu trả về (Tùy vào cách AuthContext của bạn return, thường là result.user.role hoặc result.role)
            const role = result.user?.role || result.role || '';
            const userRole = role.toLowerCase();

            if (userRole === 'farmer') {
                navigate('/farmer/dashboard'); // Nông dân -> Trang tổng quan vườn
            } else if (userRole === 'tech' || userRole === 'technology') {
                navigate('/tech/devices');     // Kỹ thuật -> Kho thiết bị
            } else {
                navigate('/');                 // Admin / Mặc định -> Bảng điều khiển chung
            }
            
        } else {
            setError(result.message || "Tên đăng nhập hoặc mật khẩu không đúng!");
        }
        setLoading(false);
    };

    return (
        <div className="flex h-screen w-full bg-white overflow-hidden">
            
            {/* ================= CỘT TRÁI (BANNER) ================= */}
            <div className="hidden lg:flex w-1/2 bg-emerald-900 relative items-center justify-center overflow-hidden">
                {/* Ảnh nền nông nghiệp */}
                <img 
                    src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?q=80&w=2070&auto=format&fit=crop"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay scale-105 hover:scale-110 transition-transform duration-[20s]"
                    alt="Smart Greenhouse" 
                />

                {/* Nội dung trên Banner */}
                <div className="relative z-10 text-center px-12">
                     <div className="w-24 h-24 glass-panel rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/20 backdrop-blur-md">
                        <i className="fas fa-leaf text-5xl text-emerald-300 drop-shadow-md"></i>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-6 tracking-tight drop-shadow-lg">
                        Lettuce<span className="text-emerald-400">IoT</span>
                    </h1>
                    <p className="text-emerald-100 text-lg font-light max-w-md mx-auto leading-relaxed drop-shadow-md">
                        Hệ thống giám sát vi khí hậu và điều khiển tự động cho nông nghiệp công nghệ cao.
                    </p>
                    
                    {/* Icons tính năng */}
                    <div className="mt-12 flex justify-center gap-4">
                        <div className="px-4 py-3 rounded-xl flex flex-col items-center bg-white/10 backdrop-blur-sm border border-white/10">
                            <i className="fas fa-wifi text-emerald-400 mb-1 text-lg"></i>
                            <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">MQTT</span>
                        </div>
                        <div className="px-4 py-3 rounded-xl flex flex-col items-center bg-white/10 backdrop-blur-sm border border-white/10">
                            <i className="fas fa-robot text-purple-400 mb-1 text-lg"></i>
                            <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">AI Core</span>
                        </div>
                        <div className="px-4 py-3 rounded-xl flex flex-col items-center bg-white/10 backdrop-blur-sm border border-white/10">
                            <i className="fas fa-mobile-alt text-blue-400 mb-1 text-lg"></i>
                            <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">Remote</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= CỘT PHẢI (FORM LOGIN) ================= */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 h-full overflow-y-auto">
                <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
                    
                    {/* Header Mobile (Chỉ hiện khi màn hình nhỏ) */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                            <i className="fas fa-leaf text-xl"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Lettuce IoT</h2>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-800">Xin chào! 👋</h2>
                        <p className="text-slate-500 mt-2">Đăng nhập để quản lý trang trại của bạn.</p>
                    </div>

                    {/* Thông báo lỗi */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-pulse">
                            <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
                            <p className="text-sm text-red-600 font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Input Username */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Tên đăng nhập</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                    <i className="fas fa-user"></i>
                                </div>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="admin"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium placeholder-slate-400"
                                    required
                                />
                            </div>
                        </div>

                        {/* Input Password */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-slate-700">Mật khẩu</label>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                    <i className="fas fa-lock"></i>
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium placeholder-slate-400"
                                    required
                                />
                                {/* Nút ẩn hiện mật khẩu */}
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 cursor-pointer focus:outline-none transition-colors"
                                >
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        {/* Remember & Forgot Password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer select-none">
                                <input type="checkbox" className="form-checkbox h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 transition duration-150 ease-in-out" />
                                <span className="ml-2 text-sm font-medium text-slate-600">Ghi nhớ đăng nhập</span>
                            </label>
                            <a href="/forgot-password" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors">
                                Quên mật khẩu?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-1 flex justify-center items-center gap-3 group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Đang xử lý...</span>
                                </>
                            ) : (
                                <>
                                    <span>Đăng nhập hệ thống</span>
                                    <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-400 text-xs">
                            &copy; 2026 Smart Farm AIoT System. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
// import React, { useState } from 'react';
// import { useAuth } from '../context/AuthContext';
// import { useNavigate } from 'react-router-dom';

// const Login = () => {
//     const [username, setUsername] = useState('');
//     const [password, setPassword] = useState('');
//     const [showPassword, setShowPassword] = useState(false);
//     const [error, setError] = useState('');
//     const [loading, setLoading] = useState(false);
    
//     const { login } = useAuth();
//     const navigate = useNavigate();

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setError('');
//         setLoading(true);

//         // Gọi hàm login từ Context (đã có sẵn logic gọi API)
//         const result = await login(username, password);
        
//         if (result.success) {
//             navigate('/'); // Thành công -> Về Dashboard
//         } else {
//             setError(result.message || "Tên đăng nhập hoặc mật khẩu không đúng!");
//         }
//         setLoading(false);
//     };

//     return (
//         <div className="flex h-screen w-full bg-white overflow-hidden">
            
//             {/* ================= CỘT TRÁI (BANNER) ================= */}
//             <div className="hidden lg:flex w-1/2 bg-emerald-900 relative items-center justify-center overflow-hidden">
//                 {/* Ảnh nền nông nghiệp */}
//                 <img 
//                     src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?q=80&w=2070&auto=format&fit=crop"
//                     className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay scale-105 hover:scale-110 transition-transform duration-[20s]"
//                     alt="Smart Greenhouse" 
//                 />

//                 {/* Nội dung trên Banner */}
//                 <div className="relative z-10 text-center px-12">
//                      <div className="w-24 h-24 glass-panel rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/20 backdrop-blur-md">
//                         <i className="fas fa-leaf text-5xl text-emerald-300 drop-shadow-md"></i>
//                     </div>
//                     <h1 className="text-5xl font-bold text-white mb-6 tracking-tight drop-shadow-lg">
//                         Lettuce<span className="text-emerald-400">IoT</span>
//                     </h1>
//                     <p className="text-emerald-100 text-lg font-light max-w-md mx-auto leading-relaxed drop-shadow-md">
//                         Hệ thống giám sát vi khí hậu và điều khiển tự động cho nông nghiệp công nghệ cao.
//                     </p>
                    
//                     {/* Icons tính năng */}
//                     <div className="mt-12 flex justify-center gap-4">
//                         <div className="px-4 py-3 rounded-xl flex flex-col items-center bg-white/10 backdrop-blur-sm border border-white/10">
//                             <i className="fas fa-wifi text-emerald-400 mb-1 text-lg"></i>
//                             <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">MQTT</span>
//                         </div>
//                         <div className="px-4 py-3 rounded-xl flex flex-col items-center bg-white/10 backdrop-blur-sm border border-white/10">
//                             <i className="fas fa-robot text-purple-400 mb-1 text-lg"></i>
//                             <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">AI Core</span>
//                         </div>
//                         <div className="px-4 py-3 rounded-xl flex flex-col items-center bg-white/10 backdrop-blur-sm border border-white/10">
//                             <i className="fas fa-mobile-alt text-blue-400 mb-1 text-lg"></i>
//                             <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">Remote</span>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* ================= CỘT PHẢI (FORM LOGIN) ================= */}
//             <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 h-full overflow-y-auto">
//                 <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
                    
//                     {/* Header Mobile (Chỉ hiện khi màn hình nhỏ) */}
//                     <div className="lg:hidden text-center mb-8">
//                         <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 mb-4">
//                             <i className="fas fa-leaf text-xl"></i>
//                         </div>
//                         <h2 className="text-2xl font-bold text-slate-800">Lettuce IoT</h2>
//                     </div>

//                     <div className="mb-8">
//                         <h2 className="text-3xl font-bold text-slate-800">Xin chào! 👋</h2>
//                         <p className="text-slate-500 mt-2">Đăng nhập để quản lý trang trại của bạn.</p>
//                     </div>

//                     {/* Thông báo lỗi */}
//                     {error && (
//                         <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-pulse">
//                             <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
//                             <p className="text-sm text-red-600 font-medium">{error}</p>
//                         </div>
//                     )}

//                     <form onSubmit={handleSubmit} className="space-y-6">
                        
//                         {/* Input Username */}
//                         <div>
//                             <label className="block text-sm font-bold text-slate-700 mb-2">Tên đăng nhập</label>
//                             <div className="relative group">
//                                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
//                                     <i className="fas fa-user"></i>
//                                 </div>
//                                 <input 
//                                     type="text" 
//                                     value={username}
//                                     onChange={(e) => setUsername(e.target.value)}
//                                     placeholder="admin"
//                                     className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium placeholder-slate-400"
//                                     required
//                                 />
//                             </div>
//                         </div>

//                         {/* Input Password */}
//                         <div>
//                             <div className="flex justify-between items-center mb-2">
//                                 <label className="block text-sm font-bold text-slate-700">Mật khẩu</label>
//                             </div>
//                             <div className="relative group">
//                                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
//                                     <i className="fas fa-lock"></i>
//                                 </div>
//                                 <input 
//                                     type={showPassword ? "text" : "password"}
//                                     value={password}
//                                     onChange={(e) => setPassword(e.target.value)}
//                                     placeholder="••••••••"
//                                     className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 font-medium placeholder-slate-400"
//                                     required
//                                 />
//                                 {/* Nút ẩn hiện mật khẩu */}
//                                 <button 
//                                     type="button"
//                                     onClick={() => setShowPassword(!showPassword)}
//                                     className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 cursor-pointer focus:outline-none transition-colors"
//                                 >
//                                     <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
//                                 </button>
//                             </div>
//                         </div>

//                         {/* Remember & Forgot Password */}
//                         <div className="flex items-center justify-between">
//                             <label className="flex items-center cursor-pointer select-none">
//                                 <input type="checkbox" className="form-checkbox h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 transition duration-150 ease-in-out" />
//                                 <span className="ml-2 text-sm font-medium text-slate-600">Ghi nhớ đăng nhập</span>
//                             </label>
//                             <a href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors">
//                                 Quên mật khẩu?
//                             </a>
//                         </div>

//                         {/* Submit Button */}
//                         <button 
//                             type="submit" 
//                             disabled={loading}
//                             className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-1 flex justify-center items-center gap-3 group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
//                         >
//                             {loading ? (
//                                 <>
//                                     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                     </svg>
//                                     <span>Đang xử lý...</span>
//                                 </>
//                             ) : (
//                                 <>
//                                     <span>Đăng nhập hệ thống</span>
//                                     <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
//                                 </>
//                             )}
//                         </button>
//                     </form>

//                     <div className="mt-8 text-center">
//                         <p className="text-slate-400 text-xs">
//                             &copy; 2026 Smart Farm AIoT System. All rights reserved.
//                         </p>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Login;
// // import React, { useState } from 'react';
// // import { useAuth } from '../context/AuthContext';
// // import { useNavigate } from 'react-router-dom';
// // import Button from '../components/common/Button';

// // const Login = () => {
// //     const [username, setUsername] = useState('');
// //     const [password, setPassword] = useState('');
// //     const [error, setError] = useState('');
// //     const [loading, setLoading] = useState(false);
    
// //     const { login } = useAuth();
// //     const navigate = useNavigate();

// //     const handleSubmit = async (e) => {
// //         e.preventDefault();
// //         setError('');
// //         setLoading(true);

// //         const result = await login(username, password);
        
// //         if (result.success) {
// //             navigate('/'); // Chuyển hướng về Dashboard
// //         } else {
// //             setError(result.message || "Đăng nhập thất bại");
// //         }
// //         setLoading(false);
// //     };

// //     return (
// //         <div className="login-box">
// //             <div className="login-header">
// //                 <i className="fas fa-leaf logo-icon"></i>
// //                 <h2>Smart Farm AIoT</h2>
// //                 <p>Hệ thống quản lý nông nghiệp thông minh</p>
// //             </div>
            
// //             <form onSubmit={handleSubmit}>
// //                 <div className="input-group">
// //                     <label><i className="fas fa-user"></i> Tên đăng nhập</label>
// //                     <input 
// //                         type="text" 
// //                         value={username}
// //                         onChange={(e) => setUsername(e.target.value)}
// //                         placeholder="Nhập username" 
// //                         required 
// //                     />
// //                 </div>
                
// //                 <div className="input-group">
// //                     <label><i className="fas fa-lock"></i> Mật khẩu</label>
// //                     <input 
// //                         type="password" 
// //                         value={password}
// //                         onChange={(e) => setPassword(e.target.value)}
// //                         placeholder="Nhập mật khẩu" 
// //                         required 
// //                     />
// //                 </div>

// //                 {error && (
// //                     <p className="error-text" style={{ display: 'block', color: 'red' }}>
// //                         <i className="fas fa-exclamation-circle"></i> {error}
// //                     </p>
// //                 )}

// //                 <Button 
// //                     type="submit" 
// //                     variant="login" 
// //                     disabled={loading}
// //                     className="btn-login"
// //                 >
// //                     {loading ? "Đang kết nối..." : "Đăng Nhập"}
// //                 </Button>
// //             </form>

// //             <div className="login-footer">
// //                 <p>Đồ án tốt nghiệp 2026</p>
// //             </div>
// //         </div>
// //     );
// // };

// // export default Login;