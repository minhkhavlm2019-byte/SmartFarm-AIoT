import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
    const navigate = useNavigate();
    
    // Quản lý các bước: 1 (Nhập Email), 2 (Nhập OTP & Mật khẩu mới)
    const [step, setStep] = useState(1);
    
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Gửi yêu cầu lấy OTP
    const handleRequestOTP = async (e) => {
        e.preventDefault();
        if (!email) return toast.warning("Vui lòng nhập email!");
        
        setIsLoading(true);
        try {
            await api.auth.forgotPassword(email);
            toast.success("Mã OTP đã được gửi đến email của bạn!");
            setStep(2); // Chuyển sang bước 2
        } catch (error) {
            toast.error("Có lỗi xảy ra, vui lòng thử lại sau.");
        } finally {
            setIsLoading(false);
        }
    };

    // Gửi yêu cầu đổi mật khẩu
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!otp || !newPassword) return toast.warning("Vui lòng điền đủ thông tin!");
        
        setIsLoading(true);
        try {
            const payload = { email, otp, new_password: newPassword };
            await api.auth.resetPassword(payload);
            toast.success("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
            navigate('/login'); // Chuyển về trang đăng nhập
        } catch (error) {
            toast.error(error.response?.data?.detail || "Mã OTP sai hoặc đã hết hạn.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 animate-fade-in">
                
                {/* Logo & Tiêu đề */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
                        <i className="fas fa-unlock-alt text-2xl text-white"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Khôi phục mật khẩu</h2>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        {step === 1 ? "Nhập email của bạn để nhận mã OTP." : "Nhập mã OTP vừa nhận được."}
                    </p>
                </div>

                {/* FORM BƯỚC 1: NHẬP EMAIL */}
                {step === 1 && (
                    <form onSubmit={handleRequestOTP} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Địa chỉ Email</label>
                            <div className="relative">
                                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nongdan@example.com"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : "Nhận mã OTP"}
                        </button>
                    </form>
                )}

                {/* FORM BƯỚC 2: ĐỔI MẬT KHẨU */}
                {step === 2 && (
                    <form onSubmit={handleResetPassword} className="space-y-5 animate-fade-in">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Mã xác nhận (OTP)</label>
                            <div className="relative">
                                <i className="fas fa-shield-alt absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input 
                                    type="text" 
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Nhập 6 số OTP"
                                    maxLength="6"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold tracking-widest text-center"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Mật khẩu mới</label>
                            <div className="relative">
                                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input 
                                    type="password" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Nhập mật khẩu mới"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : "Xác nhận & Đổi mật khẩu"}
                        </button>
                    </form>
                )}

                {/* Liên kết quay lại Login */}
                <div className="mt-8 text-center">
                    <Link to="/login" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                        <i className="fas fa-arrow-left mr-1"></i> Quay lại đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;