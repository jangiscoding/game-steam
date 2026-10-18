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

[`data/game-library.json`](data/game-library.json) is a manifest containing `metadata`, `tabs`, and `gameFiles`. Full game records live in content-addressed `data/game-library-parts/*.json` shards of about 2 MiB each. Use `load_library` / `save_library` from `scripts/library_data.py` to read or update the logical library; they also accept the previous single-file format and validate shard counts and SHA-256 checksums. Keep the manifest and its shards together. Each game has a stable input-record `id`; tabs store only `gameIds`, so a game may appear in several tabs without copying its full record. The base game-list tabs match the Excel lists, and additional `tag-*` tabs provide detailed Steam Tag categories. Excel's Mục lục and Dữ liệu chi tiết correspond to JSON metadata and each game's `sourceProfile`.

Run `npm run export:json` after installing `requirements-excel.txt`. The exporter accepts `--input`, `--output`, and `--image-report`. Unknown values remain `null`; controller/local play flags do not establish an exact player limit. `imageStatus` reflects the saved download report, not a live availability check. Full source profiles and source links are retained under `sourceProfile`.

For future additions, put personal information in each game's `custom` object and give new tabs unique IDs with lists of existing `gameIds`. Re-exporting preserves custom game fields and custom tabs, refreshes generated fields/group membership, and backs up an existing JSON file under `exports/backups/`. Generated tab IDs/names/memberships are managed by the exporter. Invalid references stop the export before replacing the file. Game records absent from the source are removed; custom tabs referencing them must be adjusted first.

Validate exporter behavior with `python scripts/test_master_json.py`.

## Detailed descriptions, screenshots and trailers

`npm run content:fetch -- --workers 2 --interval 1.6` collects official Steam descriptions and media into `games[].content` in the same master JSON. It saves each App ID immediately under the ignored `exports/content-cache/` directory, resumes previously completed apps, and checkpoints the master file every 100 apps. Steam's per-IP limit requires roughly 1.5 seconds between requests; a 429 response pauses all workers for at least five minutes. Do not lower the interval to accelerate bulk runs.

Content fields:

- `status`: `pending_collection`, `success`, `not_found`, or `retry_pending`.
- `identityStatus`: whether the linked input record was identified previously; source names remain in `steamName` for comparison.
- `locales.en`: original short description, detailed description and optional distinct about-game text, extracted as plain text without executable HTML.
- `locales.vi`: separate Vietnamese text with an explicit translation status/provider. Pending translations remain null, never mislabeled English.
- `media.images`, `media.screenshots`, `media.videos`: source URLs, thumbnails and available video formats. Assets are referenced, not downloaded. Text in artwork and spoken audio/subtitles are not translated by this pipeline.
- `sourceUrl`, `fetchedAt`: provenance for each app. Missing public data does not imply that no media exists elsewhere.

The JSON progress summary is `metadata.content`; a small copy is saved at `exports/content-progress.json`. Existing custom fields and tabs remain intact. `npm run content:attach` rebuilds the content section from saved cache without contacting Steam. Content updates back up the existing master file under `exports/backups/`.

### Local Vietnamese translation

Install `requirements-content.txt` (or use `python -m pip install --target .content-deps ctranslate2 sentencepiece` in a restricted workspace). The runtime must allow `argos-net.com` before downloading the public Argos EN→VI model:

```bash
python scripts/setup_translation_model.py
npm run content:translate -- --model-dir exports/translation-models/en-vi
```

The translator runs on CPU, splits long descriptions without dropping tail text, records the source-text hash and model provenance, and resumes already translated text. Translations are explicitly labeled `machine_translation_unreviewed`; set `locales.vi.status` to `reviewed` in the content cache to protect reviewed text. Source descriptions, images and video URLs remain intact. The model archive is downloaded from the public Argos model index; its observed SHA-256 and source URL are saved locally for reproducibility. Model weights and runtime dependencies are not committed.

Run `python scripts/test_game_content.py` and `python scripts/test_master_json.py` to validate extraction and update behavior.

## Steam Tags and detailed categories

`npm run tags:fetch` collects the complete ordered list of popular user-defined tags exposed on each public Steam Store page. Raw tag IDs and vote counts are cached under ignored `exports/tag-cache/`; the master JSON stores the ordered tag names in `games[].steamTags`. The collector is resumable, retries uncertain pages once, respects Steam cooldowns, and records unavailable regional or removed pages without guessing tags.

The tag attachment step generates Vietnamese browsing groups such as Kinh dị, Sinh tồn, Giải đố, FPS, Roguelike, Thế giới mở, Metroidvania and chiến thuật. The website catalog also exposes every collected Steam Tag as a filter and search term. Run `npm run tags:attach` to rebuild the master fields and category tabs from an existing cache without contacting Steam. Progress is summarized in `metadata.steamTags` and `exports/tag-progress.json`.

Validate tag extraction and generated categories with `python scripts/test_steam_tags.py`.

## Run the complete website locally

The standalone [`local-site/`](local-site/README.md) folder includes HTML/CSS/JavaScript, all game detail JSON files, and a Python-only launcher. Run `python local-site/serve.py`, then open http://127.0.0.1:8000. Windows users can double-click `local-site/start.bat`; macOS/Linux users can run `sh local-site/start.sh`. Rebuild from the master JSON with `npm run site:local:build`. Online media still requires Internet access.

## Double-click HTML package (no local server)

[`html-package/index.html`](html-package/index.html) opens directly from the filesystem in Chrome/Edge, without Python or npm. Keep its sibling scripts and `data/` directory together. Classic scripts supply the index and lazy-loaded complete game records; the packaged application does not fetch local JSON. Rebuild with `npm run site:html:build`, or add `--zip /absolute/path/game-archive-html.zip` when invoking the Python builder directly. Online media still needs Internet, and file-origin gamepad/video permissions depend on the browser. See [the package guide](html-package/README.md).

## Official Vietnamese language support

Run `npm run languages:fetch` to collect every page of Steam Store's official `supportedlang=vietnamese` game search, then compare all library App IDs. Evidence is saved in `data/steam-languages/search-results.json`; per-app results are divided into 250-record `part-*.json` files. Requests are paced, cached for resumption, and back off on HTTP 429. Remove `exports/language-cache/search-*.json` before starting a fresh search snapshot. Use `npm run languages:attach` to rebuild library fields from saved evidence without contacting Steam.

Each game has a boolean `supportsVietnamese` and a `vietnameseSupportStatus`. `listed` confirms membership in Steam's Vietnamese-language search. `not_listed` means Steam did not list it in the public `cc=us` search; it does not prove lack of support for unavailable, delisted, unreleased, or region-restricted games. `missing_app_id`, `unavailable`, `error`, and `pending` represent missing evidence. The boolean is `false` whenever support has not been confirmed. Optional `--method details --workers 2 --interval 1.6` checks individual `appdetails` language metadata; `success` means a direct successful check, whose boolean may be true or false.

This flag describes Steam's declared in-game language support. It is separate from Vietnamese catalog descriptions and community translation patches. Confirmed games appear in the **Ngôn ngữ tiếng Việt** collection, accessible by mouse and gamepad. Rebuild with `npm run site:local:build` and `npm run site:html:build` after attaching data. Builders use the current `local-site` interface so rebuilding does not restore older templates.

Run `python scripts/test_steam_languages.py` for language parsing, collection membership, data preservation, and shard integrity tests.
