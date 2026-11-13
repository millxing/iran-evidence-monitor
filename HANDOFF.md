# Iran Evidence Monitor — design handoff

Prepared November 13, 2026.

## Objective and status

The next task is to improve the dashboard design. The user will assign another agent. Do not change the research conclusions, baseline, scoring rules, or source records as part of a design pass.

- Live site: https://millxing.github.io/iran-evidence-monitor/
- Repository: https://github.com/millxing/iran-evidence-monitor
- Local project: `/Users/robschoen/Dropbox/CC/Iran`
- Branch: `main`
- Last deployed implementation commit: `c5e326c` (previous: `19f4459`).
- Working tree was clean before this handoff was written.
- GitHub Pages deployment succeeded. The site is public.

The original request was to build the dashboard in `Robert_Pape_Iran_Geopolitical_Analysis_and_Monitoring_Plan.pdf`, publish it on the user's GitHub, and track confidence in individual claims. The user explicitly requested the `frontend-design` skill. During implementation, the user specified a November 12, 2026 baseline and an eleven-level scale from −5 to +5.

The PDF is present locally, ignored by Git, and was not published. Read pages 6–9 for the implementation brief. This is an initial monitoring MVP, not the complete research infrastructure described in the PDF.

## User preferences

Use direct, simple language. Distinguish verified facts from assumptions. Challenge weak assumptions. Ask before large installations and provide a size estimate. Correctness, maintainability, and completeness take priority over token savings. The user prefers minimal unnecessary work.

## Architecture and files

No framework, package install, build step, backend, or database is required. The browser loads JSON using relative URLs. Open through HTTP or the deployed site; opening the HTML with `file://` can block fetch.

| File | Purpose |
| --- | --- |
| `site/index.html` | Main page, navigation, sections, controls, claim dialog, methodology |
| `site/style.css` | Responsive layout, typography, colors, focus states, reduced-motion rule |
| `site/app.js` | JSON loading, claim cards/details, SVG charts, filtering, CSV export, scenarios, history |
| `site/data/monitor.json` | Six draft claims, five evidence records, provisional baseline assessments, audit, gaps, EIA series |
| `site/data/collection.json` | Source checks, retrieval errors, hashes, changed-page queue |
| `scripts/collect.py` | Checks three source pages; never scores evidence |
| `scripts/review.py` | Applies explicit test approval or appends an approved assessment |
| `tests/test_monitor.py` | Eight data/review tests |
| `.github/workflows/pages.yml` | Tests, scheduled collection, publication |
| `.github/ISSUE_TEMPLATE/review.yml` | Evidence review suggestion form |
| `README.md` | Scoring rubric, operations, review procedure, limitations |

The two implementation commits created these files. This handoff adds only `HANDOFF.md`.

## Design decisions and rationale

The current design uses a research-journal style: warm off-white background, deep green text and indicator section, rust accents, thin rules, and restrained motion. Typography uses Libre Caslon Display, DM Sans, and IBM Plex Mono through Google Fonts. This supports a sober research product rather than a military command screen.

The large “Claims, tested.” heading introduces the difference between disruption, concessions, and durable power. Six separate cards prevent a misleading overall score. Evidence and uncertainty are visible alongside judgments. These are implementation choices, not a user-approved final design; the next agent may improve them.

Useful areas to assess:

1. Reduce the time required to compare six claims, current levels, baseline levels, and changes.
2. Improve scanability and legibility of source, uncertainty, and approval labels.
3. Reduce long-page repetition without hiding the evidence trail.
4. Improve the phone layout and density. Desktop currently uses three claim columns; phones use one.
5. Clarify empty, stale, failed, provisional, and reviewed states.
6. Improve chart labels, source links, and history presentation. Keep raw data accessible.
7. Format the compact JavaScript/CSS if this materially helps maintenance. A framework migration is not required.

These are proposed design priorities, not verified defects.

## Research rules to preserve

- Six separate hypotheses; no score for Pape as a person and no aggregate strategic-success score.
- Values are ordinal analyst judgments, not probabilities, likelihood ratios, or percentage points.
- Negative values challenge a claim; positive values support it. Zero means inconclusive, not a 50% probability.
- Magnitudes 1–5 mean slight, limited, moderate, strong, and very strong evidence.
- Change is current level minus the November 12 baseline. All initial changes are zero.
- Baseline cutoff: November 12, 2026, 23:59:59 UTC.
- The baseline is retrospective and provisional. Sources were retrieved November 13. Publication dates precede the cutoff, but archived as-of versions were not established.
- Claims are report-derived hypotheses, including interpretations of Pape; they are not verified direct quotations.
- Tests are drafts, not genuinely preregistered tests for already-observed events.
- All initial scores lack human approval. Do not relabel them as reviewed or objective probabilities.
- Missing evidence must not count as evidence against a claim.
- Inspection gaps do not establish nuclear weaponization or increased incentives.
- Shipping disruption does not establish political concessions or greater net strategic power.
- Dependence clusters identify related observations; do not count them as independent confirmation.
- Preserve prior assessments and corrections. Do not silently overwrite the baseline.

Current provisional levels, for regression checking only: H1 = 0; H2 = +2; H3 = 0; H4 = −1; H5 = 0; H6 = −2. Rationales and evidence IDs are in the JSON. They are judgments, not verified facts.

## Features to retain and verify

- All six claims; filter for claims with or without evidence.
- Claim dialog with scope, version, dates, effect threshold, falsifier, alternatives, rationale and reviewer.
- Hormuz quarterly chart, reference line, year filter and raw observations.
- Searchable and sortable evidence ledger; original source links and expandable provenance.
- CSV export of the filtered ledger.
- Scenario controls for proxy exclusion and observation age; outputs are cluster counts, not changed confidence scores.
- Baseline/current comparison and assessment history.
- Missingness panel and collection errors/queue.
- Data download, GitHub links and review issue link.
- Keyboard navigation, visible focus, native dialog close/Escape, and reduced motion.

## Verified checks

Before the handoff:

- `python3 -m unittest discover -s tests -v`: 8 tests passed.
- `node --check site/app.js`: passed.
- Desktop rendering inspected at 1200 pixels; phone rendering inspected at 390 pixels.
- Six interface assertions passed: six cards rendered, empty search state, year-filtered observations, claim dialog, proxy exclusion, and no horizontal overflow at 390 pixels.
- Pages returned HTTP 200 and published data contained all six expected levels.
- GitHub Actions deployment run `43495310742` completed successfully.

The interface checks used a temporary self-contained HTML copy with the same JSON embedded in place of network fetch. They were not a full end-to-end test of the deployed site. Temporary files under `/tmp/iran-*` are disposable, untracked, and may not persist. No reusable browser test suite was committed. CSV download, all keyboard paths, and every future assessment state have not been exhaustively tested.

## Operations and limitations

Daily source checks are configured for 11:17 UTC. The workflow commits collection metadata and republishes. Pushes to `main` test and deploy without fetching sources. Manual workflow dispatch also collects.

**Verified:** initial EIA and UKMTO checks succeeded; the IAEA index returned HTTP 403. Some individual source fetches also returned 403; the ledger records missing hashes. Access through web research and direct automated retrieval can differ.

**Limits:** collection detects page-byte changes only. It does not crawl all new reports, parse new time-series values, judge causation, or change confidence. A layout change can produce a candidate. There are only five curated source records. Daily AIS, insurance, treaty, military and economic feeds are not connected. No calibrated forecast model or backtest exists.

The page is public and read-only. Review suggestions use GitHub Issues. Applying a review requires repository write access and a human-authored record through `scripts/review.py`; there is no authenticated web review console. That script's validation uses Python assertions, so do not run it with optimization (`python -O`). Broader review-engine hardening is separate from the design task.

Future-state design checks should include an approved assessment, a positive and negative delta, multiple history entries, no evidence, a long source title, and a failed collection. Use temporary fixtures; do not commit invented observations to production data. The history SVG accessible label currently describes initial no-movement state and should become data-driven if revising history presentation.

## Next steps

1. Read the PDF brief, `README.md`, and the frontend-design skill. Inspect current files and live design.
2. Check Git status and remote changes before editing; scheduled collection can advance `main`.
3. Select a clear design direction and improve hierarchy, comparison, and responsive behavior while preserving the rules above.
4. Run the existing tests and JavaScript syntax check. Verify interactions and desktop/phone layouts, including future states.
5. Review the diff for unintended data or scoring changes.
6. If publishing within the user's authorized scope, commit and push; confirm the Pages workflow succeeds and the live revision loads.
7. Report files changed, checks, unresolved limitations, and the live URL.
