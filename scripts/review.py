"""Apply a human-authored review JSON; repository write access is the authorization boundary."""
import datetime,json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
def apply(d,r):
 assert r.get('approved') is True,'Explicit approval required'
 assert r.get('reviewer','').strip() and r.get('rationale','').strip(),'Reviewer and rationale required'
 c=next(c for c in d['claims'] if c['id']==r['claim'])
 now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 if r['action']=='approve-test':
  assert r['version']==c['version'],'Wrong test version'
  c['status']='approved';c['approved_by']=r['reviewer'];c['approved_at']=now
 elif r['action']=='assess':
  assert c['status']=='approved','Approve the test first'
  assert type(r['level']) is int and -5<=r['level']<=5,'Level must be integer -5..5'
  assert r['uncertainty'] and r['evidence'],'Evidence and uncertainty required'
  ev={e['id']:e for e in d['evidence']}
  for key in r['evidence']:
   assert key in ev and c['id'] in ev[key]['claims'],'Evidence missing or not linked'
   assert ev[key]['published']<=r['date'],'Future evidence cannot enter an assessment'
   assert ev[key]['observed']<=r['date'],'Future observation cannot enter an assessment'
  prev=[a for a in d['assessments'] if a['claim']==c['id']][-1]
  assert r['date']>=prev['date'],'Use a new dated revision; do not overwrite history'
  a={k:r[k] for k in ['claim','level','uncertainty','evidence','rationale','reviewer','date','approved']}
  a.update(version=c['version'],recorded_at=now,baseline=False,previous=prev['level']);d['assessments'].append(a)
 else:raise ValueError('Unknown review action')
 d['audit'].append(dict(date=now,actor=r['reviewer'],action=r['action'],claim=c['id'],rationale=r['rationale'],approved=True))
 return d
if __name__=='__main__':
 p=ROOT/'site/data/monitor.json';d=apply(json.loads(p.read_text()),json.loads(pathlib.Path(sys.argv[1]).read_text()));p.write_text(json.dumps(d,indent=2)+'\n')
