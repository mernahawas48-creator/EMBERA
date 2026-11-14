import csv
import hashlib
import io
import json
import os
from datetime import date
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, inspect, select
from sqlalchemy.exc import SQLAlchemyError

from backend.analytics import build_calendar, daily_calendar, in_region, trends
from backend.db import Coverage, Observation as O, database_url, engine_for
from backend.regions import PLATFORMS, REGIONS, contains
from backend import zip_api
from backend import ml_intelligence, recent_pipeline

app = FastAPI(title="EMBERA · The Fire Memory Atlas", version="1.0.0")
router = APIRouter(prefix="/api")


def dataset(demo: bool = False):
    if zip_api.enabled():
        if demo:
            raise HTTPException(404, "Demo mode is unavailable for uploaded archives")
        return None, False
    if os.getenv("EMBERA_LEGACY_API") != "true":
        raise HTTPException(503, "Import the supplied ZIP archive before opening the atlas")
    if demo and os.getenv("ENABLE_DEMO", "true").lower() != "true":
        raise HTTPException(404, "Demo mode is disabled")
    engine = engine_for(database_url(demo))
    if demo and engine.url == engine_for(database_url()).url:
        raise HTTPException(503, "Demo database must be separate")
    try:
        ready = inspect(engine).has_table("observations") and inspect(engine).has_table("coverage")
    except SQLAlchemyError as exc:
        raise HTTPException(503, "The data store is unavailable") from exc
    if not ready:
        raise HTTPException(503, "Prepare the selected database using the README setup commands")
    return engine, demo


def window(start: date, end: date, region: str = "world"):
    if (region not in REGIONS and not (zip_api.enabled() and region.startswith("country:"))) or not date(2000, 1, 1) <= start <= end <= date(2100, 12, 31):
        raise HTTPException(422, "Choose a known region and ordered dates within 2000–2100")
    return region, start, end


Dataset = Annotated[tuple, Depends(dataset)]
Window = Annotated[tuple, Depends(window)]


@router.get("/regions")
def regions():
    if zip_api.enabled():
        with zip_api.connection() as db:
            return zip_api.regions(db)
    return [{"id": name, **value} for name, value in REGIONS.items()]


@router.get("/equatorial")
def equatorial():
    if not zip_api.enabled():
        raise HTTPException(503, "Import the uploaded archive before running equatorial analysis")
    with zip_api.connection() as db:
        return equatorial_report(db)


@router.get("/intelligence")
def intelligence():
    """Return persisted historical model metrics and audited recent-data status."""
    artifacts = ml_intelligence.load()
    recent_path = recent_pipeline.MANIFEST
    recent = json.loads(recent_path.read_text(encoding="utf-8")) if recent_path.is_file() else None
    if artifacts is None:
        model_data, results = None, None
    else:
        model_data, results = artifacts
    # Always provide real CSV-derived historical analytics when the optional
    # model artifact is absent. The seasonal method is already computed by the
    # existing archive API, with its own calibration and coverage checks.
    # Recent NRT raw-coordinate observations are useful for situational
    # awareness, but not cross-sensor calibrated or assigned ML alerts.
    recent_points = []
    recent_summary = {}
    if recent_path.is_file() and recent_pipeline.DB.is_file():
        with recent_pipeline.connection() as db:
            for sensor, count in db.execute("SELECT sensor,COUNT(*) FROM observations GROUP BY sensor"):
                recent_summary[sensor] = count
            # Keep map payload bounded; retain a date-filterable set by taking
            # a deterministic spatially distributed sample across each sensor.
            for row in db.execute("""SELECT id,sensor,platform,utc,latitude,longitude,frp,confidence,qualified
                FROM observations WHERE id % 17 = 0 ORDER BY id"""):
                recent_points.append(dict(row))
    return {"status": "historical_model_ready_recent_inference_blocked" if model_data else "statistical_baseline_only",
            "model": model_data, "results": results, "recent": recent, "recent_summary": recent_summary,
            "recent_points": recent_points,
            "alerts": [], "case": results.get("case") if results else None}


@router.get("/recent-alerts")
def recent_alerts():
    """Compare complete supplied NRT dates with positive seasonal grid history.

    Sensor series are evaluated independently. Historical years without a
    detection are missing, not zero; at least three observed seasonal values
    are required. The output is a statistical watch signal, not a fire report.
    """
    if not recent_pipeline.DB.is_file() or not zip_api.enabled():
        return {"period": None, "alerts": [], "watch": [], "status": "data_unavailable"}
    with recent_pipeline.connection() as recent_db:
        last = recent_db.execute("SELECT MAX(substr(utc,1,10)) FROM observations").fetchone()[0]
        if not last:
            return {"period": None, "alerts": [], "watch": [], "status": "data_unavailable"}
        from datetime import date, timedelta
        end = date.fromisoformat(last) - timedelta(days=1)  # latest date is incomplete
        start = end - timedelta(days=6)
        start_s, end_s = start.isoformat(), end.isoformat()
        recent_rows = recent_db.execute("""SELECT sensor,x,y,SUM(CASE WHEN qualified>0 THEN 1 ELSE 0 END) activity,
                SUM(raw) raw_detections,COUNT(DISTINCT day) active_days
            FROM cells WHERE day BETWEEN ? AND ? GROUP BY sensor,x,y""", (start_s, end_s)).fetchall()
    recent_by = {(r["sensor"], r["x"], r["y"]): dict(r) for r in recent_rows}
    if not recent_by:
        return {"period": [start_s, end_s], "alerts": [], "watch": [], "status": "no_qualified_detections"}
    cells = {(sensor, x, y) for sensor, x, y in recent_by}
    xys = {(x, y) for _, x, y in cells}
    min_x, max_x = min(x for x, _ in xys), max(x for x, _ in xys)
    min_y, max_y = min(y for _, y in xys), max(y for _, y in xys)
    last_year = int(start_s[:4]) - 1
    first_year = max(2020, last_year - 5)
    seasonal = {}
    with zip_api.connection() as archive:
        if xys:
            for year in range(max(2020, first_year), last_year + 1):
                a = date(year, start.month, min(start.day, 28))
                b = date(year, end.month, min(end.day, 28))
                if b < a:
                    b = date(year, 12, 31)
                rs = archive.execute("""SELECT sensor,x,y,COUNT(DISTINCT day) activity,COUNT(DISTINCT day) active_days
                    FROM cells WHERE day BETWEEN ? AND ? AND x BETWEEN ? AND ? AND y BETWEEN ? AND ?
                    AND sensor IN ('MODIS','VIIRS') AND occupied=1 GROUP BY sensor,x,y""",
                    (a.isoformat(), b.isoformat(), min_x, max_x, min_y, max_y)).fetchall()
                for r in rs:
                    key = (r["sensor"], r["x"], r["y"])
                    if key in cells:
                        seasonal.setdefault(key, []).append((year, int(r["activity"]), int(r["active_days"])))
    import numpy as np
    candidates = []
    for key, current in recent_by.items():
        history = seasonal.get(key, [])
        if len(history) < 3:
            continue
        values = np.asarray([v for _, v, _ in history], dtype=float)
        baseline = float(np.median(values))
        mad = float(np.median(np.abs(values - baseline)))
        spread = max(1.4826 * mad, 1.0)
        score = (float(current["activity"]) - baseline) / spread
        if score >= 2.5 and current["activity"] > baseline:
            candidates.append({"sensor": key[0], "x": key[1], "y": key[2], "activity": int(current["activity"]),
                "raw_detections": int(current["raw_detections"]), "active_days": int(current["active_days"]),
                "baseline": round(baseline, 2), "score": round(score, 2), "history_years": len(history),
                "history_active_years": [year for year, _, _ in history]})
    # Merge adjacent anomalous grid cells from the same sensor into display events.
    groups = []
    remaining = set(range(len(candidates)))
    while remaining:
        stack = [remaining.pop()]
        group = []
        while stack:
            idx = stack.pop(); group.append(candidates[idx])
            near = [j for j in remaining if candidates[j]["sensor"] == candidates[idx]["sensor"]
                    and max(abs(candidates[j]["x"] - candidates[idx]["x"]), abs(candidates[j]["y"] - candidates[idx]["y"])) <= 1]
            for j in near:
                remaining.remove(j); stack.append(j)
        groups.append(group)
    alerts = []
    watch = []
    for group in groups:
        x = float(np.mean([r["x"] for r in group])); y = float(np.mean([r["y"] for r in group]))
        highest = max(r["score"] for r in group)
        severity = "HIGH" if highest >= 5 and len(group) >= 3 else "MEDIUM" if highest >= 3.5 else "LOW"
        recommendation = ("Several nearby grid cells rose well above the seasonal range. Recheck the next satellite pass and share this location with the regional fire or environmental monitoring team for prompt verification."
                         if severity == "HIGH" else
                         "This location is above its seasonal range. Check the next satellite pass and verify with a local monitoring source before escalating.")
        event = {"sensor": group[0]["sensor"], "region": "Northern and Central Africa",
            "period": [start_s, end_s], "latitude": float(np.rad2deg(np.arcsin((y + .5) / 57 - 1))),
            "longitude": x * 2 - 179, "cell_count": len(group),
            "activity": sum(r["activity"] for r in group), "baseline": round(sum(r["baseline"] for r in group), 2),
            "score": round(highest, 2), "severity": severity,
            "explanation": f"{group[0]['sensor']} showed more repeated hotspot cell-days than its recent seasonal history in {len(group)} nearby grid cell(s).",
            "recommendation": recommendation,
            "uncertainty": "NRT detections can include non-fire sources; historical no-detection years were treated as missing. MODIS and VIIRS are assessed separately; no cross-sensor calibration was applied."}
        (watch if severity == "LOW" else alerts).append(event)
    alerts.sort(key=lambda e: (e["score"], e["cell_count"]), reverse=True)
    watch.sort(key=lambda e: (e["score"], e["cell_count"]), reverse=True)
    return {"period": [start_s, end_s], "alerts": alerts, "watch": watch,
            "status": "scored" if alerts else "no_statistically_significant_anomalies",
            "method": "sensor-specific seasonal grid-cell comparison; historical positive detection years only; minimum 3 years; robust deviation >=2.5",
            "excluded_recent_partial_day": last}


@router.get("/processing")
def processing():
    if zip_api.enabled():
        with zip_api.connection() as db:
            files = zip_api.inventory(db)
            indexed = db.execute("SELECT 1 FROM sqlite_master WHERE name='archive_inventory'").fetchone()
            expected = db.execute("SELECT COUNT(*) FROM archive_inventory").fetchone()[0] if indexed else None
            crc_matched = db.execute(
                "SELECT COUNT(*) FROM archive_inventory a JOIN members m ON a.path=m.path AND a.crc=m.crc"
            ).fetchone()[0] if indexed else None
        failed = [f"{c}/{y}/{s}: {r['error']}" for c, y, s, r in files if "error" in r]
        return {"batches": [], "uploaded": True, "processed": len(files) - len(failed),
                "expected": expected, "crc_matched": crc_matched,
                "checkpoint_verified": (expected is not None and expected == crc_matched == len(files) and not failed),
                "reported_input_rows": sum(int(r.get("rows", 0)) for _, _, _, r in files),
                "reported_rejections": sum(int(r.get("rejected", 0)) for _, _, _, r in files),
                "reported_duplicates": sum(int(r.get("duplicates", 0)) for _, _, _, r in files),
                "failed": failed}
    records = []
    target = hashlib.sha256(database_url().encode()).hexdigest()
    for path in sorted(Path(os.getenv("EMBERA_RAW_DIR", "data/raw")).glob("*.json")):
        try:
            item = json.loads(path.read_text(encoding="utf-8"))
            if item.get("status") == "processed" and item.get("target") != target:
                item["status"] = "downloaded"
            records.append({key: item.get(key) for key in ("platform", "quality", "start", "end", "status", "bytes")})
        except (OSError, ValueError, AttributeError):
            continue
    return {"batches": records, "verified_request_start": "2021-11-14", "verified_request_end": "2026-11-14"}


@router.get("/coverage")
def coverage(data: Dataset, region: str = "world"):
    if data[0] is None:
        with zip_api.connection() as db:
            return zip_api.coverage(db, region)
    if region not in REGIONS:
        raise HTTPException(422, "Unknown region")
    engine, demo = data
    with engine.connect() as connection:
        first, last = connection.execute(select(func.min(O.day), func.max(O.day)).where(in_region(region))).one()
        entries = connection.execute(select(Coverage.__table__).order_by(Coverage.start)).mappings()
        spans = [dict(entry) for entry in entries if contains(entry.region, region)]
    starts = [entry["start"] for entry in spans] + ([first] if first else [])
    ends = [entry["end"] for entry in spans] + ([last] if last else [])
    return {"start": min(starts, default=None), "end": max(ends, default=None), "demo": demo, "spans": spans}


def analysis(data, filters):
    engine, demo = data
    if engine is None:
        with zip_api.connection() as db:
            return zip_api.analysis(db, *filters)
    with engine.connect() as connection:
        return {"demo": demo, **build_calendar(connection, *filters)}


@router.get("/calendar")
def calendar(data: Dataset, filters: Window):
    return analysis(data, filters)


def daily(data, filters):
    region, first, last = filters
    if (last - first).days >= 366:
        raise HTTPException(422, "Daily calendar accepts up to 366 days per request")
    engine, _ = data
    if engine is None:
        with zip_api.connection() as db:
            return zip_api.daily(db, region, first, last)
    with engine.connect() as connection:
        return daily_calendar(connection, region, first, last)


@router.get("/calendar/daily")
def calendar_daily(data: Dataset, filters: Window):
    return {"demo": data[1], "days": daily(data, filters)}


@router.get("/trends")
def trend_data(data: Dataset, filters: Window):
    result = analysis(data, filters)
    return {"demo": result["demo"], **trends(result["months"])}


@router.get("/anomalies")
def anomalies(data: Dataset, filters: Window):
    result = analysis(data, filters)
    return {"demo": result["demo"], "months": [r for r in result["months"] if r["anomaly"]]}


@router.get("/analysis")
def combined(data: Dataset, filters: Window):
    result = analysis(data, filters)
    return {**result, **trends(result["months"])}


def observation_query(filters, platform):
    region, start, end = filters
    statement = select(O.__table__).where(in_region(region), O.day.between(start, end))
    if platform:
        if platform not in PLATFORMS:
            raise HTTPException(422, "Unknown satellite")
        statement = statement.where(O.platform == platform)
    return statement.order_by(O.id)


@router.get("/hotspots")
def hotspots(data: Dataset, filters: Window, platform: str | None = None,
             after: Annotated[int, Query(ge=0)] = 0, limit: Annotated[int, Query(ge=1, le=5000)] = 3000):
    engine, demo = data
    if engine is None:
        sensors = {"aqua": "MODIS", "noaa20": "VIIRS", "paired": "HARMONIZED"}
        if platform and platform not in sensors:
            raise HTTPException(422, "Unknown archive platform")
        return {"demo": False, **zip_api.cached_hotspots(*filters, sensor=sensors.get(platform), after=after, limit=limit)}
    stmt = observation_query(filters, platform).where(O.id > after).limit(limit + 1)
    stmt = stmt.with_only_columns(O.id, O.latitude, O.longitude, O.utc, O.sensor, O.platform)
    with engine.connect() as connection:
        rows = [dict(row) for row in connection.execute(stmt).mappings()]
    return {"demo": demo, "points": rows[:limit], "next_after": rows[limit - 1]["id"] if len(rows) > limit else None}


@router.get("/comparison")
def comparison(data: Dataset, filters: Window):
    if data[0] is not None:
        raise HTTPException(503, "Uploaded archive required")
    with zip_api.connection() as db:
        return zip_api.comparison(db, *filters)


def protect_cell(value):
    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def csv_response(rows, header, name):
    def stream():
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        for row in (header,):
            writer.writerow(row)
        yield buffer.getvalue()
        for row in rows:
            buffer.seek(0)
            buffer.truncate()
            writer.writerow([protect_cell(value) for value in row])
            yield buffer.getvalue()

    return StreamingResponse(stream(), media_type="text/csv", headers={
        "Content-Disposition": f'attachment; filename="{name}.csv"'
    })


@router.get("/exports/calendar.csv")
def export_calendar(data: Dataset, filters: Window):
    result = analysis(data, filters)
    fields = ["month", "activity", "platform", "calibration_p90_relative_error", "partial", "baseline", "baseline_years", "robust_z", "anomaly"]
    if data[0] is None:
        fields += ["paired_days", "paired_day_fraction", "evaluated_activity"]
    sensors = zip_api.SENSORS if data[0] is None else PLATFORMS
    rows = (
        [result["demo"], *(r[f] for f in fields), *(r["raw"].get(p) for p in sensors), "|".join(r["complete_platforms"])]
        for r in result["months"]
    )
    header = ["synthetic_demo", *fields, *(f"raw_{p}" for p in sensors), "complete_platforms"]
    return csv_response(rows, header, "embera-calendar-demo" if result["demo"] else "embera-calendar")


@router.get("/exports/daily.csv")
def export_daily(data: Dataset, filters: Window):
    fields = ["day", "activity", "platform", "calibration_p90_relative_error"]
    sensors = zip_api.SENSORS if data[0] is None else PLATFORMS
    rows = ([data[1], *(r[field] for field in fields), *(r["raw"].get(p) for p in sensors)] for r in daily(data, filters))
    return csv_response(rows, ["synthetic_demo", *fields, *(f"raw_{p}" for p in sensors)],
                        "embera-daily-demo" if data[1] else "embera-daily")


@router.get("/exports/yearly.csv")
def export_yearly(data: Dataset, filters: Window):
    result = analysis(data, filters)
    records = result["yearly"] if "yearly" in result else trends(result["months"])["yearly"]
    fields = ["year", "activity", "comparable_months"]
    if data[0] is None:
        fields.append("paired_days")
    return csv_response(([row[f] for f in fields] for row in records), fields, "embera-yearly")


@router.get("/exports/equatorial.csv")
def export_equatorial():
    result = equatorial()
    fields = ["month", "evaluated_activity", "baseline", "paired_days", "robust_z", "anomaly"]
    rows = ([country["name"], *(row[f] for f in fields)]
            for country in result["countries"] for row in country["series"] if row["robust_z"] is not None)
    return csv_response(rows, ["country", *fields], "embera-equatorial-holdout")


@router.get("/exports/hotspots.csv")
def export_hotspots(data: Dataset, filters: Window, platform: str | None = None):
    engine, demo = data
    if engine is None:
        sensors = {"aqua": "MODIS", "noaa20": "VIIRS", "paired": "HARMONIZED"}
        if platform and platform not in sensors:
            raise HTTPException(422, "Unknown archive platform")
        # Export the same bounded first page as the map, with the requested sensor.
        with zip_api.connection() as db:
            records = zip_api.hotspots(db, *filters, sensor=sensors.get(platform), limit=5000)["points"]
        fields = ["latitude", "longitude", "sensor", "utc", "weight"]
        return csv_response(([r[f] for f in fields] for r in records), fields, "embera-displayed-grid")
    stmt = observation_query(filters, platform)
    fields = ["utc", "latitude", "longitude", "sensor", "platform", "source"]

    def rows():
        with engine.connect() as connection:
            cursor = connection.execution_options(yield_per=2000).execute(stmt).mappings()
            for row in cursor:
                yield [demo, *(row[f] for f in fields), json.dumps(row["raw"], ensure_ascii=False)]

    return csv_response(rows(), ["synthetic_demo", *fields, "raw_json"],
                        "embera-hotspots-demo" if demo else "embera-hotspots")


app.include_router(router)
