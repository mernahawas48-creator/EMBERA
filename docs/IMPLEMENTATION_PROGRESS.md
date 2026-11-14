# EMBERA progress

## Verified this session

- Branch `main`, latest commit `66fa924`. Added `devIndicators: false` to `next.config.mjs` using the installed Next.js 16 documentation.
- `rg` found no `clearRect` or canvas calls in application source. The reported runtime error still needs browser reproduction and stack-trace diagnosis.
- Existing map and archive integration remain intact. No other requested features are claimed complete in this session.

## Current session additions

- Added a bounded `/api/comparison` query over the uploaded archive grid in `backend/zip_api.py` and `backend/api.py`.
- Added a side-by-side MODIS and VIIRS mode to the main map in `src/main.tsx`, with synchronized Leaflet panning and zooming in `src/AtlasMap.tsx` and compact raw comparison statistics.
- `npx.cmd tsc --noEmit` passed. Browser runtime, API count agreement, Python regression tests, and production build are still pending. The `clearRect` error is not yet reproduced or resolved.

## 2026-11-14 runtime diagnosis

- The screenshot's data-service error was caused by FastAPI not listening on port 8000. Started `backend.api:app` locally; `/api/regions`, `/api/coverage`, and `/api/analysis` returned HTTP 200 through the Next.js proxy. The full-range global analysis returned 72 months.
- The initial map requested all 2020–2025 cells and timed out. `src/main.tsx` now waits for analysis and defaults its map to the latest observed month (2025-12 for the current archive), while the calendar retains the full selected range.
- `npx.cmd tsc --noEmit` passed. A 2025-12 global hotspot request returned 3,000 aggregated points in 17.79 seconds; further query optimization and browser verification remain necessary. The FastAPI server was started for runtime checks in this session; it must be running alongside Next.js.
- Branch `main`, latest commit `66fa924`; changes remain uncommitted pending broader verification.

## 2026-11-14 NASA map and evidence pass

- Replaced the static atlas basemap and country bounding rectangles with NASA GIBS Blue Marble WMTS in `src/AtlasMap.tsx`; the map uses EPSG:3857, metric scale, bounded zoom-aware markers at existing processed grid centers, and NASA attribution. No FIRMS MAP_KEY is sent to the client. NASA imagery is a composite basemap, not a date-specific fire observation.
- `src/Equatorial.tsx` now lists every flagged country-month as a retrospective statistical alert with score, seasonal baseline, level, and monitoring recommendation. The map markers are explicitly approximate country centers and open the associated country; they do not depict fire locations. `backend/equatorial.py` now checks equatorial cells in one database scan.
- `src/Charts.tsx` has ordered activity colors, a value legend, distinct missing and zero cells, and anomaly outlines. `src/main.tsx` adds selected-month harmonization evidence using real raw counts and calibrated activity. `src/styles.css` unifies interface fonts and alert/evidence styling.
- Verified in the browser: NASA GIBS attribution and 3,000 displayed archive grid cells after loading. Browser runtime still needs a clean-session check; a React dependency-array warning occurred during hot reload.
- Global calibration from the processed archive: factor 0.4036234884; 72 overlap months, 6 years; 72 leave-one-year-out months, median relative error 6.4478% calibrated versus 147.7569% uncalibrated, p90 13.2061%. This is sensor agreement, not ground-truth wildfire accuracy.
- `npx.cmd tsc --noEmit` passed; 11 Python tests passed using a writable pytest temp directory; Next.js production build passed when run with normal file permissions. A restricted build first failed with EPERM writing `.next`.
- Corrected inflated seasonal anomaly scores by flooring robust dispersion at one occupied cell-day per paired day or 10% of baseline in `backend/zip_api.py`. Recomputed the full equatorial report: 21 eligible countries, 479 scored held-out country-months, 17 flagged months. Browser verification showed all 17 alerts in the panel and the NASA GIBS map.
- `package.json` now uses Next.js 16's documented default `next build` path. Repeated `next build --webpack` failed under Node 26.13.1 in `WasmHash._updateWithBuffer`; `npm.cmd run build` with the default builder passed. Latest `npx.cmd tsc --noEmit` and 11 Python tests also passed.
- Branch `main`, latest commit `66fa924`; changes are uncommitted. The archive remains the only historical fire observation source. Live NASA FIRMS MAP_KEY integration is deferred because it is not needed for the historical MVP or GIBS basemap.
- Continuation verified the Indonesia 2025-12 comparison in the browser against direct database queries: MODIS 253 raw detections, VIIRS 1,532, same-country shared cell-days 94, observed dates 30/31. Both maps stayed synchronized after zoom. Calendar selection of 2025-11 updated the map period and comparison counts (697 / 4,475 detections; 216 shared cell-days). Single-map MODIS, VIIRS, and harmonized modes returned 89, 147, and 142 grid cells respectively for 2025-11.
- Corrected `/api/comparison` to count overlap only within the same country, day, and grid cell. Added a regression assertion for cross-country coordinates. Clamped side-by-side comparison dates to the applied filter range.
- Added a NASA tile failure notice while retaining archive points at their coordinates. Added a bounded in-process cache for map queries keyed by database file version; it avoids repeat SQLite aggregation but does not eliminate the first global query cost.
- Final targeted checks: 11 Python tests passed, `npx.cmd tsc --noEmit` passed, `npm.cmd run build` passed. FastAPI was restarted on port 8000 with the latest backend code. Changes remain uncommitted on `main` at `66fa924`.
- Desktop review found the global map was fitted by height, leaving wide empty sides; `src/AtlasMap.tsx` now chooses global zoom from viewport width. The NASA GIBS imagery and archive dots filled the 1440px review viewport.
- Clean-browser comparison exposed a `Maximum call stack size exceeded` error from reciprocal Leaflet `moveend` synchronization. Added a shared reentry guard plus center/zoom equality check. Retested synchronized zoom in a fresh browser tab: both map scales matched and no browser errors were logged. `npx.cmd tsc --noEmit` and `npm.cmd run build` passed again.
- Reproduced the original `clearRect` error by switching map modes rapidly. Leaflet's canvas redraw callback could outlive its renderer during teardown. Removed `preferCanvas`; bounded SVG marker layers remain responsive at the 3,000-grid-cell limit. Eight rapid comparison toggles plus a global 3,000-cell load produced no browser errors in a fresh tab. Map cleanup now also stops animations, guards observer callbacks, and avoids removing layers after their map is gone.
- Final checks after this fix: 11 Python tests, TypeScript, and the Next.js production build all passed.

## Remaining

- Optimize the first global monthly grid request; repeat requests are now cached.
- The 1440px desktop layout was checked. The imagery failure notice is implemented but its failure state has not been induced in a browser.
- The `clearRect` error was reproduced and fixed. Commit after reviewing the remaining imagery failure and cold-start performance limitations.

## Next action

Continue from the current uncommitted tree. The comparison map and archive counts have been verified; focus on cold-start map performance and any reproducible `clearRect` error. Avoid starting duplicate services if ports 8000 and 5173 are occupied.

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.api:app --port 8000
npm.cmd run dev
```
