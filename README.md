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
