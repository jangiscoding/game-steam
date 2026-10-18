#!/usr/bin/env python3
"""Check official Steam language support, with resumable, sharded evidence."""
from library_data import load_library, save_library

import argparse
import html
import json
import re
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from enrich_steam_tags import RateLimiter, atomic_json

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'data/steam-languages'
CACHE = ROOT / 'exports/language-cache'


def now():
    return datetime.now(timezone.utc).isoformat()


def supports_vietnamese(text):
    # Steam uses English language names; asterisk means full audio support.
    clean = html.unescape(re.sub(r'<[^>]*>', '', text)).split('languages with full audio support')[0]
    return bool(re.search(r'(?<!\w)Vietnamese(?!\w)', clean, re.I))


def fetch_one(app_id, limiter):
    path = CACHE / f'{app_id}.json'
    if path.exists():
        result = json.loads(path.read_text())
        if result['status'] in ('success', 'unavailable'):
            return result
    url = f'https://store.steampowered.com/api/appdetails?appids={app_id}&filters=basic&l=english&cc=us'
    error_text = ''
    for attempt in range(4):
        limiter.wait()
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'JangPlay/1.0'})
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.load(response)[app_id]
            data = payload.get('data')
            if payload.get('success') and isinstance(data, dict) and isinstance(data.get('supported_languages'), str):
                raw = data['supported_languages']
                result = {'steamAppId': app_id, 'status': 'success', 'supportsVietnamese': supports_vietnamese(raw), 'supportedLanguages': raw, 'checkedAt': now(), 'sourceUrl': url}
            else:
                result = {'steamAppId': app_id, 'status': 'unavailable', 'checkedAt': now(), 'sourceUrl': url, 'note': 'Steam did not publish language metadata for this app in cc=us.'}
            atomic_json(path, result)
            return result
        except urllib.error.HTTPError as error:
            error_text = str(error)
            if error.code == 429:
                retry = error.headers.get('Retry-After', '60')
                seconds = max(300, int(retry) if retry.isdigit() else 300)
                print(f'Steam appdetails rate limit: waiting {seconds}s', flush=True)
                limiter.pause(seconds)
            else:
                limiter.pause(2 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as error:
            error_text = str(error)
            limiter.pause(2 * (attempt + 1))
    result = {'steamAppId': app_id, 'status': 'error', 'checkedAt': now(), 'sourceUrl': url, 'error': error_text}
    atomic_json(path, result)
    return result


def parse_search_ids(page):
    ids = set()
    for value in re.findall(r'data-ds-appid="([\d,]+)"', page):
        ids.update(value.split(','))
    return ids


def collect_search(limiter):
    """Read every page of Steam's official Vietnamese language filter."""
    pages = []
    start = 0
    while True:
        url = f'https://store.steampowered.com/search/results/?start={start}&count=100&supportedlang=vietnamese&ignore_preferences=1&category1=998&cc=us&l=english&infinite=1&sort_by=Name_ASC'
        path = CACHE / f'search-{start:05d}.json'
        if path.exists():
            result = json.loads(path.read_text())
        else:
            for attempt in range(5):
                limiter.wait()
                try:
                    request = urllib.request.Request(url, headers={'User-Agent': 'JangPlay/1.0', 'Cookie': 'birthtime=0; lastagecheckage=1-January-1990; wants_mature_content=1'})
                    with urllib.request.urlopen(request, timeout=40) as response:
                        payload = json.load(response)
                    if payload.get('success') != 1 or 'results_html' not in payload:
                        raise ValueError('Incomplete Steam search response')
                    ids = parse_search_ids(payload['results_html'])
                    rows = len(re.findall(r'class="search_result_row[ "]', payload['results_html']))
                    total = int(payload['total_count'])
                    if int(payload['start']) != start or (not rows and start < total) or (rows and not ids):
                        raise ValueError('Missing Steam search page')
                    result = {'start': start, 'rows': rows, 'total': total, 'appIds': sorted(ids, key=int), 'sourceUrl': url, 'checkedAt': now()}
                    atomic_json(path, result)
                    break
                except urllib.error.HTTPError as error:
                    if error.code == 429:
                        retry = error.headers.get('Retry-After', '60')
                        seconds = max(60, int(retry) if retry.isdigit() else 60)
                        print(f'Steam search rate limit: waiting {seconds}s', flush=True)
                        limiter.pause(seconds)
                    else:
                        limiter.pause(5 * (attempt + 1))
                    if attempt == 4:
                        raise
                except (urllib.error.URLError, TimeoutError, ValueError):
                    limiter.pause(5 * (attempt + 1))
                    if attempt == 4:
                        raise
        pages.append(result)
        start += result['rows']
        print(f'Steam Vietnamese search: {start}/{result["total"]}', flush=True)
        if start >= result['total']:
            break
    snapshot = {'checkedAt': max(page['checkedAt'] for page in pages), 'filter': 'supportedlang=vietnamese; category1=998; cc=us; ignore_preferences=1', 'pages': pages, 'complete': True}
    atomic_json(EVIDENCE / 'search-results.json', snapshot)
    return snapshot


def attach(library_path):
    library = load_library(library_path)
    records = []
    for app_id in sorted({str(g['steamAppId']) for g in library['games'] if g.get('steamAppId')}, key=int):
        path = CACHE / f'{app_id}.json'
        if path.exists():
            records.append(json.loads(path.read_text()))
    by_app = {r['steamAppId']: r for r in records}
    search_path = EVIDENCE / 'search-results.json'
    if search_path.exists():
        snapshot = json.loads(search_path.read_text())
        if not snapshot.get('complete'):
            raise ValueError('Cannot attach an incomplete Steam search snapshot')
        matched = {app_id for page in snapshot['pages'] for app_id in page['appIds']}
        for app_id in {str(g['steamAppId']) for g in library['games'] if g.get('steamAppId')}:
            previous = by_app.get(app_id, {})
            if previous.get('status') == 'success':
                continue
            by_app[app_id] = {'steamAppId': app_id, 'status': 'listed' if app_id in matched else 'not_listed', 'supportsVietnamese': app_id in matched, 'checkedAt': snapshot['checkedAt'], 'source': 'search-results.json'}
        records = sorted(by_app.values(), key=lambda r: int(r['steamAppId']))
    counts = Counter()
    for game in library['games']:
        result = by_app.get(str(game.get('steamAppId')), {'status': 'missing_app_id' if not game.get('steamAppId') else 'pending'})
        counts[result['status']] += 1
        # False means no confirmed official support; status distinguishes unknown.
        game['supportsVietnamese'] = result.get('supportsVietnamese') is True
        game['vietnameseSupportStatus'] = result['status']
    tab_id = 'language-vietnamese'
    tab = {'id': tab_id, 'name': 'Ngôn ngữ tiếng Việt', 'gameIds': [g['id'] for g in library['games'] if g['supportsVietnamese']], 'source': 'steam-supported-languages'}
    library['tabs'] = [t for t in library['tabs'] if t['id'] != tab_id] + [tab]
    # Store evidence separately in small chunks rather than repeating raw HTML in master.
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    chunks = []
    for start in range(0, len(records), 250):
        name = f'part-{start // 250 + 1:03d}.json'
        atomic_json(EVIDENCE / name, records[start:start + 250])
        chunks.append(name)
    metadata = {'updatedAt': now(), 'checkedAt': max((r.get('checkedAt', '') for r in records), default=now()), 'totalGames': len(library['games']), 'uniqueApps': len(records), 'recordsByStatus': dict(counts), 'gamesSupportingVietnamese': len(tab['gameIds']), 'source': 'Steam Vietnamese language search plus appdetails supported_languages (cc=us)', 'falseMeaning': 'No confirmed official support; not_listed means absent from public Vietnamese-language search in cc=us, not proof for delisted or region-restricted apps.', 'chunks': chunks}
    atomic_json(EVIDENCE / 'index.json', metadata, pretty=True)
    library['metadata']['steamLanguages'] = metadata
    library['metadata']['updatedAt'] = metadata['updatedAt']
    library['metadata']['totalTabs'] = len(library['tabs'])
    save_library(library_path, library)
    print(json.dumps(metadata, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--interval', type=float, default=1.6)
    parser.add_argument('--attach-only', action='store_true')
    parser.add_argument('--method', choices=('search', 'details'), default='search')
    args = parser.parse_args()
    path = ROOT / 'data/game-library.json'
    if not args.attach_only and args.method == 'search':
        collect_search(RateLimiter(max(1.6, args.interval)))
        # The game search excludes non-game products still present in this catalog.
        games = load_library(path)['games']
        supplemental = sorted({str(g['steamAppId']) for g in games if g.get('steamAppId') and g.get('sourceProfile', {}).get('productType') in ('dlc', 'mod', 'advertising')}, key=int)
        limiter = RateLimiter(max(1.6, args.interval))
        for app_id in supplemental:
            fetch_one(app_id, limiter)
    if not args.attach_only and args.method == 'details':
        games = load_library(path)['games']
        ids = sorted({str(g['steamAppId']) for g in games if g.get('steamAppId')}, key=int)
        limiter = RateLimiter(args.interval)
        counts = Counter()
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(fetch_one, app_id, limiter) for app_id in ids]
            for i, future in enumerate(as_completed(futures), 1):
                result = future.result()
                counts[result['status']] += 1
                if i % 100 == 0 or i == len(ids):
                    print(f'{i}/{len(ids)} {dict(counts)}', flush=True)
    attach(path)


if __name__ == '__main__':
    main()
