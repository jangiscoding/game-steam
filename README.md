# Steam Game Catalog

A dependency-free Node.js catalog for importing, validating, searching, and
classifying a large Steam game list.

## Requirements

- Node.js 20 or newer

## Import data

The importer accepts either a JSON array or the supplied `Game` prefix followed
by a JSON array. It validates every record and writes both the normalized catalog
and an audit report.

```bash
npm run import -- /path/to/games.txt
```

Generated files:

- `data/games.json`: normalized searchable records
- `data/import-report.json`: rejected records and duplicate Steam App ID groups

Initialize or refresh the research profiles without overwriting completed work:

```bash
npm run profiles:init
```

Each supplied name keeps a unique `inputRecordId`. A shared `canonicalId` is only
assigned after an authoritative source confirms the identity. Unresearched names
remain `needs_verification` with low confidence.

Research a resumable batch against the official public Steam Store endpoint:

```bash
npm run profiles:research -- --limit=25 --delay-ms=250
```

This requires network access to `store.steampowered.com`. Failed lookups are
recorded and can be retried; name mismatches remain unlinked for manual or
secondary-source verification.

Verified profiles include a `steamMetadata` object with:

- official Store, website, and support links;
- minimum/recommended free-space requirements for Windows, macOS, and Linux;
- Steam genres and original category evidence;
- full, partial, or unknown controller support;
- single-player, multiplayer, co-op, PvP, LAN, and split-screen flags.

Steam's public app-details response does not reliably identify Xbox-specific
controller compatibility or an exact maximum player count. These values remain
`null` unless explicit evidence is available; generic controller or multiplayer
labels are never treated as proof.

The reusable functions can also be called directly:

```js
import { fetchSteamAppDetails } from "./src/steam-client.js";
import { extractSteamMetadata } from "./src/steam-metadata.js";

const appId = "251570";
const details = await fetchSteamAppDetails(appId, {
  language: "english",
  country: "us"
});
const metadata = extractSteamMetadata(details, appId);
```

## Search from the command line

```bash
npm run search -- --q "witcher wild hunt" --limit 10
npm run search -- --featured true --initial A --sort name-desc
```

Available options are `q`, `featured`, `initial`, `limit`, `offset`, and `sort`.

## Run the API

```bash
npm start
```

The service listens on `PORT` (default `3000`):

- `GET /health`
- `GET /games?q=witcher&featured=false&initial=T&limit=20&offset=0`
- `GET /facets`
- `GET /games/app/292030`
- `GET /profiles?q=witcher&limit=10`
- `GET /profiles/input-...`
- `GET /research/status`

The catalog retains multiple names associated with the same Steam App ID so
editions and aliases remain searchable. Future genre, tag, platform, language,
or release-date fields can be added by extending the importer and filters without
changing the source format.

## Test

```bash
npm test
```

## Excel library with embedded covers

The master workbook is [exports/Thu-vien-game-TONG.xlsx](exports/Thu-vien-game-TONG.xlsx): 5,262 profiles across 26 sheets, including genres, controller support, local co-op and online co-op. Covers are embedded for offline viewing; 13 unavailable covers are listed in a separate sheet.

See [MASTER-WORKBOOK.md](MASTER-WORKBOOK.md) for source data, generation scripts and rules for preserving future workbook additions. Install Excel export dependencies with `python -m pip install -r requirements-excel.txt`. The generation scripts currently use the original cloud workspace paths under `/workspace`; adjust those paths when running elsewhere.

## Master JSON library

[`data/game-library.json`](data/game-library.json) contains `metadata`, `games`, and `tabs`. Each game has a stable input-record `id`; tabs store only `gameIds`, so a game may appear in several tabs without copying its full record. The 24 game-list tabs match the Excel lists; Excel's Mục lục and Dữ liệu chi tiết correspond to JSON metadata and each game's `sourceProfile`.

Run `npm run export:json` after installing `requirements-excel.txt`. The exporter accepts `--input`, `--output`, and `--image-report`. Unknown values remain `null`; controller/local play flags do not establish an exact player limit. `imageStatus` reflects the saved download report, not a live availability check. Full source profiles and source links are retained under `sourceProfile`.

For future additions, put personal information in each game's `custom` object and give new tabs unique IDs with lists of existing `gameIds`. Re-exporting preserves custom game fields and custom tabs, refreshes generated fields/group membership, and backs up an existing JSON file under `exports/backups/`. Generated tab IDs/names/memberships are managed by the exporter. Invalid references stop the export before replacing the file. Game records absent from the source are removed; custom tabs referencing them must be adjusted first.

Validate exporter behavior with `python scripts/test_master_json.py`.
