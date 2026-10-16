# Game Archive

Static Vietnamese catalog built from the complete `data/game-library.json`, with search, genre collections, controller filters, pagination, deep-linked game detail dialogs, original/Vietnamese descriptions, screenshots and trailer playback (MP4/WebM/HLS). Translation and collection states are shown honestly; source JSON is not modified by the site builder.

Build: `python scripts/build_game_site.py` (or `--output /absolute/path/dist`). Serve the resulting `dist` folder via any static host. The builder exports all 5,262 game records individually and a lightweight index with all 24 data collections. Detail data is fetched only on opening a game. Rebuild and redeploy after source JSON updates; this deployed website uses a snapshot rather than a live GitHub connection.

Site project: `appgprj_6ad1e29cd3008191a9d38b0bf2a48173` (new private Sites hosting). Hosting checkout: `/workspace/sites/game-archive`.

HLS playback uses vendored hls.js 1.6.13 (Apache-2.0), distributed from the upstream npm package through jsDelivr. Video playback depends on the origin's streaming/CORS availability; the Steam link is always available as fallback. Steam descriptions are rendered as plain text; data is escaped before inserting into HTML. No unsupported player-count or Xbox-compatibility claims are inferred.

## Xbox / standard gamepad navigation

Connect an Xbox controller by USB or Bluetooth, open the HTTPS site in a browser supporting the Gamepad API (such as current Chrome/Edge), and press a controller button so the browser exposes the device. The controller strip appears only when a standard-mapped controller is detected.

- D-pad / left stick: spatial focus navigation; held directions repeat after a delay, with an analog dead zone.
- A: activate the focused control. On selects, A cycles values and up/down changes the selected option.
- B: close the search keyboard or game details and restore focus; otherwise return to the game grid.
- LB/RB: previous/next collection while browsing, including all JSON collection tabs.
- Y: open the on-screen search keyboard; A types, X deletes, B closes.
- Right stick: scroll the page or open detail dialog.

Mouse, keyboard and touch remain available; pointer/keyboard input removes controller focus styling. Polling pauses while the page is hidden. No device identifiers or controller input are stored or sent to a server. Functional navigation was checked with simulated Gamepad API input in a DOM harness; real Xbox hardware/browser verification remains outstanding.
