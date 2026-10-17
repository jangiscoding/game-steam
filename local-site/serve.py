#!/usr/bin/env python3
"""Serve this standalone Game Archive folder on localhost (Python standard library)."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    except OSError as error:
        parser.exit(1, f'Cannot start local server: {error}. Try --port 8080.\n')
    print(f'Game Archive: http://127.0.0.1:{server.server_port}', flush=True)
    print('Press Ctrl+C to stop. Images and trailers use their online sources.', flush=True)
    try:
        import webbrowser
        webbrowser.open(f'http://127.0.0.1:{server.server_port}')
    except Exception:
        pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
