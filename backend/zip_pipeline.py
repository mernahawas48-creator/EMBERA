"""Stream supplied FIRMS country-year CSVs into an independent analytics store."""
import argparse
import json
import os
import re
import sqlite3
import zipfile
from contextlib import closing
from pathlib import Path

import numpy as np
import pandas as pd
from filelock import FileLock

PATTERN = re.compile(r"(MODIS|VIIRS)/(20\d\d)/(?:modis|viirs-jpss1)_\2_(.+)\.csv$", re.I)
STORE = Path(os.getenv("EMBERA_ZIP_DB", "data/processed/atlas.db"))
SCHEMA = """
CREATE TABLE IF NOT EXISTS members(path TEXT PRIMARY KEY, country TEXT, year INTEGER, sensor TEXT, crc INTEGER, report TEXT);
CREATE TABLE IF NOT EXISTS cells(country TEXT, day TEXT, sensor TEXT, x INTEGER, y INTEGER, raw INTEGER, occupied INTEGER,
 PRIMARY KEY(country,day,sensor,x,y)) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS cells_day ON cells(day);
CREATE TABLE IF NOT EXISTS daily(country TEXT,day TEXT,sensor TEXT,raw INTEGER,occupied INTEGER,
 PRIMARY KEY(country,day,sensor)) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS daily_day ON daily(day);
"""
FIELDS = ["latitude", "longitude", "acq_date", "acq_time", "confidence", "satellite", "version", "frp", "type", "daynight", "instrument"]


def connect(path=STORE):
    db = sqlite3.connect(path, timeout=45)
    db.row_factory = sqlite3.Row
    return db


def process_member(source, sensor, year):
    report = dict(rows=0, rejected=0, duplicates=0, missing_frp=0, unknown_confidence=0, nrt=0, platforms={}, versions={})
    chunks = []
    first = last = None
    south = west = 180.
    north = east = -180.
    cursor = set()
    for df in pd.read_csv(source, chunksize=150_000, dtype=str, keep_default_na=False,
                          usecols=lambda col: col in FIELDS):
        full_chunk = len(df) == 150_000
        if set(FIELDS) - set(df):
            raise ValueError("Missing fields: " + ", ".join(sorted(set(FIELDS) - set(df))))
        report["rows"] += len(df)
        lat = pd.to_numeric(df.latitude, errors="coerce")
        lon = pd.to_numeric(df.longitude, errors="coerce")
        hhmm = df.acq_time.str.zfill(4)
        day = pd.to_datetime(df.acq_date, format="%Y-%m-%d", errors="coerce")
        good = (lat.between(-90, 90) & lon.between(-180, 180) & day.dt.year.eq(year)
                & hhmm.str.fullmatch(r"(?:[01][0-9]|2[0-3])[0-5][0-9]")
                & df.instrument.str.upper().eq(sensor))
        report["rejected"] += int((~good).sum())
        df = df.loc[good].copy()
        if df.empty:
            continue
        df["latitude"], df["longitude"], df["acq_time"] = lat[good], lon[good], hhmm[good]
        df["satellite"] = df.satellite.str.upper().replace({"T": "TERRA", "A": "AQUA", "NOAA-20": "N20", "NOAA20": "N20", "1": "N20"})
        # Keep identity hashes per member to catch duplicates across chunk boundaries.
        ids = pd.util.hash_pandas_object(df[["latitude", "longitude", "acq_date", "acq_time", "satellite"]], index=False)
        keep = ~ids.duplicated()
        if cursor:
            keep &= ~ids.isin(cursor)
        if full_chunk or cursor:
            cursor.update(ids[keep].to_numpy())
        report["duplicates"] += int((~keep).sum())
        df = df.loc[keep]
        if df.empty:
            continue
        for field, column in [("platforms", "satellite"), ("versions", "version")]:
            for key, count in df[column].value_counts().items():
                report[field][key] = report[field].get(key, 0) + int(count)
        frp = pd.to_numeric(df.frp, errors="coerce")
        report["missing_frp"] += int((~np.isfinite(frp) | frp.lt(0)).sum())
        nrt = df.version.str.contains("NRT|URT", case=False, regex=True)
        report["nrt"] += int(nrt.sum())
        confidence = pd.to_numeric(df.confidence, errors="coerce") if sensor == "MODIS" else df.confidence.str.lower()
        known = confidence.between(0, 100) if sensor == "MODIS" else confidence.isin(["l", "n", "h", "low", "nominal", "high"])
        report["unknown_confidence"] += int((~known).sum())
        platform = "AQUA" if sensor == "MODIS" else "N20"
        qualified = known & (confidence.ge(30) if sensor == "MODIS" else confidence.isin(["n", "h", "nominal", "high"]))
        # Same afternoon platforms, same UTC day, vegetation fires, standard products.
        flag = qualified & df.satellite.eq(platform) & df.type.eq("0") & ~nrt & df.version.ne("")
        first = min(first or "9999", df.acq_date.min())
        last = max(last or "", df.acq_date.max())
        south, north = min(south, df.latitude.min()), max(north, df.latitude.max())
        west, east = min(west, df.longitude.min()), max(east, df.longitude.max())
        # Equal-area cylindrical coordinates (uniform longitude and sine latitude).
        x = np.floor((df.longitude + 180) * .5).clip(0, 179).astype("int16")
        y = np.floor((1 + np.sin(np.deg2rad(df.latitude))) * 57).clip(0, 113).astype("int16")
        grid = pd.DataFrame({"day": df.acq_date, "x": x, "y": y, "occupied": flag.astype("int8")})
        chunks.append(grid.groupby(["day", "x", "y"], sort=False).occupied.agg(raw="size", occupied="max"))
    report.update(first=first, last=last, bounds=[west, south, east, north] if first else None)
    if not chunks:
        return None, report
    return pd.concat(chunks).groupby(level=[0, 1, 2], sort=False).agg({"raw": "sum", "occupied": "max"}).reset_index(), report


def run(archives, limit=None):
    STORE.parent.mkdir(parents=True, exist_ok=True)
    with FileLock(str(STORE) + ".lock", timeout=0), closing(connect()) as db:
        import_archives(db, archives, limit)


def import_archives(db, archives, limit):
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=NORMAL")
    db.execute("PRAGMA busy_timeout=45000")
    db.execute("PRAGMA wal_autocheckpoint=0")
    db.executescript(SCHEMA)
    db.execute("CREATE TABLE IF NOT EXISTS archive_inventory(path TEXT PRIMARY KEY, crc INTEGER)")
    db.commit()
    processed = 0
    for archive in archives:
        try:
            archive_file = zipfile.ZipFile(archive)
        except (OSError, zipfile.BadZipFile) as exc:
            print(f"Archive unavailable: {archive}: {exc}", flush=True)
            continue
        with archive_file as z:
            # Prioritize overlap in active equatorial regions for the first validation.
            targets = {"Brazil", "Indonesia", "Colombia", "Ecuador", "Kenya", "Uganda", "Democratic_Republic_of_the_Congo"}
            entries = [(i, PATTERN.search(i.filename)) for i in z.infolist()]
            with db:
                db.executemany("INSERT OR REPLACE INTO archive_inventory VALUES (?,?)",
                               ((i.filename, i.CRC) for i, match in entries if match))
            db.execute("BEGIN")
            for i, match in sorted(entries, key=lambda pair: (not (pair[1] and pair[1][3] in targets), pair[0].file_size)):
                if not match:
                    if i.filename.lower().endswith(".csv"):
                        print("Unrecognized member:", i.filename, flush=True)
                    continue
                sensor, year, country = match[1].upper(), int(match[2]), match[3]
                key = i.filename
                old = db.execute("SELECT crc,report FROM members WHERE path=?", (key,)).fetchone()
                if old and old["crc"] == i.CRC and "error" not in json.loads(old["report"]):
                    continue
                if old and old["crc"] != i.CRC:
                    print("Conflicting archive member; preserved existing import:", key, flush=True)
                    continue
                try:
                    with z.open(i) as source:
                        grid, report = process_member(source, sensor, year)
                except (ValueError, OSError, zipfile.BadZipFile) as exc:
                    grid, report = None, {"error": str(exc)}
                db.execute("SAVEPOINT archive_member")
                try:
                    if "error" not in report:
                        prefix = (country, sensor, f"{year}-01-01", f"{year}-12-31")
                        for table in ("cells", "daily"):
                            db.execute(f"DELETE FROM {table} WHERE country=? AND sensor=? AND day BETWEEN ? AND ?", prefix)
                        if grid is not None:
                            db.executemany("INSERT INTO cells VALUES (?,?,?,?,?,?,?)",
                                           ((country, day, sensor, x, y, raw, occupied) for day, x, y, raw, occupied in grid.itertuples(index=False, name=None)))
                            summary = grid.groupby("day")[["raw", "occupied"]].sum().reset_index()
                            db.executemany("INSERT INTO daily VALUES (?,?,?,?,?)",
                                           ((country, day, sensor, raw, occupied) for day, raw, occupied in summary.itertuples(index=False, name=None)))
                    report["archive"] = str(Path(archive).resolve())
                    db.execute("INSERT OR REPLACE INTO members VALUES (?,?,?,?,?,?)", (key, country, year, sensor, i.CRC, json.dumps(report)))
                except sqlite3.Error:
                    db.execute("ROLLBACK TO archive_member")
                    raise
                finally:
                    db.execute("RELEASE archive_member")
                processed += 1
                if "error" in report or processed == 1 or processed % 100 == 0:
                    print(processed, key, report.get("error", report.get("rows")), flush=True)
                if limit and processed >= limit:
                    db.commit()
                    db.execute("PRAGMA wal_checkpoint(PASSIVE)")
                    return
                if processed % 100 == 0:
                    db.commit()
                    db.execute("PRAGMA wal_checkpoint(PASSIVE)")
                    db.execute("BEGIN")
    db.commit()
    print("Archive scan complete", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archives", nargs="+")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    run(args.archives, args.limit)
