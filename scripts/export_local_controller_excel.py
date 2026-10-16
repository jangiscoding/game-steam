#!/usr/bin/env python3
import argparse
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


GENRE_VI = {
    "Action": "Hành động",
    "Indie": "Game độc lập",
    "Adventure": "Phiêu lưu",
    "Casual": "Giải trí nhẹ",
    "RPG": "Nhập vai",
    "Simulation": "Mô phỏng",
    "Strategy": "Chiến thuật",
    "Sports": "Thể thao",
    "Racing": "Đua xe",
    "Early Access": "Truy cập sớm",
    "Free To Play": "Miễn phí",
    "Massively Multiplayer": "Trực tuyến nhiều người chơi quy mô lớn",
    "Gore": "Máu me",
    "Violent": "Bạo lực",
    "Nudity": "Khỏa thân",
    "Sexual Content": "Nội dung tình dục",
    "Game Development": "Phát triển game",
}

HEADERS = [
    "STT",
    "Ảnh",
    "Tên game",
    "Steam App ID",
    "Link Steam",
    "Thể loại",
    "Hỗ trợ tay cầm",
    "Local Co-op",
    "Chia sẻ/Chia màn hình",
    "URL ảnh",
    "Nền tảng",
    "Dung lượng Windows tối thiểu",
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Export unique local-controller games with linked cover images"
    )
    parser.add_argument("--input", default="data/game-profiles.json")
    parser.add_argument(
        "--output", default="local-2-controller-games-with-images.xlsx"
    )
    return parser.parse_args()


def clean(value):
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        value = "; ".join(str(item) for item in value if item not in (None, ""))
    return ILLEGAL_CHARACTERS_RE.sub("", str(value))


def normalize_name(value):
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", normalized.lower()).strip()


def qualifies(profile):
    metadata = profile.get("steamMetadata") or {}
    controller = (metadata.get("controllerSupport") or {}).get("level")
    modes = metadata.get("playerModes") or {}
    return controller in {"full", "partial"} and (
        modes.get("localCoop") is True
        or modes.get("sharedOrSplitScreen") is True
    )


def unique_games(profiles):
    selected = {}
    for profile in profiles:
        if not qualifies(profile):
            continue
        name = profile.get("officialName") or profile.get("suppliedName")
        selected.setdefault(normalize_name(name), profile)
    return sorted(
        selected.values(),
        key=lambda profile: (profile.get("officialName") or profile.get("suppliedName") or "").casefold(),
    )


def yes_no(value):
    return "Có" if value is True else "Không"


def translated_genres(profile):
    return [GENRE_VI.get(genre, genre) for genre in profile.get("genres", [])]


def controller_label(profile):
    level = profile["steamMetadata"]["controllerSupport"]["level"]
    return "Đầy đủ" if level == "full" else "Một phần"


def build_games_sheet(workbook, games):
    sheet = workbook.active
    sheet.title = "548 game local"
    sheet.append(HEADERS)

    header_fill = PatternFill("solid", fgColor="1F4E78")
    for cell in sheet[1]:
        cell.font = Font(color="FFFFFF", bold=True)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for index, profile in enumerate(games, start=1):
        row_number = index + 1
        metadata = profile["steamMetadata"]
        modes = metadata["playerModes"]
        app_id = profile["candidateIdentifiers"]["steamAppId"]
        steam_url = metadata["links"].get("store") or f"https://store.steampowered.com/app/{app_id}/"
        image_url = profile.get("suppliedImageUrl") or ""
        storage = (
            ((metadata.get("storageRequirements") or {}).get("windows") or {})
            .get("minimum") or {}
        ).get("display")

        sheet.append([
            index,
            f"=IMAGE(J{row_number},C{row_number},0)" if image_url else "",
            clean(profile.get("officialName") or profile.get("suppliedName")),
            app_id,
            steam_url,
            clean(translated_genres(profile)),
            controller_label(profile),
            yes_no(modes.get("localCoop")),
            yes_no(modes.get("sharedOrSplitScreen")),
            image_url,
            clean(profile.get("platforms", [])),
            storage or "",
        ])

        sheet.row_dimensions[row_number].height = 90
        sheet.cell(row=row_number, column=5).hyperlink = steam_url
        sheet.cell(row=row_number, column=5).style = "Hyperlink"
        sheet.cell(row=row_number, column=10).hyperlink = image_url
        sheet.cell(row=row_number, column=10).style = "Hyperlink"

    widths = [7, 20, 46, 16, 48, 45, 20, 16, 23, 55, 24, 28]
    for index, width in enumerate(widths, start=1):
        sheet.column_dimensions[get_column_letter(index)].width = width

    sheet.freeze_panes = "C2"
    sheet.auto_filter.ref = f"A1:L{sheet.max_row}"
    sheet.row_dimensions[1].height = 36
    for row in sheet.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="center", wrap_text=True)


def build_summary_sheet(workbook, games):
    sheet = workbook.create_sheet("Tổng hợp")
    genres = Counter(
        translated
        for profile in games
        for translated in translated_genres(profile)
    )
    full = sum(
        profile["steamMetadata"]["controllerSupport"]["level"] == "full"
        for profile in games
    )
    local_coop = sum(
        profile["steamMetadata"]["playerModes"].get("localCoop") is True
        for profile in games
    )

    rows = [
        ("Chỉ số", "Giá trị"),
        ("Tổng tên game duy nhất", len(games)),
        ("Hỗ trợ tay cầm đầy đủ", full),
        ("Hỗ trợ tay cầm một phần", len(games) - full),
        ("Có Local Co-op", local_coop),
        ("Có Shared/Split Screen", len(games)),
        ("", ""),
        ("Thể loại", "Số game"),
        *genres.most_common(),
        ("", ""),
        (
            "Lưu ý về ảnh",
            "Cột Ảnh dùng hàm IMAGE và tải ảnh từ URL Steam khi mở bằng Microsoft Excel 365 có kết nối Internet. Cột URL ảnh được giữ để mở trực tiếp khi ứng dụng bảng tính không hỗ trợ IMAGE.",
        ),
        (
            "Lưu ý về số người chơi",
            "Steam xác nhận hỗ trợ tay cầm và chơi chung máy, nhưng API công khai không cung cấp số tay cầm tối đa chính xác.",
        ),
    ]
    for row in rows:
        sheet.append(row)

    for cell in sheet[1]:
        cell.font = Font(color="FFFFFF", bold=True)
        cell.fill = PatternFill("solid", fgColor="1F4E78")
    sheet.column_dimensions["A"].width = 38
    sheet.column_dimensions["B"].width = 110
    for row in sheet.iter_rows():
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)


def main():
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()

    with input_path.open("r", encoding="utf-8") as handle:
        profiles = json.load(handle)
    games = unique_games(profiles)
    if len(games) != 548:
        raise RuntimeError(f"Expected 548 unique games, found {len(games)}")

    workbook = Workbook()
    workbook.calculation.fullCalcOnLoad = True
    workbook.calculation.forceFullCalc = True
    workbook.calculation.calcMode = "auto"
    build_games_sheet(workbook, games)
    build_summary_sheet(workbook, games)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output_path)

    validated = load_workbook(output_path, read_only=False, data_only=False)
    games_sheet = validated["548 game local"]
    if games_sheet.max_row != 549 or games_sheet.max_column != len(HEADERS):
        raise RuntimeError("Excel row or column validation failed")
    if not str(games_sheet["B2"].value).startswith("=IMAGE("):
        raise RuntimeError("Excel image formula validation failed")
    validated.close()
    print(f"Exported {len(games)} unique games to {output_path}")


if __name__ == "__main__":
    main()
