# Milestone 03 — Kiểm chứng Vương quốc Chuột

Ngày kiểm chứng: 20/10/2026 (Asia/Saigon). Phạm vi chỉ Milestone 03; chưa bắt đầu Milestone 04.

## Chức năng đã triển khai

| Kỹ năng                         | Cấp 1                                 | Cấp 2                                       | Điều kiện thao tác                                                                                  |
| ------------------------------- | ------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Click trái · Bong bóng sắc màu  | 3 bong bóng lớn, dao động ít          | 5 bong bóng nhỏ hơn, dịch chuyển chậm       | Hai sự kiện down/up button 0, không giữ/kéo; đúng mục tiêu viền vàng                                |
| Click phải · Chiếc rương bí mật | 3 rương; chọn Mở rương                | 5 rương; chọn Xem vật phẩm                  | Click phải button 2 thật trên rương rồi click trái chọn menu                                        |
| Nháy đúp trái · Mở kho báu      | 3 rương lớn                           | 5 rương nhỏ                                 | Hai click trái cùng rương trong ngưỡng 450/650/900ms; không nhận giữ, phải, giữa hoặc cặp qua pause |
| Kéo thả · Thu thập ngôi sao     | 5 sao lớn                             | 8 sao phân bố rộng                          | Giữ trái, kéo liên tục, thả vào vùng giỏ; giữ offset; sai/cancel trả về gốc                         |
| Click giữa · Cánh cổng thần kỳ  | 3 cổng                                | 5 cổng nhỏ hơn                              | Button 1, cổng sáng lên; cần chuột có nút giữa                                                      |
| Cuộn · Cuộn để khám phá         | Xuống kho báu → lên táo → tìm hộp quà | Bắt đầu giữa bản đồ, xuống → lên → tìm xoài | Wheel deltaY thật, có cả hai hướng; không có nút cuộn giả                                           |

Phaser 3 lazy-load và cleanup khi rời route. React phụ trách HUD, sidebar sáu kỹ năng, cấp độ, âm thanh, countdown, pause/exit/result. Dùng sprite thật atlas 01/04/05/06/12 qua manifest; cây, nấm, hoa, giỏ, sao, rương đóng/mở, con trỏ và phần thưởng. Gate ghép từ crate/padlock/key có trong atlas 06; không tạo sprite nguồn mới.

Tự luyện tự do chọn cấp độ; cookie HttpOnly riêng lưu định danh ẩn danh để đọc lại tiến độ. Bài trong phòng bị khóa theo lesson giáo viên chọn; có UI bắt đầu/tạm dừng/tiếp tục/kết thúc cả lớp và đồng bộ Socket.IO. Mất focus/ẩn tab tạm dừng cá nhân; mất kết nối phòng chặn thao tác. Kết thúc sớm lưu kết quả chưa đạt, không tự cho qua.

Máy chủ tạo Attempt/seed, kiểm lại log input bằng reducer dùng chung, tự tính điểm, ghi Result/Progress/Achievement trong transaction. Idempotency theo attemptId; không tính điểm hai lần trên cùng mục tiêu hoặc cộng sao vô hạn khi chơi lại. Reward giữ số sao cao nhất từng bài. Frontend không import Prisma. Bài mouse-intro cũ được retired, giữ trong DB cho lịch sử; danh sách công khai có đúng 12 bài chuột.

## Lệnh và bằng chứng

| Kiểm tra                                    | Kết quả                                                          |
| ------------------------------------------- | ---------------------------------------------------------------- |
| npm run lint                                | Đạt                                                              |
| npm run typecheck                           | Đạt                                                              |
| npm run test                                | 49/49 test · 5 file unit/integration                             |
| npm run test:e2e (bao gồm build production) | Đạt · 23/23 Playwright Chromium, có 2 context giáo viên/học sinh |
| npm run assets:audit                        | 264/264 PNG giải mã; 0 sprite thiếu; 0 path/content trùng        |

Bộ kiểm thử:

- Unit: phân biệt nút trái/phải/giữa, giữ/kéo không thành click, double-click timing và tùy chỉnh, cancel/pause cắt chuỗi, menu yêu cầu nút phải, offset kéo, biên drop zone, wheel direction/quãng đường/quán tính, đủ 12 bài, giới hạn điểm, mục tiêu không ghi hai lần, thứ tự level.
- Integration SQLite riêng `.local/vitest.db`: xác thực cookie/owner, không mở lesson chưa available, replay log và tính điểm server, transaction/idempotency, không tin score client, timestamp/pause, partial result, đúng lesson/phòng PLAYING, revision cũ, quyền báo cáo.
- Playwright Chromium với production CSP và DB riêng `.local/e2e.db`: hoàn thành 12/12 bài bằng mouse click/right/dblclick/drag/middle/wheel thật của automation; lưu kết quả và đọc overview; sai nút/đúp chậm; pause/resume; drag nhanh/ra ngoài canvas/pointercancel; đổi level; hai context giáo viên–học sinh; phòng pause/resume (Escape không đóng lớp phủ do giáo viên khóa) và kết thúc sớm; retry sau HTTP 503; menu chỉ chặn trong canvas bài phải; wheel không cuộn trang; thiếu PNG chặn vào chơi; regression M01–02 và `/dev/assets` 404 production.

Không chỉ dựa vào DOM: đã xem PNG desktop/mobile. Ảnh tại `.local/m03-garden-desktop.png`, `.local/m03-garden-mobile.png`, `.local/m03-room-paused.png` và `.local/m03-mouse-*-result.png`. Giao diện mobile 390px không tràn trang; khu vườn có scroll ngang riêng để giữ kích thước vật thể đủ lớn. Desktop được kiểm ở 1366px; bộ regression M02 còn kiểm 1600/1920/2560px.

Trong QA đã phát hiện và sửa CSP chặn blob texture của Phaser: dùng loader HTMLImageElement và kiểm tra mọi texture trước scene ready, không nới CSP. Test console error và test thiếu asset bảo vệ lỗi này. Đã sửa xử lý cancel khi room pause: bản ghi hủy thao tác được phép vì chỉ xóa gesture, không cộng điểm; thao tác chơi trong pause vẫn bị từ chối.

## Checklist chuột vật lý — chưa xác minh trên thiết bị lớp học

Các ô sau cố ý để trống. Playwright middle-click không thay thế kiểm tra driver, bánh xe và auto-scroll của hệ điều hành.

- [ ] Windows 10/11 + Chrome/Edge, chuột USB 3 nút: trái/phải/giữa phân biệt đúng, cả hai cấp độ.
- [ ] Nhấn giữa trong cổng không bật auto-scroll; ngoài vùng bài giữa, hành vi giữa mặc định vẫn hoạt động.
- [ ] Trong bài phải hiện menu riêng, sát bốn cạnh không bị cắt; ngoài canvas vẫn có context menu trình duyệt.
- [ ] Double-click ở cấu hình 450/650/900ms; hai click quá chậm, giữ lâu, click phải hoặc đổi tiêu điểm không mở rương.
- [ ] Kéo sao thật nhanh, lệch khỏi canvas/cửa sổ, thả ngoài giỏ, Alt+Tab và quay lại: không mất sao, không nhảy offset, không cộng lại sao đã thu.
- [ ] Bánh xe có nấc và cuộn mượt: xuống/lên/tìm vật phẩm; quán tính sau chuyển nhiệm vụ không gây lỗi trong khoảng chuyển 500ms; trang ngoài game không cuộn theo.
- [ ] Touchpad không có nút giữa: không thể dùng click trái/touch để vượt bài; hướng dẫn đổi sang chuột hiển thị rõ.
- [ ] Zoom Windows/browser 100/125/150%, màn hình máy học sinh; hitbox, drop zone, con trỏ và menu khớp sprite.
- [ ] Mở room trên máy giáo viên và máy học sinh thật; pause giữa lúc kéo/nháy đúp, resume, rút mạng và nối lại, kết thúc sớm.
- [ ] Máy có/không có giọng vi-VN, bật/tắt tiếng và âm lượng; chữ hướng dẫn luôn đọc được. Chưa có MP3 thu âm được cung cấp.

## Giới hạn vận hành

Bundle Phaser khoảng 1.2MB trước gzip (được lazy-load); PNG nguồn còn lớn. Build có cảnh báo kích thước chunk, không có lỗi build. Chưa đo LAN 30–60 máy, chưa chứng nhận các thiết bị vật lý/driver hoặc giọng đọc Windows. 18 atlas nguồn vẫn thiếu như audit trước, 264 sprite runtime đầy đủ.

Phiên tự luyện cookie có hạn 8 giờ, không phục hồi định danh sau khi xóa cookie. Replay kiểm tính nhất quán log và chặn dữ liệu điểm trực tiếp; không phải chứng thực phần cứng chống client cố tình giả mạo. Luồng room vẫn dùng tên tự khai theo phạm vi M01–02. Các phân khu khác chưa có gameplay, không triển khai Milestone 04.

Kiểm tra môi trường phát triển sau migration: `/api/health` trả `database=connected`; `/api/lessons` trả 17 lesson công khai, trong đó đủ 12 bài chuột available=true. `npm run dev` đã được khởi động lại tại http://localhost:5173, API tại cổng 3001. Migration bổ sung đã áp dụng lên DB hiện có, không reset dữ liệu.
