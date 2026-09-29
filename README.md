# Đề tài 20: Hệ thống Booking Tour / Du lịch

**Sinh viên thực hiện**: [Điền tên của bạn vào đây] - MSSV: DTC245200547

---

## 1. Kiến trúc Hệ thống
Hệ thống được triển khai trên nền tảng Docker với tổng cộng **11 container** và được cô lập bằng **3 mạng ảo (Network Isolation)** nhằm đảm bảo an toàn thông tin:

### 11 Container cấu thành
1. **`tour_web`**: Ứng dụng Node.js (Web Server & Backend) quản lý Tour và Booking.
2. **`postgres_db`**: Cơ sở dữ liệu PostgreSQL lưu trữ dữ liệu.
3. **`pgadmin`**: Công cụ quản trị CSDL trực quan qua giao diện web.
4. **`nginx_proxy`**: Nginx Reverse Proxy xử lý truy cập HTTPS và thiết lập các Security Headers.
5. **`prometheus`**: Máy chủ giám sát, thu thập metrics.
6. **`grafana`**: Nền tảng trực quan hóa dữ liệu giám sát và log.
7. **`cadvisor`**: Thu thập thông số tài nguyên hệ thống (CPU, RAM, Disk) của các Docker container.
8. **`postgres_exporter`**: Exporter hỗ trợ trích xuất metrics cho PostgreSQL.
9. **`nginx_exporter`**: Exporter hỗ trợ trích xuất metrics cho Nginx.
10. **`loki`**: Hệ thống lưu trữ và truy vấn Logs tập trung.
11. **`promtail`**: Agent thu thập logs từ các container khác để đẩy về máy chủ Loki.

### 3 Docker Networks
1. **`frontend_net`**: Mạng cho phép giao tiếp giữa Nginx Proxy và Web App.
2. **`backend_net`**: Mạng cô lập, chỉ cho phép Web App và pgAdmin kết nối trực tiếp vào Database PostgreSQL.
3. **`monitoring_net`**: Mạng dành riêng để các công cụ giám sát (Prometheus, Grafana, Loki...) liên lạc với các exporters và thu thập log/metric một cách độc lập.

---

## 2. Hướng dẫn Cài đặt & Khởi chạy

**Yêu cầu môi trường**: Máy tính đã cài sẵn Docker và Docker Compose.

1. Clone source code về máy.
2. Tại thư mục gốc của dự án, mở Terminal/PowerShell và thực thi lệnh sau để khởi động hệ thống ngầm:
   ```bash
   docker compose up -d
   ```
3. (Tùy chọn) Kiểm tra trạng thái hoạt động của 11 container:
   ```bash
   docker compose ps
   ```

---

## 3. Danh sách các Cổng (Ports) dịch vụ
Hệ thống hiển thị ra các cổng sau để người dùng có thể truy cập thông qua trình duyệt web:

- **`443` (hoặc `80`)**: Ứng dụng Booking Tour chính (https://localhost)
- **`5050`**: Giao diện quản lý CSDL pgAdmin (http://localhost:5050)
- **`9090`**: Máy chủ giám sát Metrics Prometheus (http://localhost:9090)
- **`3001`**: Dashboard giám sát trực quan Grafana (http://localhost:3001)
- **`3100`**: Máy chủ truy vấn Log Loki (chỉ phục vụ API truy vấn, không có giao diện trực tiếp)

---

## 4. Các câu lệnh truy vấn LogQL mẫu trên Grafana Loki
Sau khi cấu hình Promtail tự động trích xuất tên container vào nhãn `container`, bạn có thể dùng các câu lệnh sau trong giao diện Grafana (mục Explore -> chọn Data source Loki) để tra cứu log:

1. **Xem toàn bộ log của ứng dụng Web (`tour_web`)**:
   ```logql
   {container="/tour_web"}
   ```

2. **Lọc ra các sự kiện khách hàng Đặt tour mới**:
   Hệ thống Backend (Node.js) đã được lập trình để in ra chuỗi JSON khi có khách hàng đặt tour.
   ```logql
   {container="/tour_web"} | json | event="new_booking"
   ```

3. **Xem các request bị lỗi hoặc trả về mã trạng thái 50x trên Nginx**:
   ```logql
   {container="/nginx_proxy"} |= "HTTP/1.1\" 50"
   ```

---

## 5. Biện pháp Bảo mật & Hardening (Tiêu chí nâng cao)
Dự án được ứng dụng quy chuẩn bảo mật chặt chẽ với 5 lớp Hardening cơ bản:

1. **Non-root container user (`node`)**: Ứng dụng Node.js trong container `tour_web` được thiết lập chạy bằng quyền user thấp (`node`) thay vì quyền Root mặc định. Điều này giảm thiểu nguy cơ leo thang đặc quyền nếu bị xâm nhập mã độc.
2. **Network Isolation (Cô lập mạng)**: Phân tách hệ thống thành 3 mạng riêng biệt (`frontend_net`, `backend_net`, `monitoring_net`). Ví dụ, kẻ tấn công chiếm quyền Nginx cũng không thể truy cập trực tiếp vào Database vì chúng nằm trên 2 mạng khác nhau.
3. **Least Privilege DB User (`tour_app_user`)**: Thay vì dùng tài khoản `postgres` (supper admin), ứng dụng Node.js kết nối vào CSDL bằng user được cấp đặc quyền tối thiểu (chỉ có lệnh `SELECT, INSERT, UPDATE, DELETE`), không thể thực thi DROP bảng hay làm hỏng cấu trúc dữ liệu.
4. **Nginx HTTPS & Security Headers**: Toàn bộ lưu lượng truy cập HTTP bị ép chuyển hướng (Redirect 301) sang HTTPS. Cấu hình Nginx bổ sung hàng loạt cơ chế chống tấn công phổ biến như:
   - Chống Clickjacking (`X-Frame-Options`)
   - Chống MIME-sniffing (`X-Content-Type-Options`)
   - Chống XSS (`X-XSS-Protection`)
   - Ẩn phiên bản server (`server_tokens off`).
5. **Quản lý thông tin nhạy cảm qua `.env`**: Tất cả tài khoản DB, mật khẩu hệ thống đều được tách ra biến môi trường nằm trong file `.env`. File này đã được khai báo vào `.gitignore`, ngăn chặn triệt để tình huống làm rò rỉ secret lên GitHub hoặc Source Control.
