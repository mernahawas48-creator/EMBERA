"""Calendar and spatial queries over the uploaded archive's materialized cells."""
import json
import os
from contextlib import closing
from collections import defaultdict
from datetime import timedelta
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
        query = "SELECT day,sensor,SUM(raw),0 FROM daily GROUP BY day,sensor"
    else:
        query = "SELECT day,sensor,raw,occupied FROM daily WHERE country=?"
    return {(r[0], r[1]): (int(r[2]), int(r[3])) for r in db.execute(query, args)}


def observed_months(db, region):
    if region == "world":
        return set()
    files = inventory(db, region)
    intervals = {}
    for country, year, sensor, report in files:
        if report.get("first") and report.get("last"):
            intervals[(country, year, sensor)] = (report["first"], report["last"])
    country = region_key(region)
    result = set()
    for year in sorted({year for _, year, _, _ in files}):
        for m in range(1, 13):
            initial, final = map(str, edges(year, m))
            if all(
                (span := intervals.get((country, year, sensor))) and span[0] <= initial and span[1] >= final
                for sensor in SENSORS
            ):
                result.add(initial[:7])
    return result


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
    comparable = observed_months(db, region)
    pairs = defaultdict(lambda: [0, 0])
    matched = defaultdict(int)
    for (day, sensor), (_, occupancy) in inputs.items():
        if sensor == "MODIS" and day[:7] in comparable and (day, "VIIRS") in inputs:
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
        score = round((held_out - baseline) / (1.4826 * mad), 2) if held_out is not None and mad else None
        rows.append(dict(month=month, raw=raw_counts(selected[month]), activity=value, platform="paired" if value is not None else None,
                         complete_platforms=list(SENSORS) if month in pairs else [], partial=partial,
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
        value = round((a[1] + factor * b[1]) / 2, 4) if factor is not None and day[:7] in pairs and a and b else None
        result.append(dict(day=day, activity=value, platform="paired" if value is not None else None,
                           raw=raw_counts({"MODIS": a[0] if a else None, "VIIRS": b[0] if b else None}),
                           calibration_p90_relative_error=None))
    return result


def hotspots(db, region, start, end, sensor=None):
    where, args = selector(region)
    clause = " AND sensor=?" if sensor else ""
    rows = db.execute(
        "SELECT x,y,sensor,SUM(raw) AS weight FROM cells WHERE " + where +
        " AND day BETWEEN ? AND ?" + clause + " GROUP BY x,y,sensor ORDER BY weight DESC,x,y,sensor LIMIT 5000",
        [*args, str(start), str(end), *([sensor] if sensor else [])]
    )
    return [dict(id=i, latitude=float(np.rad2deg(np.arcsin((r["y"] + .5) / 57 - 1))),
                 longitude=r["x"] * 2 - 179, sensor=r["sensor"], platform=SENSORS[r["sensor"]],
                 utc=str(start) + " to " + str(end), weight=r["weight"]) for i, r in enumerate(rows, 1)]
