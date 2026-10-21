# Báo cáo kiểm chứng Milestone 01

Ngày 20/10/2026, Windows PowerShell, Node 26.8.1 / npm 12.2.0. Chưa kiểm trên máy học sinh vật lý hoặc tải đồng thời cả phòng máy.

## Lệnh đã thực hiện

- Kiểm tra repository bằng `rg --files`, `Get-ChildItem -Force/-Recurse`, tìm AGENTS.md, đọc JSON/CSV.
- `npm install`: thành công sau một lần mạng ECONNRESET; postinstall shared/Prisma đã chạy được. Có package-lock.json.
- `npm run assets:audit`: Pillow giải mã 264 PNG, đối chiếu CSV/grid/filename/path, duplicate path/name/SHA-256, tìm source atlas và references.
- `npm run db:generate`, `prisma migrate dev --name init`, `npm run db:migrate`, `npm run db:seed`: tạo migration versioned, SQLite và sáu lesson definitions thật. Setup chạy lại không reset data.
- `npm run dev`: frontend 5173 và backend 3001 chạy đồng thời, API proxy/health hoạt động.
- `npm run lint`, `npm run typecheck`: gồm source, tests và TS tooling.
- `npm run test`: 12 unit/integration tests với SQLite riêng.
- `npm run build`: production React/shared/server thành công.
- `npx playwright install chromium`, `npm run test:e2e`: 3 tests trên production, hai browser contexts riêng.
- `npm run format:check`, `npm audit`: Prettier và kiểm dependency.

Kết quả cuối: lint/typecheck/format đạt; 12/12 unit/integration và 3/3 Playwright đạt; production build thành công; npm audit 0 lỗ hổng. `npm start` với cấu hình localhost mặc định: health kết nối SQLite, /play trả 200, /dev/assets trả 404; request login cùng origin đi qua kiểm origin và trả 401 khi cố ý dùng tài khoản không tồn tại.

## Bằng chứng

264/264 sprite đọc được; 18 nhóm khớp manifest; không thiếu/trùng/sai định dạng. Thiếu 18 atlas nguồn, không thiếu sprite. Đã đọc hai concept được người dùng bổ sung. Chi tiết ASSET_AUDIT.md.

Dev gallery: 264 img, 264 trạng thái Đã tải, 0 ảnh hỏng, 0 pageerror. Login chỉ tải một sprite mascot. HTTP health SELECT 1 trả database connected.

Unit/integration kiểm state machine, definitions, manifest/cache retry, SQLite persistence, hash password, cookie HttpOnly, validation/origin, ownership giữa hai giáo viên, join, chặn gameplay chưa mở, revision conflict, chặn join sau kết thúc, báo cáo rỗng thật và logout.

Playwright kiểm desktop/mobile 390px không tràn ngang; ảnh thật tải thành công; mở/đóng dialog từ navigation; admin guard/login/tạo lớp/tạo phòng; học sinh join ở context riêng; số thành viên cập nhật trực tiếp và tồn tại sau reload. Học sinh gọi state API bị 401; socket không xác thực subscribe bị từ chối; giáo viên kết thúc thì học sinh nhận state ngay. Production /dev/assets và ảnh không tồn tại trả 404. DB không được phục vụ như binary static.

Đã xem ảnh `.local/student-desktop.png`, `.local/student-mobile.png`, `.local/admin-rooms.png` để rà bố cục. Ảnh chỉ là output QA, không thay source UI. Mobile đã chỉnh Byte về hàng riêng để không đè chữ.

## Lỗi đã sửa

Network install gián đoạn; kiểu Prisma nested relation; ESLint globals cho mjs; strict type của cookie assertion; navigation query mở dialog; thư viện test/deepmerge có advisory; npm override conflict; Windows yêu cầu tạo file SQLite mới trước migrate; generate DLL bị khóa khi server chạy. Build đã tách khỏi generate, setup/postinstall phụ trách chuẩn bị engine.

## Giới hạn còn lại

Chưa có gameplay/scoring/attempt submission hay quản trị tiết học chi tiết; chưa có chọn roster, reset password, âm thanh, export báo cáo hoặc kiểm tải LAN nhiều máy. PNG lớn cần tối ưu ở giai đoạn tiếp. AudioControl mới lưu sở thích. Phaser adapter chưa có scene. Không có default account trong DB vận hành; tạo giáo viên bằng CLI theo README. Không tự bắt đầu milestone tiếp theo.
