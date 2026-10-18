"""Read legacy libraries and atomically write a manifest plus bounded game shards."""
import hashlib
import json
from pathlib import Path

MAX_SHARD_BYTES = 2 * 1024 * 1024


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_bytes(data + b'\n')
    temporary.replace(path)


def load_library(path):
    path = Path(path)
    library = json.loads(path.read_text(encoding='utf-8'))
    if 'gameFiles' not in library:
        return library
    if 'games' in library:
        raise ValueError('Library cannot contain both games and gameFiles')
    games = []
    for item in library['gameFiles']:
        shard = (path.parent / item['path']).resolve()
        if not shard.is_relative_to(path.parent.resolve()):
            raise ValueError('Game shard must stay within library directory')
        raw = shard.read_bytes()
        if hashlib.sha256(raw).hexdigest() != item['sha256']:
            raise ValueError(f'Game shard checksum mismatch: {shard.name}')
        records = json.loads(raw)
        if len(records) != item['count']:
            raise ValueError('Game shard count mismatch')
        games.extend(records)
    if len(games) != library['metadata']['totalGames']:
        raise ValueError('Library game count mismatch')
    library.pop('gameFiles')
    library['games'] = games
    return library


def save_library(path, library, *, max_shard_bytes=MAX_SHARD_BYTES):
    path = Path(path)
    # Small fixtures and small libraries remain compatible with legacy consumers.
    if len(encode(library)) <= max_shard_bytes:
        atomic_write(path, encode(library))
        return
    files = []
    batch = []
    size = 3  # brackets plus newline

    def flush():
        raw = encode(batch) + b'\n'
        digest = hashlib.sha256(raw).hexdigest()
        name = f'game-library-parts/{digest}.json'
        target = path.parent / name
        if not target.exists() or target.read_bytes() != raw:
            atomic_write(target, raw.rstrip(b'\n'))
        files.append({'path': name, 'count': len(batch), 'sha256': digest})

    for game in library['games']:
        length = len(encode(game))
        if batch and size + length + 1 > max_shard_bytes:
            flush()
            batch = []
            size = 3
        batch.append(game)
        size += length + 1
    if batch:
        flush()
    manifest = {key: value for key, value in library.items() if key not in ('games', 'gameFiles')}
    manifest['gameFiles'] = files
    atomic_write(path, encode(manifest))
    # Content-addressed older shards remain readable by existing manifests.
