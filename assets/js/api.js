// api.js - Wrapper gọi API Backend

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

/**
 * Hàm gọi API chung (Tự động thêm Token)
 */
async function fetchAPI(endpoint, method = 'GET', body = null) {
    // 1. Lấy Token đã lưu (nếu có)
    const token = localStorage.getItem('access_token');

    const headers = {
        'Content-Type': 'application/json',
    };

    // 2. Nếu có token, đính kèm vào Header
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

        // Xử lý trường hợp hết hạn Token (401)
        if (response.status === 401) {
            alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
            logout(); // Gọi hàm logout bên main.js
            return null;
        }

        if (!response.ok) {
            // Cố gắng đọc lỗi từ server trả về
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Lỗi HTTP: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Lỗi API:", error);
        // Chỉ alert lỗi nếu không phải là trang login (tránh spam alert khi chưa login)
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
             alert(`Lỗi hệ thống: ${error.message}`);
        }
        throw error; // Ném lỗi ra để file main.js xử lý tiếp
    }
}


async function loginAPI(username, password) {
    // 1. Chuẩn bị dữ liệu dạng Form (x-www-form-urlencoded)
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    // 2. Gọi API Login
    const response = await fetch(`${API_BASE_URL}/login/access-token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded', // Quan trọng!
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Đăng nhập thất bại");
    }

    return await response.json();
}

// // Địa chỉ Backend FastAPI (Mặc định là cổng 8000)
// const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

// // Hàm tiện ích để gọi API (Wrapper)
// async function fetchAPI(endpoint, method = 'GET', body = null) {
//     const headers = {
//         'Content-Type': 'application/json'
//         // Sau này nếu có Token đăng nhập thì thêm: 'Authorization': `Bearer ${token}`
//     };

//     const config = {
//         method: method,
//         headers: headers,
//     };

//     if (body) {
//         config.body = JSON.stringify(body);
//     }

//     try {
//         const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
//         if (!response.ok) {
//             throw new Error(`Lỗi HTTP: ${response.status}`);
//         }
//         return await response.json();
//     } catch (error) {
//         console.error("Lỗi API:", error);
//         alert("Không thể kết nối tới Server!");
//         return null;
//     }
// }