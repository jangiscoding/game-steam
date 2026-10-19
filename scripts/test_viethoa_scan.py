import unittest
from scan_viethoa import title_key, eligible


class MatchingTests(unittest.TestCase):
    def test_html_and_patch_suffix(self):
        self.assertEqual(title_key('[PC] <b>The Witcher 3: Wild Hunt</b> Việt Hóa Full DLCs'), title_key('The Witcher 3: Wild Hunt'))
        self.assertEqual(title_key('Baldur’s Gate 3™'), title_key("Baldur's Gate 3"))

    def test_sequels_and_editions_stay_distinct(self):
        self.assertNotEqual(title_key('古龙风云录'), title_key('追曙'))
        self.assertTrue(title_key('古龙风云录'))
        self.assertNotEqual(title_key('Alan Wake'), title_key('Alan Wake 2 Việt hóa'))
        self.assertNotEqual(title_key('Resident Evil 4'), title_key('Resident Evil 4 Remake Việt hóa'))

    def test_unfinished_projects(self):
        for title in ['[WIP] Game Việt hóa', 'Game đang dịch', 'Game Demo', 'Game sắp ra mắt']:
            self.assertFalse(eligible(title))
        self.assertTrue(eligible('[PC] Game Việt hóa hoàn thành'))


if __name__ == '__main__':
    unittest.main()
