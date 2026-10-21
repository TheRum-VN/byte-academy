# Kế hoạch phát triển

## Milestone 01

Monorepo, strict TypeScript, React/Vite, Express/Socket.IO, Prisma/SQLite migration, CLI tạo giáo viên, quyền backend, health thật, asset registry/gallery, design system, toàn bộ route, student/admin shell, lớp/học sinh, phòng chờ tạo/join, tests và docs.

## Milestone 02 — Student UI (theo phạm vi cập nhật)

Home theo hai concept, sáu phân khu dùng chung lesson configuration, lọc lớp, xem hướng dẫn, nhiệm vụ/thành tích đọc SQLite theo phiên, hồ sơ/lớp/cài đặt, AudioManager và bộ Game UI tái sử dụng. Không mở gameplay hoặc tạo dữ liệu kết quả. Phạm vi M02 này thay thế thứ tự gameplay cũ.

## Milestone 03 — Vương quốc Chuột

Sáu kỹ năng × hai cấp độ, Phaser scene khu vườn + React HUD. Native pointer/button/wheel, pointer capture/cancel, nháy đúp tùy chỉnh, pause/resume, kết quả server replay, transaction Attempt/Result/Progress/Achievement, tự luyện và phòng giáo viên. Có test unit/integration/Playwright, asset audit và build production. Xem MILESTONE_03_VERIFICATION.md để biết bằng chứng và phần kiểm thử thiết bị còn cần làm.

## Milestone 04 — Học viện Bàn phím và Xưởng gõ Tiếng Việt

16 bài bàn phím trong sáu nhóm và 11 bài tiếng Việt tăng dần. React/CSS bàn phím highlight theo code/ngón, atlas 01/02/07/08/11/12 qua registry. Engine thuần shared cho KeyboardEvent, scoring, Telex/VNI và Unicode/composition; hai chế độ bộ gõ do học sinh chọn. Tự luyện và phòng học dùng quyền/cookie/controlLog hiện có. Migration thêm typingConfig và các chỉ số gõ; server replay và transaction kết quả/progress/achievement. Test unit/integration/E2E và ảnh desktop/mobile trong MILESTONE_04_VERIFICATION.md.

## Milestone 05 — Tệp, máy tính và an toàn số

10 bài VFS, 10 bài thiết bị/cửa sổ, 5 bài an toàn số. Engine TypeScript bất biến trong shared; Explorer và desktop React/CSS theo atlas 03/09/10/15/12. API xác thực từng command, lưu snapshot/revision, khôi phục bài dở, chấm điều kiện máy chủ và ghi thưởng transaction. Bài được cô lập theo Attempt; root/cycle/collision/trash/copy/undo có kiểm thử. Không truy cập filesystem Windows. Xem MILESTONE_05_VERIFICATION.md cho bằng chứng và giới hạn.

## Những bước tiếp theo, chưa bắt đầu

1. M05 triển khai trong phạm vi tệp/máy tính/an toàn số; không bắt đầu M06.
2. Các milestone sau cần chốt lại phạm vi: quản trị realtime nâng cao và roster đã xác minh.
3. Trước phát hành: báo cáo, reset password, tối ưu asset và kiểm tải LAN.

Không tự động bắt đầu milestone tiếp theo. Chỉ mở available sau khi gameplay và tests hoàn tất. Chốt cấp độ/tiêu chí chấm trước mỗi game.

## Trước vận hành lớp thật

Đo tải 30–60 máy, nén lossless PNG, kiểm chuột/phím/IME Windows và màn hình máy học sinh; sao lưu/khôi phục SQLite, APP_ORIGIN chính xác, giáo viên riêng, quyền máy chủ. Những việc chưa kiểm trên thiết bị thật phải báo rõ, không suy luận từ một browser test.
