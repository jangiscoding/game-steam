#!/usr/bin/env python3
"""Collect configured community catalogs and conservatively match the whole library."""
import argparse
import html
import json
import re
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, quote
from library_data import load_library

ROOT = Path(__file__).resolve().parents[1]


def norm(value):
    value = html.unescape(re.sub('<[^>]+>', ' ', value)).lower().replace('đ', 'd').replace('™', '').replace('®', '')
    value = ''.join(c for c in unicodedata.normalize('NFKD', value) if not unicodedata.combining(c))
    return ' '.join(''.join(c if c.isalnum() else ' ' for c in value).split())


def title_key(value):
    value = re.sub(r'\[[^\]]*\]', ' ', value)
    value = norm(value)
    value = re.split(r'\b(?:viet hoa|viet ngu|vietnamese|ban dich|full dlcs|ra mat)\b', value)[0]
    return value.strip()


def eligible(title):
    return not re.search(r'\b(?:wip|dang dich|sap ra mat|chua hoan thanh|demo)\b', norm(title))


def request(url):
    time.sleep(.35)
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json,text/html'}), timeout=30) as response:
        return response.read().decode('utf-8-sig'), response.headers


def collect(source):
    rows = []
    if 'wp-json/' in source['searchUrl']:
        base = source['searchUrl'].split('?')[0]
        page, pages = 1, 1
        while page <= pages:
            raw, headers = request(f'{base}?per_page=100&page={page}')
            data = json.loads(raw)
            if not isinstance(data, list):
                raise ValueError('Expected WordPress product list')
            pages = int(headers.get('X-WP-TotalPages', '1'))
            rows.extend({'name': html.unescape(x['title']['rendered']), 'link': x['link'], 'img': ''} for x in data)
            page += 1
    elif source['id'] == 'viethoagame':
        page, pages = 1, 1
        while page <= pages:
            raw, _ = request(source['baseUrl'] + 'forums/san-pham.6/' + (f'page-{page}' if page > 1 else ''))
            pages = max([pages] + [int(x) for x in re.findall(r'/forums/san-pham\.6/page-(\d+)', raw)])
            blocks = re.findall(r'<div class="structItem-title">([\s\S]*?)</div>', raw)
            if not blocks:
                raise ValueError('Forum did not return thread titles')
            for block in blocks:
                for link, title in re.findall(r'<a href="(/threads/[^\"]+)"[^>]*>([\s\S]*?)</a>', block):
                    rows.append({'name': html.unescape(re.sub('<[^>]+>', '', title)).strip(), 'link': urljoin(source['baseUrl'], link), 'img': ''})
            page += 1
    else:
        # Search endpoint returns an empty list for an empty keyword.
        for keyword in 'abcdefghijklmnopqrstuvwxyz0123456789':
            raw, _ = request(source['searchUrl'] + quote(keyword))
            data = json.loads(raw)
            if not isinstance(data, list):
                raise ValueError('Expected JSON search results')
            rows.extend(data)
    unique = {}
    for row in rows:
        row['link'] = urljoin(source['baseUrl'], row['link'])
        row['img'] = urljoin(source['baseUrl'], row['img']) if row.get('img') else ''
        unique[row['link']] = row
    return list(unique.values())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', type=Path, help='JSON array exported from jang_viethoa_sources; defaults to app configuration')
    parser.add_argument('--cached', action='store_true', help='Re-match using saved source snapshots without network requests')
    args = parser.parse_args()
    if args.sources:
        sources = json.loads(args.sources.read_text())
    else:
        app = (ROOT / 'local-site/app.js').read_text()
        block = app.split('const DEFAULT_VIETHOA_SOURCES=[', 1)[1].split('];', 1)[0]
        sources = [dict(zip(('id', 'name', 'searchUrl', 'baseUrl'), values)) for values in re.findall(r"id:'([^']+)',name:'([^']+)',searchUrl:'([^']+)',baseUrl:'([^']+)'", block)]
    if not sources:
        raise ValueError('No configured sources')
    timestamp = datetime.now(timezone.utc).isoformat()
    evidence = ROOT / 'data/viethoa-scan'
    evidence.mkdir(parents=True, exist_ok=True)
    games = load_library(ROOT / 'data/game-library.json')['games']
    database_path = ROOT / 'local-site/data/viethoa_games.json'
    previous = json.loads(database_path.read_text())
    items = previous.get('items', {})
    valid_ids = {g['id'] for g in games}
    items = {k: v for k, v in items.items() if k in valid_ids}
    reports = []
    for source in sources:
        try:
            if args.cached:
                snapshot = json.loads((evidence / f"{source['id']}.json").read_text())
                if snapshot['report']['status'] != 'success':
                    raise ValueError('Cached source snapshot was incomplete')
                rows = snapshot['items']
            else:
                rows = collect(source)
            report = {'id': source['id'], 'name': source['name'], 'status': 'success', 'entries': len(rows)}
        except Exception as error:
            rows = []
            report = {'id': source['id'], 'name': source['name'], 'status': 'error', 'error': str(error)}
        (evidence / f"{source['id']}.json").write_text(json.dumps({'checkedAt': timestamp, 'source': source, 'report': report, 'items': rows}, ensure_ascii=False, indent=2))
        index = {}
        for row in rows:
            key = title_key(row['name'])
            if key and eligible(row['name']):
                index.setdefault(key, []).append(row)
        matched = 0
        for game in games:
            matches = index.get(title_key(game['name']), [])
            if not matches:
                continue
            matched += 1
            entry = items.setdefault(game['id'], {'gameId': game['id'], 'gameName': game['name']})
            links = entry.setdefault('matches', [])
            for match in matches:
                result = {**match, 'source': source['name'], 'sourceId': source['id'], 'checkedAt': timestamp}
                links[:] = [r for r in links if r['link'] != result['link']]
                links.append(result)
            first = links[0]
            entry.update(source=first['source'], trName=first['name'], link=first['link'], img=first['img'])
        report['matchedGames'] = matched
        reports.append(report)
        print(json.dumps(report, ensure_ascii=False), flush=True)
    ids = [g['id'] for g in games if g['id'] in items]
    report = {'checkedAt': timestamp, 'totalGames': len(games), 'previousTotal': previous['total'], 'total': len(ids), 'added': len(set(ids) - set(previous['gameIds'])), 'sources': reports, 'matching': 'Exact normalized titles; excludes WIP, demo and in-progress titles. Existing discoveries retained; missing matches do not prove absence of a patch.'}
    payload = {'updatedAt': timestamp, 'total': len(ids), 'gameIds': ids, 'items': items, 'scan': report}
    database_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    (evidence / 'index.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
