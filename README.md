# EMBERA · The Fire Memory Atlas

An interactive NASA FIRMS archive for mapping thermal detections and exploring seasonal changes in historical fire activity.

## Run with the supplied ZIP

The atlas reads the uploaded country/year archive. The ZIP remains the raw store and
the generated SQLite database stores the member CRC, schema audit, occupied cells,
and daily aggregates. Keep the ZIP intact for reproducibility. The import resumes
from committed files, retries failed members, and never extracts every CSV to disk.
Use a separate processed directory if replacing the supplied collection.

```powershell
.\.venv\Scripts\python.exe -u -m backend.zip_pipeline 'C:/Users/MMM/Downloads/Integration.zip'
.\.venv\Scripts\python.exe -m backend.zip_audit
```

Country coverage is inferred from file presence and observation dates. The ZIP does
not contain valid-pixel or cloud masks. Unobserved days are missing, and the global
view shows archive counts rather than inferring a fixed worldwide calibration.
Raw country totals remove in-file duplicate detections. Global totals can include
observations repeated across country files. The map shows up to 5,000 weighted
sensor-grid cells per request. The model uses same-day Aqua and NOAA-20 observations,
equal-area cylindrical grid cells, confidence and vegetation filters. NOAA-20
occupancy is calibrated against Aqua using leave-one-year-out monthly validation.
The 90th-percentile relative error describes monthly sensor transfer, not a
confidence interval. Equatorial scoring uses only earlier years to fit each held-out
year and requires at least three previous values for the same calendar month.
Detection precision and recall require labels absent from the ZIP.

## Local setup

Run from the repository root. Use Python 3.11–3.13 and Node 22.12 or later. Commands below use PowerShell.

```powershell
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm.cmd ci
```

Run these in separate terminals.

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.api:app --port 8000
npm.cmd run dev
```

Open http://127.0.0.1:5173. Interactive API docs are at http://127.0.0.1:8000/docs.

## Acquire the 2026 challenge archive

Use a dedicated database. If upgrading an earlier EMBERA checkout, set `DATABASE_URL`
to a fresh database so the previously imported snapshots stay separate.
For PostgreSQL, enable PostGIS and grant migration permissions before running Alembic.

The exact [challenge Resources tab](https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/?tab=resources)
could not be verified during setup. The example manifest is intentionally empty.
Review that tab before adding any source. Use one global CSV per platform and date
batch, or split archive deliveries into manifest batches at their actual coverage boundaries.
Dates are UTC and inclusive. A manifest entry certifies the product's geographic and
temporal coverage independently of the presence of detections.

Copy `data/challenge-manifest.example.json` to `data/challenge-manifest.json`.
Add reviewed resource URLs and one object per batch with fields `url`, `region`
(`world`), `platform`, `quality` (`science` or `nrt`), `start`, and `end`.
Optional fields are `sha256` and `bearer_auth` (use `EARTHDATA_TOKEN` in the environment).
Use confirmed CSV delivery URLs without credentials in the path. Redirects require
reviewing and adding the final URL. Use NRT for gaps only.

```powershell
.\.venv\Scripts\python.exe -m backend.acquire data/challenge-manifest.json --limit 2
.\.venv\Scripts\python.exe -m backend.acquire data/challenge-manifest.json
```

The downloader checkpoints complete files and records the SHA-256 and product
quality in `data/raw/`. The API exposes the corresponding batch states at
`/api/processing`. Keep the local import path below for experiments in a separate database.

## Earlier prototype snapshot workflow

The [NASA FIRMS Archive](https://firms.modaps.eosdis.nasa.gov/download/) offers MODIS and VIIRS CSVs via Earthdata or email. Request matching spatial extents and periods, preferably standard science-quality products. Retrieve the files and unzip them. Dates are inclusive UTC.

For a product whose download covers an entire named Atlas window and known date span, declare that coverage at import. This example assumes each CSV covers the entire globe for its platform for exactly the dates declared.

```powershell
.\.venv\Scripts\python.exe -m backend.importer data/terra-2018.csv --coverage world terra 2018-01-01 2018-12-31
.\.venv\Scripts\python.exe -m backend.importer data/snpp-2018.csv --coverage world snpp 2018-01-01 2018-12-31
```

For files with unknown coverage, snapshots, filtered subsets, or mixed platforms, omit `--coverage`. The map and raw counts will work immediately. Multi-year indicator and anomaly calculations require enough verified archive coverage. A declared archive is an inventory assertion, not a guarantee of usable satellite coverage in every grid cell. Named regional windows are rectangular, not political or ecological boundaries. Global imports can support the smaller windows. Separate smaller windows never imply global coverage.

Try a public, real VIIRS snapshot from the [NASA FIRMS Academy](https://firms.modaps.eosdis.nasa.gov/content/academy/data_ingest/firms_data_ingest.html).

```powershell
curl.exe -fL https://firms.modaps.eosdis.nasa.gov/content/notebooks/sample_viirs_snpp_071223.csv -o data/nasa-academy.csv
.\.venv\Scripts\python.exe -m backend.importer data/nasa-academy.csv
```

For a current MODIS ingestion check, use NASA's rolling 24-hour file for the contiguous US and Hawaii. The snapshot has a different observation window from the Academy sample.

```powershell
curl.exe -fL https://firms.modaps.eosdis.nasa.gov/data/active_fire/c6.1/csv/MODIS_C6_1_USA_contiguous_and_Hawaii_24h.csv -o data/nasa-modis-nrt.csv
.\.venv\Scripts\python.exe -m backend.importer data/nasa-modis-nrt.csv
```

The header-only schema in [data/firms-schema.csv](data/firms-schema.csv) shows core and standard optional fields. Importer normalizes UTC HHMM, bounds, and platform aliases, stores the original field values as JSON, and rejects invalid files atomically. Reimporting the same coordinates, UTC minute, and platform is idempotent. For an archive replacement where NRT observations differ from science-quality records, rebuild the affected dataset from consistent releases before declaring coverage. The importer does not reconcile shifted geolocations across data releases.

Set `DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname` before migrating to use PostgreSQL. Create the empty database first. Production and demo URLs must point to separate databases. Set `ENABLE_DEMO=false` to disable synthetic data endpoints.

## Interpreting the fire record

- **Raw detections** are imported FIRMS thermal anomalies after identity deduplication. Instrument totals can contain overlapping detections and changes in platform availability. Inspect coverage and platform counts before comparing them. They do not represent unique fires, fire intensity, or burned area.
- **Activity index** sums distinct occupied 0.25° cell-days per platform in each complete UTC month. It suppresses repeated same-platform detections in the same cell and day. The angular grid controls sampling scale. Cell area varies with latitude, so the index is intended for within-window comparisons.
- **Overlap calibration** uses the median monthly Terra-to-Suomi NPP occupied cell-day ratio within each region. A pair is eligible only when both archives have a complete month and each platform has at least ten occupied cell-days. Fitting requires twelve eligible months, two years, all four calendar quarters, and ratio Q3 ≤ 2 × Q1. Terra takes precedence in overlapping months. For fully covered Suomi NPP months without Terra, the index applies the fitted factor. All other platforms remain available in raw views. The fit is descriptive and does not correct for cloud cover, orbit or sensor drift. It uses all verified overlap in the database, irrespective of the chart date selection.
- **Trends and anomalies** use twelve comparable months for annual sums and the median across comparable years for each seasonal month. Anomalies are descriptive alerts at |robust z| ≥ 3.5 using the median and 1.4826 × MAD of at least five earlier Terra values for that calendar month. A zero MAD or insufficient history suppresses scoring.
- **Missing months** differ from zero. Zero requires explicit archive coverage. Partial calendar months always suppress the index. Chart colors use a square-root scale over the active selection. Color alone should not be used to compare two filter settings.
- **Map** displays paged detections. Month selection in either chart scopes the map while preserving the comparison date range. The basemap and hero are NASA Goddard’s [Black Marble 2016](https://svs.gsfc.nasa.gov/30876/) nighttime lights. The amber-tinted globe is an illustration using that imagery.

## Build and test

```powershell
npm.cmd run build
.\.venv\Scripts\python.exe -m pytest -q
```

For deployment, run `npm.cmd run build` followed by `npm.cmd run start`. Next.js rewrites
`/api` to the FastAPI server at `EMBERA_API_ORIGIN`. Keep database credentials on the backend.

Daily calendar and CSV endpoints accept up to 366 days per request. MODIS confidence
below 30, VIIRS low confidence, and missing or unknown confidence remain visible in
raw values and are excluded from the index. NRT batches are available in raw views.
Calibration requires leave-one-year-out validation on at least 12 held-out months
and calibrated median relative error no worse than the uncalibrated value. The
90th-percentile relative error is an empirical transfer diagnostic, not a confidence
interval or a daily error estimate.

REST routes include `/api/regions`, `/api/coverage`, `/api/hotspots`, `/api/calendar`, `/api/trends`, `/api/anomalies`, `/api/analysis`, and CSV endpoints under `/api/exports`. Example: `/api/analysis?region=world&start=2018-01-01&end=2024-12-31&demo=true`.
