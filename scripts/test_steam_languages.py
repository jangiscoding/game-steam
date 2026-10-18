import json
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, Mock

import enrich_steam_languages as languages
from build_game_site import public_game
from library_data import load_library, save_library


class SteamLanguageTests(unittest.TestCase):
    def test_official_language_names_with_audio_markup(self):
        self.assertTrue(languages.supports_vietnamese('English<strong>*</strong>, Vietnamese<br><strong>*</strong>languages with full audio support'))
        self.assertFalse(languages.supports_vietnamese('English, Thai, Simplified Chinese'))
        self.assertFalse(languages.supports_vietnamese('VietnameseSomething'))

    def test_search_extracts_app_ids_including_packages(self):
        page = '<a data-ds-appid="12,34"></a><a data-ds-appid="12"></a><a data-ds-packageid="99"></a>'
        self.assertEqual(languages.parse_search_ids(page), {'12', '34'})

    def test_attachment_separates_native_support_from_translations_and_unknowns(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            cache = root / 'cache'
            evidence = root / 'evidence'
            cache.mkdir(); evidence.mkdir()
            path = root / 'library.json'
            translated = {'locales': {'vi': {'status': 'reviewed', 'shortDescription': 'Giữ nguyên'}}}
            library = {'metadata': {'totalGames': 4}, 'games': [
                {'id': 'one', 'steamAppId': '1', 'content': translated},
                {'id': 'two', 'steamAppId': '2', 'content': translated},
                {'id': 'three', 'steamAppId': '3'},
                {'id': 'four', 'steamAppId': None},
            ], 'tabs': [{'id': 'favorites', 'gameIds': ['two']}]}
            path.write_text(json.dumps(library))
            (cache / '2.json').write_text(json.dumps({'steamAppId': '2', 'status': 'success', 'supportsVietnamese': False, 'supportedLanguages': 'English'}))
            (evidence / 'search-results.json').write_text(json.dumps({'complete': True, 'checkedAt': 'today', 'pages': [{'appIds': ['1']}]}))
            with patch.object(languages, 'CACHE', cache), patch.object(languages, 'EVIDENCE', evidence):
                languages.attach(path)
            result = load_library(path)
            self.assertEqual([g['supportsVietnamese'] for g in result['games']], [True, False, False, False])
            self.assertEqual([g['vietnameseSupportStatus'] for g in result['games']], ['listed', 'success', 'not_listed', 'missing_app_id'])
            self.assertEqual(result['tabs'][-1]['gameIds'], ['one'])
            self.assertEqual(result['tabs'][0], library['tabs'][0])
            self.assertEqual(result['games'][0]['content'], translated)
            self.assertEqual(result['games'][1]['content'], translated)
            self.assertIs(public_game(result['games'][1])['supportsVietnamese'], False)

    def test_incomplete_search_never_publishes_a_snapshot(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            payload = {'success': 1, 'start': 0, 'total_count': 100, 'results_html': ''}
            def response(*args, **kwargs):
                return io.BytesIO(json.dumps(payload).encode())
            with patch.object(languages, 'CACHE', root / 'cache'), patch.object(languages, 'EVIDENCE', root / 'evidence'), patch.object(languages.urllib.request, 'urlopen', side_effect=response):
                with self.assertRaisesRegex(ValueError, 'Missing Steam search page'):
                    languages.collect_search(Mock())
            self.assertFalse((root / 'evidence/search-results.json').exists())

    def test_sharded_roundtrip_and_integrity(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'library.json'
            data = {'metadata': {'totalGames': 4}, 'tabs': [], 'games': [{'id': str(i), 'content': 'tiếng Việt ' * 20} for i in range(4)]}
            save_library(path, data, max_shard_bytes=650)
            manifest = json.loads(path.read_text())
            self.assertNotIn('games', manifest)
            self.assertGreater(len(manifest['gameFiles']), 1)
            self.assertEqual(load_library(path), data)
            for item in manifest['gameFiles']:
                self.assertLessEqual((path.parent / item['path']).stat().st_size, 650)
            target = path.parent / manifest['gameFiles'][0]['path']
            target.write_text('[]')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                load_library(path)


if __name__ == '__main__':
    unittest.main()
