/**
 * main.js - Logic cốt lõi & Cập nhật UI
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // --- PHẦN 1: XỬ LÝ ĐĂNG NHẬP (Chỉ chạy ở trang index.html) ---
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 1. Chặn reload trang ngay lập tức
            
            // Lấy các thẻ giao diện
            const btnLogin = document.getElementById('btnLogin');
            const btnText = document.getElementById('btnText');
            const errorMsg = document.getElementById('error-msg');
            const errorContent = document.getElementById('error-text-content');
            
            // 2. Hiệu ứng "Đang tải"
            if(btnLogin) {
                btnLogin.disabled = true;
                btnLogin.style.opacity = "0.7";
            }
            if(btnText) btnText.innerText = "Đang kết nối...";
            if(errorMsg) errorMsg.style.display = 'none';

            // Lấy dữ liệu
            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;

            try {
                console.log(`📡 Đang gọi API Login với User: ${usernameInput}`);
                
                // 3. GỌI API THẬT (Hàm này nằm bên api.js)
                const data = await loginAPI(usernameInput, passwordInput);
                
                console.log("✅ Login thành công!", data);

                // 4. Lưu Token vào LocalStorage
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('user_name', usernameInput); // Lưu tên để hiển thị
                
                // 5. Chuyển hướng
                window.location.href = 'dashboard.html';

            } catch (err) {
                console.error("❌ Login thất bại:", err);
                
                // Hiển thị lỗi ra màn hình
                if(errorMsg) {
                    errorMsg.style.display = 'block';
                    if(errorContent) errorContent.innerText = err.message || "Lỗi kết nối Server";
                }

                // Reset nút bấm
                if(btnLogin) {
                    btnLogin.disabled = false;
                    btnLogin.style.opacity = "1";
                }
                if(btnText) btnText.innerText = "Đăng Nhập";
            }
        });
    }

    // --- PHẦN 2: LOGIC BẢO VỆ DASHBOARD (Chuyển hướng nếu chưa login) ---
    checkLogin();
});

// Hàm kiểm tra session (Chạy ở mọi trang)
function checkLogin() {
    const token = localStorage.getItem('access_token');
    const path = window.location.pathname;
    
    // Xác định xem có phải trang login không
    const isLoginPage = path.includes('index.html') || path === '/' || path.endsWith('/');

    // 1. Chưa đăng nhập mà cố vào Dashboard -> Đá về Login
    if (!token && !isLoginPage) {
        if (path.includes('/pages/')) window.location.href = '../index.html';
        else window.location.href = 'index.html';
    }

    // 2. Đã đăng nhập mà lại vào trang Login -> Đá sang Dashboard
    if (token && isLoginPage) {
        window.location.href = 'dashboard.html';
    }
    
    // 3. Hiển thị tên Admin (nếu có element)
    const displayElement = document.getElementById('display-name');
    const storedName = localStorage.getItem('user_name');
    if (displayElement && storedName) {
        displayElement.innerText = storedName;
    }
}

// Hàm Đăng xuất
function logout() {
    if (confirm("Bạn muốn đăng xuất?")) {
        localStorage.clear(); // Xóa sạch Token
        window.location.href = 'index.html';
    }
}
// /**
//  * main.js - Logic cốt lõi & Cập nhật UI
//  */

// // 1. KIỂM TRA ĐĂNG NHẬP (Session Guard)
// (function checkLogin() {
//     const token = localStorage.getItem('access_token');
//     const currentPage = window.location.pathname;

//     // Xác định xem có đang ở trang login không (Trang chủ '/' hoặc 'index.html')
//     const isLoginPage = currentPage.includes('index.html') || currentPage === '/';

//     // Nếu KHÔNG có token VÀ KHÔNG phải trang login -> Đá về login
//     if (!token && !isLoginPage) {
//         // Kiểm tra đang ở thư mục con hay thư mục gốc để redirect đúng
//         if (currentPage.includes('/pages/')) {
//             window.location.href = '../index.html';
//         } else {
//             window.location.href = 'index.html';
//         }
//     }

//     // Nếu ĐÃ có token mà lại vào trang login -> Đá sang Dashboard
//     if (token && isLoginPage) {
//         // Vì dashboard.html nằm trong folder frontend (đã mount)
//         // Nếu file dashboard nằm cạnh index thì:
//         window.location.href = 'dashboard.html';
//     }

//     // Hiển thị tên user lên thanh menu (nếu có element)
//     const username = localStorage.getItem('user_name'); // Sửa key cho khớp logic
//     const displayElement = document.getElementById('display-name');
//     if (displayElement && username) {
//         displayElement.innerText = username; // Cập nhật UI: Tên người dùng
//     }
// })();

// // 2. XỬ LÝ ĐĂNG NHẬP (Gắn vào Form Login ở index.html)
// document.addEventListener("DOMContentLoaded", () => {
//     const loginForm = document.getElementById('login-form');
//     if (loginForm) {
//         loginForm.addEventListener('submit', async (e) => {
//             e.preventDefault(); // Chặn reload trang
            
//             // Lấy dữ liệu từ input (Giả sử id input là 'username' và 'password')
//             const usernameInput = document.getElementById('username').value;
//             const passwordInput = document.getElementById('password').value;
//             const errorMsg = document.getElementById('error-msg'); // Thẻ p để hiện lỗi

//             try {
//                 // Gọi API Login từ api.js
//                 const data = await loginAPI(usernameInput, passwordInput);
                
//                 // Cập nhật UI & Lưu Session
//                 localStorage.setItem('access_token', data.access_token);
//                 // Lưu tạm tên user để hiển thị (thực tế nên gọi API /me để lấy chuẩn)
//                 localStorage.setItem('user_name', usernameInput); 
                
//                 // Chuyển hướng
//                 window.location.href = 'dashboard.html';

//             } catch (err) {
//                 // Cập nhật UI: Hiển thị lỗi
//                 if (errorMsg) errorMsg.innerText = err.message;
//                 else alert(err.message);
//             }
//         });
//     }

//     // 3. TỰ ĐỘNG TẢI DỮ LIỆU DỰA TRÊN TRANG HIỆN TẠI
//     const path = window.location.pathname;
    
//     if (path.includes('dashboard')) {
//         loadDashboardData();
//     } else if (path.includes('devices')) {
//         loadDevicesData();
//     }
    
//     // Active Menu
//     activeMenu(path);
// });

// // --- CÁC HÀM CẬP NHẬT UI (Placeholders) ---

// async function loadDashboardData() {
//     console.log("Đang tải dữ liệu Dashboard...");
//     // Ví dụ: Gọi API lấy cảm biến mới nhất
//     try {
//         const data = await fetchAPI('/devices/sensors/latest'); 
        
//         if (data) {
//             // 2. SỬA ID: Khớp với dashboard.html (avg-temp, avg-hum)
//             const tempEl = document.getElementById('avg-temp'); // Cũ là temp-display
//             const humEl = document.getElementById('avg-hum');
            
//             if (tempEl) tempEl.innerText = `${data.temp}°C`;
//             if (humEl) humEl.innerText = `${data.hum_air}%`;
//         }
        
//     } catch (e) {
//         console.log("Chưa thể tải dữ liệu Dashboard (Backend chưa chạy hoặc sai đường dẫn)");
//     }
// }

// async function loadDevicesData() {
//     console.log("Đang tải danh sách thiết bị...");
//     // Code gọi API lấy list device và render bảng...
// }

// // 4. HÀM ĐĂNG XUẤT
// function logout() {
//     if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
//         localStorage.removeItem('access_token');
//         localStorage.removeItem('user_name');
        
//         if (window.location.pathname.includes('/pages/')) {
//             window.location.href = '../index.html';
//         } else {
//             window.location.href = 'index.html';
//         }
//     }
// }

// // 5. ACTIVE MENU
// function activeMenu(currentPath) {
//     const menuItems = document.querySelectorAll('.sidebar li'); // Hoặc selector phù hợp
//     menuItems.forEach(item => {
//         // Logic tô màu
//         if (currentPath.includes('dashboard') && item.innerText.toLowerCase().includes('trang chủ')) {
//             item.classList.add('active');
//         }
//         // ... thêm các điều kiện khác
//     });
// }
// /**
//  * main.js - Logic dùng chung cho toàn bộ website
//  */

// // 1. KIỂM TRA ĐĂNG NHẬP (Session Guard)
// // Chạy ngay khi file được load
// (function checkLogin() {
//     const isLoggedIn = localStorage.getItem('isLoggedIn');
//     const currentPage = window.location.pathname;

//     // Nếu chưa đăng nhập và không phải đang ở trang login (index.html)
//     if (!isLoggedIn && !currentPage.includes('index.html')) {
//         // Chuyển hướng về trang đăng nhập
//         // Kiểm tra xem đang ở thư mục gốc hay thư mục con
//         if (currentPage.includes('/pages/')) {
//             window.location.href = '../index.html';
//         } else {
//             window.location.href = 'index.html';
//         }
//     }

//     // Hiển thị tên người dùng nếu có
//     const username = localStorage.getItem('user');
//     const displayElement = document.getElementById('display-name');
//     if (displayElement && username) {
//         displayElement.innerText = username;
//     }
// })();

// // 2. HÀM ĐĂNG XUẤT
// function logout() {
//     if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
//         // Xóa session
//         localStorage.removeItem('isLoggedIn');
//         localStorage.removeItem('user');
        
//         // Điều hướng về Login
//         // Nếu đang ở trong pages/ thì lùi ra 1 cấp
//         if (window.location.pathname.includes('/pages/')) {
//             window.location.href = '../index.html';
//         } else {
//             window.location.href = 'index.html';
//         }
//     }
// }

// // 3. HÀM ACTIVE MENU (Tô màu menu hiện tại)
// document.addEventListener("DOMContentLoaded", () => {
//     const currentPath = window.location.pathname;
//     const menuItems = document.querySelectorAll('.sidebar li');

//     menuItems.forEach(item => {
//         // Lấy đường dẫn trong onclick hoặc thẻ a
//         // Ở đây ta đơn giản logic: Dựa vào tên file
//         if (currentPath.includes('dashboard') && item.innerText.includes('Trang Chủ')) {
//             item.classList.add('active');
//         } else if (currentPath.includes('devices') && item.innerText.includes('Thiết bị')) {
//             item.classList.add('active');
//         } else if (currentPath.includes('zones') && item.innerText.includes('Zone')) {
//             item.classList.add('active');
//         } else if (currentPath.includes('users') && item.innerText.includes('Người dùng')) {
//             item.classList.add('active');
//         }
//     });
// });