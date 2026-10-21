# Quy chuẩn bắt buộc BYTE ACADEMY

## Phạm vi

Sản phẩm thật cho học sinh Việt Nam lớp 1–5. Không biến thành demo/landing/dashboard doanh nghiệp. Không tự bắt đầu milestone mới. Không dữ liệu thành công, sao, điểm, tiến độ hay người dùng giả. Trang chưa có gameplay ghi rõ đang phát triển. Đọc README và DEVELOPMENT_PLAN trước khi sửa.

## Kiến trúc

npm workspaces apps/web, apps/server, packages/shared. Frontend app/pages/components/features/games/stores/hooks/services/styles/assets. Backend modules/routes/socket/services/database/middleware/validation/config. TypeScript strict + noUncheckedIndexedAccess. Contracts/events/state machine/lesson tập trung shared, build trước consumer. Luật game data-driven, không rải JSX. Phaser lazy-load, destroy khi unmount.

Giữ đủ route /, /play, sáu phân khu mouse/keyboard/files/vietnamese/computer/safety, /admin/login, /admin, classes/rooms/lessons/reports. /dev/assets chỉ development và 404 production.

## Thiết kế

Hai ảnh thật references/UIUX-concept-0.jpg và UIUX-concept-1.jpg là chuẩn: cream, soft 2.5D/clay, Byte kawaii, header bo mềm, banner chào, bốn phân khu có màu riêng. Không dùng nguyên ảnh concept làm UI. Token Mint #A8E6CF, Cyan #79D8F2, Lavender #B8A5F5, Yellow #FFE49B, Peach #FFB58F, Cream #FFFDF7, Navy #263858. Biến thể sáng phải cùng palette. Nunito hoặc Be Vietnam Pro tiếng Việt, self-host. Nút lớn, chữ dễ đọc, focus visible, form label, keyboard modal, reduced motion, mobile 390px/desktop. Admin không dùng template B2B thông thường.

Component cơ sở: GameButton/Card/Modal/Progress/Badge, StarCounter, ByteMascot, PageHeader, LessonCard, LoadingScreen, AudioControl. Không dùng Progress/StarCounter với dữ liệu bịa. M02 bổ sung bộ Game UI tại components/game, AudioManager đọc voice ID, âm lượng và hỗ trợ giọng vi-VN khi có. Không mặc định máy có giọng đọc hoặc MP3.

## Asset

Source duy nhất public/assets, Vite publicDir về root. Không copy sang apps/web/public chỉ để dev. Dist là artifact triển khai chuẩn. Manifest có atlases[]; atlas id/name/grid/source_image/output_dir/sprites; sprite index/row/col/name/filename/path. Lấy nguyên sprite.path, không suy đoán. Lookup atlas ID + sprite name. Không lặp filename hardcode. Không emoji/stock/CSS clipart/hình tạm thay asset thật. Loading/error thật, báo audit khi thiếu, phần độc lập vẫn hoạt động. Không tải 264 ảnh ở login.

Audit giải mã PNG, so CSV, đường dẫn/nội dung trùng, file ngoài manifest, concept thực có. Giữ manifest gốc; ghi chú template không phải bằng chứng thiếu sprite. Hiện 264 sprite đầy đủ, 18 atlas nguồn thiếu; không tự tái tạo khi chưa có file thật.

## Database và quyền

Prisma SQLite ngoài public, migration versioned, không reset data vận hành. PascalCase models, domain filenames, snake_case sprite giữ nguyên. Học sinh chỉ tên, không email. bcrypt, crypto session, không secret cố định/plaintext. .env ignore, .env.example không bí mật. Mọi quản trị phải kiểm owner backend, không chỉ route guard. Cookie HttpOnly/SameSite/Secure khi HTTPS. HTTP/socket origin đúng. Không public DB/file/roster. Socket subscribe kiểm quyền, không chỉ code.

Room state server kiểm transition/revision; game state cá nhân riêng. Kết quả tương lai phải xác minh/lưu transaction. Không coi contract là lý do tin client. Lifecycle giữ đúng GAME_DESIGN, available=false thì không bắt đầu.

## Hoàn tất

Giữ npm install/dev/build/typecheck/test hoạt động Windows. Health kiểm DB. Production một origin API/web/Socket.IO, LAN không cloud phí. Có lockfile. Cập nhật docs khi đổi schema/contract/design. Trước báo xong: lint/typecheck/unit/integration/E2E hai context/build thành công, xem screenshot desktop/mobile, kiểm runtime API/socket và dev gallery bị chặn production. Tests dùng DB riêng. Báo giới hạn và lệnh chạy, không tuyên bố hoàn tất khi build lỗi.
