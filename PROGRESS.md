# EMBERA implementation checkpoint

## State at 2026-11-14

- Branch `main`, base commit `66fa924`; previous map/calendar changes remain uncommitted and must be preserved. Existing `docs/IMPLEMENTATION_PROGRESS.md` records those changes and tests.
- Historical `data/processed/atlas.db`: 2,551 imported CSV members, 236 country labels, years 2020–2025, MODIS and VIIRS. Member reports list MODIS Aqua/Terra and VIIRS N20; historical calibrated analysis uses Aqua and N20 standard-product qualified occupancy on a 2° longitude / equal-area latitude grid. Reported input rows are checkpoint counts, not independently verified raw rows.
- New user files: `C:\Users\MMM\Downloads\MODIS_C6_1_Northern_and_Central_Africa_7d.csv` (26,315 rows, Aqua/Terra) and `C:\Users\MMM\Downloads\J1_VIIRS_C2_Northern_and_Central_Africa_7d.csv` (163,090 rows, N20). Both cover 2026-11-07 through 2026-11-14, approximately 10°S–37.5°N and 17.3°W–52°E. Both have NRT versions and no `type` field. They are regional, not global. No missing fields or null values in the initial audit; duplicate full rows: 0.
- NASA FIRMS documentation states NRT archive detections are replaced by standard science-quality products later. The existing standard-product calibration is not validated for these NRT files. No recent harmonized estimate or verified recent alert may be claimed without an explicit transfer validation.
- `.venv` has NumPy and pandas but lacks scikit-learn, joblib, GeoPandas, Shapely and SciPy. Use a reproducible NumPy-based trained anomaly model or install only if truly needed.

## Completed in continuation

1. Recent ingestion completed with `backend/recent_pipeline.py`. Ignored raw copies, SHA-256 manifest (`data/processed/recent_manifest.json`) and observation/grid database (`data/processed/recent.db`) are saved. MODIS: 26,315 accepted, 0 rejected, 17,947 Aqua/confidence-qualified; VIIRS: 163,090 accepted, 0 rejected, 139,377 N20 nominal/high-qualified. Both files cover 2026-11-07–14; Nov 14 is visibly partial (141 MODIS and 1,854 VIIRS rows). No vegetation type is supplied, so `qualified` is not equivalent to historical vegetation-qualified activity. An initial full-row duplicate check found 0 in each file. Input files are regional and NRT.
2. Persisted trained model/results existed at `data/processed/ml_model.json` and `ml_results.json`; no retraining performed. Robust-covariance novelty detector used 1,537 country-months/35 countries (2020–2023), with 2024 validation (386 samples; 5 flags; median score 1.879, p95 3.705) and 2025 holdout (373 samples; 5 flags; median 1.941, p95 3.654). Train 97.5th percentile threshold: 4.3988. Holdout seasonal baseline flagged 14, with 2 overlapping model flags. No independent labels; not precision/recall.
3. Added read-only `/api/intelligence` exposing model/results, recent manifest and explicit blocked-inference state. `src/Equatorial.tsx` presents model metrics, recent regional NRT audit and a historical data case study. Case selected by existing rule: Japan 2025-12, 23 paired days, MODIS 1 / VIIRS 57 occupied cell-days, factor .1882; leave-year-out calibration median error 30.64% versus 431.37% uncalibrated, p90 74.54%. This is a historical statistical novelty case, not wildfire confirmation.
4. Recent inference remains blocked: NRT calibration transfer is unvalidated, files lack vegetation `type`, and recent features lack a comparable baseline. No current ML alerts or recent harmonized activity are generated. Recent rows are audited in SQLite but not mapped in the frontend.
5. TypeScript `npx.cmd tsc --noEmit` passed. Python `test_patch_science.py` ran past the 30-second tool window and was terminated when the shell ended; no suite result. Next.js production build likewise reached optimized build but exceeded the 30-second window with no final result. Live endpoint/browser checks remain pending. Changes remain uncommitted; preserve and review existing changes before any commit.

## Remaining

- Dashboard API direct function call returns the persisted model status and recent counts (MODIS 26,315; VIIRS 163,090) plus 11,141 deterministic mapped sample points. TestClient wrapping exceeds 30 seconds, likely due to app/test client startup or existing route setup; endpoint function itself responds in 4.5 seconds.
- Finish Python suite and browser check of `/bioscape` and dashboard map. Production build attempted twice and fails during Turbopack CSS worker startup (`node process exited before we could connect`, `Failed to write app endpoint /page`); no TypeScript diagnostic. Do not claim recent inference or harmonization before transfer validation.

## Latest continuation changes

- `backend/api.py`: read-only intelligence response, bounded deterministic raw recent-coordinate sample, model-optional response.
- `src/Equatorial.tsx`, `src/styles.css`: KPI cards, historical trend against seasonal baseline, severity cards with expandable recommendations, graceful model-artifact absence. The later dashboard steering removed the page maps and added NRT statistical alerts.
- `public/bioscape.html`: full supplied application with only EMBERA theme CSS overrides appended; embedded in Equatorial and accessible via main navigation.
- `next.config.mjs`, `src/main.tsx`: static BioSCape route and navigation.
- Verification at this checkpoint: TypeScript and backend syntax pass; direct `/api/intelligence` responds with counts and 11,141 sampled coordinates. The HTML was byte-matched before permitted CSS-only EMBERA theming. TestClient invocation and broad suite exceed prior tool timeouts; production build blocked by Turbopack worker startup. Browser checks remain.

## 2026-11-14 dashboard steering

- Replaced the Equatorial page's maps with a recent-alert workflow and retained historical seasonal charts/country selection.
- Added `/api/recent-alerts`: compares Nov 7–13, 2026 complete dates (Nov 14 omitted as incomplete), against sensor-specific historical seasonal cell occupancy. MODIS and VIIRS remain separate; no transferred calibration. Historical no-detection years are missing (not zero), at least three detected historical years required, and recent qualified cell-days are compared to historical unique cell-days on the same grid. Neighboring cells grouped; |robust deviation| cutoff is 2.5 for watch and 3.5 for alert. Actual run returned 22 statistical alerts and 25 below-threshold watch events. These are not confirmed fires or model predictions.
- Added concise visual alert cards, severity, comparisons, uncertainty details, and separate recommendations tied to observed alert coordinates; the page explicitly states where no alert qualifies.
- Embedded `public/bioscape.html` at the bottom of the Equatorial page in an iframe and added EMBERA dark-theme overrides to its CSS while preserving all supplied sections, script, plot data, and interactions. App navigation retains direct access.
- Verification: TypeScript passes; direct recent-alert pipeline completes in ~3 seconds and returns 22 alerts / 25 watch events. `backend/api.py` syntax parses. Production build still has prior Turbopack worker-start failure; browser rendering not yet checked.

## Equatorial error fix

- Screenshot error was a backend `NameError`: `equatorial()` called `equatorial_report` after its import had been removed. Restored `from backend.equatorial import cached as equatorial_report`.
- Added a persistent report cache in `backend/equatorial.py`, keyed to the archive database version, so cold process restarts reuse the 21-country / 479-month calculation. Cache saved at ignored `data/processed/equatorial_report.json`.
- Verified direct endpoint function response: HTTP handler function returns 21 countries, 479 evaluated months, and 17 historical flags in 0.019s. TypeScript check passes. FastAPI TestClient wrapper did not return within the 15-second check window, so no HTTP integration result claimed.

## Recent alert harmonization correction

- Removed the sensor-by-sensor NRT alert/watch calculations and their recommendation cards. The uploaded NRT data lack the vegetation-fire type required by historical qualification and transfer of standard-product calibration is not validated.
- `/api/recent-alerts` now explicitly returns no recent alerts/watch items with an explanatory status/reason; Equatorial UI displays one concise note and retains the historical analysis panel only.
- TypeScript passes; `recent_alerts()` returns an empty alert/watch set with `harmonized_nrt_inference_unvalidated` status.

## Resume commands

```powershell
cd 'D:\Mirna\NASA Space App\Hot-Spots'
git status --short
.\.venv\Scripts\python.exe -m pytest -q --basetemp=.pytest_tmp
npx.cmd tsc --noEmit
npm.cmd run build
```
