# Milestone 05 — Thành phố Tệp tin, Khám phá máy tính và An toàn số

Ngày kiểm chứng: 21/10/2026. Phạm vi M05; không triển khai M06.

## Sản phẩm

- **10 bài quản lý tệp**: mở thư mục, tạo Bài tập, đổi tên, phân loại ảnh/video/định dạng, sao chép, kéo thả, xóa–khôi phục và tổ chức góc học tập. Mỗi bài có seed riêng; không ảnh hưởng bài khác.
- Explorer React/CSS: title bar, toolbar, breadcrumb, cây thư mục, file grid, menu chuột phải phụ thuộc đối tượng, dialog tạo/đổi tên/xóa/di chuyển/thông tin, preview chỉ đọc, status bar. Có tìm kiếm cây con, sort tên/loại, quay lại, cắt–sao chép–dán, thùng rác và undo.
- VFS TypeScript dùng ID ổn định, cha/con, loại, extension/MIME, timestamp và metadata. Có đủ tám tệp mẫu theo yêu cầu. Reducer bất biến và atomic; kiểm tên rỗng/trùng NFC/case, thư mục gốc, đích không phải folder, self/descendant/cycle. Drop không hợp lệ hoặc bị hủy không mất tệp; cắt chưa dán thành công vẫn giữ clipboard.
- **10 bài máy tính**: bốn thiết bị, nhập/xuất, mở, đóng, thu nhỏ, phóng to, kéo, resize, chuyển focus và thanh tác vụ. Hai ứng dụng mô phỏng bằng React có hình học, open/minimized/maximized/focused/background và z-index thật; không dùng ảnh chụp cửa sổ làm gameplay.
- **5 bài an toàn số**: mật khẩu mẫu, thông tin riêng, thông báo đáng ngờ, người lạ và đóng cửa sổ không mong muốn. Không nhập mật khẩu hay thông tin cá nhân thật; chọn sai được giải thích và thử lại. Bài đóng cửa sổ chỉ đạt sau khi cửa sổ thực trong UI được đóng.
- Sprite thật của atlas 03/09/10/15/12 qua registry và manifest. Giữ phong cách Soft 2.5D, Nunito local, focus bàn phím, native modal, reduced motion và bố cục 390px.

## Lưu và chấm điểm

API `/simulation/attempts` tạo hoặc trả lại lượt dở đúng học sinh/bài/phòng. Mỗi command có schema và expected revision, được máy chủ áp dụng vào snapshot SQLite. Client không gửi cây tệp hoặc điểm để tự quyết kết quả. Reload rồi bấm Bắt đầu thực hành để tiếp tục; nếu lượt đã pause thì bấm Tiếp tục. Khi không xác nhận được request, UI tải snapshot đã lưu trước khi cho thao tác tiếp.

Mục tiêu kiểm đúng node, tên, vị trí, loại/đuôi và trạng thái chưa xóa. Bài copy giữ bản gốc và kiểm bản sao; bài drag kiểm phương thức di chuyển; bài restore kiểm dấu vết khôi phục; bài đóng cửa sổ phải mở trước. Nút Nộp không làm điều kiện thành đúng. Reset chỉ thay snapshot của lượt hiện tại. Undo tối đa 20 bước dữ liệu; ID không tái sử dụng sau undo.

Result, Progress và Achievement lưu transaction, retry cùng lượt không cộng trùng. Điểm theo tỷ lệ điều kiện đúng; chỉ đạt khi đủ điều kiện. Không yêu cầu tốc độ. Câu hỏi sai ảnh hưởng accuracy/sao; thao tác VFS không hợp lệ được giải thích, không phạt thêm. Phòng học dùng cookie owner và Socket.IO lifecycle hiện có; pause/kết thúc phòng được kiểm ở backend. Thời gian bỏ khoảng pause, chỉ tham khảo.

Migration `20261021100000_simulation_modules` bổ sung hai cột Attempt, không reset DB. Sáu intro cũ giữ ID và được retired; có 70 định nghĩa, 64 bài chơi được sau seed.

## Kiểm thử tự động

```powershell
npm run assets:audit
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright test
npm run setup
```

- Asset audit: **264/264 PNG** giải mã và khớp manifest/CSV, không trùng nội dung/đường dẫn hoặc sprite ngoài manifest. 18 atlas nguồn vẫn thiếu như các milestone trước; các sprite runtime đầy đủ.
- ESLint và TypeScript: đạt toàn workspace cùng test/tool TypeScript.
- Vitest: **197/197 đạt**, chín file test. M05 thêm 52 unit và 5 integration. Gồm create/rename/delete/restore/copy/paste/cut/move/drop, trùng tên NFC, invalid nesting/root, navigation/search/sort, undo, serialization, window lifecycle/geometry/focus, trạng thái đầu chưa đạt và lời giải thật cho toàn bộ 25 bài. Có test không cho đổi đuôi ảnh để vượt điều kiện phân loại.
- Integration kiểm chuỗi tạo → đổi tên → chuyển file → reload → xác minh → lưu kết quả, không tin state/score giả, quyền người khác, revision cũ, rollback, reset, idempotency, hoàn thành 25 bài và room pause/resume/report.
- Production build shared/web/server: đạt. Cảnh báo bundle Phaser cũ >650 kB vẫn còn; các mô-đun M05 được lazy-load riêng.

- E2E hồi quy cuối: **149/149 đạt** trong 9,3 phút trên bản production cố định, không rebuild giữa lượt. Chromium chạy toàn bộ 86 test, Edge chạy 63 test luyện gõ/mô phỏng; riêng M05 **58/58** (29 mỗi browser). Cả hai bài timer gõ đều chờ đủ một phút thật. Không có test lỗi ở lượt cuối.
- `npm run setup`: đạt trên DB hiện tại; apply thành công migration M05, seed **70 định nghĩa / 64 bài chơi được**, giữ dữ liệu cũ. Chỉ chạy sau khi server E2E đã dừng để tránh khóa Prisma DLL trên Windows.

## Phạm vi E2E và hình ảnh

Playwright chạy production tại 3101, DB `.local/e2e.db`; Vitest dùng `.local/vitest.db`. Không reset database vận hành. Bộ E2E M05 có 29 test mỗi browser: hoàn thành cả 25 bài bằng UI, reload và chuỗi tổ chức tệp, menu/ngữ cảnh/phím tắt/undo/reset/search/sort/preview/drop hủy, hai context giáo viên–học sinh và screenshot.

Native browser drag/drop đưa tệp vào folder; pointer capture kéo/resize cửa sổ; kiểm taskbar/focus/z-index và đóng cửa sổ. Luồng hai context kiểm pause, tiếp tục, kết thúc phòng và kết quả lưu. Regression cũ tiếp tục kiểm API/socket/ownership, production chặn `/dev/assets` và file riêng.

Đã mở và xem 12 ảnh toàn trang 1440px và 390px của Explorer, desktop và an toàn số trên Chromium và Edge. Sprite hiển thị đúng, bố cục không tràn ngang toàn trang; test cũng kiểm naturalWidth của sprite và pageerror. Desktop nhỏ cuộn ngang bên trong vùng máy tính 1000×600 để giữ kích thước điều khiển. Explorer có vùng cuộn riêng cho lưới tệp, không ép tất cả biểu tượng vào màn hình nhỏ.

- `.local/m05-chromium-files-organize-1440.png` và `-390.png`
- `.local/m05-chromium-computer-launch-1440.png` và `-390.png`
- `.local/m05-chromium-safety-password-1440.png` và `-390.png`
- `.local/m05-edge-...` cùng sáu màn hình.

## Giới hạn kiểm chứng và sử dụng

- Có Edge cài trên máy, chạy `channel: msedge`. Không tìm thấy Chrome cài riêng ở đường dẫn chuẩn; dùng Chromium Playwright, không gọi đó là đã kiểm Chrome cài riêng.
- Automation dùng sự kiện browser thật; chưa kiểm chuột vật lý, cảm ứng, các driver thiết bị hoặc tải LAN 30–60 máy. Cần thử trên máy phòng học trước vận hành rộng.
- Đây là VFS và ứng dụng mô phỏng. Không đọc/ghi filesystem Windows hoặc xin quyền file. Preview là nội dung chỉ đọc; chưa có trình soạn thảo Word/Excel hay media player thật.
- Giới hạn 128 node, 20 undo snapshot và 500 command mỗi lượt trước reset. Đây là môi trường thực hành có giới hạn, không thay hệ quản lý tệp đa dụng.
- Tự luyện nhận diện bằng cookie tám giờ; xóa/hết cookie không khôi phục được danh tính cũ từ giao diện. Dữ liệu kết quả vẫn giữ ở server. Mạng phải hoạt động để lưu từng thao tác; khi request chưa rõ kết quả, UI khóa thao tác và hỗ trợ tải lại trạng thái.
- Hai ứng dụng desktop là Ghi chú chỉ đọc và Album thiết bị. Vùng desktop nhỏ cần cuộn ngang; hỗ trợ phím cho dịch/resize cửa sổ nhưng bài kéo tệp vẫn yêu cầu thao tác drag/drop.

Hướng dẫn chạy: `npm run dev`; production/LAN: `npm run setup`, `npm run build`, `npm start`, cấu hình APP_ORIGIN theo README.

Milestone 05 hoàn tất trong phạm vi đã mô tả. Không bắt đầu Milestone 06.
