#!/usr/bin/env python3
"""Package the catalog as classic local scripts: double-click HTML, no HTTP server."""
from library_data import load_library
from build_xbox_game_pass import build_target as build_xbox_target

import argparse
import json
import re
import shutil
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUMMARY_FIELDS = ('id', 'steamAppId', 'name', 'imageUrl', 'genres', 'controllerSupport', 'platforms', 'playerModes', 'verificationStatus', 'supportsVietnamese', 'vietnameseSupportStatus')


def javascript_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=ROOT / 'data/game-library.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'html-package')
    parser.add_argument('--zip', type=Path, help='Optional download archive, kept outside the package folder')
    args = parser.parse_args()
    source = load_library(args.input)
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    assets = ROOT / 'local-site'
    for name in ('styles.css', 'filters.css', 'gamepad.js', 'hls.min.js', 'theme.js'):
        shutil.copy2(assets / name, out / name)
    html = (assets / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r'(<script src="\./app\.js\?v=\d+" defer>)', '<script src="./file-data.js" defer></script><script src="./data/catalog.js" defer></script><script src="./data/extras.js" defer></script>'+r'\1', html)
    (out / 'index.html').write_text(html, encoding='utf-8')
    app = (assets / 'app.js').read_text(encoding='utf-8')
    (out / 'app.js').write_text(app.replace('await fetch(', 'await window.GameArchiveFiles.request(').replace("history.replaceState(null,'',", 'window.GameArchiveFiles.replaceHash('), encoding='utf-8')
    shutil.copy2(ROOT / 'scripts/file-data-loader.js', out / 'file-data.js')
    (out / 'data').mkdir(parents=True, exist_ok=True)
    extras = []
    for name in ('theredteam.json', 'viethoa_games.json'):
        shutil.copy2(assets / 'data' / name, out / 'data' / name)
        value = json.loads((assets / 'data' / name).read_text(encoding='utf-8'))
        extras.append('window.GameArchiveFiles.registerData(' + javascript_json('./data/' + name) + ',' + javascript_json(value) + ');')
    (out / 'data/extras.js').write_text('\n'.join(extras), encoding='utf-8')
    data = out / 'data'
    (data / 'games').mkdir(parents=True, exist_ok=True)
    games = []
    tag_counts = Counter()
    ids = set()
    for game in source['games']:
        game_id = game['id']
        assert game_id.replace('-', '').isalnum() and game_id.isascii(), 'Unsafe game ID'
        assert game_id not in ids, 'Duplicate game ID'
        ids.add(game_id)
        summary = {field: game.get(field) for field in SUMMARY_FIELDS}
        source_profile = game.get('sourceProfile') or {}
        summary['releaseYear'] = source_profile.get('identifiedVersionReleaseYear') or source_profile.get('originalReleaseYear')
        summary['steamTags'] = [
            tag.get('name') if isinstance(tag, dict) else tag
            for tag in game.get('steamTags') or []
            if (tag.get('name') if isinstance(tag, dict) else tag)
        ]
        tag_counts.update(summary['steamTags'])
        games.append(summary)
        (data / 'games' / f'{game_id}.js').write_text('window.GameArchiveFiles.register(' + javascript_json(game_id) + ',' + javascript_json(game) + ');\n', encoding='utf-8')
    assert all(set(tab['gameIds']) <= ids for tab in source['tabs'])
    catalog = {
        'metadata': source['metadata'],
        'tabs': source['tabs'],
        'tags': [{'name': name, 'games': count} for name, count in tag_counts.most_common()],
        'games': games,
    }
    (data / 'catalog.js').write_text('window.GameArchiveFiles.catalog=' + javascript_json(catalog) + ';\n', encoding='utf-8')
    xbox_catalog = ROOT / 'data/xbox-game-pass.json'
    if xbox_catalog.exists():
        build_xbox_target(json.loads(xbox_catalog.read_text(encoding='utf-8')), out / 'xbox')
    (out / 'README.md').write_text('''# Game Archive — bản mở trực tiếp bằng HTML

1. Giải nén toàn bộ thư mục nếu tải bản ZIP.
2. Nhấp đúp **index.html** để mở bằng Chrome hoặc Edge.
3. Giữ nguyên các file và thư mục `data` bên cạnh HTML. Không cần Python, Node.js, npm hoặc máy chủ.

Đây là bản thư mục HTML + JavaScript, không phải một file HTML duy nhất. Có đủ 5.262 hồ sơ và toàn bộ bộ sưu tập từ JSON tổng. Danh sách tải lúc mở trang; chi tiết từng game chỉ tải khi chọn game. Dữ liệu được đóng gói thành script cục bộ để không dùng fetch đọc JSON qua file://.

Tìm kiếm, lọc và nội dung đã có chạy offline. Ảnh, trailer và font web vẫn lấy qua Internet; thiếu mạng sẽ dùng font mặc định và có thể không hiện media. Một số trailer có thể bị nguồn chặn khi mở từ file://; liên kết Steam vẫn được giữ. Mô tả chưa dịch/thu thập giữ đúng trạng thái, không tự điền dữ liệu giả.

Hỗ trợ tay cầm tùy trình duyệt và quyền của Gamepad API trên file://. Nếu trình duyệt cho phép, nhấn một nút để nhận thiết bị; D-pad/cần trái di chuyển, A chọn, B quay lại, X yêu thích, LB/RB đổi nhóm, Y tìm kiếm, Menu xóa bộ lọc, cần phải cuộn, LT/RT lật trang, LT+RT về đầu và View (⧉) chuyển Steam/PC Game Pass. Bản localhost vẫn có trong thư mục local-site của repository để dùng khi trình duyệt hạn chế tay cầm hoặc media trên file://.

Dữ liệu là bản chụp tại lúc đóng gói. Để cập nhật từ thư mục gốc repository: `python scripts/build_html_package.py`. Việc tạo lại gói cần Python; người mở gói đã tạo thì không cần cài Python.
''', encoding='utf-8')
    if args.zip:
        archive = args.zip.resolve()
        if archive.is_relative_to(out):
            raise ValueError('ZIP archive must be outside the package folder')
        archive.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zip_file:
            for path in sorted(out.rglob('*')):
                if path.is_file():
                    zip_file.write(path, Path(out.name) / path.relative_to(out))
        print(f'ZIP: {archive} ({archive.stat().st_size:,} bytes)')
    print(f'Packaged {len(games)} games / {len(source["tabs"])} collections → {out / "index.html"}')


if __name__ == '__main__':
    main()
