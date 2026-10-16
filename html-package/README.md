# Game Archive — bản mở trực tiếp bằng HTML

1. Giải nén toàn bộ thư mục nếu tải bản ZIP.
2. Nhấp đúp **index.html** để mở bằng Chrome hoặc Edge.
3. Giữ nguyên các file và thư mục `data` bên cạnh HTML. Không cần Python, Node.js, npm hoặc máy chủ.

Đây là bản thư mục HTML + JavaScript, không phải một file HTML duy nhất. Có đủ 5.262 hồ sơ và 24 tab dữ liệu từ JSON tổng. Danh sách tải lúc mở trang; chi tiết từng game chỉ tải khi chọn game. Dữ liệu được đóng gói thành script cục bộ để không dùng fetch đọc JSON qua file://.

Tìm kiếm, lọc và nội dung đã có chạy offline. Ảnh, trailer và font web vẫn lấy qua Internet; thiếu mạng sẽ dùng font mặc định và có thể không hiện media. Một số trailer có thể bị nguồn chặn khi mở từ file://; liên kết Steam vẫn được giữ. Mô tả chưa dịch/thu thập giữ đúng trạng thái, không tự điền dữ liệu giả.

Hỗ trợ tay cầm tùy trình duyệt và quyền của Gamepad API trên file://. Nếu trình duyệt cho phép, nhấn một nút để nhận thiết bị; D-pad/cần trái di chuyển, A chọn, B quay lại, LB/RB đổi nhóm, Y tìm kiếm, X xóa. Bản localhost vẫn có trong thư mục local-site của repository để dùng khi trình duyệt hạn chế tay cầm hoặc media trên file://.

Dữ liệu là bản chụp tại lúc đóng gói. Để cập nhật từ thư mục gốc repository: `python scripts/build_html_package.py`. Việc tạo lại gói cần Python; người mở gói đã tạo thì không cần cài Python.
