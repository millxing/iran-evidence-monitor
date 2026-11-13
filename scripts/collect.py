"""Fetch registered sources; record hashes, changed-source candidates and errors. Never score claims."""
import datetime, hashlib, json, pathlib, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCES=[('EIA energy security','https://www.eia.gov/outlooks/steo/report/energysecurity/article.php'),('IAEA Iran updates','https://www.iaea.org/newscenter/focus/iran'),('UKMTO notices','https://www.ukmto.org/')]
def collect():
 p=ROOT/'site/data/collection.json';old=json.loads(p.read_text());now=datetime.datetime.now(datetime.timezone.utc).isoformat();out={'checked_at':now,'sources':[],'candidates':old['candidates']};previous={s['url']:s for s in old['sources']}
 for name,url in SOURCES:
  row={'name':name,'url':url,'checked_at':now}
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'IranEvidenceMonitor/1.0 (public research source checks)'})
   with urllib.request.urlopen(req,timeout=30) as r:
    raw=r.read(5_000_001)
    if len(raw)>5_000_000:raise ValueError('Source exceeds 5 MB limit')
    if r.status!=200:raise ValueError(f'HTTP {r.status}')
   digest=hashlib.sha256(raw).hexdigest();row.update(status='Retrieved; not reviewed',hash=digest,last_success=now)
   if not any(c['url']==url and c['hash']==digest for c in out['candidates']):out['candidates'].append(dict(name=name,url=url,hash=digest,detected_at=now,status='pending',note='Page bytes changed or first retrieval. May be navigation or layout only.'))
  except Exception as e:
   row.update(status='Collection failed',error=str(e),hash=previous.get(url,{}).get('hash'),last_success=previous.get(url,{}).get('last_success'))
  out['sources'].append(row)
 p.write_text(json.dumps(out,indent=2)+'\n')
if __name__=='__main__':collect()
