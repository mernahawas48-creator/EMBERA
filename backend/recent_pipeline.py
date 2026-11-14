"""Idempotent ingestion of user-supplied FIRMS seven-day NRT CSVs.

The files are regional and lack the historical archive's vegetation-fire type.
Nothing here applies the standard-product cross-sensor calibration to NRT.
"""
import argparse
import hashlib
import json
import os
import shutil
import sqlite3
from collections import Counter
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "recent"
DB = ROOT / "data" / "processed" / "recent.db"
MANIFEST = ROOT / "data" / "processed" / "recent_manifest.json"
REQUIRED = {"latitude", "longitude", "acq_date", "acq_time", "satellite", "confidence", "version", "frp", "daynight"}


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def connection(path=DB):
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    return db


def ingest(modis, viirs):
    sources = {"MODIS": Path(modis), "VIIRS": Path(viirs)}
    for path in sources.values():
        if not path.is_file():
            raise FileNotFoundError(path)
    hashes = {sensor: digest(path) for sensor, path in sources.items()}
    if MANIFEST.exists() and DB.exists():
        previous = json.loads(MANIFEST.read_text(encoding="utf-8"))
        if previous.get("sha256") == hashes:
            return previous
    RAW.mkdir(parents=True, exist_ok=True)
    DB.parent.mkdir(parents=True, exist_ok=True)
    temp_db = DB.with_suffix(".db.part")
    if temp_db.exists():
        temp_db.unlink()
    report = {"sha256": hashes, "sources": {}, "geography": "Northern and Central Africa regional files; not global",
              "processing": "NRT raw observations and 2-degree/equal-area daily cells; no calibrated recent activity"}
    with closing(connection(temp_db)) as db:
        db.executescript("""
            CREATE TABLE observations(id INTEGER PRIMARY KEY, sensor TEXT, platform TEXT, utc TEXT,
              latitude REAL, longitude REAL, frp REAL, confidence TEXT, qualified INTEGER, x INTEGER, y INTEGER);
            CREATE INDEX observations_sensor_time ON observations(sensor,utc);
            CREATE TABLE cells(sensor TEXT, day TEXT, x INTEGER, y INTEGER, raw INTEGER, qualified INTEGER,
              mean_frp REAL, PRIMARY KEY(sensor,day,x,y)) WITHOUT ROWID;
            CREATE INDEX cells_day ON cells(day);
        """)
        for sensor, source in sources.items():
            header = set(pd.read_csv(source, nrows=0).columns)
            if not REQUIRED <= header:
                raise ValueError(f"{source.name}: missing {sorted(REQUIRED - header)}")
            summary = {"rows": 0, "accepted": 0, "rejected": 0, "qualified": 0,
                       "missing_frp": 0, "negative_frp": 0, "platforms": Counter(), "versions": Counter(),
                       "dates": Counter(), "confidence": Counter(), "bounds": [180.0, 90.0, -180.0, -90.0],
                       "type_field_present": "type" in header}
            cell_totals = {}
            for frame in pd.read_csv(source, chunksize=50_000, dtype=str, keep_default_na=False):
                summary["rows"] += len(frame)
                lat = pd.to_numeric(frame.latitude, errors="coerce")
                lon = pd.to_numeric(frame.longitude, errors="coerce")
                frp = pd.to_numeric(frame.frp, errors="coerce")
                time = frame.acq_time.str.zfill(4)
                day = pd.to_datetime(frame.acq_date, format="%Y-%m-%d", errors="coerce")
                valid = (lat.between(-90, 90) & lon.between(-180, 180) & day.notna() &
                         time.str.fullmatch(r"(?:[01][0-9]|2[0-3])[0-5][0-9]") &
                         frame.version.str.contains("NRT", case=False, regex=False))
                summary["rejected"] += int((~valid).sum())
                frame = frame.loc[valid].copy()
                if frame.empty:
                    continue
                frame["latitude"] = lat[valid]
                frame["longitude"] = lon[valid]
                frame["frp_numeric"] = frp[valid]
                frame["acq_time"] = time[valid]
                frame["platform"] = frame.satellite.str.upper().replace({"A": "AQUA", "T": "TERRA", "NOAA-20": "N20"})
                confidence = pd.to_numeric(frame.confidence, errors="coerce") if sensor == "MODIS" else frame.confidence.str.lower()
                qualified = ((frame.platform.eq("AQUA") & confidence.ge(30)) if sensor == "MODIS" else
                             (frame.platform.eq("N20") & confidence.isin(["n", "h", "nominal", "high"])))
                if "type" in frame:
                    qualified &= frame.type.eq("0")
                frame["qualified"] = qualified.astype(int)
                frame["x"] = np.floor((frame.longitude + 180) * .5).clip(0, 179).astype(int)
                frame["y"] = np.floor((1 + np.sin(np.deg2rad(frame.latitude))) * 57).clip(0, 113).astype(int)
                summary["accepted"] += len(frame)
                summary["qualified"] += int(qualified.sum())
                summary["missing_frp"] += int(frame.frp_numeric.isna().sum())
                summary["negative_frp"] += int(frame.frp_numeric.lt(0).sum())
                for name, column in (("platforms", "platform"), ("versions", "version"),
                                     ("dates", "acq_date"), ("confidence", "confidence")):
                    summary[name].update(frame[column].value_counts().to_dict())
                b = summary["bounds"]
                summary["bounds"] = [min(b[0], float(frame.longitude.min())), min(b[1], float(frame.latitude.min())),
                                     max(b[2], float(frame.longitude.max())), max(b[3], float(frame.latitude.max()))]
                records = [(sensor, p, f"{d}T{t[:2]}:{t[2:]}:00Z", float(a), float(o),
                            float(f) if np.isfinite(f) else None, str(c), int(q), int(x), int(y))
                           for p, d, t, a, o, f, c, q, x, y in frame[["platform", "acq_date", "acq_time", "latitude",
                               "longitude", "frp_numeric", "confidence", "qualified", "x", "y"]].itertuples(index=False, name=None)]
                db.executemany("INSERT INTO observations(sensor,platform,utc,latitude,longitude,frp,confidence,qualified,x,y) VALUES (?,?,?,?,?,?,?,?,?,?)", records)
                for (d, x, y), group in frame.groupby(["acq_date", "x", "y"], sort=False):
                    key = (sensor, d, int(x), int(y))
                    count, kept, frp_sum, frp_n = cell_totals.get(key, (0, 0, 0.0, 0))
                    positive = group.frp_numeric.where(group.frp_numeric.ge(0)).dropna()
                    cell_totals[key] = (count + len(group), kept + int(group.qualified.sum()),
                                        frp_sum + float(positive.sum()), frp_n + len(positive))
            db.executemany("INSERT INTO cells VALUES (?,?,?,?,?,?,?)",
                           ((s, d, x, y, n, q, total / nfrp if nfrp else None)
                            for (s, d, x, y), (n, q, total, nfrp) in cell_totals.items()))
            report["sources"][sensor] = {k: dict(v) if isinstance(v, Counter) else v for k, v in summary.items()}
        db.commit()
    for sensor, source in sources.items():
        destination = RAW / f"{sensor.lower()}_{hashes[sensor][:12]}.csv"
        if not destination.exists():
            part = destination.with_suffix(".part")
            with open(source, "rb") as original, open(part, "wb") as target:
                shutil.copyfileobj(original, target)
            if digest(part) != hashes[sensor]:
                part.unlink()
                raise ValueError(f"Hash mismatch copying {sensor}")
            os.replace(part, destination)
        report["sources"][sensor]["stored_raw"] = str(destination.relative_to(ROOT))
    os.replace(temp_db, DB)
    report["created_utc"] = datetime.now(timezone.utc).isoformat()
    temp_manifest = MANIFEST.with_suffix(".json.part")
    temp_manifest.write_text(json.dumps(report, indent=2), encoding="utf-8")
    os.replace(temp_manifest, MANIFEST)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--modis", required=True)
    parser.add_argument("--viirs", required=True)
    args = parser.parse_args()
    result = ingest(args.modis, args.viirs)
    print(json.dumps({sensor: {k: value for k, value in source.items() if k in
        ("rows", "accepted", "rejected", "qualified", "platforms", "versions", "dates", "bounds", "stored_raw")}
        for sensor, source in result["sources"].items()}, indent=2))
