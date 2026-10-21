# Hệ thống học và game

Học sinh lớp 1–5 học thao tác máy tính bằng nhiệm vụ tương tác thật. Không thay luyện tập bằng màn hình trang trí.

## Mô hình

LearningModule chứa LearningSkill. Lesson có id/module/skill/title/instructions/gradeMin/gradeMax/difficulty/targetCount/timeLimit tùy chọn/completionRules/scoringRules/rewards/config. Level sắp xếp Mission. Attempt ghi lượt cá nhân, Result ghi score/accuracy/durationMs/completedTargets. Reward dẫn đến Achievement; Progress tổng hợp từ kết quả đã kiểm chứng. Student thuộc Classroom tùy chọn; Room/RoomSession đại diện buổi học giáo viên kiểm soát.

Sáu intro M01 giữ ID ổn định và available=false để tương thích phòng cũ. M03 bổ sung 12 lesson chuột ở shared/mouse.ts. M04 thêm 16 bài bàn phím và 11 bài tiếng Việt ở shared/typing.ts. M05 thêm 10 bài tệp, 10 bài máy tính và 5 bài an toàn ở shared/simulation.ts. Tất cả 64 bài mới đều có gameplay. Các luật bài học nằm trong definition, không rải JSX.

## Vòng đời

Game: `IDLE → INSTRUCTIONS → READY → COUNTDOWN → PLAYING → COMPLETED hoặc FAILED → RESULT`. PLAYING có thể PAUSED, tiếp tục PLAYING hoặc FAILED. RESULT quay lại IDLE cho lượt mới. PersonalGameSession giữ state cá nhân, mode free/assigned, roomSessionId tùy chọn.

Room: `LOBBY → READY → COUNTDOWN → PLAYING → PAUSED → PLAYING → FINISHED → RESULT → LEADERBOARD`. Cho kết thúc sớm từ LOBBY/READY/COUNTDOWN. Server kiểm transition/revision, không tin client. Game result không đổi room state. Bài available=false không thể đi READY/COUNTDOWN/PLAYING.

## Hướng gameplay theo hai concept

- Chuột: vườn, nháy trái/phải/đúp, kéo sao vào giỏ, cuộn; atlas 04/05/06, đo thao tác thật.
- Bàn phím: hàng cơ sở, ngón tay và phím tô màu; atlas 07/08, đo ký tự đúng, accuracy/thời gian.
- Tệp tin: explorer mô phỏng, tạo/đổi tên/di chuyển thư mục; atlas 09/10, lưu private, không dùng đường dẫn OS từ học sinh.
- Tiếng Việt: Telex, câu mẫu, phản hồi dấu; atlas 08/11, xử lý composition/IME trước chấm.
- Máy tính/an toàn số: atlas 03/15, nhận diện/tình huống phù hợp tuổi.

Adapter games/engine.ts lazy import Phaser 3 và scene, chặn bài chưa available, đợi texture nạp xong và destroy khi unmount. M03 dùng games/mouse/scene.ts và MouseGamePage.tsx; không mở canvas rỗng.

M02 Student UI bổ sung `components/game/GameUI.tsx`: GameTopBar, GameInstructionBubble, GameSkillSidebar, GameScorePanel, GameTimer, GameLevelProgress, GameResultModal, GamePauseOverlay, RewardCelebration, ConfirmExitModal. Timer nhận duration/running/onExpire, dọn interval khi unmount và không chạy trong preview. Các modal dùng native dialog để trap focus/Escape và trả focus về nút mở. Result/pause/reward chỉ được nối khi có gameplay thực và kết quả kiểm chứng; M02 không tạo scene hoặc nộp kết quả. AudioManager hỗ trợ MP3 theo voice ID và vi-VN tùy thiết bị, chỉ phát từ thao tác người dùng.

## Tiêu chí mở bài tương lai

Cần thao tác thật, hướng dẫn trẻ hiểu được, pause/retry, lifecycle, scoring theo lesson, timeout/focus/reduced motion, xác thực backend, lưu Attempt/Result/Progress/Reward qua transaction, test free/assigned. Chỉ lúc đó đổi available=true.

## Gameplay M03 và chấm điểm

- Trái: click button 0, viền vàng chỉ mục tiêu hiện tại; cấp 1 kích thước 110 và dao động 5px, cấp 2 kích thước 86 và dao động 28px. Nháy giữ trên 450ms hoặc di chuyển trên 8px không tính click.
- Phải: button 2 trên rương mới mở menu; cấp 1 chọn Mở rương, cấp 2 chọn Xem vật phẩm bằng click trái. Chặn contextmenu chỉ ở canvas bài phải.
- Đúp: hai click trái cùng mục tiêu, mỗi lần giữ tối đa 450ms, lần thứ hai trong ngưỡng tối đa 300–1000ms (mặc định 650). Sai nút, kéo, cancel hoặc pause cắt chuỗi. Một cặp đúng hoàn thành một rương.
- Kéo: 5/8 sao, offset giữ nguyên, pointer capture, pointercancel/lost capture trả về gốc. Chỉ thả vật phẩm trong hình chữ nhật giỏ (tính theo tâm sao sau offset) mới thu thập. Có viền vùng nhận và đổi giỏ đầy.
- Giữa: button 1, chặn mousedown/auxclick mặc định chỉ trong canvas bài giữa. Cổng dùng crate/padlock thật từ atlas 06, khi bật sáng có hào quang và chìa khóa. Không có lựa chọn thay nút giữa bằng click trái/touch.
- Cuộn: ba mục tiêu mỗi cấp: xuống kho báu, lên quả táo, xuống tìm hộp quà/quả xoài. Wheel deltaMode được chuẩn hóa, deltaY xác định hướng; click không tính. Mỗi tick giới hạn 160px, quãng đường thực tối thiểu 160px mỗi nhiệm vụ. Sau đổi nhiệm vụ bỏ qua 500ms tick dư theo hướng trước để tránh lỗi do quán tính. Không có nút giả lập cuộn.

`correctActions` là số thao tác nhiệm vụ thành công (một cặp đúp hoặc chuỗi phải→menu là một thao tác nhiệm vụ); `wrongActions` là số lần thực hiện sai. Hoàn thành C = completedTargets/targetCount, chính xác A = correctActions/(correctActions+wrongActions). Điểm = round(60C + 35AC + bonus), tối đa 100. Bonus 5 điểm khi hoàn thành trong 120 giây hoạt động; không giới hạn thời gian, chơi chậm hoàn hảo vẫn 95 điểm/3 sao. Đạt khi đủ mục tiêu và A ≥ 60%. Đủ mục tiêu nhận ít nhất 1 sao; đạt và điểm ≥75 nhận 2, đạt và điểm ≥90 nhận 3. Bài dở dang nhận 0 sao. Progress chỉ tăng khi đạt; Achievement giữ sao cao nhất, không cộng lặp vô hạn theo số lần chơi.

Pause đóng menu, hủy kéo và cắt chuỗi đúp. Mất focus/ẩn tab tạm dừng cá nhân; mất socket dừng bài phòng. Room giữ controlLog có thời gian server để kiểm log đầu vào; học sinh không được đổi level khi phiên đang hoạt động. Room kết thúc sẽ nộp phần đã thực hiện và có thể chưa đạt. Kết quả cá nhân không đổi room state.

Bài `mouse-intro` cũ được đánh dấu retired: giữ trong DB cho phòng/kết quả cũ, không trả trong danh sách lesson công khai và không tính vào 12 bài luyện chuột hiện hành.

## Gameplay và scoring M04

Bàn phím: nhận diện chữ/số/Space/Enter/Backspace/Shift; hàng cơ sở trái/phải/GH/phối hợp; hàng trên trái/phải/chuyển hàng; hàng dưới trái/phải và dấu câu; từ ngắn/dài; số ký tự và một phút. QWERTY theo event.code, event.key chỉ ghi để đối chiếu layout. Bỏ repeat, phím đang giữ, Ctrl/Alt/Meta/Tab/CapsLock/composition. Keyup giải phóng; pause/blur cắt giữ phím. Backspace lùi một mục tiêu và cắt streak, không cộng lỗi (trừ bài nhận diện Backspace, nơi nó là mục tiêu). Không nhận click phím ảo. Ngón F/J trỏ, B trái, 6 phải, Space ngón cái; tay atlas 07 là sơ đồ nhìn từ trên xuống, không đảo trái/phải. Không có yêu cầu WPM để qua bài.

Tiếng Việt: tên cá nhân; chữ cái; nguyên âm/dấu; từ ngắn; bộ từ dấu thanh; câu; nhiều câu; dấu câu; đoạn văn; sửa bản có lỗi; luyện đều/độ chính xác. Textarea thực cho phép con trỏ, chọn, Delete/Backspace. Chặn paste/drop để luyện tự gõ. Chế độ system giữ text của máy, tích hợp chỉ xử lý ký tự trong keydown khi không composition/shortcut; input ổn định không bị chuyển dấu lần nữa. Học sinh chọn mode và chuyển máy sang ENG khi tích hợp. Không đoán IME. Trong composition giữ bản đã chấm trước đó, khóa đổi mode/nộp, chỉ commit sau compositionend. Chuẩn hóa NFC và Intl.Segmenter vi/grapheme trước so sánh. Mint đúng, peach sai, trung tính chưa nhập; vị trí UTF-16 khi sửa được cập nhật theo prefix NFC.

Engine âm tiết `shared/vietnamese.ts` tách biến đổi nguyên âm/đ và dấu thanh, bảo toàn hoa/thường; loại u trong qu/i trong gi nếu còn nguyên âm; ưu tiên nguyên âm có mũ/móc (ươ dùng ơ), ba nguyên âm lấy giữa, hai nguyên âm có phụ âm cuối lấy sau, hai nguyên âm mở dùng cách đặt dấu truyền thống (hòa, khỏe, thủy). Tự chuyển vị trí dấu khi thêm phụ âm cuối. Telex s/f/r/x/j/z, aa/aw/ee/oo/ow/uw/dd; VNI 1..5/0/6/7/8/9. Dấu mới thay dấu cũ, z/0 bỏ dấu thanh; lặp phím dấu Telex khôi phục ký tự để gõ literal. Biên từ/dấu câu không chuyển lại từ trước. Đây là bộ gõ thực hành, không có từ điển tự sửa/chính tả hay nhận diện ngôn ngữ.

Đặt C là số mục tiêu đã gõ đúng hiện tại (bàn phím), hoặc số grapheme đúng vị trí trong bản cuối (tiếng Việt); E là số lần nhấn sai (bàn phím), hoặc số grapheme sai/thừa còn lại trong bản cuối (tiếng Việt). Accuracy = C/(C+E), chưa gõ là 0. Sửa lỗi không cộng phạt mới; các phím nhấn sai trước đó vẫn ghi E ở bài bàn phím. Gọi R = C × 60000 / activeMs; CPM hiển thị round(R), WPM = round(R/5 × 10)/10 (tính từ R chưa làm tròn); activeMs=0 cho CPM/WPM 0. Điểm = round(100 × accuracy), tiến độ hiển thị riêng, điểm cao không tự có nghĩa đã qua bài. Streak bàn phím là chuỗi đúng không có nhấn sai/sửa, longest là cực đại; tiếng Việt dùng chuỗi grapheme đúng dài nhất trong bản cuối.

Đạt khi đủ mục tiêu (tiếng Việt khớp toàn bộ câu NFC) và accuracy ≥50% cho bốn bài đầu, ≥70% các bài còn lại. Bài một phút có thể đạt sau 60 giây hoạt động và ít nhất 10 ký tự đúng, hoặc hết toàn bộ mẫu; nộp sớm chưa đủ mẫu không qua. Đạt nhận 1 sao nếu accuracy <80%, 2 sao từ80%, 3 sao từ95%; chưa đạt 0 sao. Tốc độ chỉ tham khảo, không trừ điểm khi chậm. Result server là nguồn điểm chính thức; HUD là tạm tính từ cùng reducer.

## M05 — Hệ thống tệp ảo

`VfsNode` có id ổn định, parentId, name, type folder/file, fileExtension, mimeType, createdAt, updatedAt và metadata. Thư mục gốc `root` không đổi/xóa/di chuyển được. Tên NFC, bỏ khoảng trắng hai đầu, kiểm tên rỗng, ký tự cấm, tên dành riêng, giới hạn 80; cùng cha không trùng tên theo NFC/không phân biệt hoa thường. Node mới dùng counter riêng của lượt, rename không đổi ID, undo không tái sử dụng ID. Không dùng tên làm khóa.

Mỗi command chạy trên bản sao; kiểm cấu trúc trước khi trả. Lỗi không đổi source, clipboard hay dữ liệu đã lưu. Move/copy/paste chặn chính nó, hậu duệ, đích không phải folder, đích bị xóa và collision. Copy cả cây con sinh ID mới, lưu copiedFrom, cập nhật createdAt; paste cùng thư mục tự thêm “Bản sao”. Cut giữ clipboard khi paste lỗi, chỉ xóa clipboard sau di chuyển thành công. Xóa đánh dấu gốc cây con vào thùng rác, không xóa vật lý. Khôi phục giữ toàn cây, dùng cha cũ nếu còn hoạt động hoặc root nếu cha đã xóa; collision yêu cầu đổi tên mục đang có trước, không ghi đè.

Undo tối đa 20 snapshot dữ liệu; search/sort/navigation/clipboard không thêm undo. Reset tái tạo seed riêng của bài, xóa undo/clipboard/tiến độ lượt đó; không ảnh hưởng Attempt khác hoặc kết quả đã lưu. Mỗi bài có seed theo number, bài rename có thư mục Thư mục mới, bài phân loại có folder riêng cho PDF/trình chiếu/bảng tính, các mục tiêu khác khởi tạo chưa đạt. Tám tệp mẫu có MIME/đuôi/icon/metadata tương ứng, preview mô phỏng chỉ đọc; không có chương trình soạn thảo/âm thanh/video thật.

10 bài: mở Hình ảnh; tạo Bài tập trong Học tập; đổi Thư mục mới thành Vở của em; đưa hai ảnh về Hình ảnh; đưa video về Video; phân loại 8 tệp; copy Hoa sang Hình ảnh giữ bản gốc; kéo Bài tập.docx vào Tài liệu; xóa và restore Bài hát; tạo Bài tập→đổi Góc học tập→đưa hai tài liệu vào đó và hai ảnh về Hình ảnh. `simulationGoals` kiểm node/type/name/parent/trash và metadata do reducer máy chủ tạo. Bài copy cần copiedFrom + ID mới và bản gốc còn đúng vị trí; bài drag cần movedBy=drag tại đích; bài restore cần restored=true và node hoạt động. Bài tổ chức cần dấu vết tên gốc và thư mục thật đúng cha, không thể qua bằng một popup hoặc POST điểm.

## M05 — Desktop và an toàn số

Hai ứng dụng notes/gallery có state open/minimized/maximized, rect, z; DesktopState.focused xác định Focused/Background. Launch/close/minimize/maximize/restore/focus/taskbar/drag/resize đều qua reducer. Rect thường được giữ khi maximize. Move/resize bị chặn khi minimized/maximized; ràng buộc trong world 1000×550 phía trên taskbar, min 280×190. Pointer capture, local preview và pointercancel; chỉ pointerup mới gửi hình học để persist. Không thay đổi cửa sổ ứng dụng thật. Bàn phím có cách dịch cửa sổ và resize bằng mũi tên. World cố định 1000×600 cuộn trong container trên màn hình nhỏ.

10 bài: gọi tên bốn thiết bị; phân biệt nhập/xuất; launch; close sau launch; minimize; maximize; di chuyển sang phải; resize ≥520×330; mở hai cửa sổ và focus notes; minimize rồi restore bằng taskbar. Điều kiện kiểm trạng thái hiện tại và dấu vết hành động khi cần (close mặc định không được tính đã làm).

5 bài an toàn: mật khẩu khó đoán (ví dụ không dùng thật), thông tin cần giữ riêng, thông báo xin mật khẩu để nhận quà, người lạ hẹn gặp riêng, đóng thông báo không mong muốn. Đáp án sai giữ nguyên câu và thêm mistakes, đáp án đúng mới đi tiếp. Không có ô nhập mật khẩu/thông tin cá nhân. Nút nhận quà chỉ giải thích, không hoàn thành; nút đóng mới đổi dismissed và bỏ cửa sổ khỏi UI. Nội dung tham khảo [CISA: mật khẩu](https://www.cisa.gov/sites/default/files/2024-09/Secure-Our-World-Passwords-Tip-Sheet.pdf), [NIST: phishing](https://www.nist.gov/itl/smallbusinesscyber/guidance-topic/phishing), [UNICEF: quyền riêng tư](https://www.unicef.org/parenting/child-care/online-privacy). Các tình huống được viết lại bằng tiếng Việt phù hợp học sinh, không sao chép nguyên văn.

Chấm M05: score=round(100×số điều kiện đúng/tổng điều kiện). Accuracy=điều kiện đúng/(điều kiện đúng+mistakes), chưa có đáp án là 0. VFS lỗi bị từ chối không làm hỏng state/không phạt thêm; mistakes áp dụng câu trắc nghiệm. Đạt khi mọi điều kiện đúng, không ngưỡng thời gian. Đạt nhận 3 sao nếu accuracy≥95%, 2 sao nếu≥70%, còn lại 1; chưa đủ điều kiện 0 sao. Thời gian từ command đầu tới nộp, trừ hợp các khoảng pause/kết thúc phòng, chỉ tham khảo. Server là nguồn điểm chính thức, button Nộp không tự đánh dấu điều kiện. Result/Progress/Achievement ghi transaction, idempotent theo Attempt.

## Cập nhật trình bày thực hành — fit màn hình

Theo yêu cầu sau M05, cả sáu phân khu thực hành dùng toàn diện tích cửa sổ và nút fullscreen sau tương tác, không khóa root 16:9. Chuột chuyển sang cảnh vườn phủ nền, menu kỹ năng nổi bên trái, hướng dẫn phía trên, mục tiêu/điểm thật ở header và nhắc nhiệm vụ phía dưới. Nội dung concept được dựng bằng sprite và UI có tương tác, không dán ảnh concept hoặc sao chép số thưởng +150.

Màn rộng/4:3/siêu rộng tự reflow panel; màn dọc nhỏ dùng menu chuột ngang, gợi ý xoay ngang và cuộn trong panel văn bản/tệp. Giữ hình ảnh và hitbox đúng tỷ lệ trong vùng chơi. Các công thức, điều kiện qua bài và lưu backend không thay đổi. Desktop chuyển delta màn hình về tọa độ logic theo scale; resize viewport hủy gesture để tránh nhảy cửa sổ.
