# 🤖 AI_CONTEXT.md — HƯỚNG DẪN DÀNH CHO AI AGENT (JANG PLAY)

> **Tài liệu này được tạo ra để bất kỳ AI Agent nào khi tiếp nhận dự án đều có thể hiểu ngay lập tức toàn bộ bối cảnh, kiến trúc hệ thống, các lưu ý kỹ thuật sống còn và quy tắc bắt buộc.**

---

## 1. 📌 TỔNG QUAN DỰ ÁN

- **Tên dự án:** **Jang Play** *(Tên cũ: Jang Game Archive)*
- **Chủ sở hữu:** Jang (`jangiscoding`)
- **Mục tiêu:** Thư viện game cá nhân đồ sộ (hơn 5.200 trò chơi Steam), được thiết kế tối ưu hóa đặc biệt cho **trải nghiệm Console / TV / Ghế Sofa** điều khiển 100% bằng **Tay cầm Xbox / PlayStation (Gamepad)**, giao diện **Cyberpunk Neon**, hỗ trợ tìm kiếm tức thì, lọc co-op/tay cầm, xem trailer HLS/MP4 và mở game 1-chạm vào Steam client.
- **Repository:** `origin/main` trên `github.com:jangiscoding/game-steam.git`

---

## 2. 📂 CẤU TRÚC THƯ MỤC & FILE TRỌNG YẾU

```
c:\LAB\game-steam\
├── local-site/                  # THƯ MỤC CHÍNH PHỤC VỤ LOCALHOST (127.0.0.1:8000)
│   ├── index.html               # Trang chủ UI chính (có cache-buster ?v=X)
│   ├── app.js                   # Logic catalog, tìm kiếm, virtual scroll, modal detail, steam runner
│   ├── gamepad.js               # Engine điều khiển tay cầm Console-grade (âm thanh, rung, phím ảo)
│   ├── serve.py                 # Server Python nền siêu nhẹ (xử lý API open-steam, search-viethoa, installed-games)
│   ├── styles.css               # Theme Cyberpunk Neon (#00f0ff, #ff7700, #ff007f)
│   ├── filters.css              # Giao diện bộ lọc thể loại, tag, việt hóa, game đã cài
│   ├── ps-neon.ico              # Icon PlayStation Neon 4 nút chuẩn native Windows DIB
│   ├── jang-app.ico             # Icon dự phòng cho favicon / shortcut
│   └── data/                    # Dữ liệu offline & bộ dataset
│       ├── theredteam.json      # Cache danh sách bản dịch The Red Team
│       └── viethoa_games.json   # Dataset 191+ game đã khớp với danh mục Steam
├── html-package/                # BẢN ĐÓNG GÓI TĨNH ĐỘC LẬP (PHẢI LUÔN ĐỒNG BỘ VỚI local-site/)
├── Jang Play.lnk                # File Desktop Shortcut chuẩn đã gắn sẵn icon ps-neon
├── create-shortcut.bat          # File chạy 1-click tạo shortcut ra Desktop bất kỳ lúc nào
├── create-shortcut.ps1          # Script PowerShell tạo shortcut và refresh Windows icon cache
├── native_ico.cs                # Công cụ C# biên dịch ảnh PNG/JPG thành icon Windows DIB chuẩn
├── generate_ps_neon.cs          # Mã nguồn C# vẽ biểu tượng PlayStation Neon 4 nút dạng vector
└── AI_CONTEXT.md                # Chính là tài liệu này
```

---

## 3. ⚠️ QUY TẮC BẮT BUỘC DÀNH CHO AI (CRITICAL RULES)

### 🔴 QUY TẮC 1: Luôn đồng bộ 2 thư mục (`local-site` và `html-package`)
Mọi chỉnh sửa code UI, script hoặc server tại `local-site/` (ví dụ `app.js`, `gamepad.js`, `styles.css`, `filters.css`, `serve.py`, `index.html`, `data/`) **BẮT BUỘC PHẢI COPY / ĐỒNG BỘ SANG `html-package/`**.

### 🔴 QUY TẮC 2: Tăng số Version Cache-Busting (`?v=X`)
Trong `index.html`, các thẻ nạp `app.js`, `gamepad.js`, `styles.css`, `filters.css` sử dụng tham số `?v=X` (ví dụ `?v=18`). Khi chỉnh sửa code các file này, **hãy tăng số version** để trình duyệt của người dùng không bị load lại file cũ từ cache.

### 🔴 QUY TẮC 3: Mở Steam trên Tay cầm Xbox (Bypass Chromium User Activation)
- **Bản chất kỹ thuật:** Trong trình duyệt Chromium (Chrome / Edge), Gamepad API chạy trong vòng lặp `requestAnimationFrame` và **KHÔNG được cấp quyền Transient User Activation**. Nếu dùng thẻ `<a href="steam://...">` hoặc `window.location = url` hay `iframe.src`, trình duyệt sẽ **CHẶN (BLOCK)** không cho gọi ứng dụng ngoài OS khi bấm bằng tay cầm.
- **Giải pháp bắt buộc:** Trong `app.js`, hàm `openSteamUrl()` phải gọi `fetch('/api/open-steam?url=' + encodeURIComponent(url))`. Server `serve.py` nhận request và gọi lệnh hệ điều hành gốc `os.startfile(url)`. Cách này bỏ qua 100% cơ chế chặn của Chrome, mở Steam ngay tức thì 100/100 lần.

### 🔴 QUY TẮC 4: Tiêu điểm tay cầm (Focus Landing) khi mở Game Detail
Khi người dùng bấm **A** vào một thẻ game để xem chi tiết:
- Con trỏ viền sáng (`.gamepad-focus`) **PHẢI NHẢY NGAY VÀO NÚT "Mở trong ứng dụng Steam"** (`a[href^="steam://"]`).
- **TUYỆT ĐỐI KHÔNG** để rơi vào nút đóng `"×"` (`[data-close]`).
- Điều này cho phép người dùng bấm **A** lần 1 để xem game, bấm **A** lần 2 là game khởi chạy ngay.

### 🔴 QUY TẮC 5: Xử lý an toàn cho `pythonw.exe` trong `serve.py`
- Người dùng chạy shortcut qua `pythonw.exe` để không bị hiện cửa sổ đen CMD.
- Trong `pythonw.exe`, `sys.stdout` và `sys.stderr` mặc định là `None`. Mọi thao tác ghi log hoặc print phải được chuyển hướng an toàn (`io.StringIO` hoặc file log), không được để ném lỗi `AttributeError: 'NoneType' object has no attribute 'write'`.
- Kiểm tra cổng mạng bằng raw `socket` với timeout ngắn (0.3s), không dùng `urllib` để tránh Windows kiểm tra IE Proxy gây đơ server.

### 🔴 QUY TẮC 6: Chuẩn Icon Windows (`.ico`)
Windows Explorer trên Desktop đòi hỏi các kích thước nhỏ (16, 32, 48, 64) phải là dạng **Bitmap DIB không nén**, chỉ tầng 256x256 mới dùng PNG nén. Nếu tạo file `.ico` chỉ toàn PNG, Windows Explorer sẽ hiển thị icon trắng/lỗi. Hãy sử dụng bộ chuyển đổi trong `native_ico.cs` hoặc `generate_ps_neon.cs`.

---

## 4. 🎮 HỆ THỐNG ĐIỀU KHIỂN TAY CẦM (GAMEPAD ENGINE)

File: [`local-site/gamepad.js`](file:///c:/LAB/game-steam/local-site/gamepad.js)

| Phím bấm | Chức năng trong Jang Play |
| :--- | :--- |
| **D-Pad / Cần Analog Trái** | Di chuyển tiêu điểm trong lưới game, thanh tìm kiếm, bộ lọc |
| **Cần Analog Phải (R-Stick)** | Cuộn mượt danh sách game hoặc cuộn nội dung mô tả game |
| **Nút A (Button 0)** | Chọn / Xác nhận / Mở game / Kích hoạt mở Steam |
| **Nút B (Button 1)** | Quay lại / Đóng cửa sổ chi tiết game / Thoát bàn phím ảo |
| **Nút X (Button 2)** | Thả tim yêu thích game / Xóa ký tự trong bàn phím ảo |
| **Nút Y (Button 3)** | Bật bàn phím ảo trên màn hình để gõ tìm kiếm game |
| **LB / RB (Button 4 / 5)** | Chuyển đổi nhanh qua lại giữa các Bộ sưu tập (Tất cả, Đang chơi, Có Việt Hóa, Đã cài...) |

### Các module tích hợp trong `gamepad.js`:
1. **Web Audio Synthesizer**: Tự tạo âm thanh phản hồi (move, select, back, toggle, boundary) bằng tần số dao động âm thanh thuần, 0ms độ trễ, không cần tải file MP3/WAV bên ngoài.
2. **Dual-Rumble Haptics**: Điều khiển mô-tơ rung của tay cầm Xbox/DualSense phản hồi theo từng thao tác.
3. **On-Screen Virtual Keyboard**: Bàn phím ảo điều khiển bằng tay cầm khi tìm kiếm trên TV.
4. **Auto Focus Recovery**: Tự động lấy lại nút đang chọn khi chuyển đổi cửa sổ giữa Windows và trình duyệt.

---

## 5. 🇻🇳 HỆ THỐNG TÌM KIẾM & DANH MỤC VIỆT HÓA ĐA NGUỒN (VIỆT HÓA ENGINE)

Jang Play tích hợp hệ thống phát hiện và tìm kiếm bản dịch tiếng Việt tự động cho toàn bộ thư viện game.

### 1. 4 Nguồn dịch chính thức được tìm song song:
- **The Red Team** (`theredteam.vn`): Tìm trực tiếp qua API `list-search.php?q=` kết hợp offline cache `data/theredteam.json`.
- **Cánh Cụt Team** (`canhcutteam.com`): REST API WordPress WooCommerce: `/wp-json/wp/v2/product?_embed=1&search=`.
- **Game Thuần Việt** (`gamethuanviet.com`): REST API WordPress WooCommerce: `/wp-json/wp/v2/product?_embed=1&search=`.
- **Việt Hóa Game (XenForo)** (`viethoagame.com`): Tìm kiếm 2 bước thông qua proxy server Python:
  - Tự động lấy token CSRF `_xfToken` từ trang `/forums/san-pham.6/`.
  - Gửi POST đến `search/search` với tham số `c[title_only]=1` và bóc tách HTML DOM để trích xuất danh sách bài viết.

### 2. Backend Proxy & Xử lý lỗi (`serve.py` -> `/api/search-viethoa`):
- Giả lập User-Agent trình duyệt hiện đại để tránh bị Cloudflare/WAF chặn.
- Chuẩn hóa toàn bộ dữ liệu trả về theo format đồng nhất:
  ```json
  [
    {
      "title": "Tên bản dịch",
      "url": "https://...",
      "author": "Tác giả / Nhóm dịch",
      "date": "Ngày phát hành",
      "source": "Tên nguồn (Cánh Cụt, The Red Team...)",
      "thumbnail": "URL ảnh bìa"
    }
  ]
  ```
- **Xử lý lỗi HTTP thân thiện (`friendly_http_error`)**: Nếu một hoặc toàn bộ trang dịch bị lỗi kết nối hoặc trả về mã khác 200 (401, 403, 404, 429, 500, 502, 503, 504, timeout, connection refused), server dịch thông báo lỗi sang tiếng Việt dễ hiểu. Giao diện modal hiển thị cảnh báo riêng cho nguồn bị lỗi mà không làm ảnh hưởng tới các nguồn hoạt động bình thường.

### 3. Tìm kiếm dự phòng trên Google (Fallback Search):
- Nếu cả 4 nguồn đều không tìm thấy kết quả, modal tự động cung cấp nút mở tìm kiếm Google với cú pháp chuẩn xác:
  `https://www.google.com/search?q={ten_game}+steam+việt+hóa`
- Đồng thời cung cấp nút **"Thử tìm lại với tên ngắn hơn"** (tự động loại bỏ subtitle, số phiên bản, ký tự đặc biệt).

### 4. Nhận diện & Đánh dấu Badge Việt Hóa (`.badge-viethoa`):
- **Dataset tĩnh:** `data/viethoa_games.json` gồm hơn 191 game đã được so khớp trước appId.
- **Dynamic Discovery:** Khi người dùng mở modal chi tiết của một game bất kỳ và hệ thống tìm thấy bản dịch từ các nguồn, game đó sẽ được tự động lưu vào `localStorage` (`jang_discovered_viethoa`) và tự động gắn ngay badge `[🇻🇳 CÓ VIỆT HÓA]` trên thẻ game.
- **Bộ lọc & Thống kê:** Hero banner hiển thị bộ đếm số game có Việt Hóa; Sidebar trái có bộ sưu tập riêng `[🇻🇳 Có Việt Hóa]`; thanh thẻ thể loại có chip `[🇻🇳 Có Việt Hóa]`.

---

## 6. 💾 HỆ THỐNG NHẬN DIỆN GAME ĐÃ CÀI ĐẶT TRÊN MÁY (INSTALLED STEAM DETECTION)

- **Backend Scanning (`serve.py` -> `/api/installed-games`):**
  - Tự động dò đường dẫn cài đặt Steam từ Windows Registry (`HKCU\Software\Valve\Steam\SteamPath` hoặc `HKLM\SOFTWARE\WOW6432Node\Valve\Steam\InstallPath`).
  - Đọc file cấu hình `config/libraryfolders.vdf` để quét toàn bộ các thư viện Steam phân tán trên mọi ổ đĩa (D:, E:, F:...).
  - Đọc tất cả manifest `appmanifest_<appId>.acf` trong thư mục `steamapps` để lập danh sách chính xác các game đang được cài đặt trong máy.
- **Giao diện & Trải nghiệm:**
  - Thẻ game đã cài đặt sẽ có badge xanh ngọc phát sáng `[💾 ĐÃ CÀI]`.
  - Bộ sưu tập `[💾 Game đã cài trên máy]` tại sidebar bên trái cho phép người dùng chỉ xem các game sẵn sàng chơi ngay.
  - Khi mở modal chi tiết của game đã cài, nút hành động chính tự động chuyển thành **"Chơi ngay trên Steam"** (`steam://run/<appId>`).

---

## 7. 🚀 CÁCH KHỞI ĐỘNG VÀ KIỂM TRA NHANH

- **Chạy local test:**
  ```powershell
  & "C:\Program Files\Python311\python.exe" c:\LAB\game-steam\local-site\serve.py --port 8000
  ```
- **Chạy ngầm (Silent mode giống shortcut desktop):**
  ```powershell
  Start-Process "C:\Program Files\Python311\pythonw.exe" -ArgumentList "c:\LAB\game-steam\local-site\serve.py" -WorkingDirectory "c:\LAB\game-steam\local-site"
  ```
- **Tạo lại Shortcut ngoài Desktop:**
  Chạy file `c:\LAB\game-steam\create-shortcut.bat` hoặc lệnh:
  ```powershell
  powershell -ExecutionPolicy Bypass -File "c:\LAB\game-steam\create-shortcut.ps1"
  ```
- **Kiểm tra API mở Steam:**
  ```powershell
  Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/open-steam?appId=1215260"
  # Kết quả mong đợi: {"ok": true}
  ```
- **Kiểm tra API tìm kiếm Việt Hóa:**
  ```powershell
  Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/search-viethoa?url=https://canhcutteam.com/wp-json/wp/v2/product?_embed=1&search=Hades"
  ```
- **Kiểm tra API game đã cài đặt:**
  ```powershell
  Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/installed-games"
  ```

---

## 8. 🎨 PHONG CÁCH GIAO DIỆN & TONE GIỌNG

- **Phong cách:** Cyberpunk Neon, nền đen sâu (`#0a0d12`), viền phát quang Cyan (`#00f0ff`) và Cam lửa Neon (`#ff7700`).
- **Không dùng viền trắng kép sắc nhọn** trên viền chọn tay cầm (chỉ dùng viền neon mềm mại phát sáng `gamepadNeonGlow`).
- **Giao tiếp với người dùng:** Ngắn gọn, súc tích, chuyên nghiệp, phản hồi bằng tiếng Việt.
