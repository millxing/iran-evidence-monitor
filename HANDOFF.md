# Iran Evidence Monitor — handoff

Updated November 13, 2026, after the design pass.

## Objective and status

The dashboard redesign is complete and deployed. The next agent may continue design polish or move to research and operations work. Do not change research conclusions, levels, scoring rules, or formal claim statements without the user's approval.

- Live site: https://millxing.github.io/iran-evidence-monitor/
- Repository: https://github.com/millxing/iran-evidence-monitor
- Local project: `/Users/robschoen/Dropbox/CC/Iran`
- Branch: `main`
- Last deployed commit: `cf2f5dd` (redesign and ship-transit chart). Earlier: `42e71f8`, `c5e326c`, `19f4459`.
- GitHub Actions run `43506545787` deployed `cf2f5dd` successfully. The live page shows the new header text, and `data/transits.json` returns HTTP 200.

The original brief is `Robert_Pape_Iran_Geopolitical_Analysis_and_Monitoring_Plan.pdf` (pages 6–9). It is local only, ignored by Git, and not published. The site cites it in Method as an unpublished analytical report dated 13 November 2026.

## User preferences

Use direct, simple language (the user prefers ASD-STE100 style). Distinguish verified facts from assumptions. Challenge weak assumptions. Ask before large installations and give a size estimate. Correctness, maintainability, and completeness take priority over token savings. Essential text only: no promotional slogans or "AI-looking" design. Ask before changing research data.

Nov 13: the owner said the project needs "lots of deference" to the agent's judgment; they lack time and domain expertise. Make evidence and research calls yourself and report them briefly. Still ask before changing levels, formal statements or test definitions. Record owner approvals as "Owner sign-off … not expert-reviewed" (see E006–E008 and the audit list). Never relabel levels or tests as human- or expert-reviewed.

## Architecture and files

No framework, build step, backend, or package install. The browser loads JSON with relative URLs, so the page must be served over HTTP (`cd site && python3 -m http.server`). Opened as `file://`, the page shows a message that explains this, not a blank page.

| File | Purpose |
| --- | --- |
| `site/index.html` | Header, sticky section nav, sections, claim dialog, Method text, load-failure fallback script |
| `site/style.css` | Design tokens (light and dark), type scale, tables, charts, responsive rules, motion |
| `site/app.js` | Data loading, claims table, claim dialog, ship and oil charts, evidence ledger, CSV, sensitivity, history, coverage, nav tracking |
| `site/data/monitor.json` | Claims, assessments, evidence, EIA series, audit, gaps |
| `site/data/transits.json` | Daily Hormuz transits from IMF PortWatch (`[date, total, tanker]` rows) |
| `site/data/markets.json` | Display-only context: daily Brent (EIA), daily open-market rial rate (tgju.org), annual Iran inflation (World Bank) |
| `site/data/collection.json` | Source checks, retrieval errors, hashes, review queue |
| `scripts/collect.py` | Checks three source pages; never scores evidence |
| `scripts/transits.py` | Fetches PortWatch transits; keeps last good data and records the error on failure |
| `scripts/markets.py` | Fetches the three economic series; each keeps its last good data and records its own error |
| `scripts/review.py` | Applies explicit test approval or appends an approved assessment |
| `tests/test_monitor.py` | 12 data/review tests, including per-claim directions, the transit series, the market series and the oil breakdown |
| `.github/workflows/pages.yml` | Tests; on schedule/dispatch also runs `collect.py`, `transits.py` and `markets.py`, commits data, publishes |
| `README.md` | Rubric, operations, ship transits, review procedure, limitations |

## Current design

Plain research-tool style. White background (dark mode follows the OS), Charter serif for headings and claim statements, system sans for everything else, monospace only for IDs. Blue = support, orange = challenge. Ship charts use their own palette (dark grey for all ships, dashed teal for tankers) so they are not read as support/challenge.

Page order: header facts (baseline, levels recorded, sources checked) → provisional notice → Claims → Strait of Hormuz → Oil price and Iran's economy → Evidence → Source independence → History → Coverage → Method.

- **Claims table:** one row per claim with a diverging bar from −5 to +5, level and label, evidence count (links to the filtered ledger), and Details. Baseline and Change columns appear only after a revision exists. The baseline marker is a diamond (shown only when different from the current level). The Uncertainty column appears only when values differ. Up to 900 px the table becomes one card per claim.
- **Claim dialog:** URL `#claim-H1`…; Back closes it; ← / → moves between claims and keeps focus; shows the plain statement, levels, rationale, evidence with per-claim direction, test definition, and the formal statement.
- **Ship transits:** daily counts, 7-day averages for all ships and tankers, 2025 average, a shaded gap from the last data day to the 12 Nov cutoff, and a neutral marker "7-day avg first below 10: 7 Mar 2026". Period selector (90 days / since 2025 / since 2019). Pointer and keyboard (arrow keys, Shift+arrow, Home/End) readout, with a live region for screen readers. A monthly-average table is the text alternative. Charts render at the container width, so text stays at its true size.
- **Oil flow:** EIA quarterly series (evidence E001) with Q1 2025 reference. Caption states scope (crude, condensate and products leaving the Gulf; LNG separate) and Vortexa source. Data table shows total, crude, products and LNG.
- **AIS caveat:** the ship-chart source line and the Coverage gap state that EIA calls Hormuz AIS data especially unreliable since the end of February 2026.
- **Oil price and Iran's economy (added Nov 13):** daily Brent and daily open-market rial charts (shared period selector, hover and keyboard readout, 2025 average reference, monthly-average table) and an annual inflation bar chart from 2015. Context for H2, H3, H6 only; not evidence records, never scored.
- **Evidence:** search over display fields and per-claim directions, claim filter, sort, "Clear filters", CSV with a `claim_directions` column. "Not machine-verified" tag where automatic retrieval failed.
- **History / Coverage:** compact on phones (one line per history entry; gap name and state on one line).
- **Motion:** bars grow in once, average lines draw once, dialog fades in, evidence highlight fades. All motion is off under `prefers-reduced-motion`. No count-up numbers, parallax, or scroll effects (deliberate).

## Data changes made in the design pass (user-approved)

All recorded in the `audit` list in `monitor.json`, actor "Claude (at owner request)". No level and no formal statement changed.

- Optional `directions` map per evidence record. E003: H3 "Uncertainty only", H6 "Potential challenge". The record-level `direction` stays for compatibility.
- Optional `plain` summary on claims: H1 and H5. The UI shows `plain` where present; the dialog shows the formal `statement` too.
- Coverage-gap descriptions reworded in plain language; AIS gap set to "Display only".
- Nov 13: EIA crude/products/LNG breakdown added to `series.points` (from E001 Table 4), `scope` and `note` fields on `series`, AIS note on the AIS gap, new gap "Iran economy and oil price" (Display only).

## Research rules to preserve

- Six separate hypotheses; no score for Pape and no aggregate score.
- Values are ordinal analyst judgments, not probabilities or percentage points. Zero means inconclusive.
- Magnitudes 1–5: slight, limited, moderate, strong, very strong (criteria in Method and README).
- Change = current level − 12 Nov 2026 baseline. Baseline cutoff 12 Nov 2026, 23:59:59 UTC.
- The baseline is retrospective, provisional, AI-drafted, and not human-reviewed. Do not relabel it as reviewed.
- Missing evidence never counts against a claim. Shipping disruption does not establish concessions or greater net power.
- Same-source groups (`cluster`) are not independent confirmation.
- Ship transit counts, Brent, the rial rate and inflation are display-only context; they never change a level. Using them as evidence needs the user's decision and new test definitions.
- Preserve prior assessments and corrections; append, never overwrite.

Current provisional levels, for regression checking: H1 = 0; H2 = +2; H3 = 0; H4 = −1; H5 = 0; H6 = −2.

## Verification

Verified before handoff:

- `python3 -m unittest discover -s tests -v`: 10 tests passed. `node --check site/app.js`: passed.
- 33 browser assertions passed against a local server (headless Chrome via Playwright): dialog open/close/Back/Escape/deep link/prev-next focus, `#coverage` and `#ev-E002` deep links, evidence link and claim filter, empty state, keyboard chart readout, sensitivity exclusion, transit periods, CSV download and content, per-claim direction display and search, `file://` message, nav marks Method at page end, no horizontal overflow at 390, 700, 768, 900, 1024 and 1280 px (light and dark), and no console errors.
- Live site checked after deploy (header text and `transits.json`). The browser assertions were not run against the live site.

- Nov 13 economy change: 12 tests passed; the 33 earlier browser assertions plus 11 new ones passed (economy charts, keyboard readout, period change, oil breakdown, AIS note, gap row, nav link; no overflow at 390, 768 and 1280 px, light and dark; no console errors).

Not verified: screen-reader behaviour (only ARIA from source), Windows High Contrast, Safari/Firefox rendering, the first scheduled runs of `transits.py` and `markets.py` on GitHub (11:17 UTC daily), and whether tgju.org accepts requests from GitHub runners (it worked from a US home connection).

The browser assertion script and screenshot script live in a session scratchpad and are **not committed**; they may not persist. A reusable UI test suite is still missing.

## Design evaluation results

Five rounds, two independent evaluators each (Codex `gpt-6-astra` medium; Claude Fable 5.2 medium), eight weighted categories. Target: weighted ≥ 85 with every category ≥ 80 for each evaluator.

| Round | Astra | Fable | Lowest category |
| --- | --- | --- | --- |
| 1 | 76.7 | 78.0 | 64 |
| 2 | 81.9 | 83.1 | 75 |
| 3 | 82.7 | 82.5 | 74 |
| 4 | 83.7 | 85.3 | 76 |
| 5 | 84.9 | 86.0 | 80 |

Round 5: Fable met the target; Astra had every category ≥ 80 but a weighted score 0.1 below 85. Several round 5 findings were fixed before the commit (chart palette, labels, dialog focus, touch target size, header wording).

## Open items

Suggested by evaluators, not done:

1. Plain-language summary for H2 ("consequential maritime-denial capacity"). Needs user approval (data change).
2. Shorten the Hormuz section (chart height, spacing) or default the ship chart to "Last 90 days".
3. Fewer caveat lines above the claims table; merge source-independence counts into the claims table.
4. Make Details a text link or the whole row clickable; small-caps column headings as a consistent design device.
5. Phone: Claim and Sort filters on one row; collapse History and the Method scale table; visible "Observed" label in evidence on phones.
6. `forced-colors` (Windows High Contrast) rules for SVG fills.
7. Rial source risk: tgju.org is an unofficial, Iran-based site; its API is undocumented and can change or block. Consider a second source (for example bonbast.com) as a cross-check.
8. IMF WEO inflation projections for 2026 would be more current than World Bank annual data, but the IMF DataMapper API refused automated requests in testing.
9. Commit a reusable browser test suite (Playwright) to replace the scratchpad scripts.

Operations and research limits (unchanged): collection detects page-byte changes only; only ten curated evidence records (E006–E008 are 2026 IAEA reports, owner sign-off; E009 Iran’s INFCIRC/1416 reply; E010 the June 2026 US–Iran memorandum for H3; owner-supplied PDFs kept locally in `IAEA/`, ignored by Git, hashes match iaea.org); insurance, treaty and military feeds are not connected; no forecast model. Review application requires repository write access and `scripts/review.py` (do not run with `python -O`).

## Next steps

1. Check `git status` and pull first: the scheduled workflow commits `collection.json` and `transits.json` to `main`.
2. Confirm the first scheduled `transits.py` and `markets.py` runs succeeded (Actions tab) and that the chart shows newer data.
3. Ask the user which open items to do. Get approval before any change to `monitor.json` research fields.
4. After changes: run the tests, `node --check site/app.js`, and browser checks at phone, tablet and desktop widths in light and dark mode; review the data diff for level or statement changes; commit, push, and confirm the Pages deploy.
