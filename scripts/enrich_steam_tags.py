#!/usr/bin/env python3
"""Collect complete popular Steam tags from Store pages and attach them safely."""

from library_data import load_library, save_library

import argparse
import json
import re
import threading
import time
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from steam_tag_categories import rebuild_tag_tabs


ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "exports/tag-cache"
TAG_PATTERN = re.compile(r"InitAppTagModal\(\s*\d+\s*,\s*(\[.*?\])\s*,\s*\[", re.DOTALL)


def now():
    return datetime.now(timezone.utc).isoformat()


def atomic_json(path, value, *, pretty=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    separators = None if pretty else (",", ":")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2 if pretty else None, separators=separators) + "\n")
    temporary.replace(path)


def extract_tags(page):
    match = TAG_PATTERN.search(page)
    if not match:
        return None
    tags = []
    for item in json.loads(match.group(1)):
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        tags.append({"id": int(item["tagid"]), "name": name, "count": int(item.get("count") or 0)})
    return tags


class RateLimiter:
    def __init__(self, interval):
        self.lock = threading.Lock()
        self.next = 0.0
        self.blocked_until = 0.0
        self.interval = interval

    def wait(self):
        while True:
            with self.lock:
                clock = time.monotonic()
                due = max(self.next, self.blocked_until)
                if clock >= due:
                    self.next = clock + self.interval
                    return
                delay = min(due - clock, 10)
            time.sleep(delay)

    def pause(self, seconds):
        with self.lock:
            self.blocked_until = max(self.blocked_until, time.monotonic() + seconds)


def fetch_one(app_id, limiter):
    path = CACHE / f"{app_id}.json"
    previous_status = None
    if path.exists():
        cached = json.loads(path.read_text())
        previous_status = cached.get("status")
        if previous_status in {"success", "not_found", "unavailable"}:
            return cached

    for attempt in range(4):
        limiter.wait()
        try:
            url = f"https://store.steampowered.com/app/{app_id}/?l=english&cc=us&agecheckage=1-January-1990"
            request = urllib.request.Request(url, headers={
                "User-Agent": "game-steam-library/1.0",
                "Cookie": "birthtime=0; lastagecheckage=1-January-1990; wants_mature_content=1",
            })
            with urllib.request.urlopen(request, timeout=35) as response:
                page = response.read().decode("utf-8", "replace")
            tags = extract_tags(page)
            if tags is None:
                unavailable = "This item is currently unavailable" in page or "app_agegate" in page
                result = {
                    "status": "unavailable" if unavailable or previous_status == "retry_pending" else "retry_pending",
                    "steamAppId": app_id,
                    "fetchedAt": now(),
                    "tags": [],
                    "error": "Steam không cung cấp danh sách tag công khai trên trang này hoặc tại khu vực hiện tại.",
                }
            else:
                result = {"status": "success", "steamAppId": app_id, "fetchedAt": now(), "tags": tags}
            atomic_json(path, result)
            return result
        except urllib.error.HTTPError as error:
            if error.code == 429:
                retry = error.headers.get("Retry-After", "300")
                seconds = max(300, int(retry) if retry.isdigit() else 300)
                limiter.pause(seconds)
                print(f"Rate limit: global cooldown {seconds}s, app {app_id}", flush=True)
            elif error.code == 404:
                result = {"status": "not_found", "steamAppId": app_id, "fetchedAt": now(), "tags": []}
                atomic_json(path, result)
                return result
            elif error.code >= 500:
                limiter.pause(5 * (attempt + 1))
            else:
                break
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            limiter.pause(2 * (attempt + 1))

    result = {
        "status": "retry_pending", "steamAppId": app_id, "fetchedAt": now(), "tags": [],
        "error": "Không lấy được Steam tags sau nhiều lần thử; chạy lại để tiếp tục.",
    }
    atomic_json(path, result)
    return result


def attach(library_path):
    import fcntl

    lock_path = ROOT / "exports/tag-attach.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        library = load_library(library_path)
        statuses = Counter()
        unique_tags = Counter()
        games_with_tags = 0
        fetched_times = []
        for game in library["games"]:
            cache_path = CACHE / f'{game.get("steamAppId")}.json'
            cached = json.loads(cache_path.read_text()) if cache_path.exists() else {"status": "pending_collection", "tags": []}
            # Keep the complete ordered tag names in the master file. Raw tag IDs and
            # vote counts remain in the resumable cache to avoid repeating them 5,000×.
            game["steamTags"] = [tag["name"] for tag in cached.get("tags") or []]
            statuses[cached["status"]] += 1
            if game["steamTags"]:
                games_with_tags += 1
                unique_tags.update(game["steamTags"])
            if cached.get("fetchedAt"):
                fetched_times.append(cached["fetchedAt"])

        rebuild_tag_tabs(library)
        timestamp = now()
        library["metadata"]["updatedAt"] = timestamp
        library["metadata"]["steamTags"] = {
            "updatedAt": max(fetched_times, default=timestamp),
            "recordsByStatus": dict(statuses),
            "gamesWithTags": games_with_tags,
            "uniqueTags": len(unique_tags),
            "source": "Steam Store popular user-defined tags",
        }
        backup = ROOT / "exports/backups" / f'game-library-tags-{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")}.json'
        backup.parent.mkdir(parents=True, exist_ok=True)
        atomic_json(backup, load_library(library_path))
        save_library(library_path, library)
        atomic_json(ROOT / "exports/tag-progress.json", library["metadata"]["steamTags"], pretty=True)
        print("Tags attached:", json.dumps(library["metadata"]["steamTags"], ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--interval", type=float, default=0.45)
    parser.add_argument("--attach-only", action="store_true")
    args = parser.parse_args()
    library_path = ROOT / "data/game-library.json"

    if not args.attach_only:
        library = load_library(library_path)
        ids = sorted({game["steamAppId"] for game in library["games"] if game.get("steamAppId")}, key=int)
        if args.limit is not None:
            ids = ids[:args.limit]
        limiter = RateLimiter(args.interval)
        counts = Counter()
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(fetch_one, app_id, limiter) for app_id in ids]
            for index, future in enumerate(as_completed(futures), 1):
                counts[future.result()["status"]] += 1
                if index % 100 == 0 or index == len(ids):
                    print(f"Tags {index}/{len(ids)} {dict(counts)}", flush=True)
                if index % 500 == 0:
                    attach(library_path)
    attach(library_path)


if __name__ == "__main__":
    main()
