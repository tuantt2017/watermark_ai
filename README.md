# WatermarkRemover AI (Client-Side Web App)

Ứng dụng web xóa watermark trên **Hình ảnh** và **Video** hoạt động **100% trên trình duyệt (Client-Side)**.
- **Không cần Backend / Máy chủ**: Không tốn chi phí server, không bảo trì API server.
- **Không cần Cơ sở dữ liệu**: Dữ liệu lưu trong RAM của trình duyệt (Blob URLs) và `localStorage`.
- **Bảo mật tuyệt đối**: Tệp ảnh và video không tải lên mạng (trừ khi dùng Gemini AI cho ảnh).
- **Chi phí 0đ**: Sử dụng WebAssembly (OpenCV.js và FFmpeg.wasm) chạy trực tiếp bằng CPU máy tính của người dùng.

---

## 🚀 Tính Năng Chính

### 1. Xử Lý Ảnh (Image Watermark Removal)
- **Công cụ vẽ Mask linh hoạt**:
  - Cọ vẽ tự do (Brush) với thanh trượt chỉnh kích thước từ `5px` đến `100px`.
  - Khung viền chữ nhật (Rectangle selection) để kéo bao quanh logo nhanh chóng.
  - Tẩy mask (Eraser) & Hoàn tác (Undo).
- **Chế độ Xóa Nhanh (OpenCV.js Telea WASM)**:
  - Tốc độ ~0.3 giây, hoạt động offline, mượt mà và không để lại vết mờ.
  - Có tích hợp sẵn Pure JavaScript Inpainting Fallback phòng trường hợp mạng chặn CDN.
- **Trợ lực bởi Google Gemini AI**:
  - **Tự động quét toạ độ watermark**: Gemini Vision AI phân tích ảnh và tự động khoanh vùng tất cả watermark, logo, timestamp trên ảnh.
  - **Xóa AI Tái tạo**: Dùng GenAI để tái tạo vùng ảnh bị che khuất với chi tiết chân thực cao.
- **Thanh trượt so sánh Before/After**: Kéo thanh trượt để so sánh trực quan ảnh gốc và ảnh sau khi xóa.

### 2. Xử Lý Video (Video Watermark Removal)
- **Công nghệ FFmpeg WebAssembly (`@ffmpeg/ffmpeg`)**:
  - Chạy FFmpeg nguyên bản trong trình duyệt qua Web Worker.
- **Khung chọn Watermark tương tác**:
  - Người dùng có thể kéo thả, di chuyển và co giãn khung viền đỏ trực tiếp trên màn hình video.
  - Có sẵn các nút preset vị trí: *Góc trên phải, Góc dưới phải, Góc trên trái, Góc dưới trái*.
- **2 Bộ lọc xử lý**:
  - **Xóa nội suy (Delogo)**: Tự động tính toán các pixel xung quanh để xóa phẳng watermark mà không làm giảm chất lượng tổng thể và giữ nguyên âm thanh (`-c:a copy`).
  - **Làm mờ mịn (BoxBlur)**: Làm mờ cục bộ vùng logo.
- **Tích hợp trình tạo video mẫu (Demo Generator)**:
  - Tự động dựng video mẫu 3s bằng Canvas + MediaRecorder ngay trong trình duyệt để thử nghiệm tính năng ngay lập tức.

---

## 🛠 Hướng Dẫn Chạy Cục Bộ

1. Cài đặt các gói phụ thuộc (nếu chưa có):
```bash
npm install
```

2. Khởi động môi trường dev:
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:5173/`

3. Đóng gói bản chạy production:
```bash
npm run build
```
Thư mục `dist/` có thể tải lên bất kỳ dịch vụ web tĩnh nào (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

---

## 🔑 Cấu Hình Google Gemini API (Tùy chọn)

Nếu bạn muốn sử dụng tính năng **Tự động quét watermark** hoặc **AI Tái tạo**:
1. Lấy API Key miễn phí tại: [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Mở ứng dụng, nhấn nút **"Cấu hình Gemini AI"** ở góc phải thanh tiêu đề.
3. Dán API Key vào và nhấn **Lưu Cấu Hình**.
*(API Key chỉ được lưu cục bộ trong trình duyệt của bạn, hoàn toàn bảo mật).*
