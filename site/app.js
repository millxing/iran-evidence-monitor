const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sign = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const MAG = ['', 'Slight', 'Limited', 'Moderate', 'Strong', 'Very strong'];
const label = (n) => (n === 0 ? 'Inconclusive' : `${MAG[Math.abs(n)]} ${n > 0 ? 'support' : 'challenge'}`);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const BASELINE_DATE = '2026-11-12';
// Shared caveat that the initial records repeat in every rationale. Shown once in the History note instead.
const SHARED_CAVEAT = /\s*Retrospective, provisional analyst judgment using publications dated before the cutoff; no archived as-of snapshot or human approval\.\s*$/;
const phone = window.matchMedia('(max-width: 640px)');

let D;
let C;
let T = null;

const levels = (c) => D.assessments.filter((a) => a.claim === c.id);
const current = (c) => levels(c).at(-1);
const baseline = (c) => levels(c).find((a) => a.baseline);
const evidenceFor = (id) => D.evidence.filter((e) => e.claims.includes(id));
const rationale = (a) => String(a.rationale || '').replace(SHARED_CAVEAT, '');
const reviewerName = (r) => (/provisional initialization/i.test(r) ? 'AI draft (Codex), not reviewed' : r);
const anyRevision = () => D.assessments.some((a) => !a.baseline);
const isAiDraft = (a) => /provisional initialization/i.test(a.reviewer || '');
// A record can carry a different direction for each claim; fall back to the record-level direction.
const dirFor = (e, claim) => (e.directions && e.directions[claim]) || e.direction;
const shortUnc = (u) => String(u || '').split(';')[0].trim();
const ext = '<span class="ext" aria-hidden="true"> ↗</span><span class="visually-hidden"> (opens in a new tab)</span>';

/* On phones, CSS turns table rows into grids or blocks; explicit roles keep the table semantics. */
function tableRoles(root) {
  root.querySelectorAll('table').forEach((t) => {
    t.setAttribute('role', 'table');
    t.querySelectorAll('thead, tbody').forEach((g) => g.setAttribute('role', 'rowgroup'));
    t.querySelectorAll('tr').forEach((r) => r.setAttribute('role', 'row'));
    t.querySelectorAll('thead th').forEach((c) => c.setAttribute('role', 'columnheader'));
    t.querySelectorAll('tbody th').forEach((c) => c.setAttribute('role', 'rowheader'));
    t.querySelectorAll('td').forEach((c) => c.setAttribute('role', 'cell'));
  });
}

function directionClass(dir) {
  if (/support/i.test(dir)) return 'dir-support';
  if (/challenge/i.test(dir)) return 'dir-challenge';
  return 'dir-other';
}

function statusTag(text) {
  const t = String(text || '');
  let cls = 'tag-warn';
  if (/fail|error/i.test(t)) cls = 'tag-bad';
  else if (/^retrieved/i.test(t)) cls = '';
  else if (/^(approved|reviewed)/i.test(t)) cls = 'tag-ok';
  return `<span class="tag ${cls}">${esc(t)}</span>`;
}

function chartWidth(el, fallback) {
  return Math.max(300, Math.round(el.clientWidth || fallback));
}

/* ---------- Claims ---------- */

/* Diverging bar, −5 to +5. Filled from 0 to the current level. A ring marks the baseline only when it differs. */
function bar(level, base) {
  const W = 250, H = 22, pad = 8, mid = W / 2, step = (W / 2 - pad) / 5, y = H / 2;
  const x = (v) => mid + v * step;
  const ticks = [-4, -3, -2, -1, 1, 2, 3, 4].map((v) => `<line class="tick" x1="${x(v)}" x2="${x(v)}" y1="${y - 6}" y2="${y + 6}"/>`).join('');
  const fill = level === 0
    ? `<circle class="dot-zero" cx="${mid}" cy="${y}" r="5.5"/>`
    : `<rect class="grow ${level > 0 ? 'fill-pos from-left' : 'fill-neg from-right'}" x="${Math.min(mid, x(level))}" y="${y - 6}" width="${Math.abs(x(level) - mid)}" height="12"/>`;
  // Baseline: a diamond, so it cannot be confused with the round zero marker.
  const ring = base !== level ? `<rect class="base" x="${x(base) - 5}" y="${y - 5}" width="10" height="10" transform="rotate(45 ${x(base)} ${y})"/>` : '';
  return `<svg class="bar" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
    <rect class="track" x="${pad}" y="${y - 6}" width="${W - 2 * pad}" height="12"/>${ticks}
    <line class="mid" x1="${mid}" x2="${mid}" y1="${y - 10}" y2="${y + 10}"/>${fill}${ring}
  </svg><div class="bar-axis" aria-hidden="true"><span>−5</span><span>0</span><span>+5</span></div>`;
}

function claimSummary() {
  const cur = D.claims.map((c) => current(c).level);
  const pos = cur.filter((v) => v > 0).length, neg = cur.filter((v) => v < 0).length, zero = cur.length - pos - neg;
  const revisions = D.assessments.filter((a) => !a.baseline).length;
  const shown = $('#claimFilter') ? $('#claimTable').querySelectorAll('tbody tr').length : D.claims.length;
  $('#claimSummary').textContent = (shown < D.claims.length ? `Showing ${shown} of ${D.claims.length} claims. ` : '') +
    `${pos} support, ${neg} challenge, ${zero} inconclusive; no combined score. ` +
    (revisions ? `${plural(revisions, 'revision')} since baseline.` : 'Baseline only: no level has been revised yet.') +
    (new Set(D.claims.map((c) => shortUnc(current(c).uncertainty))).size === 1 ? ` Uncertainty: ${shortUnc(current(D.claims[0]).uncertainty).toLowerCase()} for every claim.` : '');
  const ringShown = D.claims.some((c) => current(c).level !== baseline(c).level);
  $('#claimKey').innerHTML = ringShown ? 'Bar: current level. <span class="key-diamond" aria-hidden="true"></span>Baseline level, where it differs.' : '';
}

function cards() {
  const filter = $('#claimFilter').value;
  const revised = anyRevision();
  const showUnc = new Set(D.claims.map((c) => shortUnc(current(c).uncertainty))).size > 1;
  const rows = D.claims
    .filter((c) => filter === 'all' || (filter === 'evidence') === evidenceFor(c.id).length > 0)
    .map((c) => {
      const a = current(c), b = baseline(c), n = evidenceFor(c.id).length, d = a.level - b.level;
      const cls = a.level > 0 ? 'pos' : a.level < 0 ? 'neg' : 'zero';
      const records = n ? `<button type="button" class="link-button" data-evclaim="${c.id}" aria-label="Show ${plural(n, 'evidence record')} for ${c.id}">${plural(n, 'record')}</button>` : 'None';
      return `<tr>
        <td class="claim-id">${c.id}</td>
        <th scope="row" class="claim-main"><span class="claim-title">${esc(c.title)}</span><span class="claim-statement">${esc(c.plain || c.statement)}</span></th>
        <td class="bar-cell">${bar(a.level, b.level)}</td>
        <td class="level-cell"><span class="level-num ${cls}">${sign(a.level)}</span><span class="level-label">${label(a.level)}</span></td>
        ${showUnc ? `<td class="unc">${esc(shortUnc(a.uncertainty))}</td>` : ''}
        ${revised ? `<td class="base-cell num">${sign(b.level)}</td><td class="delta num">${d === 0 ? '0' : sign(d)}</td>` : ''}
        <td class="ev-count">${records}</td>
        <td class="meta-cell">${showUnc ? `${esc(shortUnc(a.uncertainty))} uncertainty · ` : ''}${revised ? `Baseline ${sign(b.level)} · change ${d === 0 ? '0' : sign(d)} · ` : ''}${n ? `<button type="button" class="link-button" data-evclaim="${c.id}">${plural(n, 'evidence record')}</button>` : 'No evidence records'}</td>
        <td class="open"><button type="button" data-claim="${c.id}" aria-label="Details for ${c.id}, ${esc(c.title)}">Details</button></td>
      </tr>`;
    }).join('');
  $('#claimTable').innerHTML = rows
    ? `<div class="table-scroll"><table class="claims">
        <caption class="visually-hidden">Evidence level for each claim</caption>
        <thead><tr>
          <th scope="col">ID</th><th scope="col">Claim</th>
          <th scope="col"><span class="axis-head" aria-hidden="true"><span>−5</span><span>0</span><span>+5</span></span><span class="visually-hidden">Scale</span></th>
          <th scope="col">Level</th>
          ${showUnc ? '<th scope="col" class="unc">Uncertainty</th>' : ''}
          ${revised ? '<th scope="col" class="num">Baseline</th><th scope="col" class="num">Change</th>' : ''}
          <th scope="col">Evidence</th>
          <th scope="col" class="meta-cell">Summary</th>
          <th scope="col"><span class="visually-hidden">Details</span></th>
        </tr></thead>
        <tbody>${rows}</tbody></table></div>`
    : '<p class="empty">No claims match this filter.</p>';
  tableRoles($('#claimTable'));
  claimSummary();
  revealOnce($('#claimTable'));
}

/* Add class "in" the first time an element scrolls into view (drives the bar grow-in). */
function revealOnce(el) {
  if (!('IntersectionObserver' in window)) { el.classList.add('in'); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) {
      requestAnimationFrame(() => el.classList.add('in'));
      io.disconnect();
    }
  }, { threshold: 0.2 });
  io.observe(el);
}

function kv(obj) {
  return `<dl class="kv">${Object.entries(obj).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
}

/* ---------- Claim dialog (URL #claim-H1; Back closes it) ---------- */

function detail(id, { push = true } = {}) {
  const c = D.claims.find((x) => x.id === id);
  if (!c) return;
  const a = current(c), b = baseline(c), ev = evidenceFor(id);
  const i = D.claims.indexOf(c), prev = D.claims[(i + D.claims.length - 1) % D.claims.length], next = D.claims[(i + 1) % D.claims.length];
  $('#detailMeta').innerHTML = `<button type="button" class="nav-btn" data-claim-nav="${prev.id}" aria-label="Previous claim, ${prev.id}">← ${prev.id}</button>
    <span>${c.id} · test definition v${c.version} (draft)</span>
    <button type="button" class="nav-btn" data-claim-nav="${next.id}" aria-label="Next claim, ${next.id}">${next.id} →</button>`;
  $('#detailContent').innerHTML = `
    <h2 id="detailTitle">${esc(c.title)}</h2>
    <p class="statement">${esc(c.plain || c.statement)}</p>
    <div class="detail-grid">
      <div class="in"><span class="k">Current level</span><span class="v">${sign(a.level)} · ${label(a.level)}</span>${bar(a.level, b.level)}</div>
      <div><span class="k">Baseline, ${fmtDate(b.date)}</span><span class="v">${sign(b.level)}</span></div>
      <div><span class="k">Uncertainty</span><span class="v">${esc(a.uncertainty)}</span></div>
      <div><span class="k">Review</span><span class="v">${a.approved ? 'Approved' : 'Not reviewed'}</span></div>
    </div>
    <h3>Rationale</h3><p>${esc(rationale(a))}</p>
    <h3>Evidence (${ev.length})</h3>
    ${ev.length ? `<ul>${ev.map((e) => `<li><a href="#ev-${e.id}" data-ev="${e.id}">${e.id}</a> ${esc(e.title)} · <span class="${directionClass(dirFor(e, id))}">${esc(dirFor(e, id))}</span></li>`).join('')}</ul>` : '<p class="empty">No evidence records yet.</p>'}
    <h3>Test</h3>
    ${kv({
      ...(c.plain ? { 'Formal statement': c.statement } : {}),
      Scope: c.geography,
      Period: `${fmtDate(c.baseline)} to ${fmtDate(c.horizon)}`,
      'Minimum effect': c.effect,
      'Would challenge': c.falsifier,
      'Would support': c.support,
      'Other explanations': c.alternative,
      ...(isAiDraft(a) ? {} : { 'Assessed by': a.reviewer }),
      Attribution: c.attribution,
    })}`;
  if (push && location.hash !== `#claim-${id}`) {
    if (location.hash.startsWith('#claim-')) history.replaceState({ claim: id }, '', `#claim-${id}`);
    else history.pushState({ claim: id }, '', `#claim-${id}`);
  }
  $('#detail').scrollTop = 0;
  if (!$('#detail').open) $('#detail').showModal();
}

function closeDetail() {
  if (!$('#detail').open) return;
  $('#detail').close();
}

/* ---------- Ship transits (IMF PortWatch; display only) ---------- */

const DAY = 86400000;
const toTime = (iso) => Date.parse(`${iso}T00:00:00Z`);
const avg7 = (vals) => vals.map((_, i) => (i < 6 ? null : vals.slice(i - 6, i + 1).reduce((a, b) => a + b, 0) / 7));
let transitState = null;

function prepTransits(t) {
  const rows = t.rows.map(([date, total, tanker]) => ({ date, t: toTime(date), total, tanker }));
  const a = avg7(rows.map((r) => r.total)), k = avg7(rows.map((r) => r.tanker));
  rows.forEach((r, i) => { r.avg = a[i]; r.tavg = k[i]; });
  const y25 = rows.filter((r) => r.date.startsWith('2025'));
  return { ...t, rows, ref2025: y25.length ? y25.reduce((s, r) => s + r.total, 0) / y25.length : null };
}

function transitText(r) {
  return `${fmtDate(r.date)}: ${plural(r.total, 'ship')}, ${plural(r.tanker, 'tanker')}` + (r.avg != null ? `; 7-day averages: all ships ${r.avg.toFixed(1)}, tankers ${r.tavg.toFixed(1)}` : '');
}

function transitReadout(r) {
  $('#transitReadout').innerHTML = `${fmtDate(r.date)}: <b>${r.total}</b> ships, <span class="tk">${plural(r.tanker, 'tanker')}</span>` +
    (r.avg != null ? ` · 7-day avg: all ${r.avg.toFixed(1)}, tankers ${r.tavg.toFixed(1)}` : '') +
    (T.ref2025 ? ` · 2025 average ${T.ref2025.toFixed(1)}` : '');
}

function setHover(i) {
  const s = transitState;
  if (!s) return;
  s.i = Math.max(0, Math.min(s.ps.length - 1, i));
  const r = s.ps[s.i];
  const line = $('#tHoverLine'), dot = $('#tHoverDot');
  line.setAttribute('x1', s.x(r.t)); line.setAttribute('x2', s.x(r.t)); line.setAttribute('visibility', 'visible');
  dot.setAttribute('cx', s.x(r.t)); dot.setAttribute('cy', s.y(r.total)); dot.setAttribute('visibility', 'visible');
  transitReadout(r);
}

function clearHover() {
  $('#tHoverLine')?.setAttribute('visibility', 'hidden');
  $('#tHoverDot')?.setAttribute('visibility', 'hidden');
  if (T) transitReadout(T.rows.at(-1));
}

function transitChart() {
  const host = $('#transitChart');
  if (!T || !T.rows.length) {
    host.innerHTML = '<p class="empty">Ship transit data is not available.</p>';
    return;
  }
  const win = $('#transitWindow').value;
  const lastT = T.rows.at(-1).t;
  const cutoff = toTime(BASELINE_DATE);
  const endT = Math.max(lastT, cutoff); // The axis runs to the cutoff, so a data gap stays visible.
  const start = win === '90' ? lastT - 89 * DAY : win === '2025' ? toTime('2025-01-01') : T.rows[0].t;
  const ps = T.rows.filter((r) => r.t >= start);
  const small = phone.matches;
  const W = chartWidth(host, 760), H = small ? 280 : 320;
  const L = 40, R = small ? 12 : 180, Tp = 26, B = 30;
  const max = Math.max(20, Math.ceil(Math.max(...ps.map((r) => r.total)) / 20) * 20);
  const x = (t) => L + (W - L - R) * (t - start) / Math.max(DAY, endT - start);
  const y = (v) => Tp + (H - Tp - B) * (1 - v / max);
  const path = (key) => {
    let d = '', pen = false;
    for (const r of ps) {
      if (r[key] == null) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${x(r.t).toFixed(1)},${y(r[key]).toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const step = max <= 60 ? 20 : max <= 160 ? 40 : 50;
  const grid = [];
  for (let v = 0; v <= max; v += step) grid.push(`<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-text" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`);
  // Year ticks for long spans, month ticks otherwise; spacing depends on the rendered width.
  const span = (endT - start) / DAY;
  const pxPerMonth = (W - L - R) / (span / 30.4);
  const ticks = [];
  const d0 = new Date(start);
  if (span > 800) {
    for (let yr = d0.getUTCFullYear() + 1; ; yr++) { const t = Date.UTC(yr, 0, 1); if (t > endT) break; ticks.push([t, String(yr)]); }
  } else {
    const every = [1, 2, 3, 6].find((n) => n * pxPerMonth >= 44) || 6;
    for (let m = d0.getUTCMonth() + (d0.getUTCDate() > 1 ? 1 : 0), yr = d0.getUTCFullYear(); ; m++) {
      const t = Date.UTC(yr, m, 1);
      if (t > endT) break;
      const dm = new Date(t);
      if (dm.getUTCMonth() % every === 0) ticks.push([t, dm.getUTCMonth() === 0 ? String(dm.getUTCFullYear()) : MONTHS[dm.getUTCMonth()]]);
    }
  }
  const ref = T.ref2025;
  const last = ps.at(-1);
  // Direct labels at the right end of each line; nudge apart when they would overlap.
  const labels = [
    { cls: 'lab-avg', text: `All ships, 7-day avg ${(last.avg ?? last.total).toFixed(1)}`, v: last.avg ?? last.total },
    { cls: 'lab-tank', text: `Tankers, 7-day avg ${(last.tavg ?? last.tanker).toFixed(1)}`, v: last.tavg ?? last.tanker },
  ];
  if (ref) labels.push({ cls: 'lab-ref', text: `2025 avg ${ref.toFixed(1)}`, v: ref });
  labels.forEach((l) => { l.py = y(l.v) + 4; });
  labels.sort((a, b) => a.py - b.py);
  for (let i = 1; i < labels.length; i++) labels[i].py = Math.max(labels[i].py, labels[i - 1].py + 16);
  const overflow = labels.at(-1).py - (H - B + 4);
  if (overflow > 0) labels.forEach((l) => { l.py -= overflow; });
  for (let i = labels.length - 2; i >= 0; i--) labels[i].py = Math.min(labels[i].py, labels[i + 1].py - 16);
  const labX = x(endT) + 8;
  const shortText = (t) => (small ? t.replace(', 7-day avg', '').replace('All ships', 'All ships') : t);

  // Neutral marker: first day the 7-day average fell below 10 after being at or above it. No cause is implied.
  const drop = T.rows.filter((r) => r.t >= start).find((r, i) => i > 0 && r.avg != null && ps[i - 1].avg != null && r.avg < 10 && ps[i - 1].avg >= 10);
  const dropLabel = (r) => {
    const text = `7-day avg first below 10: ${fmtDate(r.date)}`;
    const fits = x(r.t) + 6 + text.length * 7 < W - 4; // approx. 7 px per character at 13 px
    return `<text class="lab lab-ref" x="${x(r.t) + (fits ? 6 : -6)}" y="${Tp + 10}" text-anchor="${fits ? 'start' : 'end'}">${text}</text>`;
  };
  const firstDraw = !host.dataset.drawn;
  host.dataset.drawn = '1';
  const draw = firstDraw ? ' pathLength="1"' : '';
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" tabindex="0" role="group" aria-roledescription="chart" aria-describedby="transitHint"
      aria-label="Ships per day through the Strait of Hormuz, ${fmtDate(ps[0].date)} to ${fmtDate(last.date)}. Latest 7-day average ${last.avg?.toFixed(1)} ships${ref ? `; 2025 average ${ref.toFixed(1)}` : ''}. Use left and right arrow keys to read daily values.">
    ${grid.join('')}
    ${ticks.map(([t, lab]) => `<text class="axis-text" x="${x(t)}" y="${H - 8}" text-anchor="middle">${lab}</text>`).join('')}
    ${ref ? `<line class="ref" x1="${L}" x2="${x(endT)}" y1="${y(ref)}" y2="${y(ref)}"/>` : ''}
    ${cutoff >= start ? `<line class="cutoff" x1="${x(cutoff)}" x2="${x(cutoff)}" y1="${Tp - 6}" y2="${H - B}"/><text class="lab lab-cut" x="${x(cutoff)}" y="${Tp - 10}" text-anchor="end">Data to ${fmtDate(T.rows.at(-1).date).replace(/ \d{4}$/, '')} · baseline 12 Nov</text>` : ''}
    ${drop ? `<line class="event" x1="${x(drop.t)}" x2="${x(drop.t)}" y1="${Tp}" y2="${H - B}"/>${dropLabel(drop)}` : ''}
    ${cutoff > lastT && cutoff >= start ? `<rect class="gap" x="${x(lastT)}" y="${Tp}" width="${x(cutoff) - x(lastT)}" height="${H - Tp - B}"/>` : ''}
    <path class="daily" d="${path('total')}"/>
    <path class="avg${firstDraw ? ' draw' : ''}"${draw} d="${path('avg')}"/>
    <path class="tank${firstDraw ? ' draw' : ''}"${draw} d="${path('tavg')}"/>
    ${small ? '' : labels.map((l) => `<text class="lab ${l.cls}" x="${labX}" y="${l.py}">${shortText(l.text)}</text>`).join('')}
    ${last.avg != null ? `<circle class="pt" cx="${x(last.t)}" cy="${y(last.avg)}" r="3.5"/>` : ''}
    <line class="hover-line" id="tHoverLine" y1="${Tp}" y2="${H - B}" visibility="hidden"/>
    <circle class="hover-dot" id="tHoverDot" r="4" visibility="hidden"/>
    <rect id="tHit" x="${L}" y="${Tp}" width="${x(endT) - L}" height="${H - Tp - B}" fill="transparent"/>
  </svg>`;
  transitState = { ps, x, y, i: ps.length - 1 };
  const svg = host.querySelector('svg'), hit = $('#tHit');
  const fromPointer = (ev) => {
    const box = svg.getBoundingClientRect();
    const px = (ev.clientX - box.left) * (W / box.width);
    const t = start + (px - L) / (W - L - R) * Math.max(DAY, endT - start);
    let best = 0;
    ps.forEach((q, i) => { if (Math.abs(q.t - t) < Math.abs(ps[best].t - t)) best = i; });
    setHover(best);
  };
  hit.addEventListener('pointermove', fromPointer);
  hit.addEventListener('pointerdown', fromPointer);
  hit.addEventListener('pointerleave', clearHover);
  svg.addEventListener('keydown', (ev) => {
    const s = transitState, jump = ev.shiftKey ? 30 : 1;
    const map = { ArrowLeft: s.i - jump, ArrowRight: s.i + jump, Home: 0, End: s.ps.length - 1, PageUp: s.i - 30, PageDown: s.i + 30 };
    if (!(ev.key in map)) return;
    ev.preventDefault();
    setHover(map[ev.key]);
    $('#transitLive').textContent = transitText(s.ps[s.i]);
  });
  svg.addEventListener('blur', clearHover);
  clearHover();

  $('#transitSource').innerHTML = `Source: <a href="${esc(T.url)}" target="_blank" rel="noopener">IMF PortWatch${ext}</a>, daily estimates from AIS ship signals, which miss ships with transponders switched off. Data to ${fmtDate(T.rows.at(-1).date)}; retrieved ${fmtDate(T.retrieved_at)}; figures can be revised.` + (T.error ? ` <span class="tag tag-bad">Last update failed</span>` : '');

  // Monthly averages for the selected period: a compact, complete text alternative to the chart.
  const months = new Map();
  for (const r of ps) {
    const k = r.date.slice(0, 7);
    const m = months.get(k) || { n: 0, total: 0, tanker: 0 };
    m.n++; m.total += r.total; m.tanker += r.tanker;
    months.set(k, m);
  }
  $('#transitRaw').innerHTML = `<div class="table-scroll"><table><thead><tr><th scope="col">Month</th><th scope="col" class="num">Ships per day</th><th scope="col" class="num">Tankers per day</th><th scope="col" class="num">Days</th></tr></thead><tbody>${[...months].reverse().map(([k, m]) => `<tr><td>${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}</td><td class="num">${(m.total / m.n).toFixed(1)}</td><td class="num">${(m.tanker / m.n).toFixed(1)}</td><td class="num">${m.n}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- Oil flow (EIA, quarterly) ---------- */

function chart() {
  const host = $('#chart');
  const win = $('#window').value;
  const ps = D.series.points.filter((p) => win === 'all' || p.date.startsWith(win));
  const small = phone.matches;
  const W = chartWidth(host, 760), H = small ? 230 : 220, L = 40, R = small ? 16 : 150, T0 = 26, B = 30;
  const max = 25;
  const x = (i) => L + 24 + i * (W - L - R - 48) / Math.max(1, ps.length - 1);
  const y = (v) => T0 + (H - T0 - B) * (1 - v / max);
  const grid = [0, 10, 20].map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-text" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const ref = D.series.baseline;
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Oil through the Strait of Hormuz, million barrels per day, by quarter: ${ps.map((p) => `${p.label} ${p.value}`).join(', ')}. Q1 2025 level ${ref}.">
    ${grid}
    <line class="ref" x1="${L}" x2="${W - R}" y1="${y(ref)}" y2="${y(ref)}"/>
    ${small ? `<text class="lab lab-ref" x="${W - R}" y="${y(ref) + 18}" text-anchor="end">Q1 2025: ${ref}</text>` : `<text class="lab lab-ref" x="${W - R + 8}" y="${y(ref) + 4}">Q1 2025: ${ref}</text>`}
    <polyline class="line" points="${ps.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}"/>
    ${ps.map((p, i) => {
      // When the line descends into a point, put its label to the left, below the incoming segment.
      const below = i > 0 && ps[i - 1].value - p.value > 3;
      return `<circle class="pt" cx="${x(i)}" cy="${y(p.value)}" r="${small ? 4 : 5}"/>` +
        `<text class="val" x="${x(i) + (below ? -12 : 0)}" y="${below ? y(p.value) + 16 : y(p.value) - 12}" text-anchor="${below ? 'end' : 'middle'}">${p.value.toFixed(1)}</text>` +
        `<text class="axis-text" x="${x(i)}" y="${H - 8}" text-anchor="middle">${p.label}</text>`;
    }).join('')}
  </svg>`;
  $('#raw').innerHTML = `<table><thead><tr><th scope="col">Quarter ending</th><th scope="col" class="num">Million b/d</th></tr></thead><tbody>${ps.map((p) => `<tr><td>${fmtDate(p.date)}</td><td class="num">${p.value.toFixed(1)}</td></tr>`).join('')}</tbody></table>`;
}

/* ---------- Evidence ---------- */

const searchText = (e) => [e.id, e.claims.join(' '), e.title, e.publisher, e.document, e.direction, ...Object.values(e.directions || {}), e.type, e.rationale, e.excerpt].join(' ').toLowerCase();

function filtered() {
  const q = $('#search').value.trim().toLowerCase();
  const claim = $('#claimSelect').value;
  const order = $('#sort').value;
  return D.evidence
    .filter((e) => (!q || searchText(e).includes(q)) && (!claim || e.claims.includes(claim)))
    .sort((a, b) => (order === 'claim' ? a.claims[0].localeCompare(b.claims[0]) : (order === 'old' ? 1 : -1) * a.observed.localeCompare(b.observed)));
}

function ledger() {
  const list = filtered(), total = D.evidence.length;
  $('#evidenceStatus').textContent = list.length === total ? `${plural(total, 'record')}.` : `Showing ${list.length} of ${total} records.`;
  $('#clearEvidence').hidden = !$('#search').value.trim() && !$('#claimSelect').value;
  $('#export').textContent = list.length === total ? 'Download CSV' : `Download CSV (${list.length})`;
  $('#evidenceList').innerHTML = list.map((e) => `<article class="ev" id="ev-${e.id}" tabindex="-1">
      <div>
        <div class="ev-top"><span class="meta">${e.id}</span>${/pending/i.test(e.status) ? '' : statusTag(e.status)}${e.retrieval_error ? ' <span class="tag tag-warn" title="Checked by hand; no automatic copy or file hash">Not machine-verified</span>' : ''}</div>
        <h3 class="ev-title"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}${ext}</a></h3>
        <p>${esc(e.rationale)}</p>
        <p class="source">${esc(e.publisher)} · ${esc(e.document)} · published ${fmtDate(e.published)}</p>
      </div>
      <dl class="ev-aside">
        <div><dt>Claim</dt><dd class="ev-claims">${e.claims.map((c) => `<button type="button" class="link-button" data-claim="${c}" aria-label="Open claim ${c}">${c}</button>`).join(', ')}</dd></div>
        <div><dt>Direction</dt><dd>${new Set(e.claims.map((c) => dirFor(e, c))).size > 1
          ? e.claims.map((c) => `<span class="dirs">${c}: <span class="${directionClass(dirFor(e, c))}">${esc(dirFor(e, c))}</span></span>`).join(' ')
          : `<span class="${directionClass(e.direction)}">${esc(dirFor(e, e.claims[0]))}</span>`}</dd></div>
        <div><dt>Observed</dt><dd>${fmtDate(e.observed)}</dd></div>
        <div><dt>Type</dt><dd>${esc(e.type)}</dd></div>
      </dl>
      <details><summary>Provenance</summary>${kv({
        Excerpt: e.excerpt,
        'Observed through': fmtDate(e.observed),
        Collected: fmtDate(e.collected),
        Reliability: e.reliability,
        'What was measured': e.effect,
        'Same-source group': e.cluster,
        'Other causes': e.confounders,
        'Known gaps': e.missingness,
        'Review state': e.status,
        License: e.license,
        Retrieval: e.retrieval_error ? `Automated retrieval failed on ${fmtDate(e.collected)} (${e.retrieval_error}). Content checked by web research only; no file hash.` : `SHA-256 ${e.hash || 'not captured'}`,
        'Correction of': e.correction_of || 'None',
      })}</details>
    </article>`).join('') || '<p class="empty">No records match. <button type="button" class="link-button" id="clearFilters">Clear filters</button></p>';
}

function showEvidence(id, { instant = false } = {}) {
  // Keep the current filters if the record is visible; otherwise clear them.
  if (!filtered().some((e) => e.id === id)) {
    $('#search').value = '';
    $('#claimSelect').value = '';
    ledger();
  }
  closeDetail();
  const el = document.getElementById(`ev-${id}`);
  if (!el) return;
  el.scrollIntoView({ block: 'start', behavior: instant ? 'instant' : 'auto' });
  el.focus({ preventScroll: true });
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 2000);
}

function showClaimEvidence(id) {
  $('#search').value = '';
  $('#claimSelect').value = id;
  ledger();
  $('#evidence').scrollIntoView({ block: 'start' });
  $('#claimSelect').focus({ preventScroll: true });
}

/* ---------- Sensitivity, history, coverage ---------- */

function scenario() {
  const proxy = $('#excludeProxy').checked, recent = $('#recent').checked;
  const excluded = new Map();
  for (const e of D.evidence) {
    const reasons = [];
    if (proxy && e.type.includes('Proxy')) reasons.push('proxy');
    if (recent && (new Date(BASELINE_DATE) - new Date(e.observed)) / DAY > 180) reasons.push('older than 180 days');
    if (reasons.length) excluded.set(e.id, reasons.join(', '));
  }
  const kept = D.evidence.filter((e) => !excluded.has(e.id));
  const active = proxy || recent;
  const rows = D.claims.map((c) => {
    const all = new Set(evidenceFor(c.id).map((e) => e.cluster)).size;
    const left = new Set(kept.filter((e) => e.claims.includes(c.id)).map((e) => e.cluster)).size;
    return `<tr class="${left < all ? 'changed' : ''}"><td><span class="meta">${c.id}</span> ${esc(c.title)}</td><td class="num">${all}</td>${active ? `<td class="num">${left < all ? `<strong>${left}</strong>` : left}</td>` : ''}</tr>`;
  }).join('');
  $('#scenarioResult').innerHTML = `<table><thead><tr><th scope="col">Claim</th><th scope="col" class="num">Independent sources</th>${active ? '<th scope="col" class="num">After filters</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>`;
  $('#scenarioNote').textContent = excluded.size
    ? `Excluded: ${[...excluded].map(([id, why]) => `${id} (${why})`).join('; ')}.`
    : (proxy || recent ? 'No records excluded.' : '');
}

function historyTable() {
  const base = D.assessments.filter((a) => a.baseline);
  const recorded = base.map((a) => a.recorded_at).filter(Boolean).sort().at(-1);
  $('#historyNote').textContent = anyRevision() ? '' : `${plural(base.length, 'baseline level')} set as of ${fmtDate(BASELINE_DATE)}${recorded ? `, recorded ${fmtDate(recorded)}` : ''}. No revisions yet.`;
  const evLinks = (ids) => ids.length ? ids.map((id) => `<a href="#ev-${id}" data-ev="${id}">${id}</a>`).join(', ') : 'none';
  const rows = [...D.assessments].reverse().map((a) => `<tr>
      <td class="h-date">${fmtDate(a.date)}</td>
      <td class="lead">${a.claim} · ${sign(a.level)}</td>
      <td class="h-type">${a.baseline ? 'Baseline' : 'Revision'}${a.approved ? ' <span class="tag tag-ok">Approved</span>' : ''}</td>
      <td><details><summary>Rationale</summary>${esc(rationale(a))}<div class="caption">Evidence: ${evLinks(a.evidence)}${isAiDraft(a) ? '' : ` · ${esc(a.reviewer)}`}</div></details></td>
    </tr>`).join('');
  $('#historyRows').innerHTML = `<table class="stack hist"><thead><tr><th scope="col">Date</th><th scope="col">Claim · level</th><th scope="col">Type</th><th scope="col">Rationale</th></tr></thead><tbody>${rows}</tbody></table>`;
  tableRoles($('#historyRows'));
}

function coverage() {
  $('#gaps').innerHTML = `<table class="stack gaps-table"><thead><tr><th scope="col">Data</th><th scope="col">State</th><th scope="col">Detail</th></tr></thead><tbody>${D.gaps.map((g) => `<tr><td class="lead">${esc(g.name)}</td><td class="g-state">${esc(g.state)}</td><td>${esc(g.detail)}</td></tr>`).join('')}</tbody></table>`;
  const pending = C.candidates.filter((c) => c.status === 'pending').length;
  const failed = C.sources.filter((s) => /fail/i.test(s.status)).length;
  $('#queue').innerHTML = `<p class="sub">${C.checked_at ? `Checked ${fmtDate(C.checked_at)}.` : 'Not yet run.'} ${C.sources.length - failed} of ${C.sources.length} sources retrieved. ${plural(pending, 'page')} awaiting review (changed or retrieved for the first time). A page is not new evidence until a reviewer adds it.</p>
    <table class="stack"><thead><tr><th scope="col">Source</th><th scope="col">Status</th><th scope="col">Last success</th></tr></thead><tbody>
    ${C.sources.map((s) => `<tr><td class="lead"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}${ext}</a></td><td>${statusTag(s.status)}${s.error ? ` <span class="caption">${esc(s.error)}</span>` : ''}</td><td data-label="Last success">${s.last_success ? fmtDate(s.last_success) : 'Never'}</td></tr>`).join('')}
    </tbody></table>`;
  tableRoles($('#gaps'));
  tableRoles($('#queue'));
  $('#collectionStatus').innerHTML = C.checked_at ? `${fmtDate(C.checked_at)}${failed ? `<span class="fail">${failed} failed</span>` : ''}` : 'Not yet run';
}

function csv() {
  const keys = ['id', 'claims', 'title', 'publisher', 'document', 'type', 'direction', 'published', 'observed', 'url', 'cluster', 'status', 'rationale'];
  const safe = (v) => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
  // Direction per claim, e.g. "H3: Uncertainty only; H6: Potential challenge".
  const claimDirs = (e) => e.claims.map((c) => `${c}: ${dirFor(e, c)}`).join('; ');
  const body = filtered().map((e) => [...keys.map((k) => safe(Array.isArray(e[k]) ? e[k].join(';') : e[k])), safe(claimDirs(e))].join(',')).join('\n');
  const blob = new Blob([[...keys, 'claim_directions'].join(',') + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'iran-evidence-ledger.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function trackSections() {
  const links = [...document.querySelectorAll('nav a')];
  const byId = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
  const visible = new Set();
  let current = null;
  const update = () => {
    // At the page end, mark the last section even if an earlier one is still in view.
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    const id = atEnd ? [...byId.keys()].at(-1) : [...byId.keys()].find((k) => visible.has(k));
    if (id === current) return;
    current = id;
    links.forEach((l) => l.removeAttribute('aria-current'));
    if (!id) return;
    const link = byId.get(id);
    link.setAttribute('aria-current', 'location');
    link.parentElement.scrollLeft = Math.max(0, link.offsetLeft - 24);
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) en.isIntersecting ? visible.add(en.target.id) : visible.delete(en.target.id);
    update();
  }, { rootMargin: '-60px 0px -55% 0px' });
  byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }, { passive: true });
}

/* ---------- Start ---------- */

try {
  const r = await fetch('data/monitor.json');
  if (!r.ok) throw Error('Data unavailable');
  D = await r.json();
  const [cr, tr] = await Promise.all([fetch('data/collection.json').catch(() => null), fetch('data/transits.json').catch(() => null)]);
  C = cr && cr.ok ? await cr.json() : { sources: [], candidates: [] };
  T = tr && tr.ok ? prepTransits(await tr.json()) : null;
  $('#claimSelect').insertAdjacentHTML('beforeend', D.claims.map((c) => `<option value="${c.id}">${c.id} ${esc(c.title)}</option>`).join(''));
  $('#lastAssessment').textContent = fmtDate(D.assessments.map((a) => a.recorded_at || a.date).sort().at(-1));
  cards();
  ledger();
  transitChart();
  chart();
  scenario();
  historyTable();
  coverage();
  trackSections();
  document.documentElement.setAttribute('data-ready', '');

  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-claim-nav]');
    if (navBtn) {
      // Keep keyboard focus on the same control after the dialog content is replaced.
      const side = navBtn.textContent.trim().startsWith('←') ? 0 : 1;
      detail(navBtn.dataset.claimNav);
      return $('#detailMeta').querySelectorAll('.nav-btn')[side].focus();
    }
    const claimBtn = e.target.closest('[data-claim]');
    if (claimBtn) return detail(claimBtn.dataset.claim);
    const evBtn = e.target.closest('[data-evclaim]');
    if (evBtn) return showClaimEvidence(evBtn.dataset.evclaim);
    const evLink = e.target.closest('[data-ev]');
    if (evLink) { e.preventDefault(); return showEvidence(evLink.dataset.ev); }
    if (e.target.id === 'clearFilters') { $('#search').value = ''; $('#claimSelect').value = ''; ledger(); $('#search').focus(); }
  });
  $('#close').onclick = closeDetail;
  // Close on a backdrop click only: a click inside the dialog box (including its padding) keeps it open.
  $('#detail').addEventListener('click', (e) => {
    if (e.target !== $('#detail')) return;
    const b = $('#detail').getBoundingClientRect();
    if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) closeDetail();
  });
  $('#detail').addEventListener('close', () => {
    if (location.hash.startsWith('#claim-')) {
      if (history.state && history.state.claim) history.back();
      else history.replaceState(null, '', location.pathname + location.search);
    }
  });
  window.addEventListener('popstate', () => {
    const m = location.hash.match(/^#claim-(H\d+)$/);
    if (m) detail(m[1], { push: false });
    else if ($('#detail').open) $('#detail').close();
  });
  $('#claimFilter').onchange = cards;
  $('#clearEvidence').onclick = () => { $('#search').value = ''; $('#claimSelect').value = ''; ledger(); $('#search').focus(); };
  $('#window').onchange = chart;
  $('#transitWindow').onchange = transitChart;
  $('#search').oninput = ledger;
  $('#claimSelect').onchange = ledger;
  $('#sort').onchange = ledger;
  $('#excludeProxy').onchange = scenario;
  $('#recent').onchange = scenario;
  $('#export').onclick = csv;
  phone.addEventListener('change', historyTable);
  let lastW = 0;
  new ResizeObserver(() => {
    const w = $('#chart').clientWidth;
    if (Math.abs(w - lastW) < 2) return;
    lastW = w;
    transitChart();
    chart();
  }).observe($('#chart'));

  // Content is rendered after load, so re-apply the URL fragment now that targets exist.
  const hash = decodeURIComponent(location.hash.slice(1));
  const m = hash.match(/^claim-(H\d+)$/);
  if (m) detail(m[1], { push: false });
  else if (hash) {
    // Wait one frame so chart sizes settle, then jump without smooth scrolling.
    requestAnimationFrame(() => {
      if (/^ev-E\d+$/.test(hash)) showEvidence(hash.slice(3), { instant: true });
      else document.getElementById(hash)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
} catch (e) {
  $('#claimTable').innerHTML = '<p class="empty">Data could not be loaded. Reload the page, or open data/monitor.json in the repository.</p>';
  console.error(e);
}
