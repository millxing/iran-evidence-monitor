# Iran Evidence Monitor

A static GitHub Pages research dashboard based on the supplied Robert Pape analysis and monitoring specification. Six separate hypotheses; ordinal evidence levels from −5 to +5; differences from a provisional 2026-11-12 baseline. Scores are analyst judgments, not probabilities.

## Run and verify

No build or installation required. Serve `site/` with any static host. Tests: `python3 -m unittest discover -s tests -v`. JavaScript syntax: `node --check site/app.js`.

## Sources and baseline

`site/data/monitor.json` contains claims, original source excerpts/rows, dates, dependence clusters, alternatives, assessments and audit history. The initial source set uses publications dated before the cutoff, retrieved on November 13. It is retrospective and incomplete, not a certified historical snapshot. Initial scores are clearly identified as provisional machine-assisted analyst judgments. No human approval is fabricated. Claim definitions are drafts, not true preregistrations for already-observed outcomes.

Scale: 0 inconclusive; magnitude 1 slight, 2 limited, 3 moderate, 4 strong, 5 very strong. Positive supports; negative challenges. Assign levels through documented review, never summing news counts or related observations. Magnitude 3 requires direct relevant evidence plus an independent corroborating cluster and serious examination of alternatives; 4 requires repeated corroboration and passing the operational test; 5 requires sustained results across the registered horizon, robust to source exclusion. These are judgment rules, not measured likelihood ratios. Deltas are ordinal steps, not percentage points.

## Ship transits

`scripts/transits.py` fetches daily Strait of Hormuz transit counts from IMF PortWatch (AIS-based estimates) into `site/data/transits.json`. The scheduled workflow runs it daily. On failure it keeps the last good data and records the error. The counts are display-only context for H2; they never change a level.

## Oil price and Iran's economy

`scripts/markets.py` fetches three display-only series into `site/data/markets.json`: the daily Brent spot price (U.S. EIA), the daily open-market US dollar rate in Iranian rials (tgju.org; unofficial market data, not the official rate), and annual consumer-price inflation for Iran (World Bank, `FP.CPI.TOTL.ZG`). The scheduled workflow runs it daily. Each series is fetched separately; on failure the last good rows are kept and the error is recorded. These series are context for H2, H3 and H6. They are not evidence records and never change a level. The EIA Hormuz table (E001) is shown with its crude, products and LNG breakdown.

## Updating

1. Add source observations to `monitor.json` with full provenance, claim links, a `direction` (and an optional `directions` map by claim ID when the direction differs between claims), uncertainty, dependence cluster, correction/retraction links, and excerpts within permitted reuse. Never overwrite a corrected observation: append a replacement and link it with `correction_of`.
2. Approve a test using a JSON file containing `action: approve-test`, `claim`, `version`, `reviewer`, `approved: true`, and `rationale`. Run `python3 scripts/review.py path/to/review.json`.
3. Assess using `action: assess`, `claim`, integer `level`, `date` (YYYY-MM-DD), `evidence` (IDs), `uncertainty`, `rationale`, `reviewer`, and `approved: true`. Run the same command. It appends an assessment and audit entry; it does not overwrite the baseline.
4. Run tests, review the diff, commit and push. Repository write permissions are the trust boundary. The public site does not grant write access. Issues collect review suggestions but do not approve them.

Do not amend the historical baseline silently. A historical correction requires a separately versioned baseline release and a documented review, preserving old data in Git. Do not add information published after the cutoff to an earlier assessment.

## Automation

GitHub Actions checks EIA, IAEA and UKMTO daily at 11:17 UTC (GitHub scheduling may be delayed). It records page hashes, errors, last-success times and changed-page candidates, commits the log, tests and deploys. A changed hash can be a layout change. These are source-watch adapters, not complete news crawlers or quantitative-series parsers. No automatic source update changes confidence. No API keys or paid feeds required. Public-repository scheduled jobs may be disabled by GitHub after 60 days without activity.

The original PDF is not published. Restricted full-text documents and commercial raw AIS feeds are not redistributed. Source checks retain hashes and metadata, not copyrighted document bodies. Exact excerpts and the small published EIA data row are retained in the ledger. The live EIA source can change; the initial row is preserved in Git.

## Known limitations

Ten curated source records (E001–E010), not comprehensive November 12 intelligence. Insurance, military outcomes and treaties are not connected; AIS, oil price and economic series are display-only. No daily time series, calibrated probabilities, event-study estimator, reference-class backtest or causal identification is claimed. The scenario panel checks source exclusion and observation age, not posterior sensitivity. No current nuclear status is inferred from historical access gaps. All initial definitions and ratings need human review.
