import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';

// 1. Tạo Context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // State lưu thông tin user
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 2. useEffect: Khôi phục phiên đăng nhập khi F5
    useEffect(() => {
        const storedToken = localStorage.getItem('access_token');
        const storedRole = localStorage.getItem('user_role');
        const storedName = localStorage.getItem('user_name');

        if (storedToken) {
            setUser({
                token: storedToken,
                role: storedRole,
                name: storedName
            });
        }
        setLoading(false);
    }, []);

    // 3. Hàm Đăng Nhập
    const login = async (username, password) => {
        try {
            const data = await api.auth.login(username, password);
            const token = data.access_token;
            
            // --- XỬ LÝ ROLE CHUẨN ---
            // Backend Python trả về "ADMIN", "TECH", "FARMER" (Viết hoa).
            // Nên ta thống nhất dùng CHỮ HOA toàn bộ ứng dụng để tránh lỗi so sánh.
            let roleRaw = data.role || 'FARMER'; 
            let role = String(roleRaw).trim().toUpperCase();
            
            // Ép kiểu: Nếu lỡ là TECHNOLOGY thì đổi ngay thành TECH
            if (role === 'TECHNOLOGY') role = 'TECH';

            //const name = data.username || username;
            
            const name = data.username || username;

            // Lưu vào LocalStorage
            localStorage.setItem('access_token', token);
            localStorage.setItem('user_role', role);
            localStorage.setItem('user_name', name);

            // Cập nhật State
            setUser({ token, role, name });
            
            return { success: true, role: role };
        } catch (error) {
            console.error("Login Error:", error);
            return { success: false, message: error.message };
        }
    };

    // 4. Hàm Đăng Xuất
    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        setUser(null);
    };

    // 5. Hàm Cập nhật thông tin User
    const updateUser = (newData) => {
        setUser((prev) => ({
            ...prev,
            ...newData
        }));

        if (newData.name) localStorage.setItem('user_name', newData.name);
        if (newData.role) localStorage.setItem('user_role', newData.role);
    };

    // 6. Giá trị cung cấp cho toàn bộ App
    const value = {
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        
        // --- PHÂN QUYỀN (Dùng .toUpperCase() để chắc chắn) ---
        
        // 1. Check Admin: Chỉ đúng khi là ADMIN
        isAdmin: (user?.role || '').toString().toUpperCase() === 'ADMIN', 
        
        // 2. Check Tech: Admin cũng được coi là Tech (để vào xem dashboard kỹ thuật)
        isTech: ['ADMIN', 'TECH'].includes((user?.role || '').toString().toUpperCase()),
        
        // 3. Check Farmer:
        isFarmer: (user?.role || '').toString().toUpperCase() === 'FARMER',
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// --- QUAN TRỌNG: Dòng này fix lỗi trắng trang ---
export const useAuth = () => {
    return useContext(AuthContext);
};

export default AuthContext;
// import React, { createContext, useState, useEffect, useContext } from 'react';
// import { api } from '../services/api';

// // 1. Tạo Context
// const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
//     // State lưu thông tin user. Ban đầu là null (chưa đăng nhập)
//     // Cấu trúc user object: { name: 'Admin', role: 'admin', token: '...' }
//     const [user, setUser] = useState(null);
//     const [loading, setLoading] = useState(true); // Trạng thái loading khi mới vào web

//     // 2. useEffect: Chạy 1 lần khi F5 trang để khôi phục phiên đăng nhập
//     useEffect(() => {
//         const storedToken = localStorage.getItem('access_token');
//         const storedRole = localStorage.getItem('user_role');
//         const storedName = localStorage.getItem('user_name');

//         if (storedToken) {
//             // Nếu tìm thấy token trong kho, khôi phục lại State
//             setUser({
//                 token: storedToken,
//                 role: storedRole,
//                 name: storedName
//             });
//         }
//         setLoading(false); // Đã kiểm tra xong
//     }, []);

//     // 3. Hàm Đăng Nhập
//     const login = async (username, password) => {
//         try {
//             // Gọi API đăng nhập thật
//             const data = await api.auth.login(username, password);
            
//             // Dữ liệu trả về từ server: { access_token, role, username, ... }
//             const token = data.access_token;
            
//             // Xử lý Role và Name an toàn
//             // let role = data.role || 'farmer';
//             let role = data.role || 'farmer'; 
//             role = String(role).trim().toLowerCase(); // Chuyển về chữ thường hết (ví dụ: "ADMIN" -> "admin")
            
//             const name = data.username || username;

//             // Lưu vào LocalStorage
//             localStorage.setItem('access_token', token);
//             localStorage.setItem('user_role', role);
//             localStorage.setItem('user_name', name);

//             // Cập nhật State để React render lại giao diện ngay lập tức
//             setUser({ token, role, name });
            
//             return { success: true };
//         } catch (error) {
//             console.error("Login Error:", error);
//             return { success: false, message: error.message };
//         }
//     };

//     // 4. Hàm Đăng Xuất
//     const logout = () => {
//         // Xóa sạch dữ liệu
//         localStorage.removeItem('access_token');
//         localStorage.removeItem('user_role');
//         localStorage.removeItem('user_name');
        
//         // Reset State về null
//         setUser(null);
//     };

//     // 5. Hàm Cập nhật thông tin User (Dùng cho chức năng "Sửa hồ sơ")
//     const updateUser = (newData) => {
//         // Cập nhật State React
//         setUser((prev) => ({
//             ...prev,
//             ...newData
//         }));

//         // Cập nhật LocalStorage nếu có thay đổi tên hoặc role
//         if (newData.name) {
//             localStorage.setItem('user_name', newData.name);
//         }
//         if (newData.role) {
//             localStorage.setItem('user_role', newData.role);
//         }
//     };

//     // 6. Giá trị cung cấp cho toàn bộ App
//     const value = {
//         user,
//         login,
//         logout,
//         updateUser, // <-- Export hàm này để Header dùng
//         isAuthenticated: !!user, // true nếu user khác null
//         // Kiểm tra quyền Admin (Chấp nhận cả 'admin', 'ADMIN', 'Admin')
//         isAdmin: (user?.role || '').toString().toLowerCase() === 'admin', 
//     };

//     return (
//         <AuthContext.Provider value={value}>
//             {!loading && children} {/* Chỉ hiển thị App khi đã load xong thông tin user */}
//         </AuthContext.Provider>
//     );
// };

// // Custom Hook để dùng nhanh
// export const useAuth = () => {
//     return useContext(AuthContext);
// };
// import React, { createContext, useState, useEffect, useContext } from 'react';
// import { api } from '../services/api';

// // 1. Tạo Context
// const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
//     // State lưu thông tin user. Ban đầu là null (chưa đăng nhập)
//     // Cấu trúc user object: { name: 'Admin', role: 'admin', token: '...' }
//     const [user, setUser] = useState(null);
//     const [loading, setLoading] = useState(true); // Trạng thái loading khi mới vào web

//     // 2. useEffect: Chạy 1 lần khi F5 trang để khôi phục phiên đăng nhập
//     useEffect(() => {
//         const storedToken = localStorage.getItem('access_token');
//         const storedRole = localStorage.getItem('user_role');
//         const storedName = localStorage.getItem('user_name');

//         if (storedToken) {
//             // Nếu tìm thấy token trong kho, khôi phục lại State
//             setUser({
//                 token: storedToken,
//                 role: storedRole,
//                 name: storedName
//             });
//         }
//         setLoading(false); // Đã kiểm tra xong
//     }, []);

//     // 3. Hàm Đăng Nhập
//     const login = async (username, password) => {
//         try {
//             // Gọi API đăng nhập thật
//             const data = await api.auth.login(username, password);
            
//             // Dữ liệu trả về từ server: { access_token, role, username, ... }
//             const token = data.access_token;
//             // Nếu server chưa trả role chuẩn, tạm fix cứng để test (giống logic cũ)
//             const role = data.role || 'admin'; 
//             const name = data.username || username;

//             // Lưu vào LocalStorage
//             localStorage.setItem('access_token', token);
//             localStorage.setItem('user_role', role);
//             localStorage.setItem('user_name', name);

//             // Cập nhật State để React render lại giao diện ngay lập tức
//             setUser({ token, role, name });
            
//             return { success: true };
//         } catch (error) {
//             console.error("Login Error:", error);
//             return { success: false, message: error.message };
//         }
//     };

//     // 4. Hàm Đăng Xuất
//     const logout = () => {
//         // Xóa sạch dữ liệu
//         localStorage.removeItem('access_token');
//         localStorage.removeItem('user_role');
//         localStorage.removeItem('user_name');
        
//         // Reset State về null
//         setUser(null);
        
//         // Tùy chọn: Chuyển hướng về trang login (thường xử lý ở Router)
//         // window.location.href = '/login'; 
//     };

//     // 5. Giá trị cung cấp cho toàn bộ App
//     const value = {
//         user,
//         login,
//         logout,
//         isAuthenticated: !!user, // true nếu user khác null
//         isAdmin: user?.role === 'admin' || user?.role === 'ADMIN', // Kiểm tra nhanh quyền Admin
//     };

//     return (
//         <AuthContext.Provider value={value}>
//             {!loading && children} {/* Chỉ hiển thị App khi đã load xong thông tin user */}
//         </AuthContext.Provider>
//     );
// };

// 6. Custom Hook để dùng nhanh ở các file khác
// Thay vì viết: const { user } = useContext(AuthContext);
// Chỉ cần viết: const { user } = useAuth();
// export const useAuth = () => {
//     return useContext(AuthContext);
// };