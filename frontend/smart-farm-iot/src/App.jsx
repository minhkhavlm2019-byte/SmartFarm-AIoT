import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// --- 1. IMPORT THƯ VIỆN TOASTIFY ---
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // ⚠️ Quan trọng: Không có dòng này thông báo sẽ bị vỡ giao diện
// ------------------------------------

// Import Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Import Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/dashboard/Dashboard';
import Devices from './pages/Devices';
import AdminView  from './pages/dashboard/AdminView';
import Zones from './pages/Zones';
import Users from './pages/Users';
import NotFound from './pages/NotFound';
import AdminDeviceManagement from './pages/AdminDeviceManagement';
import AdminZoneManagement from './pages/AdminZoneManagement';
import AdminReports from './pages/AdminReports';
import ZoneDetail from './pages/ZoneDetail';
import TechZones from './pages/tech/TechZones';
import TechZoneDetail from './pages/tech/ZoneDetail';
import TechDashboard from'./pages/tech/TechDashboard';
import SystemLogs from './pages/tech/SystemLogs';
import TechDeviceManagement from './pages/tech/TechDeviceManagement';
import TechRoute  from './routes/TechRoute';
import FarmerRoute from './routes/FarmerRoute'; // Chỉnh lại đường dẫn nếu cần
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import FarmerZoneDetail from './pages/farmer/FarmerZoneDetail';
import FarmerWeather from './pages/farmer/FarmerWeather';
import FarmerMonitor from './pages/farmer/FarmerMonitor';
import FarmerControl from './pages/farmer/FarmerControl';
import FarmerHistory from './pages/farmer/FarmerHistory';

/**
 * Component bảo vệ: Yêu cầu phải đăng nhập mới được vào
 */
const PrivateRoute = () => {
    const { isAuthenticated } = useAuth();
    // Nếu chưa đăng nhập -> Chuyển hướng về trang Login
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

/**
 * Component bảo vệ: Yêu cầu phải là Admin
 */
const AdminRoute = () => {
    const { isAdmin } = useAuth();
    // Nếu không phải Admin -> Chuyển hướng về Dashboard (hoặc trang 403)
    return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
};

function App() {
    return (
        <AuthProvider>
            {/* --- 2. ĐẶT CONTAINER Ở ĐÂY (Nằm ngoài Router để luôn hiển thị) --- */}
            <ToastContainer 
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored" // Thêm màu sắc cho đẹp (xanh/đỏ/vàng)
            />
            {/* ------------------------------------------------------------------ */}

            <BrowserRouter>
                <Routes>
                    {/* --- 1. PUBLIC ROUTES (Ai cũng vào được) --- */}
                    <Route element={<AuthLayout />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                    </Route>

                    {/* --- 2. PRIVATE ROUTES (Phải đăng nhập) --- */}
                    {/* Bọc MainLayout trong PrivateRoute */}
                    <Route element={<PrivateRoute />}>
                        <Route element={<MainLayout />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/devices" element={<Devices />} />
                            <Route path="/zones" element={<Zones />} />
                            {/* KHU VỰC 4: CHỈ DÀNH CHO NÔNG DÂN (FARMER) */}
                            <Route element={<FarmerRoute />}>
                                <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
                                <Route path="/farmer/weather" element={<FarmerWeather />} />
                                <Route path="/farmer/monitor" element={<FarmerMonitor />} />
                                <Route path="/farmer/control" element={<FarmerControl />} />
                                <Route path="/farmer/history" element={<FarmerHistory />} />
                                {/* Sau này bạn làm thêm các trang Chi tiết vườn, Lịch sử thì bỏ vào đây */}
                                <Route path="/farmer/zones/:id" element={<FarmerZoneDetail />} /> 
                            </Route>
                            <Route element={<TechRoute />}>
                                <Route path="/tech/dashboard" element={<TechDashboard />} />
                                <Route path="/tech/zones" element={<TechZones />} />
                                <Route path="/tech/devices" element={<TechDeviceManagement />} />
                                <Route path="/tech/zones/:id" element={<TechZoneDetail />} />
                                <Route path="/tech/logs" element={<SystemLogs />} />
                            </Route>
                            {/* --- 3. ADMIN ROUTES (Chỉ Admin) --- */}
                            <Route element={<AdminRoute />}>
                                <Route path="/" element ={<AdminView/>}/>
                                <Route path="/users" element={<Users />} />
                                <Route path="/admin/devices" element={<AdminDeviceManagement />} />
                                <Route path="/admin/zones" element={<AdminZoneManagement />} />
                                <Route path="/admin/reports" element={<AdminReports />} />
                                <Route path="/admin/zones/:id" element={<ZoneDetail />} />
                            </Route>
                        </Route>
                    </Route>

                    {/* --- 4. CATCH ALL (Lỗi 404) --- */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;