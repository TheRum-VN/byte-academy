# Báo cáo kiểm chứng Milestone 02 — Student UI

Ngày 20/10/2026, Windows, Chromium/Playwright. Phát triển tiếp monorepo hiện có; đã đọc README, PROJECT_RULES, DEVELOPMENT_PLAN, ASSET_AUDIT, manifest và hai concept trước khi sửa. Không triển khai gameplay M03.

## Phần đã triển khai

- Student Home theo concept: nền cream, banner cyan–lavender, robot atlas 01 đổi tư thế mềm, bốn thẻ atlas 14 mint/lavender/yellow/peach, nút có chiều sâu, nhiệm vụ và hai phân khu bổ sung.
- Navigation Trang chủ/Khám phá/Nhiệm vụ/Thành tích, sao, lớp học, hồ sơ, âm thanh và cài đặt. Tùy chọn âm lượng/mute được lưu; tên/lớp lấy từ phiên thực. Phòng đang tham gia được khôi phục sau reload.
- Sáu phân khu dùng lesson từ API chung; lọc lớp 1–2/3–5, cấp độ, kỹ năng, sao, tiến độ, xem từng hướng dẫn, nút trở về và khóa vào bài theo availability.
- Mười Game UI component tái sử dụng tại `apps/web/src/components/game/GameUI.tsx`. Preview dùng hướng dẫn/sidebar/điểm/timer tĩnh; modal kết quả, pause, reward và xác nhận rời bài được chuẩn bị cho gameplay thật.
- `GET /api/student/overview` đọc SQLite theo cookie thành viên còn hạn; không nhận student ID tùy ý, không trả roster, không ghi dữ liệu kết quả. Trạng thái nhiệm vụ hôm nay theo ngày Việt Nam và Result thật. Sao có thể nhận khác với sao đã đạt.
- AudioManager có voice ID/MP3, volume/mute, xử lý file lỗi/autoplay, thay hoặc dừng hướng dẫn an toàn. Chỉ fallback SpeechSynthesis khi có voice vi-VN. Không có MP3 được cung cấp nên không dựng URL giả.

## Kết quả kiểm tra

- `npm run typecheck`: đạt, bao gồm source, shared và tooling/tests.
- `npm run lint`: đạt.
- `npm run test`: 20/20 unit/integration đạt trên SQLite tạm riêng.
- `npm run build`: shared/web/server build production đạt (chạy qua `npm run test:e2e`).
- `npm run test:e2e`: 6/6 Playwright đạt trên production, gồm hai browser context giáo viên/học sinh.
- `npm run assets:audit`: giải mã 264/264 PNG, 18 nhóm; không thiếu sprite, không trùng đường dẫn/nội dung. Manifest và PNG nguồn được giữ nguyên.
- `npm run format:check`: đạt sau format báo cáo audit.

Unit/integration kiểm trạng thái đang học/hoàn thành từ dữ liệu thật, không cộng sao hai lần khi lặp lượt, ưu tiên bài được giao, cookie hết hạn, cách ly dữ liệu giữa người dùng, ngày hoàn thành, MP3 thiếu, giọng tiếng Việt không có, autoplay bị chặn và race giữa hai lần phát âm thanh.

Playwright kiểm đủ Home 1366×768, 1600×900, 1920×1080, 2560×1440 và 390×844; bốn nút phân khu nằm trong viewport desktop; robot nằm trong banner; không tràn ngang, lỗi console/pageerror hoặc lỗi HTTP asset ở luồng thành công. Kiểm thêm sáu phân khu, lọc mức lớp, navigation, modal, Escape/trả focus, volume/mute sau reload, hướng dẫn, khóa bài, nhiệm vụ, thành tích, kết nối lỗi và thử lại, reduced motion. Luồng login/tạo lớp/tạo phòng/join/Socket.IO/khôi phục sau reload, quyền backend và chặn dev gallery ở production vẫn đạt.

## Ảnh kiểm tra trực quan

Đã xem trực tiếp các ảnh QA để chỉnh bố cục, căn modal và đảm bảo robot không bị cắt:

- `.local/m02-home-1366x768.png`
- `.local/m02-home-1600x900.png`
- `.local/m02-home-1920x1080.png`
- `.local/m02-home-2560x1440.png`
- `.local/m02-home-390x844.png`
- `.local/m02-module-1366.png`
- `.local/m02-lesson-preview-1366.png`

Ảnh full-page được chụp với đúng viewport ghi trong tên; chiều cao ảnh có thể dài hơn viewport vì bao gồm nội dung cuộn. Screenshot chỉ là bằng chứng QA, không được dùng làm nền hoặc thay component.

## Giới hạn đúng phạm vi

Sáu lesson hiện vẫn `available=false`, nên chưa có lượt chơi/kết quả thực phát sinh. Nhiệm vụ là lesson gợi ý hoặc bài phòng học, không phải hệ thống giao nhiệm vụ hằng ngày mới. Guest có số sao/tiến độ bằng 0 vì không có kết quả; lỗi kết nối được báo riêng, không gán 0 giả. Chưa có bộ MP3, voice vi-VN tùy hệ điều hành. 18 atlas nguồn còn thiếu như audit M01, nhưng đủ 264 sprite runtime. Chưa kiểm tải LAN nhiều máy hoặc thiết bị học sinh vật lý. Không thay đổi schema và không reset DB vận hành.
