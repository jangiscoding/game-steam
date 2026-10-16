#!/usr/bin/env python3
"""Curated Vietnamese browsing groups derived from Steam user tags."""

import re


CATEGORY_RULES = (
    ("tag-horror", "Kinh dị", {"Horror", "Psychological Horror", "Survival Horror"}),
    ("tag-survival", "Sinh tồn", {"Survival", "Open World Survival Craft"}),
    ("tag-puzzle", "Giải đố", {"Puzzle", "Logic", "Puzzle Platformer"}),
    ("tag-fps", "Bắn súng góc nhìn thứ nhất", {"FPS"}),
    ("tag-third-person-shooter", "Bắn súng góc nhìn thứ ba", {"Third-Person Shooter"}),
    ("tag-fighting", "Đối kháng", {"Fighting", "2D Fighter", "3D Fighter"}),
    ("tag-platformer", "Đi cảnh", {"Platformer", "2D Platformer", "3D Platformer", "Precision Platformer"}),
    ("tag-roguelike", "Roguelike", {"Roguelike", "Roguelite", "Action Roguelike", "Traditional Roguelike"}),
    ("tag-open-world", "Thế giới mở", {"Open World"}),
    ("tag-sandbox", "Sandbox", {"Sandbox"}),
    ("tag-visual-novel", "Visual Novel", {"Visual Novel"}),
    ("tag-souls-like", "Souls-like", {"Souls-like"}),
    ("tag-metroidvania", "Metroidvania", {"Metroidvania"}),
    ("tag-stealth", "Lén lút", {"Stealth"}),
    ("tag-rhythm", "Âm nhạc & nhịp điệu", {"Rhythm", "Music"}),
    ("tag-card-deckbuilding", "Thẻ bài & xây bộ bài", {"Card Game", "Deckbuilding", "Roguelike Deckbuilder"}),
    ("tag-turn-based", "Chiến thuật theo lượt", {"Turn-Based Strategy", "Turn-Based Tactics"}),
    ("tag-rts", "Chiến thuật thời gian thực", {"RTS", "Real Time Tactics"}),
    ("tag-city-builder", "Xây dựng thành phố", {"City Builder"}),
    ("tag-management", "Quản lý", {"Management"}),
    ("tag-crafting", "Chế tạo", {"Crafting"}),
    ("tag-mmorpg", "MMORPG", {"MMORPG"}),
    ("tag-moba", "MOBA", {"MOBA"}),
    ("tag-battle-royale", "Battle Royale", {"Battle Royale"}),
)


def tag_names(game):
    names = []
    for tag in game.get("steamTags") or []:
        name = tag.get("name") if isinstance(tag, dict) else tag
        if name and name not in names:
            names.append(name)
    return names


def rebuild_tag_tabs(library):
    """Replace generated tag-category tabs without touching custom tabs."""
    tabs = [tab for tab in library.get("tabs", []) if not re.fullmatch(r"tag-[a-z0-9-]+", tab["id"])]
    for tab_id, name, matching_tags in CATEGORY_RULES:
        selected = [game["id"] for game in library["games"] if matching_tags.intersection(tag_names(game))]
        if selected:
            tabs.append({"id": tab_id, "name": name, "gameIds": selected, "source": "steam-tags"})
    library["tabs"] = tabs
    library["metadata"]["totalTabs"] = len(tabs)

