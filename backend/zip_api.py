"""Calendar and spatial queries over the uploaded archive's materialized cells."""
import json
import os
from contextlib import closing
from collections import defaultdict
from datetime import timedelta
from datetime import date
from functools import lru_cache
from pathlib import Path

import numpy as np
from fastapi import HTTPException

from backend.analytics import edges, months, trends
from backend.zip_pipeline import STORE, connect

SENSORS = {"MODIS": "aqua", "VIIRS": "noaa20"}


def enabled():
    return Path(os.getenv("EMBERA_ZIP_DB", str(STORE))).is_file()


def connection():
    return closing(connect(Path(os.getenv("EMBERA_ZIP_DB", str(STORE)))))


def region_key(region):
    if region == "world":
        return ""
    if not region.startswith("country:") or not region[8:]:
        raise HTTPException(422, "Unknown archive region")
    return region[8:]


def selector(region):
    key = region_key(region)
    return ("country=?", [key]) if key else ("1=1", [])


def inventory(db, region="world"):
    where, params = selector(region)
    return [(row["country"], row["year"], row["sensor"], json.loads(row["report"]))
            for row in db.execute("SELECT country,year,sensor,report FROM members WHERE " + where, params)]


def regions(db):
    countries = defaultdict(list)
    for country, _, _, report in inventory(db):
        countries[country]
        if report.get("bounds"):
            countries[country].append(report["bounds"])
    return [{"id": "world", "name": "All uploaded countries", "bounds": [-180, -90, 180, 90]}] + [
        {"id": "country:" + country, "name": country.replace("_", " "),
         "bounds": [min(b[0] for b in bounds), min(b[1] for b in bounds), max(b[2] for b in bounds), max(b[3] for b in bounds)]
         if bounds else [-180, -90, 180, 90]}
        for country, bounds in sorted(countries.items())
    ]


def coverage(db, region):
    reports = inventory(db, region)
    first = [r["first"] for _, _, _, r in reports if r.get("first")]
    last = [r["last"] for _, _, _, r in reports if r.get("last")]
    return {"start": min(first, default=None), "end": max(last, default=None), "demo": False,
            "spans": [], "members": len(reports), "failed": sum("error" in r for _, _, _, r in reports),
            "file_years": sorted({year for _, year, _, _ in reports}),
            "sensors": sorted({sensor for _, _, sensor, r in reports if r.get("first")})}


def counts(db, region):
    _, args = selector(region)
    if region == "world":
        # Country labels are not disjoint geographic masks; these are pooled
        # archive totals, not independently verified global satellite coverage.
        query = "SELECT day,sensor,SUM(raw),SUM(occupied) FROM daily GROUP BY day,sensor"
    else:
        query = "SELECT day,sensor,raw,occupied FROM daily WHERE country=?"
    return {(r[0], r[1]): (int(r[2]), int(r[3])) for r in db.execute(query, args)}



def fit_model(pairs):
    folds = []
    for year in sorted({k[:4] for k in pairs}):
        train = [a / b for k, (a, b) in pairs.items() if k[:4] != year and min(a, b) >= 10]
        if len(train) < 8:
            continue
        ratio = float(np.median(train))
        folds.extend((abs(ratio * b - a) / a, abs(b - a) / a)
                     for k, (a, b) in pairs.items() if k[:4] == year and min(a, b) >= 10)
    eligible = {k: a / b for k, (a, b) in pairs.items() if min(a, b) >= 10}
    errors = np.array(folds)
    median = float(np.median(errors[:, 0])) if len(errors) else None
    raw = float(np.median(errors[:, 1])) if len(errors) else None
    p90 = float(np.percentile(errors[:, 0], 90)) if len(errors) else None
    quarters = len({(int(k[5:]) - 1) // 3 for k in eligible})
    years = len({k[:4] for k in eligible})
    iqr = np.percentile(list(eligible.values()), [25, 75]).tolist() if eligible else None
    factor = float(np.median(list(eligible.values()))) if (
        len(folds) >= 12 and years >= 2 and quarters == 4 and iqr[1] <= 2 * iqr[0] and median <= raw
    ) else None
    return dict(factor=factor, overlap_months=len(eligible), overlap_years=years, quarters=quarters, ratio_iqr=iqr,
                validation=dict(held_out_months=len(folds), median_relative_error=median,
                                uncalibrated_median_relative_error=raw, p90_relative_error=p90))


def model(db, region):
    inputs = counts(db, region)
    if region == "world":
        # Co-observation must be in the SAME country label and UTC day; a
        # MODIS-only country cannot be paired with a VIIRS-only country.
        matched_countries = {}
        for day, modis, viirs in db.execute(
            "SELECT m.day,SUM(m.occupied),SUM(v.occupied) "
            "FROM daily m INNER JOIN daily v ON v.country=m.country AND v.day=m.day "
            "AND v.sensor='VIIRS' WHERE m.sensor='MODIS' GROUP BY m.day"
        ):
            matched_countries[day] = (int(modis), int(viirs))
        # Preserve ALL raw counts for honest reporting, but restrict calibrated
        # occupancy to country/day pairs. None means no valid pair, not zero.
        inputs = {key: (raw, matched_countries[key[0]][0 if key[1] == "MODIS" else 1]
                        if key[0] in matched_countries else None)
                  for key, (raw, _) in inputs.items()}
    # File first/last detection dates do NOT certify daily swath coverage.
    # Pair days with observations from both sensors without imputing zeros on
    # unobserved days; require >=20 paired days per eligible month below.
    pairs = defaultdict(lambda: [0, 0])
    matched = defaultdict(int)
    for (day, sensor), (_, occupancy) in inputs.items():
        if (sensor == "MODIS" and occupancy is not None
                and (day, "VIIRS") in inputs and inputs[day, "VIIRS"][1] is not None):
            pairs[day[:7]][0] += occupancy
            pairs[day[:7]][1] += inputs[day, "VIIRS"][1]
            matched[day[:7]] += 1
    pairs = {key: pair for key, pair in pairs.items() if matched[key] >= 20}
    return inputs, pairs, matched, fit_model(pairs)


def raw_counts(values):
    return {sensor: values.get(sensor) for sensor in SENSORS}


def analysis(db, region, start, end):
    inputs, pairs, matched, calibration = model(db, region)
    factor = calibration["factor"]
    rows = []
    selected = defaultdict(lambda: defaultdict(int))
    for (day, sensor), (raw, _) in inputs.items():
        if str(start) <= day <= str(end):
            selected[day[:7]][sensor] += raw
    for y, m in months(start, end):
        first, last = edges(y, m)
        month = str(first)[:7]
        partial = first < start or last > end
        reference, secondary = pairs.get(month, (0, 0))
        value = round((reference + factor * secondary) / 2, 4) if factor is not None and month in pairs and not partial else None
        historical = {key: pair for key, pair in pairs.items() if key[:4] < month[:4]}
        past_factor = fit_model(historical)["factor"] if month in pairs else None
        prior = [(a + past_factor * b) / (2 * matched[key]) for key, (a, b) in historical.items()
                 if key[5:] == month[5:] and past_factor is not None]
        baseline = float(np.median(prior)) if len(prior) >= 3 else None
        mad = float(np.median(np.abs(np.asarray(prior) - baseline))) if baseline is not None else 0
        held_out = (reference + past_factor * secondary) / (2 * matched[month]) if past_factor is not None and not partial else None
        # Near-constant baselines can make a tiny difference look like an
        # extreme anomaly. Require at least one occupied cell-day per paired
        # day, or 10% of the baseline, as a practical dispersion floor.
        spread = max(1.4826 * mad, abs(baseline) * .1, 1.0) if baseline is not None else None
        score = round((held_out - baseline) / spread, 2) if held_out is not None and spread else None
        rows.append(dict(month=month, raw=raw_counts(selected[month]), activity=value, platform="paired" if value is not None else None,
                         # Means: 20+ days with both sensors observed, NOT complete satellite coverage.
                         complete_platforms=list(SENSORS) if month in pairs else [], partial=partial,
                         paired_day_fraction=round(matched.get(month, 0) / ((last - first).days + 1), 4),
                         baseline=baseline, baseline_years=len(prior), robust_z=score, evaluated_activity=held_out,
                         paired_days=matched.get(month, 0),
                         anomaly=abs(score) >= 3.5 if score is not None else None,
                         calibration_p90_relative_error=calibration["validation"]["p90_relative_error"] if value is not None else None))
    summaries = trends(rows)
    for item in summaries["yearly"]:
        records = [row for row in rows if row["month"][:4] == item["year"]]
        item["paired_days"] = sum(row["paired_days"] for row in records if row["activity"] is not None)
    return {"demo": False, "months": rows, "calibration": calibration, **summaries}


def daily(db, region, start, end):
    inputs, pairs, _, calibration = model(db, region)
    factor = calibration["factor"]
    result = []
    for n in range((end - start).days + 1):
        day = str(start + timedelta(days=n))
        a, b = [inputs.get((day, sensor)) for sensor in SENSORS]
        value = round((a[1] + factor * b[1]) / 2, 4) if factor is not None and day[:7] in pairs and a and b and a[1] is not None and b[1] is not None else None
        result.append(dict(day=day, activity=value, platform="paired" if value is not None else None,
                           raw=raw_counts({"MODIS": a[0] if a else None, "VIIRS": b[0] if b else None}),
                           calibration_p90_relative_error=None))
    return result


def hotspots(db, region, start, end, sensor=None, after=0, limit=3000):
    """Bounded, date-filtered grid values, never individual fire events.

    `sensor="HARMONIZED"` uses calibrated *occupied* cell-days only on dates
    where both sensors have observations in the selected region. Missing swaths
    are not interpreted as zero fire detections.
    """
    if sensor not in (None, "MODIS", "VIIRS", "HARMONIZED"):
        raise HTTPException(422, "Unknown archive sensor")
    if not 0 <= after or not 1 <= limit <= 5000:
        raise HTTPException(422, "Invalid grid page")
    where, args = selector(region)
    if sensor == "HARMONIZED":
        _, _, _, calibration = model(db, region)
        factor = calibration["factor"]
        if factor is None:
            return {"points": [], "next_after": None, "aggregated": True,
                    "message": "No validated sensor conversion for this region and date history"}
        # The paired-day subquery must use the SAME regional selection.
        query = (
            "WITH matched AS (SELECT country,day FROM daily WHERE " + where +
            " AND day BETWEEN ? AND ? GROUP BY country,day "
            "HAVING MAX(CASE WHEN sensor='MODIS' THEN 1 ELSE 0 END)=1 "
            "AND MAX(CASE WHEN sensor='VIIRS' THEN 1 ELSE 0 END)=1) "
            "SELECT c.x,c.y,"
            "(SUM(CASE WHEN c.sensor='MODIS' THEN c.occupied ELSE 0 END) + "
            " ? * SUM(CASE WHEN c.sensor='VIIRS' THEN c.occupied ELSE 0 END))/2.0 AS weight "
            "FROM cells c INNER JOIN matched m ON c.country=m.country AND c.day=m.day WHERE " +
            ("1=1" if region == "world" else "c.country=?") +
            " GROUP BY c.x,c.y HAVING weight>0 ORDER BY weight DESC,c.x,c.y LIMIT ? OFFSET ?"
        )
        params = [*args, str(start), str(end), factor, *args, limit + 1, after]
    else:
        clause = " AND sensor=?" if sensor else ""
        query = (
            "SELECT x,y,sensor,SUM(raw) AS weight FROM cells WHERE " + where +
            " AND day BETWEEN ? AND ?" + clause +
            " GROUP BY x,y,sensor ORDER BY weight DESC,x,y,sensor LIMIT ? OFFSET ?"
        )
        params = [*args, str(start), str(end), *([sensor] if sensor else []), limit + 1, after]
    records = db.execute(query, params).fetchall()
    more = len(records) > limit
    points = []
    for i, r in enumerate(records[:limit], after + 1):
        s = "HARMONIZED" if sensor == "HARMONIZED" else r["sensor"]
        points.append(dict(id=i, latitude=float(np.rad2deg(np.arcsin((r["y"] + .5) / 57 - 1))),
                           longitude=r["x"] * 2 - 179, sensor=s,
                           platform="paired" if s == "HARMONIZED" else ("modis_all" if s == "MODIS" else "viirs_all"),
                           utc=str(start) + " to " + str(end), weight=float(r["weight"])))
    return {"points": points, "next_after": after + limit if more else None, "aggregated": True,
            "message": "Paired-day calibrated occupancy" if sensor == "HARMONIZED" else "Raw detection-count grid"}


@lru_cache(maxsize=24)
def _cached_hotspots(db_path, version, region, start, end, sensor, after, limit):
    with closing(connect(Path(db_path))) as db:
        return hotspots(db, region, date.fromisoformat(start), date.fromisoformat(end), sensor, after, limit)


def cached_hotspots(region, start, end, sensor=None, after=0, limit=3000):
    path = Path(os.getenv("EMBERA_ZIP_DB", str(STORE)))
    stat = path.stat()
    return _cached_hotspots(str(path.resolve()), (stat.st_mtime_ns, stat.st_size), region,
                            str(start), str(end), sensor, after, limit)


def comparison(db, region, start, end):
    where, args = selector(region)
    rows = db.execute(
        "SELECT sensor,SUM(raw) AS detections,COUNT(DISTINCT day) AS days,COUNT(*) AS cell_days "
        "FROM cells WHERE " + where + " AND day BETWEEN ? AND ? GROUP BY sensor",
        [*args, str(start), str(end)],
    ).fetchall()
    sensors = {row["sensor"]: dict(detections=row["detections"], observed_days=row["days"], occupied_cell_days=row["cell_days"]) for row in rows}
    overlap = db.execute(
        "SELECT COUNT(*) FROM (SELECT country,day,x,y FROM cells WHERE " + where +
        " AND day BETWEEN ? AND ? GROUP BY country,day,x,y HAVING COUNT(DISTINCT sensor)=2)",
        [*args, str(start), str(end)],
    ).fetchone()[0]
    return {"sensors": sensors, "overlapping_cell_days": overlap,
            "grid": "2° longitude by equal-area sine-latitude bins", "period": [str(start), str(end)]}
