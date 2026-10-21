# Milestone 04 — Học viện Bàn phím và Xưởng gõ Tiếng Việt

Ngày kiểm chứng: 21/10/2026. Phạm vi M04, không triển khai M05.

## Kết quả triển khai

- 16 bài bàn phím / sáu nhóm: chữ, số, phím đặc biệt; hàng cơ sở; hàng trên; hàng dưới; từ; số ký tự và một phút. 11 bài tiếng Việt: tên, chữ cái, nguyên âm có dấu, từ ngắn, dấu thanh, câu, nhiều câu, dấu câu, đoạn, sửa lỗi và luyện đều. Bài mở theo dữ liệu shared, có lọc nhóm; intro cũ retired nhưng giữ ID/DB.
- Bàn phím QWERTY React/CSS theo code, màu nhóm ngón, F/J có gờ, highlight phím/giữ phím. Hai tay atlas 07 đúng trái/phải và ngón. Không cộng tiến độ khi click phím ảo. Có mẫu chữ, phím kế, CPM/WPM/accuracy/streak/timer/progress/audio/pause. Không yêu cầu tốc độ cho bài nhập môn.
- Xưởng theo concept D: bảng gỗ, bàn viết, cây, notebook, Byte, bàn phím nhỏ. Hai chế độ do người học chọn: hệ điều hành giữ nguyên Unicode, tích hợp Telex/VNI cần máy ở ENG. Không tự đoán IME. Engine theo âm tiết, bảo toàn hoa/thường, dấu/shape, ưu/ươu/qu/gi, sửa theo selection; không chuyển cả câu bằng replace.
- CompositionGate bỏ qua input đang ghép; NFC + grapheme so sánh, mint/peach/trung tính. Chỉnh sửa UTF-16 selection được căn lại theo prefix NFC. Backspace/Delete/selection dùng thao tác thật của textarea. Pause hủy phần composition chưa commit, giữ bản ổn định.
- Tự luyện và lớp học dùng cookie HttpOnly, lesson/session do server kiểm, Socket.IO revision và controlLog. Mất focus/mạng dừng thao tác; kết thúc phòng tự nộp phần đang làm; sau đó có thể tự luyện. Không ghi điểm vào localStorage.
- Server replay/tính điểm, không tin score/WPM client. Transaction Result/Attempt/Progress/Achievement, retry cùng attempt không cộng trùng. Khi HTTP lỗi, giữ nguyên log đã nộp để retry. Migration thêm config/chỉ số, không reset DB. Báo cáo giáo viên có chỉ số gõ và kiểm owner.
- Atlas 01/02/07/08/11/12 được lấy qua manifest registry. Không dùng ảnh bàn phím tĩnh làm input. AudioManager hiện có tiếp tục hỗ trợ đăng ký file thu âm; không có MP3 giả, không lấy audio ngoài dự án. Chỉ phát sau thao tác, dùng vi-VN nếu có, có fallback chữ.

## Lệnh kiểm chứng

```powershell
npm run assets:audit
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright test
npx playwright test tests/e2e/typing.spec.ts
```

Lượt regression toàn dự án: **83/83 E2E đạt** (Chromium toàn bộ luồng cũ/mới và Edge cho M04). Sau các bổ sung kiểm thử timer 60 giây, retry, con trỏ và kết thúc phòng, chạy lại bộ M04 trên hai browser; kết quả cuối ghi bên dưới. Các test dùng `.local/vitest.db` / `.local/e2e.db`, không reset dữ liệu vận hành.

Unit/integration bao gồm KeyboardEvent down/up/repeat/modifier/composition/blur reset, code khác key/layout, mọi nhóm ngón, Backspace, sai/streak, công thức CPM/WPM/accuracy/stars, thời gian trước gõ và pause, Unicode NFC/NFD/grapheme, Telex/VNI/hoa/dấu/vần phức hợp, composition gate, đổi mode, selection, mọi bài theo ký tự và quyền phòng/kết quả/idempotency. Corpus bắt buộc: Việt Nam, trường học, máy tính, học sinh, Tiếng Việt, Nguyễn; thêm đủ nguyên âm × năm dấu, câu mẫu, ưu/ươu/quơ, xóa dấu/escape.

E2E dùng phím browser để hoàn thành 15 bài bàn phím theo ký tự; native Unicode input cho cả 11 bài tiếng Việt; gõ từng phím Telex/VNI; chu kỳ composition; sửa giữa câu và con trỏ NFD→NFC; click ảo không làm tiến bài; idle/pause/resume/focus; mất HTTP và retry; teacher/student hai browser context; teacher finish và tự luyện sau phòng; bài một phút chờ đủ **60 giây thật** rồi kiểm 10 CPM / 2 WPM, không chỉ mock đồng hồ.

## Hình ảnh đã xem

1440×1100 và 390×844, ảnh toàn trang của hai module trên Chromium và Edge. Không tràn ngang, sprite giải mã đầy đủ, bàn phím hiển thị đủ hàng/ngón, focus và ô viết rõ. Kiểm tra bằng screenshot và naturalWidth, không chỉ suy luận từ CSS.

- `.local/m04-chromium-keyboard-home-both-1440.png`
- `.local/m04-chromium-keyboard-home-both-390.png`
- `.local/m04-chromium-vietnamese-sentence-1440.png`
- `.local/m04-chromium-vietnamese-sentence-390.png`
- `.local/m04-edge-...` cùng bốn màn hình.

Audit: **264/264 PNG** giải mã, CSV khớp, không trùng nội dung/đường dẫn, không PNG ngoài manifest. 18 atlas nguồn vẫn chưa có như audit trước; sprite runtime đầy đủ. Production `/dev/assets` bị chặn và API/Socket.IO kiểm bằng server production trên 3101 trong E2E.

## Giới hạn thiết bị thật

- Có Edge trên máy nên chạy `channel: msedge`. Không tìm thấy Chrome cài riêng tại đường dẫn chuẩn; Chromium Playwright được dùng cho nhánh Chromium. Không gọi kết quả này là đã kiểm Chrome cài riêng.
- E2E kiểm native text và mô phỏng composition DOM; chưa điều khiển UniKey/EVKey/Windows IME thật. Cần thử gõ, đổi ENG/VIE và tổ hợp shortcut trên máy phòng học trước triển khai diện rộng. Không có nhận diện IME tự động; học sinh chọn chế độ rõ ràng.
- Chưa có file thu âm tiếng Việt. Voice vi-VN phụ thuộc máy; unit test kiểm thiếu voice/lỗi file/mute và E2E kiểm fallback khi muted. Không tuyên bố đã nghe giọng máy lớp học.
- WPM là thông tin luyện tập, không phải điều kiện tốc độ để qua bài. Với tiếng Việt, accuracy/error/streak tính trên bản Unicode cuối sau sửa (được giải thích trong GAME_DESIGN), không phạt ký tự Telex đang biến đổi hoặc chữ IME đang ghép.
- Bundle Phaser của M03 vẫn có cảnh báo kích thước >650 kB; luyện gõ lazy-load riêng và không tải Phaser. Không mở phạm vi tối ưu/gameplay M05.

## Kiểm chứng cuối

- `npm run lint`: đạt, không lỗi/cảnh báo ESLint.
- `npm run typecheck`: đạt toàn workspace và test/tool TypeScript.
- `npm run test`: **140/140 đạt**; riêng unit luyện gõ/IME là 87 test, integration hoàn thành 26 bài không giới hạn thời gian và kiểm quyền/kết quả.
- `npm run build`: đạt shared/web/server; web được build lại sau thay đổi cuối về focus/Tab, đạt.
- `npm run setup`: đạt; migration M04 đã apply vào DB hiện tại, seed 45 định nghĩa bài và giữ dữ liệu cũ.
- `npm run assets:audit`: đạt 264/264 sprite.
- `npx playwright test tests/e2e/typing.spec.ts`: **68/68 đạt** trên bản build cuối cố định, gồm 34 Chromium và 34 Edge; cả hai bài timer đều chạy đủ một phút thật. Không còn E2E lỗi ở lượt cuối.

Milestone 04 hoàn tất trong phạm vi đã mô tả. Giữ các giới hạn thiết bị thật phía trên; không bắt đầu Milestone 05.
