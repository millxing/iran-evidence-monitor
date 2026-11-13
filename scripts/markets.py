"""Fetch display-only economic context into site/data/markets.json.

Series:
  brent     Daily Europe Brent spot price, US$/barrel (U.S. EIA).
  rial      Daily open-market US dollar rate in Iranian rials, closing value (tgju.org; unofficial market data).
  inflation Annual consumer-price inflation for Iran, % (World Bank, FP.CPI.TOTL.ZG).

These indicators never score claims or change assessments.
Each series is fetched on its own. On failure, the previous rows for that series are kept and the error is recorded.
"""
import datetime
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'site/data/markets.json'
START = '2019-01-01'
UA = {'User-Agent': 'Mozilla/5.0 (compatible; IranEvidenceMonitor/1.0; public research)'}
MON = {m: i + 1 for i, m in enumerate(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}

META = {
    'brent': {
        'name': 'Brent crude oil spot price',
        'unit': 'US dollars per barrel',
        'source': 'U.S. EIA, Europe Brent Spot Price FOB (daily)',
        'url': 'https://www.eia.gov/dnav/pet/hist/RBRTED.htm',
    },
    'rial': {
        'name': 'US dollar in Iranian rials, open market',
        'unit': 'rials per US dollar',
        'source': 'tgju.org daily closing rate (unofficial market data, not the official central-bank rate)',
        'url': 'https://www.tgju.org/profile/price_dollar_rl',
    },
    'inflation': {
        'name': 'Iran consumer-price inflation',
        'unit': 'percent per year',
        'source': 'World Bank, Inflation, consumer prices (annual %), FP.CPI.TOTL.ZG',
        'url': 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=IR',
    },
}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def check_daily(rows, lo, hi):
    assert rows, 'no rows returned'
    dates = [r[0] for r in rows]
    assert dates == sorted(dates) and len(set(dates)) == len(dates), 'dates must be unique and ascending'
    for d, v in rows:
        datetime.date.fromisoformat(d)
        assert lo < v < hi, (d, v)
    return rows


def brent():
    html = get('https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=RBRTE&f=D')
    rows = []
    # Each table row is one week: "YYYY Mon-DD to Mon-DD", then five cells for Monday to Friday.
    for m in re.finditer(r"class='B6'>(?:&nbsp;)*(\d{4}) (\w{3})-\s*(\d+) to[^<]*</td>((?:\s*<td class='B3'>[^<]*</td>){5})", html):
        monday = datetime.date(int(m[1]), MON[m[2]], int(m[3]))
        cells = re.findall(r"<td class='B3'>([^<]*)</td>", m[4])
        for i, c in enumerate(cells):
            c = c.strip()
            if c:
                d = (monday + datetime.timedelta(days=i)).isoformat()
                if d >= START:
                    rows.append([d, round(float(c), 2)])
    return check_daily(rows, 5, 500)


def rial():
    data = json.loads(get('https://api.tgju.org/v1/market/indicator/summary-table-data/price_dollar_rl'))
    rows = []
    # Row: [open, low, high, close, change, change %, Gregorian date, Persian date]
    for r in data['data']:
        d = r[6].replace('/', '-')
        if d >= START:
            rows.append([d, int(r[3].replace(',', ''))])
    rows.sort()
    return check_daily(rows, 10_000, 100_000_000)


def inflation():
    data = json.loads(get('https://api.worldbank.org/v2/country/IRN/indicator/FP.CPI.TOTL.ZG?format=json&per_page=100'))
    rows = sorted([int(r['date']), round(r['value'], 1)] for r in data[1] if r['value'] is not None and int(r['date']) >= 2000)
    assert rows, 'no rows returned'
    for y, v in rows:
        assert -50 < v < 1000, (y, v)
    return rows


def main():
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    out = {'note': 'Display-only context. Not scored; never changes a level.'}
    for key, fetch in (('brent', brent), ('rial', rial), ('inflation', inflation)):
        prev = old.get(key, {})
        s = dict(META[key])
        try:
            s['rows'] = fetch()
            s['retrieved_at'] = now
            s['error'] = None
        except Exception as e:  # keep the last good data; record the failure
            s['rows'] = prev.get('rows', [])
            s['retrieved_at'] = prev.get('retrieved_at')
            s['error'] = f'{now}: {e}'
        out[key] = s
        print(f"{key}: {len(s['rows'])} rows; last {s['rows'][-1][0] if s['rows'] else 'none'}; error {s['error']}")
    OUT.write_text(json.dumps(out, separators=(',', ':')) + '\n')


if __name__ == '__main__':
    main()
