#!/usr/bin/env python3
"""Build the static site with a compact, lazy-loaded public data projection."""

from library_data import load_library
from build_xbox_game_pass import build_target as build_xbox_target

import argparse
import json
import shutil
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STATIC_FILES = ("index.html", "styles.css", "filters.css", "app.js", "hls.min.js", "gamepad.js", "theme.js")
SUMMARY_FIELDS = (
    "id", "steamAppId", "name", "imageUrl", "genres", "controllerSupport",
    "platforms", "playerModes", "verificationStatus", "supportsVietnamese", "vietnameseSupportStatus",
)
DETAIL_FIELDS = (
    "id", "steamAppId", "name", "imageUrl", "steamUrl", "genres", "platforms",
    "controllerSupport", "playerModes", "storage", "verificationStatus", "supportsVietnamese", "vietnameseSupportStatus",
)
LOCALE_FIELDS = ("status", "shortDescription", "detailedDescription", "aboutGame")
PLAYABLE_VIDEO_FORMATS = {"mp4", "webm", "hls_h264"}


def pick(source, fields):
    """Return non-null public fields while preserving False and empty collections."""
    source = source or {}
    return {key: source[key] for key in fields if key in source and source[key] is not None}


def public_media(media):
    media = media or {}
    videos = []
    for video in media.get("videos") or []:
        public_video = pick(video, ("id", "name", "thumbnailUrl", "highlight"))
        public_video["sources"] = [
            pick(source, ("format", "url"))
            for source in video.get("sources") or []
            if source.get("format") in PLAYABLE_VIDEO_FORMATS and source.get("url")
        ]
        videos.append(public_video)

    return {
        "images": [pick(image, ("role", "url", "alt")) for image in media.get("images") or []],
        "screenshots": [
            pick(screenshot, ("id", "thumbnailUrl", "url"))
            for screenshot in media.get("screenshots") or []
        ],
        "videos": videos,
    }


def public_game(game):
    """Project the master record to fields consumed by the static application."""
    source_profile = game.get("sourceProfile") or {}
    detail = pick(game, DETAIL_FIELDS)
    detail["steamTags"] = [
        tag.get("name") if isinstance(tag, dict) else tag
        for tag in game.get("steamTags") or []
        if (tag.get("name") if isinstance(tag, dict) else tag)
    ]
    public_source_profile = pick(source_profile, ("shortDescription", "developers"))
    if public_source_profile:
        detail["sourceProfile"] = public_source_profile

    content = game.get("content") or {}
    locales = {
        language: pick(locale, LOCALE_FIELDS)
        for language, locale in (content.get("locales") or {}).items()
        if language in {"en", "vi"}
    }
    detail["content"] = {
        **pick(content, ("status", "fetchedAt", "identityStatus")),
        "locales": locales,
        "media": public_media(content.get("media")),
    }
    return detail


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=ROOT / "data/game-library.json")
    parser.add_argument("--output", type=Path, default=ROOT / "web-game-library/dist")
    args = parser.parse_args()

    source = load_library(args.input)
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    for name in STATIC_FILES:
        source_asset = ROOT / "local-site" / name
        if source_asset.resolve() != (output / name).resolve():
            shutil.copy2(source_asset, output / name)

    data_dir = output / "data"
    for name in ("theredteam.json", "viethoa_games.json"):
        source_extra = ROOT / "local-site/data" / name
        destination = data_dir / name
        data_dir.mkdir(parents=True, exist_ok=True)
        if source_extra.resolve() != destination.resolve():
            shutil.copy2(source_extra, destination)
    games_dir = data_dir / "games"
    shutil.rmtree(games_dir, ignore_errors=True)
    games_dir.mkdir(parents=True)

    summaries = []
    tag_counts = Counter()
    for game in source["games"]:
        assert game["id"].replace("-", "").isalnum()
        summary = pick(game, SUMMARY_FIELDS)
        source_profile = game.get("sourceProfile") or {}
        summary["releaseYear"] = (
            source_profile.get("identifiedVersionReleaseYear")
            or source_profile.get("originalReleaseYear")
        )
        summary["steamTags"] = [
            tag.get("name") if isinstance(tag, dict) else tag
            for tag in game.get("steamTags") or []
            if (tag.get("name") if isinstance(tag, dict) else tag)
        ]
        tag_counts.update(summary["steamTags"])
        summaries.append(summary)
        (games_dir / f'{game["id"]}.json').write_text(
            json.dumps(public_game(game), ensure_ascii=False, separators=(",", ":"))
        )

    catalog = {
        "metadata": source["metadata"],
        "tabs": source["tabs"],
        "tags": [{"name": name, "games": count} for name, count in tag_counts.most_common()],
        "games": summaries,
    }
    (data_dir / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    )
    print(
        f"Built {len(summaries)} compact game detail records and "
        f'{len(source["tabs"])} tabs → {output}'
    )
    xbox_catalog = ROOT / "data/xbox-game-pass.json"
    if xbox_catalog.exists():
        build_xbox_target(json.loads(xbox_catalog.read_text(encoding="utf-8")), output / "xbox")


if __name__ == "__main__":
    main()
