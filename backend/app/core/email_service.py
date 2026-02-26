import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading

# CẤU HÌNH GMAIL CỦA HỆ THỐNG
SENDER_EMAIL = "minhkhavlm2019@gmail.com"  # Thay bằng email của bạn
SENDER_PASSWORD = "zgva bylg dkjw auhw"    # Thay bằng Mật khẩu ứng dụng (App Password)

def _send_email_task(to_email: str, subject: str, body: str):
    """Hàm chạy ngầm thực thi việc gửi email"""
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'html'))

        # Kết nối tới server Gmail
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ Đã gửi email cảnh báo tới: {to_email}")
    except Exception as e:
        print(f"❌ Lỗi khi gửi email: {e}")

def send_alert_email(to_email: str, subject: str, html_body: str):
    """
    Hàm gọi gửi email (Chạy đa luồng - Threading để không làm chậm API)
    """
    if not to_email:
        return
    # Đẩy việc gửi mail sang một luồng khác để API phản hồi ngay lập tức
    thread = threading.Thread(target=_send_email_task, args=(to_email, subject, html_body))
    thread.start()
def send_otp_email(to_email: str, otp: str):
    """
    Hàm đóng gói nội dung HTML để gửi mã OTP khôi phục mật khẩu.
    """
    subject = "Mã OTP Khôi phục mật khẩu - LettuceIoT"
    
    # Thiết kế mã HTML cho email trông chuyên nghiệp và nổi bật mã OTP
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                
                <h2 style="color: #059669; text-align: center; margin-top: 0;">Khôi phục mật khẩu</h2>
                <p>Chào bạn,</p>
                <p>Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản trên hệ thống <b>LettuceIoT</b>. Dưới đây là mã xác nhận (OTP) của bạn:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981; background-color: #ecfdf5; padding: 15px 25px; border-radius: 12px; border: 2px dashed #34d399; display: inline-block;">
                        {otp}
                    </span>
                </div>
                
                <p style="color: #ef4444; font-size: 14px; text-align: center; font-weight: bold;">
                    Lưu ý: Mã này chỉ có hiệu lực trong vòng 5 phút.
                </p>
                <p style="font-size: 14px;">Vui lòng không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn cho tài khoản của bạn.</p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                    Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.<br>
                    Hệ thống Nông nghiệp Thông minh LettuceIoT.
                </p>
            </div>
        </body>
    </html>
    """
    
    # Gọi lại hàm send_alert_email để nó tự đẩy vào luồng (Thread) chạy ngầm
    send_alert_email(to_email, subject, html_body)