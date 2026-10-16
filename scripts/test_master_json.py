import unittest
from export_master_json import build, validate

class MasterJsonTests(unittest.TestCase):
    def test_unknowns_and_custom_data_survive_refresh(self):
        profiles = [{'inputRecordId':'one','suppliedName':'Unknown game','genres':[]}]
        previous = {'games':[{'id':'one','custom':{'rating':9},'myNote':'keep'}], 'tabs':[{'id':'favorites','name':'Yêu thích','gameIds':['one']}]}
        result = build(profiles, {}, previous)
        game = result['games'][0]
        self.assertIsNone(game['playerModes']['localCoop'])
        self.assertIsNone(game['storage']['windowsMinimumGB'])
        self.assertEqual(game['imageStatus'],'unknown')
        self.assertEqual(game['custom'],{'rating':9})
        self.assertEqual(game['myNote'],'keep')
        self.assertEqual(result['tabs'][-1],previous['tabs'][0])
        self.assertEqual(game['sourceProfile'],profiles[0])

    def test_rejects_broken_custom_tab_reference(self):
        with self.assertRaisesRegex(AssertionError,'Unknown game reference'):
            build([],{}, {'tabs':[{'id':'favorites','name':'Yêu thích','gameIds':['missing']}]})

    def test_unknown_modes_are_not_false(self):
        result=build([{'inputRecordId':'one','suppliedName':'Example','steamMetadata':{'playerModes':{'singlePlayer':False,'maximumPlayers':None}}}],{})
        self.assertIs(result['games'][0]['playerModes']['singlePlayer'],False)
        self.assertIsNone(result['games'][0]['playerModes']['maximumPlayers'])

if __name__ == '__main__':
    unittest.main()
