# Chỉnh giao diện Chuột và fit màn hình thực hành

Ngày 21/10/2026. Theo yêu cầu cập nhật: fit toàn bộ kích thước cửa sổ, không khóa màn hình vào tỷ lệ 16:9. Không mở Milestone 06.

## Thay đổi

- Chuột: khu vườn phủ nền, menu kỹ năng nổi, header gọn, nút quay lại màu peach, hướng dẫn nổi và trạng thái nhiệm vụ dưới cảnh. Dùng sprite atlas 04/05/06/12 hiện có, không dùng ảnh concept làm nền gameplay. Điểm/mục tiêu vẫn lấy từ reducer/kết quả thật.
- Bàn phím, Tiếng Việt, Tệp, Máy tính và An toàn số: trang thực hành phủ viewport, không còn nằm trong thẻ hẹp của Student shell. Header/toolbar/điểm/nút nộp giữ vị trí; nội dung có thể cuộn bên trong panel trên màn nhỏ.
- Tất cả có nút bật/tắt Fullscreen API sau click. Trình duyệt không hỗ trợ hoặc từ chối có thông báo dùng F11. Không tự bật fullscreen khi tải trang.
- Nền và UI reflow theo viewport. Vùng tương tác Chuột giữ logic 960×560 và fit đồng nhất vào phần trống; con trỏ chuyển từ bounding rect thực sang tọa độ logic. Bỏ Phaser FIT lần hai để không co canvas hai lần.
- Desktop giữ logic 1000×600, tự fit vùng trống; kéo/resize chia delta màn hình cho scale được chụp đầu gesture. Thay kích thước màn hình hủy gesture đang dở để không nhảy cửa sổ. Không đổi schema, API chấm điểm hoặc dữ liệu vận hành.

## Kiểm chứng

- Lint, typecheck, production build: đạt.
- Unit/integration: 197/197 đạt.
- E2E mới kiểm root bằng đúng width/height viewport ở 1920×1080, 1366×768, 1440×1000, 2560×1080, 390×844 và 844×390 (tùy bài); kiểm Fullscreen API bật/tắt thật, canvas giữ đúng tỷ lệ hình, asset tải thật, không cuộn ngang/dọc toàn trang.
- Ảnh sáu kỹ năng Chuột: `.local/mouse-redesign-{chromium|edge}-{left|right|double|drag|middle|wheel}-1920.png`; thêm ready, 1366px, 390px và 844px.
- Ảnh năm phân khu khác: `.local/practice-fit-{chromium|edge}-{keyboard|vietnamese|files|computer|safety}-{1366|390}.png`.

Lượt E2E hồi quy cuối đang chạy; ghi kết quả cuối bên dưới sau khi kết thúc. Bản build được giữ nguyên trong mỗi lượt kiểm thử.

## Giới hạn

Edge cài trên máy và Chromium Playwright; chưa có Chrome cài riêng. Chưa kiểm chuột vật lý, cảm ứng/driver, IME Windows thật hoặc tải LAN nhiều máy. Bài Chuột vẫn yêu cầu con trỏ chuột, không đổi luật thành click nút thay thao tác. Màn dọc hẹp có thanh kỹ năng cuộn ngang và gợi ý xoay ngang; bảng tệp/trang viết cuộn bên trong để giữ chữ và nút đọc được. Bundle Phaser vẫn có cảnh báo kích thước cũ; build thành công.

Chạy `npm run dev`, vào các route `/play/<module>/practice/<lessonId>`. Báo cáo milestone trước là ảnh chụp kiểm chứng tại thời điểm đó; bố cục fullscreen hiện tại được mô tả tại tài liệu này.
