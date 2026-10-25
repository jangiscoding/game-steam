#!/usr/bin/env python3
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class XboxGamePassTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / "data/xbox-game-pass.json").read_text(encoding="utf-8"))

    def test_catalog_has_unique_products(self):
        ids = [game["id"] for game in self.data["games"]]
        self.assertGreater(len(ids), 400)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(len(product_id) == 12 for product_id in ids))

    def test_games_are_current_game_pass_members(self):
        self.assertTrue(all(game["platforms"] == ["pc"] for game in self.data["games"]))
        self.assertTrue(all(game["storeUrl"].startswith("https://www.xbox.com/") for game in self.data["games"]))

    def test_metadata_counts_match(self):
        games = self.data["games"]
        metadata = self.data["metadata"]
        self.assertEqual(metadata["totalGames"], len(games))
        self.assertEqual(metadata["pcGames"], len(games))
        self.assertNotIn("consoleGames", metadata)
        self.assertEqual(metadata["vietnameseLanguageGames"], sum(game["supportsVietnamese"] for game in games))
        self.assertEqual(metadata["vietnamesePatchGames"], sum(game["hasVietnamesePatch"] for game in games))

    def test_vietnamese_categories_have_traceable_data(self):
        games = self.data["games"]
        self.assertTrue(all(isinstance(game["supportedLanguages"], list) for game in games))
        self.assertTrue(all(game["supportsVietnamese"] == any(code == "vi" or code.startswith("vi-") for code in game["supportedLanguages"]) for game in games))
        self.assertTrue(all(game["hasVietnamesePatch"] == bool(game["vietnamesePatches"]) for game in games))
        self.assertTrue(all(patch.get("link", "").startswith("https://") for game in games for patch in game["vietnamesePatches"]))

    def test_page_uses_expanded_filters_and_xbox_app_deep_link(self):
        html = (ROOT / "web-game-library/xbox/index.html").read_text(encoding="utf-8")
        app = (ROOT / "web-game-library/xbox/app.js").read_text(encoding="utf-8")
        self.assertNotIn("<select", html)
        self.assertNotIn('id="pagination"', html)
        self.assertNotIn("PAGE_SIZE", app)
        self.assertNotIn("data-page", app)
        self.assertIn('id="collections"', html)
        self.assertIn('id="genre-chips"', html)
        self.assertIn('id="feature-chips"', html)
        self.assertIn("msxbox://game/?productId=", app)
        self.assertIn("Ngôn ngữ tiếng Việt", app)
        self.assertIn("Có hỗ trợ Việt hóa", app)
        self.assertNotIn("Xbox Console", html + app)

    def test_page_has_gamepad_navigation(self):
        html = (ROOT / "web-game-library/xbox/index.html").read_text(encoding="utf-8")
        app = (ROOT / "web-game-library/xbox/app.js").read_text(encoding="utf-8")
        gamepad = (ROOT / "web-game-library/xbox/gamepad.js").read_text(encoding="utf-8")
        steam_gamepad = (ROOT / "local-site/gamepad.js").read_text(encoding="utf-8")
        steam_app = (ROOT / "local-site/app.js").read_text(encoding="utf-8")
        self.assertIn("gamepad.js", html)
        self.assertIn("navigator.getGamepads", gamepad)
        self.assertIn("xbox:gamepad-category", gamepad)
        self.assertIn("stopHaptics", gamepad)
        self.assertIn("pagehide", gamepad)
        self.assertIn("stopHaptics", steam_gamepad)
        self.assertIn("beforeunload", steam_gamepad)
        self.assertIn("switchToSteam", gamepad)
        self.assertIn("switchToPcGamePass", steam_gamepad)
        self.assertIn("openKeyboard", gamepad)
        self.assertIn("gamepad.axes[3]", gamepad)
        self.assertIn("xbox:gamepad-favorite", gamepad)
        self.assertIn("xbox:focus-primary", app)
        self.assertIn("pageScroll", gamepad)
        self.assertIn("LT+RT", gamepad)
        self.assertIn("pageScroll", steam_gamepad)
        self.assertIn("triggerChordStarted", gamepad)
        self.assertIn("triggerChordStarted", steam_gamepad)
        self.assertIn("window.scrollTo(0,target)", steam_app)
        self.assertIn("pageScrollFocusLocked", steam_gamepad)
        self.assertIn("focus(best, false)", steam_gamepad)
        self.assertIn("controllerPageScroll", steam_app)
        self.assertIn("window.__archive.controllerPageScroll", steam_gamepad)

    def test_personal_xbox_collections_and_steam_theme(self):
        app = (ROOT / "web-game-library/xbox/app.js").read_text(encoding="utf-8")
        styles = (ROOT / "web-game-library/xbox/styles.css").read_text(encoding="utf-8")
        server = (ROOT / "local-site/serve.py").read_text(encoding="utf-8")
        steam_app = (ROOT / "local-site/app.js").read_text(encoding="utf-8")
        theme = (ROOT / "local-site/theme.js").read_text(encoding="utf-8")
        xbox_html = (ROOT / "web-game-library/xbox/index.html").read_text(encoding="utf-8")
        self.assertIn("Game yêu thích", app)
        self.assertIn("Đã cài trên máy", app)
        self.assertIn("jang-xbox-personal-v1", app)
        self.assertIn("--green:#f59e0b", styles)
        self.assertIn("--xbox:#06b6d4", styles)
        self.assertIn("gamepad-bar", styles)
        self.assertIn("/api/installed-xbox-games", server)
        self.assertIn("detectInstalledGames", app)
        self.assertIn("packageIdentityNames", server)
        self.assertIn("productIds", server)
        self.assertIn("gameNames", server)
        self.assertIn("installed-detection", app)
        self.assertIn("127.0.0.1", app)
        self.assertIn("Access-Control-Allow-Private-Network", server)
        self.assertIn("jang_welcome_seen_v1", steam_app)
        self.assertIn("--green", theme)
        self.assertIn("--neon-primary", theme)
        self.assertIn("../theme.js", xbox_html)
        games_with_packages = [game for game in self.data["games"] if game["packageFamilyNames"]]
        self.assertGreater(len(games_with_packages), 300)
        self.assertTrue(all(isinstance(game["packageIdentityNames"], list) for game in self.data["games"]))

    def test_every_catalog_genre_has_a_vietnamese_label(self):
        app = (ROOT / "web-game-library/xbox/app.js").read_text(encoding="utf-8")
        genres = {genre for game in self.data["games"] for genre in game["genres"]}
        self.assertTrue(all(f"'{genre}'" in app or f"{genre}:" in app for genre in genres))


if __name__ == "__main__":
    unittest.main()
