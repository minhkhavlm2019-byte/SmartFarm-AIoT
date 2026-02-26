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

                // --- 4. LƯU DỮ LIỆU ---
                localStorage.setItem('access_token', data.access_token);
                
                // Lưu Role (Dự phòng: nếu server null thì ép thành admin để test)
                localStorage.setItem('user_role', data.role || 'admin'); 
                
                // Lưu Tên
                localStorage.setItem('user_name', data.username || usernameInput); 
                
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

    // --- PHẦN 2: LOGIC BẢO VỆ DASHBOARD ---
    checkLogin();
    applyPermissions();
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

function applyPermissions() {
    const rawRole = localStorage.getItem('user_role');
    const role = (rawRole || "").toLowerCase(); // admin hoặc farmer

    // 1. Xử lý Menu Sidebar (Ẩn menu "Người dùng" với Farmer)
    // Tìm thẻ a có chứa link users.html
    const userMenuLink = document.querySelector('a[href*="users.html"]'); 
    
    if (userMenuLink && role !== 'admin') {
        // Ẩn thẻ li chứa thẻ a đó (nếu cấu trúc là ul > li > a)
        if(userMenuLink.parentElement.tagName === 'LI') {
            userMenuLink.parentElement.style.display = 'none';
        } else {
            userMenuLink.style.display = 'none';
        }
    }

    // 2. Xử lý các nút chức năng (Chỉ Admin mới thấy nút Thêm/Xóa)
    if (role !== 'admin') {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = 'none'; // Ẩn hoàn toàn
        });
    }
} // <--- BẠN ĐÃ THIẾU DẤU NÀY Ở CODE CŨ

// Hàm Đăng xuất
function logout() {
    if (confirm("Bạn muốn đăng xuất?")) {
        localStorage.clear(); // Xóa sạch Token, Role, Name
        
        // Kiểm tra đang ở đâu để quay về trang Login đúng cách
        if (window.location.pathname.includes('/pages/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
    }
}