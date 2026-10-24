# Game Archive — chạy local

Thư mục này chứa đủ giao diện và dữ liệu để chạy độc lập, không cần npm install hay build. Bạn có thể sao chép nguyên thư mục sang máy khác.

## Shortcut Desktop trên Windows

Không dùng file `Jang Play.lnk` được sao chép từ máy khác vì shortcut Windows chứa đường dẫn tuyệt đối.

1. Tại thư mục gốc project, chạy `create-shortcut.bat` một lần.
2. Script sẽ tạo hoặc ghi đè shortcut `Jang Play` trên Desktop bằng đúng đường dẫn hiện tại.
3. Sau đó mở shortcut Desktop. Trang Steam ở `/`, trang Xbox Game Pass ở `/xbox/`.

Máy cần Python 3 và lệnh `py` hoặc `python` trong PATH. Nếu muốn xem lỗi trực tiếp, chạy `local-site\start.bat` thay vì shortcut chạy ẩn.

## Khởi động

Cần cài **Python 3**.

- **Windows:** nhấp đúp `start.bat`.
- **macOS/Linux:** mở Terminal tại thư mục này, chạy `sh start.sh`.
- Hoặc chạy `python serve.py` (macOS/Linux có thể dùng `python3 serve.py`).

Sau đó mở **http://127.0.0.1:8000** trong Chrome/Edge. Giữ cửa sổ Terminal đang chạy; nhấn Ctrl+C để tắt.

Nếu cổng 8000 đang được dùng: `python serve.py --port 8080`, rồi mở http://127.0.0.1:8080.

Không mở `index.html` bằng cách nhấp đúp: trình duyệt cần HTTP localhost để tải JSON và nhận Gamepad API đúng cách. Máy chủ chỉ lắng nghe trên máy của bạn (127.0.0.1).

## Các tệp

- `index.html`, `styles.css`, `app.js`: giao diện thư viện, tìm kiếm, phân loại và chi tiết game.
- `gamepad.js`: hỗ trợ tay cầm Xbox/standard Gamepad API, có bàn phím tìm kiếm trên màn hình.
- `hls.min.js`: trình phát HLS cho trailer (hls.js 1.6.13, Apache-2.0).
- `data/catalog.json`: danh sách đủ 5.262 hồ sơ, metadata và 24 tab dữ liệu.
- `data/games/*.json`: dữ liệu đầy đủ của từng hồ sơ, tải khi mở chi tiết.
- `serve.py`, `start.bat`, `start.sh`: chạy máy chủ local bằng Python tiêu chuẩn.

Tìm kiếm/phân loại và dữ liệu JSON hoạt động khi không có Internet; ảnh, video, liên kết Steam và font web vẫn cần Internet. Mô tả chưa thu thập hoặc chưa dịch được hiển thị đúng trạng thái; đây là bản chụp dữ liệu tại thời điểm build.

## Tay cầm

Kết nối tay cầm Xbox bằng USB/Bluetooth, mở trang rồi nhấn một nút để trình duyệt nhận thiết bị. D-pad/cần trái di chuyển; A chọn; B quay lại; LB/RB đổi nhóm; Y tìm kiếm; X xóa khi nhập; cần phải cuộn. Khả năng hoạt động phụ thuộc trình duyệt và thiết bị.

## Cập nhật dữ liệu từ repository

Tại thư mục gốc repository, chạy:

```bash
python scripts/build_game_site.py --output local-site
```

Lệnh này đọc `data/game-library.json` và cập nhật giao diện/dữ liệu tại đây, giữ các tệp khởi động. Chạy lại khi JSON tổng có thông tin mới. Muốn chỉ làm việc với bản local không cần mang theo repository, hãy sao chép toàn bộ thư mục `local-site` sau khi build.
