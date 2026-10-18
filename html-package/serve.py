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

        super().do_GET()

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
    except Exception as e:
        import traceback
        debug_log(f"Exception: {e}\n{traceback.format_exc()}")


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
