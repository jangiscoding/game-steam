import unittest
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
import enrich_game_content as module
from enrich_game_content import description, extract, safe_url

class ContentTests(unittest.TestCase):
    def test_text_retains_structure_and_strips_executable_content(self):
        text, images=description('<h2>Features</h2><p>A &amp; B</p><script>alert(1)</script><img src="javascript:bad"><img src="https://example.com/game.png" alt="game"><ul><li>Play</li></ul>')
        self.assertIn('A & B',text)
        self.assertIn('• Play',text)
        self.assertNotIn('alert',text)
        self.assertEqual(images,[{'url':'https://example.com/game.png','alt':'game'}])
    def test_no_fake_vietnamese_and_missing_media_are_empty(self):
        content=extract({'name':'Example','short_description':'English','detailed_description':'<p>Details</p>'},'123')
        self.assertEqual(content['locales']['vi']['status'],'pending_translation')
        self.assertIsNone(content['locales']['vi']['shortDescription'])
        self.assertEqual(content['media']['videos'],[])
    def test_preserves_media_sources_and_deduplicates_images(self):
        data={'detailed_description':'<img src="https://example.com/image.jpg">','about_the_game':'<img src="https://example.com/image.jpg">','screenshots':[{'id':1,'path_full':'https://example.com/screen.jpg'}],'movies':[{'id':2,'name':'Trailer','mp4':{'max':'https://example.com/movie.mp4'}}]}
        result=extract(data,'123')
        self.assertEqual(len(result['media']['images']),1)
        self.assertEqual(result['media']['videos'][0]['sources'][0]['url'],'https://example.com/movie.mp4')
    def test_attach_preserves_custom_data_tabs_and_reviewed_translation(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary); cache=root/'cache';cache.mkdir()
            content=extract({'name':'Example','short_description':'English'},'123')
            (cache/'123.json').write_text(json.dumps(content))
            library={'metadata':{},'games':[{'id':'one','steamAppId':'123','custom':{'rating':9},'content':{'locales':{'vi':{'status':'reviewed','shortDescription':'Đã duyệt'}}}},{'id':'two','steamAppId':'456','sourceProfile':{'shortDescription':'Existing summary'}}],'tabs':[{'id':'favorite','gameIds':['one']}]}
            path=root/'library.json';path.write_text(json.dumps(library))
            with patch.object(module,'ROOT',root),patch.object(module,'CACHE',cache):
                module.attach(path)
            result=json.loads(path.read_text())
            self.assertEqual(result['games'][0]['custom'],{'rating':9})
            self.assertEqual(result['tabs'],library['tabs'])
            self.assertEqual(result['games'][0]['content']['locales']['vi']['shortDescription'],'Đã duyệt')
            self.assertEqual(result['games'][1]['content']['status'],'pending_collection')
            self.assertEqual(len(list((root/'exports/backups').glob('*.json'))),1)

    def test_rejects_unsafe_urls(self):
        self.assertIsNone(safe_url('javascript:alert(1)'))
        self.assertEqual(safe_url('//example.com/a'),'https://example.com/a')

if __name__=='__main__':unittest.main()
