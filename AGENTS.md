# Agent instructions

These instructions apply to the entire repository.

## Keep generated website data synchronized

`data/game-library.json` is the source of truth. Whenever a task changes this file, or changes translations/content that are attached to it, the agent must complete all of the following steps before finishing:

1. Rebuild the local website data:

   ```bash
   npm run site:local:build
   ```

2. Verify that `local-site/data/catalog.json` and the records under `local-site/data/games/` reflect the updated master JSON. For translation work, confirm that every game whose `content.status` is `success` has `locales.vi.status` set to `translated` or `reviewed`.

3. Run the relevant validation suites:

   ```bash
   python3 scripts/test_game_content.py
   python3 scripts/test_master_json.py
   npm test
   ```

4. Commit `local-site/data` together with `data/game-library.json` and any related progress files. Never commit a changed master JSON while leaving generated local-site data stale.

5. If the task includes publishing or maintaining the hosted demo, deploy the rebuilt `local-site` assets to the existing Sites project and verify that deployment succeeds. A GitHub push does not automatically update the hosted Sites deployment.

## Preserve existing content

- Never overwrite `translated` or `reviewed` Vietnamese text with pending or empty values.
- Preserve English source descriptions and Steam image/video URLs when updating translations.
- Do not mark `not_found` records as translated; they have no public source text.
