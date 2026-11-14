import argparse
import calendar
import hashlib
import json
import math
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from alembic import command
from alembic.config import Config
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from backend.db import Coverage, Observation, database_url, engine_for
from backend.regions import PLATFORMS, REGIONS

ALIASES = {
    "t": "terra", "terra": "terra", "a": "aqua", "aqua": "aqua",
    "n": "snpp", "snpp": "snpp", "suomi npp": "snpp", "npp": "snpp",
    "n20": "noaa20", "noaa20": "noaa20", "noaa-20": "noaa20",
    "n21": "noaa21", "noaa21": "noaa21", "noaa-21": "noaa21",
}
REQUIRED = {"latitude", "longitude", "acq_date", "acq_time", "satellite"}


def normalized(row, source):
    lat, lon = float(row["latitude"]), float(row["longitude"])
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("Coordinates out of range")
    day = date.fromisoformat(row["acq_date"])
    if not 2000 <= day.year <= 2100:
        raise ValueError("Date outside supported years 2000–2100")
    time = row["acq_time"].zfill(4)
    if len(time) != 4 or not time.isascii() or not time.isdigit() or int(time[:2]) > 23 or int(time[2:]) > 59:
        raise ValueError("Invalid UTC acquisition time")
    utc = f"{day}T{time[:2]}:{time[2:]}Z"
    platform = ALIASES.get(row["satellite"].strip().lower())
    sensor = row.get("instrument", "").strip().upper() or PLATFORMS.get(platform)
    if not platform or PLATFORMS[platform] != sensor:
        raise ValueError("Unrecognized satellite and instrument combination")
    key = json.dumps([platform, utc, lon or 0, lat or 0], separators=(",", ":"))
    return dict(fingerprint=hashlib.sha256(key.encode()).hexdigest(), day=day, utc=utc,
                x=min(1439, math.floor((lon + 180) * 4)), y=min(719, math.floor((lat + 90) * 4)),
                latitude=lat, longitude=lon, sensor=sensor, platform=platform, source=source, raw=row)


def insert_rows(connection, model, rows):
    if not rows:
        return 0
    insert = sqlite_insert if connection.dialect.name == "sqlite" else pg_insert
    return connection.execute(insert(model).on_conflict_do_nothing(), rows).rowcount


def ingest(path, coverage=None, require_rows=False, expected_quality=None):
    path = Path(path)
    source = path.name
    imported = 0
    line = 1
    with engine_for(database_url()).begin() as connection:
        for frame in pd.read_csv(path, dtype=str, keep_default_na=False, chunksize=5000, encoding="utf-8-sig"):
            frame.columns = frame.columns.str.strip().str.lower()
            missing = REQUIRED - set(frame.columns)
            if missing:
                raise ValueError(f"Missing FIRMS fields: {', '.join(sorted(missing))}")
            batch = []
            for row in frame.to_dict("records"):
                line += 1
                try:
                    obs = normalized(row, source)
                    if expected_quality:
                        version = row.get("version", "").strip().upper()
                        if not version or ("NRT" in version) != (expected_quality == "nrt"):
                            raise ValueError("Missing or inconsistent FIRMS product version")
                        if not row.get("confidence", "").strip():
                            raise ValueError("Missing confidence in a declared archive batch")
                    if coverage:
                        region, platform, start, end = coverage
                        w, s, e, n = REGIONS[region]["bounds"]
                        if not (platform == obs["platform"] and start <= obs["day"] <= end and
                                w <= obs["longitude"] <= e and s <= obs["latitude"] <= n):
                            raise ValueError("Row falls outside declared platform, bounds, or dates")
                except ValueError as exc:
                    raise ValueError(f"{source}, record {line}: {exc}") from exc
                batch.append(obs)
            imported += insert_rows(connection, Observation, batch)
        if require_rows and line == 1:
            raise ValueError("Global batch contains no observations")
        if coverage:
            region, platform, start, end = coverage
            insert_rows(connection, Coverage, [dict(region=region, platform=platform, start=start, end=end, source=source)])
    return imported


def seed_demo():
    import os
    if engine_for(database_url()).url == engine_for(database_url(True)).url:
        raise ValueError("Demo and production databases must be distinct")
    previous = os.environ.get("EMBERA_MIGRATE_DEMO")
    try:
        os.environ["EMBERA_MIGRATE_DEMO"] = "true"
        command.upgrade(Config("alembic.ini"), "head")
    finally:
        if previous is None:
            os.environ.pop("EMBERA_MIGRATE_DEMO", None)
        else:
            os.environ["EMBERA_MIGRATE_DEMO"] = previous
    rng = np.random.default_rng(3106)
    # Illustrative clusters only. No row is a measurement.
    clusters = {
        "western-us": [(39, -121), (44, -119), (36, -113)],
        "amazon": [(-11, -55), (-7, -65), (-15, -61)],
        "mediterranean": [(39, 24), (41, -6), (36, 4)],
        "se-asia": [(16, 98), (-2, 114), (8, 104)],
        "australia": [(-14, 131), (-31, 149), (-35, 117)],
    }
    source = "synthetic-demo-v1"
    with engine_for(database_url(True)).begin() as connection:
        for year in range(2014, 2025):
            for month in range(1, 13):
                batch = []
                days = calendar.monthrange(year, month)[1]
                for region, centers in clusters.items():
                    peak = {"australia": 12, "se-asia": 3}.get(region, 8)
                    season = (1 + math.cos((month - peak) * math.tau / 12)) / 2
                    count = round(12 + season**2 * 94 * rng.uniform(.6, 1.5))
                    if region == "australia" and year == 2019 and month in (11, 12):
                        count *= 5
                    for i in range(count):
                        lat, lon = centers[i % len(centers)]
                        lat += rng.normal(0, .65)
                        lon += rng.normal(0, .9)
                        acquired = date(year, month, int(rng.integers(1, days + 1)))
                        for platform, satellite, hour in [("terra", "Terra", "1030"), ("snpp", "N", "1330")]:
                            if platform == "terra" and (year == 2024 or rng.random() < .24):
                                continue
                            row = dict(latitude=f"{lat:.4f}", longitude=f"{lon:.4f}", acq_date=str(acquired),
                                       acq_time=hour, satellite=satellite, instrument=PLATFORMS[platform],
                                       confidence="80" if platform == "terra" else "n", synthetic="true")
                            batch.append(normalized(row, source))
                insert_rows(connection, Observation, batch)
        insert_rows(connection, Coverage, [
            dict(region="world", platform=platform, start=date(2014, 1, 1), end=date(year, 12, 31), source=source)
            for platform, year in [("terra", 2023), ("snpp", 2024)]
        ])


def main():
    parser = argparse.ArgumentParser(description="Import NASA FIRMS archives or seed isolated sample data")
    parser.add_argument("files", nargs="*")
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--coverage", nargs=4, metavar=("REGION", "PLATFORM", "START", "END"))
    args = parser.parse_args()
    if args.demo:
        if args.files or args.coverage:
            parser.error("--demo cannot be combined with archive inputs")
        seed_demo()
        print("Synthetic demo database ready.")
        return
    if not args.files:
        parser.error("Provide at least one CSV")
    coverage = None
    if args.coverage:
        region, platform, first, last = args.coverage
        try:
            start, end = date.fromisoformat(first), date.fromisoformat(last)
        except ValueError:
            parser.error("Coverage dates must be YYYY-MM-DD")
        if len(args.files) != 1 or region not in REGIONS or platform not in PLATFORMS or not 2000 <= start.year <= end.year <= 2100 or start > end:
            parser.error("Coverage needs one file, a valid region and platform, and ordered dates")
        coverage = region, platform, start, end
    if engine_for(database_url()).url == engine_for(database_url(True)).url:
        parser.error("Production and demo databases must be distinct")
    for path in args.files:
        try:
            print(f"{path}: {ingest(path, coverage):,} new observations")
        except (ValueError, OSError) as exc:
            parser.error(str(exc))


if __name__ == "__main__":
    main()
