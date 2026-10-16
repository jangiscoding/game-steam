# File Excel chính để cập nhật lâu dài

- File chính: `/workspace/Thu-vien-game-TONG.xlsx`.
- File 548 game đã có vẫn giữ nguyên: `/workspace/548-game-local-2-tay-cam-nhung-anh.xlsx`.
- Nguồn 5.262 hồ sơ: `data/game-profiles.json`.
- Script tạo ban đầu: `scripts/export_master_excel.py`; mặc định từ chối ghi đè file đã tồn tại để bảo vệ các tab/cột thêm sau này.
- Ảnh cache: `exports/master-covers/`; báo cáo tải: `exports/master-image-report.json`.
- Manifest số dòng/tab: `exports/master-workbook-manifest.json`.

## Quy tắc cho các lần cập nhật tiếp theo

1. Đọc file chính đang có, danh sách tab và các cột đã được thêm.
2. Sao lưu nguyên file vào thư mục `exports/backups/` với thời gian trước khi chỉnh sửa.
3. Nối dữ liệu theo cột `Mã hồ sơ` (`inputRecordId`), không dùng thứ tự dòng hay chỉ tên game. Tab Dữ liệu chi tiết dùng cột Input Record ID tương ứng.
4. Bảo toàn tab/cột/ghi chú người dùng đã thêm; chỉ chỉnh vùng được yêu cầu. Không chạy lại script để thay cả file nếu có thay đổi thủ công.
5. Giữ nguyên đường dẫn và tên file chính; kiểm tra số dòng, ảnh và liên kết sau khi lưu.
6. Không coi hỗ trợ tay cầm + local/shared screen là bằng chứng số tay cầm tối đa. Tab 2 người - tay cầm là nhóm ứng viên theo tiêu chí của file 548 game, đã ghi rõ trong Mục lục.

Một game có thể ở nhiều tab thể loại. Tất cả game giữ nguyên mọi hồ sơ đầu vào; tab 2 người - tay cầm có 548 tên duy nhất. Thiếu thể loại và ảnh lỗi được đánh dấu, không tự suy đoán.
