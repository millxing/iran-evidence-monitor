"""Fetch daily Strait of Hormuz transit counts from IMF PortWatch into site/data/transits.json.

Display-only indicator. It never scores claims or changes assessments.
On failure, the previous file is kept and the error is recorded in it.
"""
import datetime
import json
import pathlib
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'site/data/transits.json'
API = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query'
PAGE_URL = 'https://portwatch.imf.org/pages/cb5856222a5b4105adc6ee7e880a1730'
PORT = 'Strait of Hormuz'
PAGE = 1000


def fetch_rows():
    rows, offset = [], 0
    while True:
        q = urllib.parse.urlencode({
            'where': f"portname='{PORT}'",
            'outFields': 'date,n_total,n_tanker',
            'orderByFields': 'date ASC',
            'resultOffset': offset,
            'resultRecordCount': PAGE,
            'f': 'json',
        })
        req = urllib.request.Request(f'{API}?{q}', headers={'User-Agent': 'IranEvidenceMonitor/1.0 (public research)'})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r)
        if 'error' in data:
            raise ValueError(data['error'])
        feats = data.get('features', [])
        for f in feats:
            a = f['attributes']
            rows.append([a['date'], int(a['n_total']), int(a['n_tanker'])])
        if len(feats) < PAGE and not data.get('exceededTransferLimit'):
            break
        offset += len(feats)
    for row in rows:
        datetime.date.fromisoformat(row[0])
        assert row[1] >= 0 and 0 <= row[2] <= row[1], row
    dates = [r[0] for r in rows]
    assert dates == sorted(dates) and len(set(dates)) == len(dates), 'dates must be unique and ascending'
    assert rows, 'no rows returned'
    return rows


def main():
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    out = {
        'name': 'Daily transits through the Strait of Hormuz',
        'source': 'IMF PortWatch (AIS-based estimates)',
        'url': PAGE_URL,
        'fields': ['date', 'total', 'tanker'],
    }
    try:
        out['rows'] = fetch_rows()
        out['retrieved_at'] = now
        out['error'] = None
    except Exception as e:  # keep the last good data; record the failure
        out['rows'] = old.get('rows', [])
        out['retrieved_at'] = old.get('retrieved_at')
        out['error'] = f'{now}: {e}'
    OUT.write_text(json.dumps(out, separators=(',', ':')) + '\n')
    print(f"{len(out['rows'])} rows; last {out['rows'][-1][0] if out['rows'] else 'none'}; error {out['error']}")


if __name__ == '__main__':
    main()
