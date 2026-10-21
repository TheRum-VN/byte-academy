# REST và Socket.IO

Base `/api`, JSON, cookie cùng origin. Lỗi `{error:string}`, validation có details. HTTP 400 định dạng, 401 chưa login, 403 quyền/origin, 404 không tìm thấy hoặc ngoài owner, 409 state/bài chưa mở, 429 rate limit, 500 lỗi máy chủ. Không expose stack/password/hash.

| Method | Path                  | Quyền                 | Hành vi thật                                                              |
| ------ | --------------------- | --------------------- | ------------------------------------------------------------------------- |
| GET    | /health               | Public                | SELECT 1, status ok/database connected                                    |
| POST   | /auth/login           | Public, 10/15 phút/IP | username/password → id/name + cookie                                      |
| POST   | /auth/logout          | Cookie nếu có         | Xóa phiên, clear cookie, 204                                              |
| GET    | /auth/me              | Giáo viên             | id/name                                                                   |
| GET    | /lessons              | Public                | Lesson[] từ DB, 12 bài chuột available=true                               |
| GET    | /classes              | Giáo viên             | Lớp owner kèm danh sách học sinh                                          |
| POST   | /classes              | Giáo viên             | name/grade 1–5 → lớp đã lưu, 201                                          |
| POST   | /classes/:id/students | Owner lớp             | name → học sinh đã lưu, 201                                               |
| GET    | /rooms                | Giáo viên             | RoomSnapshot[] của owner                                                  |
| POST   | /rooms                | Giáo viên             | name/lessonId/classroomId? → snapshot và phiên LOBBY, 201                 |
| POST   | /rooms/join           | Mã phòng, 30/phút/IP  | code/name → room/student + cookie, 201                                    |
| GET    | /rooms/:code          | Owner/thành viên      | Snapshot không roster                                                     |
| POST   | /rooms/:code/state    | Owner                 | state/revision → snapshot sau commit                                      |
| GET    | /reports              | Giáo viên             | Tối đa 100 kết quả mới nhất thuộc lớp/phòng owner; không trả raw inputLog |

RoomSnapshot `{id,code,name,lessonId,state,revision,memberCount}`. Student trả khi join `{id,name}`. Không trả participantToken JSON; token trong HttpOnly cookie. Mã 6 ký tự crypto.randomInt, unique index và tối đa 5 lần retry khi va chạm. Tối đa 60 thành viên; join chỉ LOBBY/READY. Cookie hợp lệ tránh thêm trùng khi join lại. Tên học sinh 1–60 ký tự sau trim, lớp/phòng 1–80 ký tự.

## Student overview (M02)

`GET /student/overview` trả `StudentOverview` từ shared, `Cache-Control: no-store`. Cookie `byte_student` trỏ đến RoomMember còn hạn, hoặc `byte_practice` trỏ đến PracticeIdentity còn hạn. Không có cookie hoặc đã hết hạn: `student/classroom/room=null`, các danh sách rỗng. Không nhận studentId qua query, không lộ roster hoặc dữ liệu người khác.

Có phiên: `student: {id,name}`, `classroom: {name,grade}|null`, `room: RoomSnapshot|null`, `progress: {lessonId,completedCount,bestScore}[]`, `achievements: {rewardId,stars}[]`, `activeLessonIds: string[]`, `todayCompletedLessonIds: string[]`. Ngày hôm nay tính theo Asia/Ho_Chi_Minh; hoàn thành cần Attempt COMPLETED/RESULT có Result đạt (passed=true) trong ngày. Overview chỉ đọc; ghi điểm dùng các endpoint M03 dưới đây. `/lessons` lấy `available` từ cột DB cùng definition.

Cookie 8 giờ. POST có Origin phải đúng APP_ORIGIN; CLI không Origin vẫn phải có cookie khi cần quyền. Không CORS wildcard.

## Socket

Handshake kiểm Origin. Client emit `room:subscribe({code}, ack)`. Server kiểm cookie teacher/member. Ack `{ok:true}` hoặc `{ok:false,error}`. Thành công gửi `room:snapshot(RoomSnapshot)` ngay. Join/state broadcast sau commit. Reconnect phải subscribe lại để lấy snapshot DB mới. Không public tên học sinh. Không nhận sự kiện điểm hay điều khiển game từ client trong milestone này. Tối đa 20 subscribe/connection, kiểm lại quyền mỗi 30 giây.

## Gameplay chuột M03

- `POST /attempts`: `{lessonId, doubleClickMs?:300..1000}` → 201 `{id,lessonId,seed,startedAt,doubleClickMs}`. Bài phải tồn tại và đã available. Tự luyện tạo PracticeIdentity + Student ẩn danh bằng cookie HttpOnly `byte_practice`. Thành viên phòng đang hoạt động chỉ được tạo đúng lesson khi room PLAYING; sessionId do server xác định.
- `POST /attempts/:id/pause`: `{paused:boolean}` → `{paused}`. Kiểm chủ lượt theo cookie, ghi pauseLog bằng thời gian máy chủ. Không cho đổi lượt đã có Result.
- `POST /attempts/:id/result`: `{events:MouseInput[]}` → `{id,attemptId,score,accuracy,durationMs,completedTargets,correctActions,wrongActions,stars,passed,completedAt}`. Không nhận điểm/thống kê do client tính. Tối đa 6000 events, JSON tối đa 512KiB, thời gian log tối đa 4 giờ. Event `{type:down|move|up|cancel|wheel,button,x,y,t,deltaY?}` với tọa độ world 960×560, t tính ms từ lượt bắt đầu; deltaMode của wheel chuẩn hóa pixel ở canvas. Down/wheel phải trong world; move/up cho phép ngoài canvas để pointer capture làm việc.

Máy chủ replay MouseRun với seed và cấu hình của Attempt, kiểm thời gian tăng dần, không ở tương lai, không thao tác trong pause cá nhân/phòng hoặc sau khi giáo viên kết thúc. Pause cắt gesture đang dở. Thời gian chấm bỏ khoảng pause. Result/Achievement/Progress/Attempt state ghi trong một transaction; retry cùng attempt trả lại kết quả cũ, không tăng lượt hoàn thành hoặc sao lần nữa. Raw inputLog giữ trong DB để audit, không trả cho học sinh/báo cáo thông thường.

Attempt lưu skillId/levelId/startedAt/sessionId/seed/doubleClickMs. Result lưu createdAt (thời điểm server hoàn tất kiểm tra), số đúng/sai/mục tiêu, điểm/sao/đạt, độ chính xác, durationMs và inputLog. Progress tăng khi đạt; Achievement upsert mức sao tốt nhất theo reward ID riêng từng bài. Không gọi Prisma từ frontend. Lượt tự rời bài không tạo kết quả thành công.

Replay kiểm tính nhất quán của thao tác do browser gửi; trình duyệt không cung cấp chứng thực phần cứng chống giả mạo từ client có chủ đích. Việc xác minh mouse device/auto-scroll của hệ điều hành nằm trong checklist thiết bị thật.

Bài `mouse-intro` cũ được đánh dấu retired: giữ trong DB cho phòng/kết quả cũ, không trả trong danh sách lesson công khai và không tính vào 12 bài luyện chuột hiện hành.

## Luyện gõ M04

- `POST /typing/attempts`: `{lessonId,name?}` → 201 `{id,startedAt,serverTime,roomSessionId,config}`. Chỉ lesson thuộc typingLessons đã mở trong DB. Bài tên yêu cầu name 1–60 ký tự chữ/khoảng trắng; target NFC được cố định trong `Attempt.typingConfig`. Tự luyện dùng PracticeIdentity hiện có. Phòng đang hoạt động chỉ tạo đúng bài khi PLAYING; session do server chọn. roomSessionId=null cho tự luyện, kể cả khi học sinh có cookie của phòng đã kết thúc.
- `POST /attempts/:id/pause`: dùng chung chuột/gõ, trả thêm `serverTime` để căn đồng hồ đơn điệu của máy học sinh, không phụ thuộc giờ hệ điều hành máy học sinh. `RoomSnapshot` có `serverTime?` cho cùng mục đích.
- `POST /typing/attempts/:id/result`: `{events:TypingEvent[]}` → `{id,attemptId,score,accuracy,durationMs,correctActions,wrongActions,completedTargets,stars,passed,cpm,wpm,longestStreak,errorCount}`. Server không nhận thống kê client. Tối đa 6000 events, text snapshot 2000 ký tự, body 512KiB, t tối đa 4 giờ. `TypingEvent` nằm trong shared: down/up/clear/text/mode/finish, t tương đối startedAt; down có code/key/repeat/modifier/isComposing, text chỉ có bản ổn định NFC, mode có system/integrated và telex/vni.

Replay kiểm thời gian tăng dần, không tương lai, pause cá nhân/phòng và kết thúc buổi học; clear/up/finish được phép trong pause để cắt giữ phím/nộp phần đã làm. Thời gian gõ từ thao tác đầu tiên tới finish, bỏ hợp của các khoảng pause/kết thúc phòng. Không tính thời gian đọc hướng dẫn hoặc chờ gõ. Một transaction ghi Result, Attempt RESULT, Progress (chỉ khi đạt), Achievement mức sao tốt nhất. Retry cùng attempt trả ID/kết quả cũ. Phải là chủ lượt theo cookie còn hạn, không nhận studentId. `/reports` thêm cpm/wpm/longestStreak/errorCount nhưng không trả raw log. Không chứng thực phần cứng chống client cố ý giả log.

Tại M04, `keyboard-intro` và `vietnamese-intro` cũng retired, vẫn giữ DB/phòng cũ; danh sách công khai khi đó có 12 bài chuột, 16 bàn phím, 11 tiếng Việt và 3 intro chưa có gameplay. M05 thay ba intro còn lại bằng các bài thực hành bên dưới.

## Simulation M05

Sáu intro cũ đều retired, không trả trong `/lessons`. Sau seed có 70 định nghĩa lưu DB, 64 lesson công khai/chơi được: 12 mouse, 16 keyboard, 11 vietnamese, 10 files, 10 computer, 5 safety.

- `POST /simulation/attempts` `{lessonId}` → 201 lượt mới hoặc 200 lượt dở cùng lesson/session. Trả `{id,revision,paused,roomSessionId,state,goals}`. `state` là SimulationState trong shared; definition do server chụp từ lesson, không nhận config client. Tạo cookie practice HttpOnly khi chưa có danh tính. Phòng đang hoạt động phải đúng bài, lượt mới chỉ khi PLAYING; PAUSED có thể lấy lại lượt dở để chờ. Lượt phòng kết thúc chưa nộp được lấy lại để hoàn tất kết quả trước khi mở tự luyện mới.
- `GET /simulation/attempts/:id` → ticket hiện tại, chỉ cookie owner. Không biết ID người khác, hết phiên hoặc sai module →404; không public snapshot.
- `POST /simulation/attempts/:id/action` `{revision,action:SimulationCommand}` → ticket sau commit. Có discriminated schema theo domain files/desktop/quiz/dismiss/reset. Mọi action kiểm owner, PLAYING cá nhân/phòng, chưa result và revision. 409 khi stale/không hợp lệ, rollback toàn bộ; 400 khi sai schema. Không nhận state/score/parent tree tùy ý. Giới hạn 500 command/lượt trước reset, 128 node, undo 20. Tên tối đa 80; app chỉ notes/gallery; hình học số hữu hạn, được clamp bởi reducer.
- `POST /simulation/attempts/:id/result` `{revision}` → `{id,score,accuracy,durationMs,correctActions,wrongActions,completedTargets,stars,passed}`. Kiểm revision và tính từ snapshot server. Có thể nộp phần dở hoặc khi phòng kết thúc; thiếu điều kiện passed=false. Retry cùng Attempt trả lại kết quả cũ, không tăng progress/achievement. Result.inputLog lưu snapshot để audit, không trả trong JSON/report. Result/Attempt/Progress/Achievement một transaction.
- Pause dùng chung `POST /attempts/:id/pause`; snapshot đã lưu độc lập với trạng thái pause. Reset là action domain reset, tăng revision; không sửa Attempt khác hoặc Result đã hoàn tất. Command retry với revision cũ không được áp dụng lại, cần GET để lấy trạng thái mới.

Client không truy cập file thật. Body JSON vẫn giới hạn 512KiB; action chỉ chứa ID/tên/tham số cần thiết. Screenshot preview không phải file được upload/download; các tệp ví dụ là VfsNode.
