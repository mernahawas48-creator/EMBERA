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
from backend.equatorial import cached as equatorial_report

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
        with zip_api.connection() as db:
            return {"demo": False, **zip_api.hotspots(db, *filters, sensor=sensors.get(platform), after=after, limit=limit)}
    stmt = observation_query(filters, platform).where(O.id > after).limit(limit + 1)
    stmt = stmt.with_only_columns(O.id, O.latitude, O.longitude, O.utc, O.sensor, O.platform)
    with engine.connect() as connection:
        rows = [dict(row) for row in connection.execute(stmt).mappings()]
    return {"demo": demo, "points": rows[:limit], "next_after": rows[limit - 1]["id"] if len(rows) > limit else None}


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
