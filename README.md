# BYTE ACADEMY — Hành trình khám phá máy tính

Ứng dụng học Tin học cho học sinh tiểu học Việt Nam. **Milestone 05** bổ sung 10 bài Thành phố Tệp tin, 10 bài Khám phá máy tính và 5 bài An toàn số, bên cạnh 12 bài chuột, 16 bài bàn phím và 11 bài tiếng Việt. Có tự luyện, phòng học giáo viên điều khiển, mô phỏng có dữ liệu thật và kết quả lưu tại máy chủ. Không tự bắt đầu Milestone 06.

## Khởi động trên Windows

Cài Node.js **22.12+**, khuyến nghị Node 24 LTS, và npm. Tại thư mục dự án:

```powershell
npm install
npm run dev
```

`dev` chạy setup trước: tạo `.env` nếu chưa có, tạo SQLite nếu chưa có, build shared, generate Prisma Client, apply migration và seed định nghĩa bài học. Không ghi đè `.env` hay xóa dữ liệu. Frontend: http://localhost:5173; API: http://localhost:3001/api/health. Dừng bằng Ctrl+C.

`npm install` có postinstall để chuẩn bị shared và Prisma Client kể cả khi npm chặn lifecycle của dependency. Dừng server trước khi cài lại dependency hoặc generate Prisma sau thay đổi schema trên Windows để tránh khóa DLL. `build` không generate lại engine đang chạy.

Tạo tài khoản giáo viên đầu tiên trong terminal khác:

```powershell
npm run teacher:create
```

Nhập username, tên và mật khẩu 12–72 ký tự, tối đa 72 byte UTF-8. Terminal hiện ký tự khi nhập; không lưu mật khẩu plaintext. Không có tài khoản hay mật khẩu mặc định. Mật khẩu băm bcrypt cost 12.

Truy cập `/play` cho học sinh, `/admin/login` cho giáo viên. Tạo lớp/học sinh ở `/admin/classes`, tạo phòng ở `/admin/rooms`, gửi mã 6 ký tự cho học sinh. Học sinh chọn **Tham gia phòng học**, nhập mã và tên. Số học sinh đã tham gia cập nhật trực tiếp. Giáo viên chọn một trong 64 bài thực hành của sáu phân khu rồi bắt đầu phòng học.

## Kiểm tra

```powershell
npm run assets:audit
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

Audit PNG cần Python và Pillow (`python -m pip install Pillow`). Chạy ứng dụng không cần Python. Vitest dùng `.local/vitest.db`, Playwright dùng `.local/e2e.db`; không sử dụng database vận hành. E2E tự build rồi chạy production trên cổng 3101, tạo tài khoản riêng trong DB tạm. `npm run format` / `format:check` dùng Prettier.

## Production và LAN

```powershell
npm run setup
npm run build
npm start
```

Express phục vụ frontend build và Socket.IO cùng origin trên cổng 3001. `npm start` tự đặt production. Trong `apps/server/.env`, cấu hình `APP_ORIGIN=http://192.168.1.10:3001` theo IP LAN thật của máy giáo viên. Học sinh truy cập chính URL đó. Cho phép Node/cổng 3001 trong Windows Firewall trên Private network nếu chưa được phép. Host mặc định `0.0.0.0`; không cần cloud. Nên cố định IP LAN.

Khi chưa đặt APP_ORIGIN, mặc định là `http://localhost:5173` ở dev và `http://localhost:3001` ở production. Với LAN phải đặt origin chính xác theo URL truy cập.

Để thử development qua LAN, dùng `APP_ORIGIN=http://<IP>:5173` và truy cập 5173; Vite proxy HTTP/WebSocket sang backend. Khi dùng HTTPS đặt `COOKIE_SECURE=true` và `APP_ORIGIN=https://...`. HTTP LAN giữ `COOKIE_SECURE=false`.

Cookie HttpOnly + SameSite Strict, origin được kiểm cho thao tác ghi và handshake socket. Session dùng token ngẫu nhiên 256 bit; DB chỉ lưu SHA-256 token. Phiên giáo viên 8 giờ. Không secret cố định trong source. Sao lưu SQLite ngoài giờ hoạt động, bảo vệ máy chủ và bản sao lưu bằng quyền hệ điều hành. DB và dữ liệu học sinh nằm ngoài public.

`DATABASE_URL` mặc định `file:./byte.db`, Prisma giải quyết từ `apps/server/prisma/`. Nếu đổi sang file khác, tạo thư mục và file rỗng trước migration nếu engine Windows yêu cầu. Các lệnh rời: `db:generate`, `db:migrate`, `db:seed`. Không dùng db push thay migration production.

## Asset và thiết kế

Một bộ source duy nhất `public/assets`. Vite publicDir trỏ về root; build copy chuẩn sang dist để triển khai. Không có bản sao dành riêng cho dev. URL lấy nguyên văn **sprite.path**.

Đủ 18 nhóm / 264 PNG đã giải mã. Thiếu 18 atlas nguồn, không cản trở sprite runtime. Hai concept `references/UIUX-concept-0.jpg` và `UIUX-concept-1.jpg` đã đọc và dùng làm chuẩn bố cục, màu, độ mềm và hướng gameplay. Không dùng nguyên tấm concept làm giao diện. Font Nunito Vietnamese đóng gói local, không CDN.

Development có `/dev/assets` xem toàn bộ sprite và trạng thái tải; route bị loại khỏi router và trả 404 ở production. Login chỉ tải mascot; phân khu preload atlas riêng và báo tiến độ/lỗi.

## Tài liệu

- [Kiến trúc](docs/ARCHITECTURE.md)
- [Audit asset](docs/ASSET_AUDIT.md)
- [Kế hoạch](docs/DEVELOPMENT_PLAN.md)
- [Thiết kế game](docs/GAME_DESIGN.md)
- [API và Socket](docs/API_CONTRACT.md)
- [Quy chuẩn dự án](docs/PROJECT_RULES.md)
- [Kiểm chứng Student UI M02](docs/MILESTONE_02_VERIFICATION.md)

## Student UI Milestone 02

Home dùng bốn sprite atlas 14, robot đổi tư thế nhẹ từ atlas 01, font Nunito tiếng Việt local và panel clay pastel. Navigation dẫn tới `/play/explore`, `/play/missions`, `/play/achievements`; nút lớp, hồ sơ, âm thanh và cài đặt có tương tác. Sáu phân khu dùng chung cấu hình `/api/lessons`, lọc lớp 1–2/3–5, xem từng hướng dẫn và khóa vào bài theo `available`.

`GET /api/student/overview` đọc Progress, Achievement, Attempt/Result theo cookie thành viên HttpOnly; không nhận student ID từ client. Khách hoặc phiên hết hạn nhận trạng thái chưa có kết quả. Nhiệm vụ là ba lesson gợi ý (ưu tiên bài phòng học), trạng thái hoàn thành hôm nay tính theo ngày Việt Nam. Sao thưởng hiển thị ở nhiệm vụ là phần thưởng có thể nhận; bộ đếm chỉ cộng Achievement thực tế.

Bộ Game UI ở `apps/web/src/components/game/GameUI.tsx` có top bar, hướng dẫn, sidebar, điểm, timer, tiến độ, kết quả, pause, thưởng và xác nhận rời bài. Preview chỉ dùng các panel phù hợp; không chạy timer hay tạo lượt chơi. Các overlay kết quả/pause sẵn sàng cho gameplay M03, chưa giả lập kết quả trên UI.

AudioManager hỗ trợ `register(voiceId, { text, mp3 })`, volume, mute, dừng khi chuyển trang/đóng hướng dẫn và xử lý lỗi file/autoplay. Chưa có MP3 được cung cấp, nên không tạo URL âm thanh giả. Khi bấm nghe, chỉ dùng Web Speech nếu máy có voice `vi-VN`; nếu không có sẽ hiện hướng dẫn chữ và thông báo. Cài đặt lưu tại máy bằng localStorage, không lưu điểm học tập tại client.

## Gameplay chuột Milestone 03

Vào `/play/mouse`, chọn một bài đã mở, bấm **Vào bài học → Bắt đầu luyện tập**. Hoặc mở trực tiếp `/play/mouse/practice/mouse-left-1`. Có bong bóng click trái, menu rương click phải, kho báu nháy đúp, kéo sao vào giỏ, cổng dùng nút giữa và bản đồ cuộn lên/xuống/tìm vật phẩm. Mỗi kỹ năng có cấp 1 và 2; khoảng nháy đúp tùy chỉnh 450/650/900 ms.

Giáo viên tạo phòng với bài chuột, sau đó dùng **Sẵn sàng → Chuẩn bị → Bắt đầu bài học**. Học sinh tham gia bằng mã và mở **Vào bài luyện chuột**. Cấp độ được gắn theo bài của phòng; giáo viên có nút tạm dừng/tiếp tục/kết thúc. Mất kết nối hoặc mất tiêu điểm sẽ dừng thao tác. Tự luyện dùng cookie HttpOnly riêng, kết quả vẫn nằm trong SQLite; không ghi điểm vào localStorage.

Máy chủ tạo seed/lượt chơi, replay log pointer/wheel, tính lại điểm 0–100 và thưởng 1–3 sao khi hoàn thành. Mỗi mục tiêu được ghi đúng một lần. Nộp lại cùng lượt không tăng Progress/Reward lần nữa. Không có nút cho qua bài. Xem [báo cáo kiểm chứng và checklist chuột vật lý](docs/MILESTONE_03_VERIFICATION.md).

## Giới hạn hiện tại

Sáu phân khu đã có bài thực hành. Luồng vào phòng vẫn dùng tên tự khai; mã phòng không xác minh danh tính. Chưa có reset password, xuất báo cáo đầy đủ hoặc bộ MP3. Giọng vi-VN phụ thuộc máy và luôn có hướng dẫn chữ thay thế. Không bắt đầu Milestone 06.

Tự luyện ẩn danh được nhận diện trong phiên cookie 8 giờ; không có cơ chế khôi phục danh tính tự luyện sau khi xóa/hết hạn cookie. Kết quả vẫn lưu trong DB. Browser automation đã kiểm middle-click nhưng hành vi auto-scroll, driver, chuột vật lý và giọng đọc của máy lớp học cần checklist thực tế. Các trang thực hành phủ toàn cửa sổ theo kích thước màn hình, không khóa tỷ lệ 16:9. Nền/panel tự giãn, hình ảnh/vùng tương tác co đồng nhất; bảng tệp/trang viết có cuộn nội bộ khi cần. Luyện Chuột nên xoay ngang và dùng chuột vật lý. Xem [kiểm chứng giao diện fullscreen](docs/PRACTICE_SCREEN_VERIFICATION.md).

PNG và bundle Phaser còn lớn (Phaser được lazy-load khi vào bài); cần tối ưu lossless và đo tải LAN 30–60 máy trước vận hành quy mô lớn. SQLite hiện dành cho một server. Chưa tự động triển khai milestone tiếp theo.

Bài `mouse-intro` cũ được đánh dấu retired: giữ trong DB cho phòng/kết quả cũ, không trả trong danh sách lesson công khai và không tính vào 12 bài luyện chuột hiện hành.

## Học viện Bàn phím và Xưởng gõ Tiếng Việt M04

Vào `/play/keyboard` hoặc `/play/vietnamese`, chọn **Xem bài học → Vào bài học → Bắt đầu luyện tập**. Bàn phím gồm sáu nhóm tăng dần, có lọc nhóm, hướng dẫn ngón, F/J, CPM/WPM/độ chính xác/chuỗi đúng/thời gian. Bàn phím ảo React/CSS chỉ hướng dẫn; dùng phím thật để tiến bài. `event.code` là vị trí QWERTY nên ký tự in trên bàn phím layout khác có thể khác nhãn. Bài đầu không có yêu cầu tốc độ. Bài một phút bắt đầu tính giờ từ lần nhấn hợp lệ đầu tiên.

Xưởng có 11 bài từ tên bản thân, chữ cái/nguyên âm, từ, câu, đoạn văn đến sửa lỗi và luyện đều. Chọn **A · Bộ gõ có sẵn trên máy** khi dùng UniKey/EVKey/IME; ứng dụng không chuyển Telex/VNI trong chế độ này. Chọn **B · Bộ gõ thực hành tích hợp** và chuyển máy sang **ENG** khi muốn ứng dụng chuyển dấu. Chọn Telex hoặc VNI, có thể đổi trong lượt khi không ghép chữ. Không tự đoán bộ gõ máy. Các quy tắc hiển thị bên trang viết; NFC/grapheme để so sánh, không chấm trong composition. Bấm **Nộp bài** để lưu. Lỗi bài viết là chữ sai còn lại trong bản đã sửa; bài phím đếm mỗi lần nhấn sai (xem công thức trong GAME_DESIGN).

Giáo viên chọn bài bàn phím/tiếng Việt khi tạo phòng. Các lệnh sẵn sàng, bắt đầu, tạm dừng, tiếp tục và kết thúc dùng chung Socket.IO; mất kết nối dừng thao tác. Khi phòng kết thúc, ứng dụng tự nộp phần đã làm, kể cả chưa đạt; nếu mạng lỗi có nút thử lưu lại cùng log. Kết quả và các chỉ số được máy chủ replay/tính lại, lưu transaction và không cộng thưởng trùng khi retry. Migration M04 chỉ thêm cột; `npm run setup` áp dụng migration và cập nhật định nghĩa bài, không xóa dữ liệu.

Xem [kiểm chứng M04](docs/MILESTONE_04_VERIFICATION.md). Kiểm thử thật UniKey/EVKey và giọng vi-VN trên máy lớp học vẫn cần thực hiện; E2E mô phỏng chu kỳ composition và native input, không điều khiển phần mềm IME Windows.

## Tệp, máy tính và an toàn số M05

Mở `/play/files`, `/play/computer` hoặc `/play/safety`, chọn bài → **Vào bài học → Bắt đầu thực hành**. Có 25 bài mới và 64 bài chơi được trên toàn hệ thống. Intro cũ vẫn giữ trong DB để tương thích, không đưa vào danh sách công khai. Giáo viên có thể chọn cả ba phân khu mới khi tạo phòng.

Explorer có cây thư mục, breadcrumb, thanh công cụ, lưới tệp, menu chuột phải và hộp thoại. Nháy đúp mở thư mục/xem trước, chọn rồi đổi tên/xóa/cắt/sao chép/dán/di chuyển, hoặc kéo vào thư mục. Tìm kiếm trong toàn cây con của thư mục hiện tại; sắp xếp theo tên/loại. Ctrl+C/X/V/Z, F2, Delete, Enter và Backspace dùng trong cửa sổ mô phỏng. Thùng rác giữ cả cây con, có khôi phục; undo tối đa 20 thao tác dữ liệu. Tệp là đối tượng mô phỏng; preview chỉ đọc, không mở Word/Excel hay media thật. Không xin quyền truy cập Windows hoặc đọc/ghi tệp trên máy học sinh.

Mỗi thao tác được máy chủ kiểm và lưu SQLite theo lượt/bài. Reload rồi bấm **Bắt đầu thực hành** để mở lại đúng trạng thái; nếu lượt đang tạm dừng, bấm **Tiếp tục**. **Đặt lại bài** có xác nhận và chỉ reset lượt hiện tại. Khi mạng không xác nhận được, tải trạng thái đã lưu trước khi thao tác tiếp. Máy chủ chấm cây tệp/cửa sổ/đáp án đã lưu, không nhận điểm hoặc VFS tự gửi từ client. Nộp khi chưa đủ điều kiện không qua bài; retry kết quả không cộng trùng thưởng.

Máy tính có hai ứng dụng React mô phỏng: Ghi chú chỉ đọc và Album thiết bị. Nháy đúp biểu tượng, dùng nút trên thanh tiêu đề, kéo thanh tiêu đề, kéo góc cửa sổ và bấm thanh tác vụ. Cửa sổ giữ hình học khi phóng to/khôi phục; focus và z-index có trạng thái thật. Bàn máy tính giữ tọa độ logic 1000×600 và tự fit vùng hiển thị, đổi delta con trỏ theo scale khi kéo/resize. Có nút dịch cửa sổ và dùng phím mũi tên trên góc resize để hỗ trợ bàn phím.

An toàn số dùng tình huống, mật khẩu mẫu và đáp án chọn sẵn; không hỏi bí mật hoặc thông tin riêng thật. Có bài đóng thông báo bằng nút đóng của cửa sổ thực trong mô phỏng. Xem [kiểm chứng M05](docs/MILESTONE_05_VERIFICATION.md), [thiết kế/chấm điểm](docs/GAME_DESIGN.md) và [API](docs/API_CONTRACT.md).
