#!/usr/bin/env python3
"""Serve this standalone Game Archive folder on localhost (Python standard library)."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import signal
import io
import sys
import time
import webbrowser

if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()
if sys.stdin is None:
    sys.stdin = io.StringIO()

DIR = Path(__file__).resolve().parent
PID_FILE = DIR / '.server.pid'


def get_installed_steam_app_ids():
    import glob, re
    steam_path = None
    if sys.platform == 'win32':
        import winreg
        for root, subkey in [
            (winreg.HKEY_CURRENT_USER, r'Software\Valve\Steam'),
            (winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\Valve\Steam'),
            (winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\WOW6432Node\Valve\Steam'),
        ]:
            try:
                with winreg.OpenKey(root, subkey) as k:
                    val = winreg.QueryValueEx(k, 'SteamPath')[0]
                    if val and os.path.exists(val):
                        steam_path = val
                        break
            except Exception:
                pass
    else:
        candidates = [
            os.path.expanduser('~/.steam/steam'),
            os.path.expanduser('~/.local/share/Steam'),
            os.path.expanduser('~/Library/Application Support/Steam'),
        ]
        for c in candidates:
            if os.path.isdir(c):
                steam_path = c
                break

    if not steam_path:
        return []

    library_paths = [os.path.normpath(steam_path)]
    vdf_path = os.path.join(steam_path, 'steamapps', 'libraryfolders.vdf')
    if os.path.exists(vdf_path):
        try:
            with open(vdf_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            for m in re.finditer(r'"path"\s+"([^"]+)"', content):
                p = os.path.normpath(m.group(1).replace(r'\\', r'\\'))
                if os.path.exists(p) and p not in library_paths:
                    library_paths.append(p)
        except Exception:
            pass

    installed_ids = set()
    for lib in library_paths:
        apps_dir = os.path.join(lib, 'steamapps')
        if not os.path.isdir(apps_dir):
            continue
        for manifest in glob.glob(os.path.join(apps_dir, 'appmanifest_*.acf')):
            try:
                with open(manifest, 'r', encoding='utf-8', errors='ignore') as f:
                    txt = f.read()
                appid_m = re.search(r'"appid"\s+"(\d+)"', txt)
                if appid_m:
                    installed_ids.add(appid_m.group(1))
            except Exception:
                pass

    return sorted(list(installed_ids))


def get_installed_xbox_packages():
    """Read Appx and Xbox Gaming Services identities installed on Windows."""
    if sys.platform != 'win32':
        return {'packageFamilyNames': [], 'packageIdentityNames': [], 'productIds': [], 'gameNames': [], 'scan': {'roots': 0, 'manifests': 0}}
    import subprocess
    import string
    import re
    import xml.etree.ElementTree as ET
    command = [
        'powershell.exe', '-NoProfile', '-NonInteractive', '-Command',
        "Get-AppxPackage | ForEach-Object { if ($_.PackageFamilyName) { 'PFN|' + $_.PackageFamilyName }; if ($_.Name) { 'ID|' + $_.Name } }"
    ]
    kwargs = {
        'capture_output': True,
        'text': True,
        'timeout': 20,
        'check': False,
    }
    if hasattr(subprocess, 'CREATE_NO_WINDOW'):
        kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
    result = subprocess.run(command, **kwargs)
    families = set()
    identities = set()
    product_ids = set()
    game_names = set()
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            kind, separator, value = line.strip().partition('|')
            if not separator or not value:
                continue
            if kind == 'PFN':
                families.add(value)
            elif kind == 'ID':
                identities.add(value)

    # Win32/MSIXVC games installed by the Xbox app expose MicrosoftGame.config
    # even when Get-AppxPackage does not list the game as a normal Appx package.
    gaming_roots = set()
    for letter in string.ascii_uppercase:
        drive = Path(f'{letter}:\\')
        default_root = drive / 'XboxGames'
        if default_root.is_dir():
            gaming_roots.add(default_root)
        legacy_root = drive / 'Program Files' / 'ModifiableWindowsApps'
        if legacy_root.is_dir():
            gaming_roots.add(legacy_root)
        marker = drive / '.GamingRoot'
        if marker.is_file():
            try:
                relative = marker.read_bytes()[8:].decode('utf-16-le', errors='ignore').strip('\x00').strip()
                configured_root = drive / relative
                if relative and configured_root.is_dir():
                    gaming_roots.add(configured_root)
            except Exception:
                pass
    configs = set()
    for xbox_root in gaming_roots:
        try:
            configs.update(xbox_root.rglob('MicrosoftGame.config'))
        except Exception:
            pass
    for config in list(configs)[:1000]:
        try:
            parent = config.parent.parent if config.parent.name.lower() == 'content' else config.parent
            if parent.name:
                game_names.add(parent.name)
            raw_text = config.read_text(encoding='utf-8-sig', errors='ignore')
            product_ids.update(re.findall(r'(?<![A-Z0-9])[A-Z0-9]{12}(?![A-Z0-9])', raw_text.upper()))
        except Exception:
            raw_text = ''
        try:
            root = ET.parse(config).getroot()
            identity = next((node for node in root.iter() if node.tag.rsplit('}', 1)[-1] == 'Identity'), None)
            name = identity.get('Name') if identity is not None else None
            if name:
                identities.add(name)
        except Exception:
            pass
    return {
        'packageFamilyNames': sorted(families),
        'packageIdentityNames': sorted(identities),
        'productIds': sorted(product_ids),
        'gameNames': sorted(game_names),
        'scan': {'roots': len(gaming_roots), 'manifests': len(configs)},
    }


def get_installed_xbox_package_families():
    return get_installed_xbox_packages()['packageFamilyNames']


def check_for_steam_updates(catalog_path):
    import urllib.request, json, re
    req = urllib.request.Request(
        'https://startranstore.com/api/steam-acc-games?list=mac-dinh',
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        remote_data = json.loads(resp.read().decode('utf-8'))

    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    cat_appids = set()
    cat_names = set()
    for g in catalog.get('games', []):
        if g.get('steamAppId'):
            cat_appids.add(str(g['steamAppId']))
        if g.get('name'):
            cat_names.add(g['name'].strip().lower())

    KNOWN_FIXES = {
        'dwarves: glory': ('Dwarves: Glory, Death and Loot', '2205850', 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2205850/library_600x900.jpg'),
        'invisible': ('Invisible, Inc.', '243970', 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/243970/library_600x900.jpg'),
        'noob': ('Noob - The Factionless', '1623880', 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1623880/library_600x900.jpg'),
    }

    new_games = []
    seen_candidates = set()
    for idx, item in enumerate(remote_data):
        raw_name = item.get('name', '').strip()
        raw_img = item.get('imageUrl', '').strip()
        if not raw_name or raw_name == 'Game Name' or raw_img == 'Image URL':
            continue

        name_lower = raw_name.lower()
        if name_lower in KNOWN_FIXES:
            fixed_name, fixed_appid, fixed_img = KNOWN_FIXES[name_lower]
            if fixed_appid not in cat_appids and fixed_appid not in seen_candidates:
                seen_candidates.add(fixed_appid)
                new_games.append({
                    'name': fixed_name,
                    'steamAppId': fixed_appid,
                    'imageUrl': fixed_img,
                    'isFeatured': item.get('isFeatured', False)
                })
            continue

        m = re.search(r'/apps/(\d+)/', raw_img)
        appid = m.group(1) if m else None

        is_new = False
        if appid and appid not in cat_appids:
            is_new = True
        elif not appid and name_lower not in cat_names:
            is_new = True

        cand_key = appid or name_lower
        if is_new and cand_key not in seen_candidates:
            seen_candidates.add(cand_key)
            new_games.append({
                'name': raw_name,
                'steamAppId': appid,
                'imageUrl': raw_img if raw_img.startswith('http') else (f'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900.jpg' if appid else ''),
                'isFeatured': item.get('isFeatured', False)
            })

    return {
        'ok': True,
        'remoteTotal': len(remote_data),
        'currentTotal': len(catalog.get('games', [])),
        'hasUpdate': len(new_games) > 0,
        'newCount': len(new_games),
        'newGames': new_games
    }


def enrich_and_apply_steam_updates(catalog_path, games_dir, target_games=None):
    import urllib.request, json, re, hashlib, datetime, os

    if not target_games:
        check_res = check_for_steam_updates(catalog_path)
        target_games = check_res.get('newGames', [])

    if not target_games:
        return {'ok': True, 'addedCount': 0, 'addedGames': [], 'message': 'Không có game mới để cập nhật.'}

    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    existing_appids = {str(g.get('steamAppId')) for g in catalog.get('games', []) if g.get('steamAppId')}
    existing_ids = {g.get('id') for g in catalog.get('games', []) if g.get('id')}

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    added_games = []

    html_package_dir = catalog_path.parent.parent.parent / 'html-package'
    html_package_games_dir = html_package_dir / 'data' / 'games'
    html_package_cat_json = html_package_dir / 'data' / 'catalog.json'
    html_package_cat_js = html_package_dir / 'data' / 'catalog.js'

    for g_item in target_games:
        name = g_item.get('name', '').strip()
        app_id = g_item.get('steamAppId')
        img_url = g_item.get('imageUrl', '').strip()

        # If app_id missing, try steam storesearch
        if not app_id and name:
            try:
                import urllib.parse
                s_url = f'https://store.steampowered.com/api/storesearch/?term={urllib.parse.quote(name)}&l=english&cc=US'
                s_req = urllib.request.Request(s_url, headers=headers)
                with urllib.request.urlopen(s_req, timeout=10) as s_resp:
                    s_res = json.loads(s_resp.read().decode('utf-8', errors='ignore'))
                    if s_res.get('items'):
                        app_id = str(s_res['items'][0]['id'])
                        if not img_url:
                            img_url = f'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/library_600x900.jpg'
            except Exception:
                pass

        if app_id and str(app_id) in existing_appids:
            continue

        raw_key = (name + str(app_id or '')).encode('utf-8')
        gid = 'input-' + hashlib.md5(raw_key).hexdigest()[:12]
        if gid in existing_ids:
            continue

        app_data = {}
        if app_id:
            try:
                url_en = f'https://store.steampowered.com/api/appdetails?appids={app_id}&l=english'
                req_en = urllib.request.Request(url_en, headers=headers)
                with urllib.request.urlopen(req_en, timeout=12) as resp:
                    res = json.loads(resp.read().decode('utf-8', errors='ignore'))
                    if res.get(str(app_id), {}).get('success'):
                        app_data = res[str(app_id)]['data']
            except Exception as e:
                debug_log(f'Error fetching appdetails for {app_id}: {e}')

        tags = []
        if app_id:
            try:
                url_store = f'https://store.steampowered.com/app/{app_id}/'
                req_store = urllib.request.Request(url_store, headers=headers)
                with urllib.request.urlopen(req_store, timeout=12) as resp:
                    html_content = resp.read().decode('utf-8', errors='ignore')
                    m_tag = re.search(r'InitAppTagModal\(\s*\d+,\s*(\[.*?\])\s*,', html_content, re.DOTALL)
                    if m_tag:
                        tags = [t['name'] for t in json.loads(m_tag.group(1)) if 'name' in t][:20]
            except Exception as e:
                debug_log(f'Error fetching store tags for {app_id}: {e}')

        cats = [c.get('description', '') for c in app_data.get('categories', [])]
        genres = [g.get('description', '') for g in app_data.get('genres', [])]
        ctrl = 'full' if app_data.get('controller_support') == 'full' or 'Full controller support' in cats else ('partial' if 'Partial Controller Support' in cats else None)

        single = 'Single-player' in cats
        multi = 'Multi-player' in cats
        coop = 'Co-op' in cats or 'Online Co-op' in cats or 'Shared/Split Screen Co-op' in cats
        local_coop = 'Shared/Split Screen' in cats or 'Shared/Split Screen Co-op' in cats or 'Local Co-op' in cats
        online_coop = 'Online Co-op' in cats
        shared_screen = 'Shared/Split Screen' in cats or 'Shared/Split Screen Co-op' in cats
        supp_vi = 'vietnamese' in (app_data.get('supported_languages') or '').lower()

        r_date = app_data.get('release_date', {}).get('date', '')
        m_yr = re.search(r'\b(20\d\d|19\d\d)\b', r_date)
        year = int(m_yr.group(1)) if m_yr else None

        screenshots = []
        for s in app_data.get('screenshots', []):
            screenshots.append({
                'id': s.get('id', 0),
                'thumbnailUrl': s.get('path_thumbnail', ''),
                'url': s.get('path_full', '')
            })

        videos = []
        for m in app_data.get('movies', []):
            mp4 = m.get('mp4', {})
            hls_url = m.get('hls', {}).get('max') or m.get('hls', {}).get('480') or ''
            mp4_url = mp4.get('max') or mp4.get('480') or ''
            sources = []
            if hls_url:
                sources.append({'format': 'hls_h264', 'url': hls_url})
            if mp4_url:
                sources.append({'format': 'mp4_h264', 'url': mp4_url})
            videos.append({
                'id': m.get('id', 0),
                'name': m.get('name', ''),
                'thumbnailUrl': m.get('thumbnail', ''),
                'highlight': m.get('highlight', False),
                'sources': sources
            })

        final_img = img_url or (f'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/library_600x900.jpg' if app_id else '')
        final_name = app_data.get('name') or name

        detail = {
            'id': gid,
            'steamAppId': str(app_id) if app_id else None,
            'name': final_name,
            'imageUrl': final_img,
            'steamUrl': f'https://store.steampowered.com/app/{app_id}/' if app_id else None,
            'genres': genres,
            'platforms': ['windows'] if app_data.get('platforms', {}).get('windows', True) else [],
            'controllerSupport': ctrl,
            'playerModes': {
                'singlePlayer': single,
                'multiplayer': multi,
                'coop': coop,
                'localCoop': local_coop,
                'sharedOrSplitScreen': shared_screen,
                'onlineCoop': online_coop,
                'maximumPlayers': None
            },
            'storage': {
                'windowsMinimumGB': None,
                'windowsMinimumDisplay': None
            },
            'verificationStatus': 'identified' if app_id else 'unidentified',
            'supportsVietnamese': supp_vi,
            'vietnameseSupportStatus': 'listed' if supp_vi else 'not_listed',
            'steamTags': tags,
            'sourceProfile': {
                'shortDescription': app_data.get('short_description', ''),
                'developers': app_data.get('developers', [])
            },
            'content': {
                'status': 'success' if app_data else 'not_found',
                'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'identityStatus': 'verified' if app_id else 'unverified',
                'locales': {
                    'en': {
                        'status': 'source',
                        'shortDescription': app_data.get('short_description', ''),
                        'detailedDescription': app_data.get('detailed_description', '')
                    },
                    'vi': {
                        'status': 'source',
                        'shortDescription': app_data.get('short_description', ''),
                        'detailedDescription': app_data.get('detailed_description', '')
                    }
                },
                'media': {
                    'images': [],
                    'screenshots': screenshots,
                    'videos': videos
                }
            }
        }

        summary = {
            'id': gid,
            'steamAppId': str(app_id) if app_id else None,
            'name': final_name,
            'imageUrl': final_img,
            'genres': genres,
            'controllerSupport': ctrl,
            'platforms': detail['platforms'],
            'playerModes': detail['playerModes'],
            'verificationStatus': detail['verificationStatus'],
            'supportsVietnamese': supp_vi,
            'vietnameseSupportStatus': detail['vietnameseSupportStatus'],
            'releaseYear': year,
            'steamTags': tags
        }

        # Save game detail file
        game_file = games_dir / f'{gid}.json'
        with open(game_file, 'w', encoding='utf-8') as gf:
            json.dump(detail, gf, ensure_ascii=False, indent=2)

        if html_package_games_dir.exists():
            hp_game_file = html_package_games_dir / f'{gid}.json'
            try:
                with open(hp_game_file, 'w', encoding='utf-8') as hgf:
                    json.dump(detail, hgf, ensure_ascii=False, indent=2)
            except Exception:
                pass

        # Append to catalog
        catalog['games'].append(summary)
        existing_appids.add(str(app_id))
        existing_ids.add(gid)

        # Update tabs
        tab_map = { t['id']: t for t in catalog.get('tabs', []) }
        def add_to_tab(t_id):
            if t_id in tab_map:
                t_obj = tab_map[t_id]
                if gid not in t_obj['gameIds']:
                    t_obj['gameIds'].append(gid)

        add_to_tab('all')
        if ctrl in ('full', 'partial'):
            add_to_tab('controller')
            if local_coop or shared_screen:
                add_to_tab('local-controller')
        if local_coop:
            add_to_tab('local-coop')
        if online_coop:
            add_to_tab('online-coop')
        if supp_vi:
            add_to_tab('language-vietnamese')

        genre_slug_map = {
            'Action': 'genre-action', 'Adventure': 'genre-adventure', 'Casual': 'genre-casual',
            'Early Access': 'genre-early-access', 'Free to Play': 'genre-free-to-play',
            'Game Development': 'genre-game-development', 'Gore': 'genre-gore', 'Indie': 'genre-indie',
            'Massively Multiplayer': 'genre-massively-multiplayer', 'Nudity': 'genre-nudity',
            'RPG': 'rpg', 'Racing': 'genre-racing', 'Sexual Content': 'genre-sexual-content',
            'Simulation': 'genre-simulation', 'Sports': 'genre-sports', 'Strategy': 'genre-strategy',
            'Violent': 'genre-violent',
        }
        for g in genres:
            if g in genre_slug_map:
                add_to_tab(genre_slug_map[g])

        tag_slug_map = {
            'Horror': 'tag-horror', 'Psychological Horror': 'tag-horror',
            'Survival': 'tag-survival', 'Puzzle': 'tag-puzzle', 'FPS': 'tag-fps',
            'Third-Person Shooter': 'tag-third-person-shooter', 'Fighting': 'tag-fighting',
            'Platformer': 'tag-platformer', '2D Platformer': 'tag-platformer', '3D Platformer': 'tag-platformer',
            'Roguelike': 'tag-roguelike', 'Roguelite': 'tag-roguelike', 'Action Roguelike': 'tag-roguelike',
            'Open World': 'tag-open-world', 'Sandbox': 'tag-sandbox', 'Visual Novel': 'tag-visual-novel',
            'Souls-like': 'tag-souls-like', 'Metroidvania': 'tag-metroidvania', 'Stealth': 'tag-stealth',
            'Rhythm': 'tag-rhythm', 'Music': 'tag-rhythm',
            'Card Battler': 'tag-card-deckbuilding', 'Deckbuilding': 'tag-card-deckbuilding', 'Card Game': 'tag-card-deckbuilding',
            'Turn-Based': 'tag-turn-based', 'Turn-Based Strategy': 'tag-turn-based', 'Turn-Based Tactics': 'tag-turn-based', 'Turn-Based Combat': 'tag-turn-based',
            'RTS': 'tag-rts', 'City Builder': 'tag-city-builder', 'Management': 'tag-management',
            'Crafting': 'tag-crafting', 'MMORPG': 'tag-mmorpg', 'MOBA': 'tag-moba', 'Battle Royale': 'tag-battle-royale'
        }
        for t in tags:
            if t in tag_slug_map:
                add_to_tab(tag_slug_map[t])

        # Update tags counts
        tag_counter = { item['name']: item for item in catalog.get('tags', []) }
        for t in tags:
            if t in tag_counter:
                tag_counter[t]['games'] = tag_counter[t].get('games', 0) + 1
            else:
                new_t = {'name': t, 'games': 1}
                catalog.setdefault('tags', []).append(new_t)
                tag_counter[t] = new_t

        added_games.append({
            'id': gid,
            'steamAppId': app_id,
            'name': final_name,
            'imageUrl': final_img
        })

    # Update metadata
    catalog['metadata']['totalGames'] = len(catalog['games'])
    catalog['metadata']['updatedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Atomic write to catalog.json
    tmp_file = catalog_path.with_suffix('.json.tmp')
    with open(tmp_file, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False)
    os.replace(tmp_file, catalog_path)

    # Sync to html-package
    if html_package_cat_json.parent.exists():
        try:
            with open(html_package_cat_json, 'w', encoding='utf-8') as f:
                json.dump(catalog, f, ensure_ascii=False)
        except Exception:
            pass

    if html_package_cat_js.exists():
        try:
            with open(html_package_cat_js, 'w', encoding='utf-8') as f:
                f.write('window.__CATALOG__ = ' + json.dumps(catalog, ensure_ascii=False) + ';')
        except Exception:
            pass

    return {
        'ok': True,
        'addedCount': len(added_games),
        'addedGames': added_games,
        'newTotal': len(catalog['games']),
        'updatedAt': catalog['metadata']['updatedAt']
    }


class ArchiveHTTPRequestHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.ico': 'image/x-icon',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.html': 'text/html; charset=utf-8',
        '.svg': 'image/svg+xml',
    }

    def do_GET(self):
        if self.path.startswith('/api/installed-xbox-games'):
            import json
            try:
                packages = get_installed_xbox_packages()
                count = sum(len(packages[key]) for key in ('packageFamilyNames', 'packageIdentityNames', 'productIds', 'gameNames'))
                payload = json.dumps({'ok': True, **packages, 'count': count}).encode('utf-8')
            except Exception as e:
                payload = json.dumps({'ok': False, 'error': str(e), 'packageFamilyNames': [], 'packageIdentityNames': [], 'productIds': [], 'gameNames': [], 'scan': {'roots': 0, 'manifests': 0}}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store')
            self.end_headers()
            self.wfile.write(payload)
            return

        if self.path.startswith('/api/installed-games'):
            import json
            try:
                installed = get_installed_steam_app_ids()
                payload = json.dumps({'ok': True, 'installedAppIds': installed, 'count': len(installed)}).encode('utf-8')
            except Exception as e:
                payload = json.dumps({'ok': False, 'error': str(e), 'installedAppIds': []}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store')
            self.end_headers()
            self.wfile.write(payload)
            return

        if self.path.startswith('/api/open-steam'):
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            query = parse_qs(parsed.query)
            target_url = query.get('url', [''])[0]
            app_id = query.get('appId', [''])[0]

            if not target_url and app_id.isdigit():
                target_url = f'steam://nav/games/details/{app_id}'

            success = False
            if target_url.startswith('steam://'):
                try:
                    os.startfile(target_url)
                    success = True
                except Exception:
                    try:
                        import webbrowser
                        webbrowser.open(target_url)
                        success = True
                    except Exception:
                        pass

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store')
            self.end_headers()
            self.wfile.write(b'{"ok":true}' if success else b'{"ok":false}')
            return

        if self.path.startswith('/api/search-viethoa'):
            from urllib.parse import urlparse, parse_qs, quote_plus
            import urllib.request
            import json

            parsed = urlparse(self.path)
            query = parse_qs(parsed.query)
            search_url_template = query.get('url', ['https://theredteam.vn/list-search.php?q='])[0]
            keyword = query.get('q', [''])[0].strip()

            def friendly_http_error(err):
                err_str = str(err)
                if 'timed out' in err_str.lower():
                    return 'Hết thời gian chờ kết nối (Timeout)'
                if 'getaddrinfo failed' in err_str or 'name or service not known' in err_str.lower():
                    return 'Không thể kết nối đến máy chủ nguồn (DNS/Network Error)'
                if 'connection refused' in err_str.lower() or 'actively refused' in err_str.lower():
                    return 'Máy chủ nguồn từ chối kết nối hoặc không phản hồi'
                import re
                code_m = re.search(r'HTTP Error (\d+)', err_str)
                if code_m:
                    code = code_m.group(1)
                    labels = {
                        '401': 'Yêu cầu đăng nhập / xác thực (HTTP 401 Unauthorized)',
                        '403': 'Bị máy chủ nguồn chặn truy cập (HTTP 403 Forbidden)',
                        '404': 'Không tìm thấy trang tìm kiếm (HTTP 404 Not Found)',
                        '429': 'Bị giới hạn tần suất yêu cầu (HTTP 429 Rate Limit)',
                        '500': 'Máy chủ nguồn bị lỗi nội bộ (HTTP 500)',
                        '502': 'Cổng kết nối máy chủ lỗi (HTTP 502 Bad Gateway)',
                        '503': 'Máy chủ nguồn đang quá tải hoặc bảo trì (HTTP 503)',
                        '504': 'Hết hạn cổng kết nối (HTTP 504 Gateway Timeout)'
                    }
                    return labels.get(code, f'Máy chủ trả về lỗi HTTP {code}')
                return err_str

            results = []
            error_msg = None
            if keyword and search_url_template:
                if 'viethoagame.com' in search_url_template:
                    try:
                        import html, re, urllib.parse
                        headers_vhg = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        }
                        r1_req = urllib.request.Request('https://viethoagame.com/search/', headers=headers_vhg)
                        cookie_str = ''
                        csrf_token = ''
                        with urllib.request.urlopen(r1_req, timeout=8) as r1_resp:
                            c_headers = r1_resp.headers.get_all('Set-Cookie') or []
                            cookie_str = '; '.join([c.split(';')[0] for c in c_headers])
                            r1_html = r1_resp.read().decode('utf-8', errors='ignore')
                            csrf_m = re.search(r'data-csrf="([^"]+)"', r1_html)
                            if csrf_m:
                                csrf_token = csrf_m.group(1)

                        if csrf_token:
                            s_headers = dict(headers_vhg)
                            if cookie_str:
                                s_headers['Cookie'] = cookie_str
                            s_data = urllib.parse.urlencode({
                                'keywords': keyword,
                                '_xfToken': csrf_token,
                                'c[title_only]': 1,
                                'c[nodes][]': 6,
                                'c[child_nodes]': 1,
                                'o': 'relevance'
                            }).encode('utf-8')
                            s_req = urllib.request.Request('https://viethoagame.com/search/search', data=s_data, headers=s_headers)
                            with urllib.request.urlopen(s_req, timeout=8) as s_resp:
                                s_html = s_resp.read().decode('utf-8', errors='ignore')
                                matches = re.findall(r'<h3 class="contentRow-title">\s*<a href="(/threads/[^"]+)"[^>]*>(.*?)</a>', s_html)
                                normalized = []
                                for lk, tit in matches:
                                    t = html.unescape(re.sub(r'<[^>]+>', '', tit)).strip()
                                    clean_link = re.sub(r'/unread/?$', '/', lk)
                                    clean_link = re.sub(r'/page-\d+/?$', '/', clean_link)
                                    full_lk = 'https://viethoagame.com' + clean_link if clean_link.startswith('/') else clean_link
                                    normalized.append({'name': t, 'link': full_lk, 'img': ''})
                                results = normalized
                        else:
                            error_msg = 'Không thể lấy mã CSRF từ diễn đàn'
                    except Exception as e:
                        error_msg = friendly_http_error(e)
                else:
                    full_search_url = search_url_template + quote_plus(keyword)
                    try:
                        import html
                        req = urllib.request.Request(
                            full_search_url,
                            headers={
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                                'Accept': 'application/json, text/plain, */*',
                            }
                        )
                        with urllib.request.urlopen(req, timeout=10) as resp:
                            raw = resp.read().decode('utf-8-sig', errors='replace')
                            parsed_json = json.loads(raw)
                            if isinstance(parsed_json, list):
                                normalized = []
                                for it in parsed_json:
                                    if not isinstance(it, dict):
                                        continue
                                    t = it.get('name')
                                    if not t and 'title' in it:
                                        t = it['title'].get('rendered') if isinstance(it['title'], dict) else it['title']
                                    t = html.unescape(t or '').strip()
                                    if not t:
                                        continue
                                    link = it.get('link') or it.get('url') or ''
                                    img = it.get('img', '')
                                    if not img:
                                        embedded = it.get('_embedded', {})
                                        fm = embedded.get('wp:featuredmedia', [])
                                        if fm and isinstance(fm, list) and isinstance(fm[0], dict):
                                            img = fm[0].get('source_url', '')
                                    normalized.append({'name': t, 'link': link, 'img': img})
                                results = normalized
                    except Exception as e:
                        error_msg = friendly_http_error(e)

            payload = json.dumps({'ok': True, 'keyword': keyword, 'results': results, 'error': error_msg}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store')
            self.end_headers()
            self.wfile.write(payload)
            return

        if self.path.startswith('/api/check-steam-update'):
            import json
            try:
                cat_path = DIR / 'data' / 'catalog.json'
                res = check_for_steam_updates(cat_path)
                payload = json.dumps(res).encode('utf-8')
            except Exception as e:
                debug_log(f'check-steam-update error: {e}')
                payload = json.dumps({'ok': False, 'error': str(e)}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store')
            self.end_headers()
            self.wfile.write(payload)
            return

        if self.path.startswith('/api/apply-steam-update'):
            import json
            try:
                cat_path = DIR / 'data' / 'catalog.json'
                games_dir = DIR / 'data' / 'games'
                res = enrich_and_apply_steam_updates(cat_path, games_dir)
                payload = json.dumps(res).encode('utf-8')
            except Exception as e:
                debug_log(f'apply-steam-update error: {e}')
                payload = json.dumps({'ok': False, 'error': str(e)}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store')
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/apply-steam-update'):
            import json
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else '{}'
                data = json.loads(body) if body.strip() else {}
                target_games = data.get('games')
                cat_path = DIR / 'data' / 'catalog.json'
                games_dir = DIR / 'data' / 'games'
                res = enrich_and_apply_steam_updates(cat_path, games_dir, target_games)
                payload = json.dumps(res).encode('utf-8')
            except Exception as e:
                debug_log(f'POST apply-steam-update error: {e}')
                payload = json.dumps({'ok': False, 'error': str(e)}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store')
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_POST()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        pass


def is_port_responding(port: int) -> bool:
    """Check if our server is responsive on the given port using raw socket."""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.3)
    try:
        s.connect(('127.0.0.1', port))
        s.sendall(b'HEAD / HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n')
        data = s.recv(64)
        s.close()
        return b'200' in data or b'OK' in data
    except Exception:
        try:
            s.close()
        except Exception:
            pass
        return False


def terminate_old_instance():
    """If a previous server PID was recorded, terminate it cleanly if still alive."""
    if not PID_FILE.exists():
        return
    try:
        old_pid = int(PID_FILE.read_text().strip())
        if old_pid != os.getpid():
            try:
                os.kill(old_pid, signal.SIGTERM)
                time.sleep(0.3)
            except (ProcessLookupError, PermissionError):
                pass
    except Exception:
        pass


def debug_log(msg):
    try:
        with open(DIR / 'serve.log', 'a', encoding='utf-8') as f:
            f.write(f'{time.strftime("%H:%M:%S")} {msg}\n')
    except Exception:
        pass


def main():
    debug_log("main started")
    try:
        _run_main()
    except BaseException as e:
        import traceback
        debug_log(f"BaseException: {type(e).__name__}: {e}\n{traceback.format_exc()}")


def _run_main():
    debug_log("step 1: parse_args")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()

    debug_log(f"step 2: check if port responding")
    for p in [args.port, 8001, 8002]:
        if is_port_responding(p):
            debug_log(f"port {p} is responding, opening browser")
            webbrowser.open(f'http://127.0.0.1:{p}/')
            return

    debug_log("step 3: terminate old instance")
    terminate_old_instance()

    debug_log("step 4: creating handler")
    handler = partial(ArchiveHTTPRequestHandler, directory=str(DIR))

    ThreadingHTTPServer.allow_reuse_address = False

    server = None
    active_port = args.port
    debug_log("step 5: binding server")
    for p in [args.port, 8001, 8002, 8080]:
        try:
            debug_log(f"trying to bind port {p}")
            server = ThreadingHTTPServer(('127.0.0.1', p), handler)
            active_port = p
            debug_log(f"successfully bound to {p}")
            break
        except OSError as e:
            debug_log(f"bind failed on {p}: {e}")
            continue

    if server is None:
        debug_log("all ports failed, trying fallback reuse")
        ThreadingHTTPServer.allow_reuse_address = True
        try:
            server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
            active_port = args.port
        except OSError as e:
            debug_log(f"fallback failed: {e}")
            webbrowser.open(f'http://127.0.0.1:{args.port}/')
            return

    debug_log("step 6: write PID")
    try:
        PID_FILE.write_text(str(os.getpid()))
    except Exception as e:
        debug_log(f"PID write failed: {e}")

    target_url = f'http://127.0.0.1:{active_port}/'
    debug_log(f"step 7: open browser to {target_url}")

    try:
        webbrowser.open(target_url)
    except Exception as e:
        debug_log(f"webbrowser open failed: {e}")

    debug_log("step 8: serve_forever entering")
    try:
        server.serve_forever()
    except (KeyboardInterrupt, SystemExit) as e:
        debug_log(f"serve_forever interrupted: {e}")
    finally:
        debug_log("finally: server closing")
        try:
            server.server_close()
        except Exception:
            pass
        if PID_FILE.exists():
            try:
                if int(PID_FILE.read_text().strip()) == os.getpid():
                    PID_FILE.unlink(missing_ok=True)
            except Exception:
                pass
        debug_log("exited cleanly")


if __name__ == '__main__':
    main()
