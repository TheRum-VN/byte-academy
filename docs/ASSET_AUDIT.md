# Asset audit

Audit toàn bộ PNG bằng Pillow: mở và giải mã đầy đủ, đối chiếu sprite.path (không suy đoán tên), filename, CSV và SHA-256.

- Atlas khai báo: 18; sprite khai báo: 264; PNG giải mã: 264.
- CSV: 264 dòng.
- Đường dẫn trùng: 0. Nội dung trùng SHA-256: 0 nhóm.
- PNG ngoài manifest: 0.
- references/: Có.

| ID | Atlas | Khai báo | Đọc được | Atlas gốc |
|---|---|---:|---:|---|
| 01 | byte_poses | 16 | 16 | Thiếu atlas gốc |
| 02 | byte_faces | 16 | 16 | Thiếu atlas gốc |
| 03 | hardware | 16 | 16 | Thiếu atlas gốc |
| 04 | mouse_skills | 16 | 16 | Thiếu atlas gốc |
| 05 | mouse_garden | 16 | 16 | Thiếu atlas gốc |
| 06 | mouse_objects | 16 | 16 | Thiếu atlas gốc |
| 07 | typing_hands | 16 | 16 | Thiếu atlas gốc |
| 08 | keyboard | 16 | 16 | Thiếu atlas gốc |
| 09 | file_icons | 16 | 16 | Thiếu atlas gốc |
| 10 | file_actions | 16 | 16 | Thiếu atlas gốc |
| 11 | vietnamese_typing | 16 | 16 | Thiếu atlas gốc |
| 12 | rewards | 16 | 16 | Thiếu atlas gốc |
| 13 | navigation | 16 | 16 | Thiếu atlas gốc |
| 14 | module_art | 4 | 4 | Thiếu atlas gốc |
| 15 | computer_safety | 16 | 16 | Thiếu atlas gốc |
| 16 | students | 16 | 16 | Thiếu atlas gốc |
| 17 | classroom | 16 | 16 | Thiếu atlas gốc |
| 18 | hero_art | 4 | 4 | Thiếu atlas gốc |

## Vấn đề sprite
Không có sprite thiếu, sai định dạng, sai tên, không đọc được hoặc lệch CSV.

## Giới hạn và khắc phục
18 atlas nguồn không được cung cấp trong public/assets/atlas-source. Không cản trở runtime vì ứng dụng dùng sprite PNG đã tách. Muốn tái xuất, bổ sung các file đúng source_image trong manifest. Ghi chú “no sprites included” trong manifest là thông tin template cũ; kiểm tra thực tế xác nhận sprite tồn tại.

## PNG ngoài danh mục
Không có.

## Trùng nội dung
Không có.

## Tên file và concept
Trùng basename giữa các thư mục: 0 nhóm. Trùng trong cùng atlas được coi là lỗi và được kiểm riêng.
references\UIUX-concept-0.jpg
references\UIUX-concept-1.jpg

Hai ảnh concept đã được mở và đọc trực quan: UIUX-concept-0.jpg (trang học sinh và preview), UIUX-concept-1.jpg (chi tiết bốn game). Giao diện bám nền cream, header bo mềm, Byte, banner pastel và bốn thẻ phân khu. Không dùng ảnh concept làm screenshot thay giao diện thật.

## Repository ban đầu
Không có package.json, source/config hay AGENTS.md. Chỉ có public/assets với manifests JSON/CSV/XLSX, 264 sprite PNG và các .gitkeep. references/ được người dùng bổ sung trong lúc audit. Không xóa hoặc ghi đè asset/manifests/concept.
