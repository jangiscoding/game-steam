#!/usr/bin/env python3
"""Export a tabbed JSON library; preserve custom game fields and custom tabs."""
import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from export_local_controller_excel import GENRE_VI, unique_games

ROOT = Path(__file__).resolve().parents[1]

def build(profiles, image_report, previous=None):
    previous = previous or {}
    old_games = {g['id']: g for g in previous.get('games', [])}
    missing = {item['url'] for item in image_report.get('failures', [])}
    games = []
    for profile in profiles:
        meta = profile.get('steamMetadata') or {}
        app = (profile.get('candidateIdentifiers') or {}).get('steamAppId')
        minimum = ((meta.get('storageRequirements') or {}).get('windows') or {}).get('minimum') or {}
        size = minimum.get('approximateBytes')
        game_id = profile['inputRecordId']
        game = dict(old_games.get(game_id, {}))
        game.update({
            'id': game_id, 'steamAppId': str(app) if app is not None else None,
            'name': profile.get('officialName') or profile.get('suppliedName'),
            'imageUrl': profile.get('suppliedImageUrl'),
            'imageStatus': 'unavailable' if profile.get('suppliedImageUrl') in missing else 'downloaded' if profile.get('suppliedImageUrl') and image_report else 'unknown',
            'steamUrl': (meta.get('links') or {}).get('store') or (f'https://store.steampowered.com/app/{app}/' if app else None),
            'genres': profile.get('genres') or [], 'platforms': profile.get('platforms') or [],
            'controllerSupport': (meta.get('controllerSupport') or {}).get('level') or 'unknown',
            'playerModes': {key: (meta.get('playerModes') or {}).get(key) for key in ('singlePlayer','multiplayer','coop','localCoop','sharedOrSplitScreen','onlineCoop','maximumPlayers')},
            'storage': {'windowsMinimumGB': size / 1_000_000_000 if size is not None else None, 'windowsMinimumDisplay': minimum.get('display')},
            'verificationStatus': profile.get('status'),
            'custom': old_games.get(game_id, {}).get('custom', {}),
            'sourceProfile': profile,
        })
        games.append(game)
    tabs = []
    def add(tab_id, name, selected, description=None):
        tab = {'id': tab_id, 'name': name, 'gameIds': [g['id'] for g in selected]}
        if description:
            tab['description'] = description
        tabs.append(tab)
    add('all', 'Tất cả game', games)
    lookup = {g['id']: g for g in games}
    add('local-controller', '2 người - tay cầm', [lookup[p['inputRecordId']] for p in unique_games(profiles)], '548 là số tên duy nhất trong dữ liệu ban đầu. Có tay cầm full/partial và Local Co-op hoặc Shared/Split Screen; chưa xác nhận số tay cầm tối đa.')
    add('controller', 'Hỗ trợ tay cầm', [g for g in games if g['controllerSupport'] in ('full','partial')])
    for tab_id,name,key in [('local-coop','Local Co-op','localCoop'),('online-coop','Online Co-op','onlineCoop')]:
        add(tab_id,name,[g for g in games if g['playerModes'][key] is True])
    for genre in sorted({genre for g in games for genre in g['genres']}):
        tab_id = 'rpg' if genre == 'RPG' else 'genre-' + genre.lower().replace(' ', '-')
        name = 'Trực tuyến nhiều người' if genre == 'Massively Multiplayer' else GENRE_VI.get(genre,genre)
        add(tab_id,name,[g for g in games if genre in g['genres']])
    add('unclassified','Chưa rõ thể loại',[g for g in games if not g['genres']])
    add('missing-images','Ảnh cần bổ sung',[g for g in games if g['imageStatus'] == 'unavailable'])
    generated = {tab['id'] for tab in tabs}
    tabs.extend(tab for tab in previous.get('tabs', []) if tab['id'] not in generated)
    result = {'metadata': {**previous.get('metadata', {}), 'schemaVersion': 1, 'updatedAt': datetime.now(timezone.utc).isoformat(), 'totalGames':len(games), 'totalTabs':len(tabs), 'source':'data/game-profiles.json', 'notes': 'Các tab tham chiếu hồ sơ qua gameIds; một App ID có thể có nhiều hồ sơ đầu vào. Mục lục và Dữ liệu chi tiết của Excel tương ứng metadata và sourceProfile.'}, 'games':games,'tabs':tabs}
    validate(result)
    return result

def validate(data):
    ids = [g['id'] for g in data['games']]
    assert len(ids) == len(set(ids)), 'Duplicate game IDs'
    known = set(ids)
    tab_ids = [t['id'] for t in data['tabs']]
    assert len(tab_ids) == len(set(tab_ids)), 'Duplicate tab IDs'
    for tab in data['tabs']:
        assert len(tab['gameIds']) == len(set(tab['gameIds'])), f'Duplicate references: {tab["id"]}'
        assert set(tab['gameIds']) <= known, f'Unknown game reference: {tab["id"]}'
    assert data['metadata']['totalGames'] == len(ids)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,default=ROOT/'data/game-profiles.json')
    parser.add_argument('--output',type=Path,default=ROOT/'data/game-library.json')
    parser.add_argument('--image-report',type=Path,default=ROOT/'exports/master-image-report.json')
    args = parser.parse_args()
    previous = json.loads(args.output.read_text()) if args.output.exists() else None
    report = json.loads(args.image_report.read_text()) if args.image_report.exists() else {}
    result = build(json.loads(args.input.read_text()),report,previous)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    if args.output.exists():
        backups = ROOT/'exports/backups'
        backups.mkdir(parents=True,exist_ok=True)
        shutil.copy2(args.output,backups/f'{args.output.stem}-{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")}.json')
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temporary.replace(args.output)
    print(f'Exported {len(result["games"])} games / {len(result["tabs"])} tabs: {args.output}')

if __name__ == '__main__':
    main()
