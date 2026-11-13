import copy,datetime,importlib.util,json,pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('review',ROOT/'scripts/review.py');review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)
class MonitorTests(unittest.TestCase):
 def setUp(self):self.d=json.loads((ROOT/'site/data/monitor.json').read_text())
 def record(self):return dict(action='assess',claim='H2',approved=True,reviewer='Test reviewer',rationale='Test rationale',level=3,evidence=['E001'],date='2026-11-14',uncertainty='High')
 def test_unique_ids_and_references(self):
  ids=[e['id'] for e in self.d['evidence']];self.assertEqual(len(ids),len(set(ids)))
  for a in self.d['assessments']:
   self.assertTrue(-5<=a['level']<=5);self.assertTrue(set(a['evidence'])<=set(ids));datetime.date.fromisoformat(a['date'])
 def test_baseline_cutoff(self):
  for a in self.d['assessments']:
   if a['baseline']:
    self.assertEqual(a['date'],'2026-11-12')
    for e in self.d['evidence']:
     if e['id'] in a['evidence']:self.assertLessEqual(e['published'],a['date']);self.assertLessEqual(e['observed'],a['date'])
 def test_unapproved_test_blocks_update(self):
  with self.assertRaises(AssertionError):review.apply(self.d,self.record())
 def test_append_only_assessment(self):
  self.d['claims'][1]['status']='approved';old=copy.deepcopy(self.d['assessments']);review.apply(self.d,self.record());self.assertEqual(self.d['assessments'][:-1],old)
 def test_future_source_rejected(self):
  self.d['claims'][1]['status']='approved';self.d['evidence'][0]['published']='2027-01-01'
  with self.assertRaises(AssertionError):review.apply(self.d,self.record())
 def test_level_bounds(self):
  self.d['claims'][1]['status']='approved';r=self.record();r['level']=6
  with self.assertRaises(AssertionError):review.apply(self.d,r)
 def test_missing_evidence_rejected(self):
  self.d['claims'][1]['status']='approved';r=self.record();r['evidence']=[]
  with self.assertRaises(AssertionError):review.apply(self.d,r)
 def test_source_series_matches_row(self):self.assertEqual([p['value'] for p in self.d['series']['points']],[20.9,21,21.3,21.6,14.9,4.9])
 def test_per_claim_directions(self):
  allowed={'Potential support','Potential challenge','Uncertainty only'}
  for e in self.d['evidence']:
   self.assertIn(e['direction'],allowed)
   for k,v in e.get('directions',{}).items():self.assertIn(k,e['claims']);self.assertIn(v,allowed)
 def test_transit_series_valid(self):
  t=json.loads((ROOT/'site/data/transits.json').read_text());rows=t['rows'];self.assertTrue(rows)
  dates=[r[0] for r in rows];self.assertEqual(dates,sorted(set(dates)))
  for d,total,tanker in rows:datetime.date.fromisoformat(d);self.assertTrue(0<=tanker<=total)
if __name__=='__main__':unittest.main()
