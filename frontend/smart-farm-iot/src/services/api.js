export const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

/**
 * Hàm gọi API chung (Wrapper)
 */
export const fetchAPI = async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('access_token');
    
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method: method,
        headers: headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // --- XỬ LÝ LỖI 401 (HẾT HẠN TOKEN) ---
        if (response.status === 401) {
            localStorage.clear(); 
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login'; 
            }
            return null;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Lỗi HTTP: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error("Lỗi API:", error);
        throw error;
    }
};

/**
 * Hàm đăng nhập (Form Data)
 */
export const loginAPI = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/login/access-token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Tên đăng nhập hoặc mật khẩu không đúng");
    }

    return await response.json();
};

// --- TỔNG HỢP API ---
export const api = {
    auth: {
        login: loginAPI,
        logout: () => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_name');
            window.location.href = '/login';
        },
        forgotPassword: (email) => fetchAPI('/auth/forgot-password', 'POST', { email }),
        resetPassword: (data) => fetchAPI('/auth/reset-password', 'POST', data)
    },
    devices: {
        getAll: () => fetchAPI('/devices/'),
        create: (data) => fetchAPI('/devices/', 'POST', data),
        control: (id, command) => fetchAPI(`/devices/${id}/control`, 'POST', { command: command }),
        update: (id, data) => fetchAPI(`/devices/${id}`, 'PUT', data),
        delete: (id) => fetchAPI(`/devices/${id}`, 'DELETE'), // Đã thêm hàm delete
        getHistory: (id, limit=20) => fetchAPI(`/devices/${id}/history?limit=${limit}`)
    },
    zones: {
        getAll: () => fetchAPI('/zones/'),
        create: (data) => fetchAPI('/zones/', 'POST', data),
        update: (id, data) => fetchAPI(`/zones/${id}`, 'PUT', data),
        updateSettings: (id, settingsData) => fetchAPI(`/zones/${id}/settings`, 'PUT', settingsData),
        delete: (id) => fetchAPI(`/zones/${id}`, 'DELETE')
    },
    users: {
        getAll: () => fetchAPI('/users/'),
        create: (data) => fetchAPI('/users/', 'POST', data),
        updateProfile: (data) => fetchAPI('/users/me', 'PUT', data),
        toggleLock: (userId) => fetchAPI(`/users/${userId}/toggle-lock`, 'PUT')
    },
    // --- ĐÃ SỬA PHẦN NÀY ---
    reports: {
        // Dùng fetchAPI thay vì instance.get
        getCharts: () => fetchAPI('/reports/charts'),
        
        // Truyền tham số vào URL
        getLogs: (limit = 50) => fetchAPI(`/reports/logs?limit=${limit}`),
    },
    logs: {
        // Dùng luôn hàm fetchAPI của bạn, ngắn gọn và chuẩn xác!
        getAll: () => fetchAPI('/logs')
    },
    
    // Hàm get chung (Để AdminReports.jsx gọi api.get(...))
    get: (endpoint) => fetchAPI(endpoint) 
};
// // src/services/api.js

// export const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

// /**
//  * Hàm gọi API chung (Wrapper)
//  */
// export const fetchAPI = async (endpoint, method = 'GET', body = null) => {
//     const token = localStorage.getItem('access_token');
    
//     const headers = {
//         'Content-Type': 'application/json',
//     };

//     if (token) {
//         headers['Authorization'] = `Bearer ${token}`;
//     }

//     const config = {
//         method: method,
//         headers: headers,
//     };

//     if (body) {
//         config.body = JSON.stringify(body);
//     }

//     try {
//         const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

//         // --- XỬ LÝ LỖI 401 (HẾT HẠN TOKEN) ---
//         if (response.status === 401) {
//             localStorage.clear(); 
//             // Không dùng alert ở đây để tránh chặn luồng, 
//             // chuyển hướng luôn hoặc để component xử lý
//             if (!window.location.pathname.includes('/login')) {
//                 window.location.href = '/login'; 
//             }
//             return null;
//         }

//         if (!response.ok) {
//             const errorData = await response.json().catch(() => ({}));
//             // Ném lỗi ra để Component bắt (catch) và hiện Toast
//             throw new Error(errorData.detail || `Lỗi HTTP: ${response.status}`);
//         }

//         return await response.json();

//     } catch (error) {
//         console.error("Lỗi API:", error);
//         throw error; // Ném lỗi tiếp cho Component xử lý (Hiện thông báo đỏ/Toast)
//     }
// };

// /**
//  * Hàm đăng nhập (Form Data)
//  */
// export const loginAPI = async (username, password) => {
//     const formData = new URLSearchParams();
//     formData.append('username', username);
//     formData.append('password', password);

//     const response = await fetch(`${API_BASE_URL}/login/access-token`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/x-www-form-urlencoded',
//         },
//         body: formData
//     });

//     if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         throw new Error(errorData.detail || "Tên đăng nhập hoặc mật khẩu không đúng");
//     }

//     return await response.json();
// };

// // --- TỔNG HỢP API ---
// export const api = {
//     auth: {
//         login: loginAPI,
//         logout: () => {
//             localStorage.removeItem('access_token');
//             localStorage.removeItem('user_role');
//             localStorage.removeItem('user_name');
//             window.location.href = '/login';
//         }
//     },
//     devices: {
//         // Lấy tất cả thiết bị
//         getAll: () => fetchAPI('/devices/'),
        
//         // Tạo thiết bị mới
//         create: (data) => fetchAPI('/devices/', 'POST', data),
        
//         // --- SỬA QUAN TRỌNG: Gửi lệnh qua BODY ---
//         // Ví dụ backend nhận: { "command": "PUMP_ON" }
//         control: (id, command) => fetchAPI(`/devices/${id}/control`, 'POST', { command: command }),
        
//         // Cập nhật thông tin thiết bị
//         update: (id, data) => fetchAPI(`/devices/${id}`, 'PUT', data),
        
//         // Lấy lịch sử
//         getHistory: (id, limit=20) => fetchAPI(`/devices/${id}/history?limit=${limit}`)
//     },
//     zones: {
//         getAll: () => fetchAPI('/zones/'),
//         create: (data) => fetchAPI('/zones/', 'POST', data),
//         update: (id, data) => fetchAPI(`/zones/${id}`, 'PUT', data),
//         delete: (id) => fetchAPI(`/zones/${id}`, 'DELETE')
//     },
//     users: {
//         getAll: () => fetchAPI('/users/'),
//         create: (data) => fetchAPI('/users/', 'POST', data), // Endpoint chuẩn REST thường là POST /users/
//         updateProfile: (data) => fetchAPI('/users/me', 'PUT', data)
//     },
//     reports: {
//         getCharts: () => instance.get('/reports/charts').then(res => res.data),
//         getLogs: (params) => instance.get('/reports/logs', { params }).then(res => res.data),
//     },
//     // Hàm get chung (như trong code React ở trên mình dùng)
//     get: (url, config) => instance.get(url, config),
// };
// // src/services/api.js

// export const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

// /**
//  * Hàm gọi API chung (Wrapper)
//  * Tự động thêm Token vào Header và xử lý lỗi 401
//  */
// export const fetchAPI = async (endpoint, method = 'GET', body = null) => {
//     // 1. Lấy Token từ LocalStorage
//     const token = localStorage.getItem('access_token');

//     const headers = {
//         'Content-Type': 'application/json',
//     };

//     // 2. Nếu có token, đính kèm vào Header
//     if (token) {
//         headers['Authorization'] = `Bearer ${token}`;
//     }

//     const config = {
//         method: method,
//         headers: headers,
//     };

//     if (body) {
//         config.body = JSON.stringify(body);
//     }

//     try {
//         const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

//         // --- XỬ LÝ LỖI 401 (HẾT HẠN TOKEN) ---
//         if (response.status === 401) {
//             // Trong React, ta xóa storage và dùng window.location để đá về trang login
//             // vì file này nằm ngoài React Component nên không dùng được useNavigate hook
//             localStorage.clear(); 
//             alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
//             window.location.href = '/login'; 
//             return null;
//         }

//         if (!response.ok) {
//             // Cố gắng đọc lỗi từ server
//             const errorData = await response.json().catch(() => ({}));
//             throw new Error(errorData.detail || `Lỗi HTTP: ${response.status}`);
//         }

//         return await response.json();

//     } catch (error) {
//         console.error("Lỗi API:", error);
        
//         // Chỉ alert lỗi nếu KHÔNG phải đang ở trang Login (để tránh spam)
//         if (!window.location.pathname.includes('/login')) {
//              alert(`Lỗi hệ thống: ${error.message}`);
//         }
//         throw error; // Ném lỗi ra để Component xử lý tiếp (ví dụ: tắt loading)
//     }
// };

// /**
//  * Hàm đăng nhập riêng biệt (Vì dùng Form Data thay vì JSON)
//  */
// export const loginAPI = async (username, password) => {
//     const formData = new URLSearchParams();
//     formData.append('username', username);
//     formData.append('password', password);

//     const response = await fetch(`${API_BASE_URL}/login/access-token`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/x-www-form-urlencoded',
//         },
//         body: formData
//     });

//     if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         throw new Error(errorData.detail || "Đăng nhập thất bại");
//     }

//     return await response.json();
// };

// // --- GOM NHÓM CÁC API THEO CHỨC NĂNG (OPTIONAL - ĐỂ CODE GỌN HƠN) ---
// export const api = {
//     auth: {
//         login: loginAPI,
//         logout: () => {
//             if(window.confirm("Bạn muốn đăng xuất?")) {
//                 localStorage.clear();
//                 window.location.href = '/login';
//             }
//         }
//     },
//     devices: {
//         getAll: () => fetchAPI('/devices/'),
//         create: (data) => fetchAPI('/devices/', 'POST', data),
//         control: (id, action) => fetchAPI(`/devices/${id}/control?action=${action}`, 'POST'),
//         update: (id, data) => fetchAPI(`/devices/${id}`, 'PUT', data),
//         getHistory: (id, limit=20) => fetchAPI(`/devices/${id}/history?limit=${limit}`)
//     },
//     zones: {
//         getAll: () => fetchAPI('/zones/'),
//         create: (data) => fetchAPI('/zones/', 'POST', data),
//         update: (id, data) => fetchAPI(`/zones/${id}`, 'PUT', data),
//         delete: (id) => fetchAPI(`/zones/${id}`, 'DELETE')
//     },
//     users: {
//         getAll: () => fetchAPI('/users/'),
//         create: (data) => fetchAPI('/users/register', 'POST', data),
//         updateProfile: (data) => fetchAPI('/users/me', 'PUT', data)
//     }
// };