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
        self.assertIn('id="collections"', html)
        self.assertIn('id="genre-chips"', html)
        self.assertIn('id="feature-chips"', html)
        self.assertIn("msxbox://game/?productId=", app)
        self.assertIn("Ngôn ngữ tiếng Việt", app)
        self.assertIn("Có hỗ trợ Việt hóa", app)
        self.assertNotIn("Xbox Console", html + app)

    def test_page_has_gamepad_navigation(self):
        html = (ROOT / "web-game-library/xbox/index.html").read_text(encoding="utf-8")
        gamepad = (ROOT / "web-game-library/xbox/gamepad.js").read_text(encoding="utf-8")
        self.assertIn("gamepad.js", html)
        self.assertIn("navigator.getGamepads", gamepad)
        self.assertIn("xbox:gamepad-category", gamepad)

    def test_every_catalog_genre_has_a_vietnamese_label(self):
        app = (ROOT / "web-game-library/xbox/app.js").read_text(encoding="utf-8")
        genres = {genre for game in self.data["games"] for genre in game["genres"]}
        self.assertTrue(all(f"'{genre}'" in app or f"{genre}:" in app for genre in genres))


if __name__ == "__main__":
    unittest.main()
