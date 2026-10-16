#!/usr/bin/env python3
"""Regression tests for Steam tag extraction and generated categories."""

import unittest

from enrich_steam_tags import extract_tags
from steam_tag_categories import rebuild_tag_tabs


class SteamTagTests(unittest.TestCase):
    def test_extracts_complete_modal_payload(self):
        page = '''<script>InitAppTagModal( 42,
            [{"tagid":1667,"name":"Horror","count":90,"browseable":true},
             {"tagid":1662,"name":"Survival","count":40,"browseable":true}],
            [], "source", "new", null, false);</script>'''
        self.assertEqual(extract_tags(page), [
            {"id": 1667, "name": "Horror", "count": 90},
            {"id": 1662, "name": "Survival", "count": 40},
        ])

    def test_rebuilds_vietnamese_category_tabs(self):
        library = {
            "metadata": {},
            "games": [
                {"id": "a", "steamTags": ["Horror", "Survival"]},
                {"id": "b", "steamTags": ["Puzzle"]},
            ],
            "tabs": [{"id": "all", "name": "Tất cả", "gameIds": ["a", "b"]}],
        }
        rebuild_tag_tabs(library)
        tabs = {tab["id"]: tab for tab in library["tabs"]}
        self.assertEqual(tabs["tag-horror"]["gameIds"], ["a"])
        self.assertEqual(tabs["tag-survival"]["gameIds"], ["a"])
        self.assertEqual(tabs["tag-puzzle"]["gameIds"], ["b"])


if __name__ == "__main__":
    unittest.main()
