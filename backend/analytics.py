from calendar import monthrange
from collections import defaultdict
from datetime import date, timedelta

import numpy as np
from sqlalchemy import and_, case, extract, func, or_, select

from backend.db import Coverage, Observation as O
from backend.regions import PLATFORMS, REGIONS, contains


def in_region(region):
    west, south, east, north = REGIONS[region]["bounds"]
    if region == "world":
        return and_(O.latitude >= -90, O.latitude <= 90)
    return and_(O.latitude.between(south, north), O.longitude.between(west, east))


def accepted():
    confidence = func.lower(func.trim(O.raw["confidence"].as_string()))
    # MODIS numeric confidence >=30; VIIRS nominal or high. Unknown is excluded.
    modis = or_(confidence.in_([str(i) for i in range(30, 101)]), confidence.in_([f"{i:03d}" for i in range(30, 101)]))
    return case((or_(and_(O.sensor == "MODIS", modis),
                     and_(O.sensor == "VIIRS", confidence.in_(["n", "h", "nominal", "high"]))), 1), else_=0)


def months(start, end):
    for index in range(start.year * 12 + start.month - 1, end.year * 12 + end.month):
        year, offset = divmod(index, 12)
        yield year, offset + 1


def edges(year, month):
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


def coverage_for(connection, region, science_only=False):
    spans = defaultdict(list)
    statement = select(Coverage.__table__).order_by(Coverage.start, Coverage.end)
    for entry in connection.execute(statement).mappings():
        if not contains(entry.region, region):
            continue
        if science_only and "-nrt-" in entry.source:
            continue
        ranges = spans[entry.platform]
        if ranges and entry.start <= ranges[-1][1] + timedelta(days=1):
            ranges[-1] = (ranges[-1][0], max(ranges[-1][1], entry.end))
        else:
            ranges.append((entry.start, entry.end))
    return spans


def covered(spans, platform, first, last):
    return any(start <= first and end >= last for start, end in spans[platform])


def monthly_counts(connection, region, start, end):
    yr, mo = extract("year", O.day), extract("month", O.day)
    grouped = (
        select(yr.label("year"), mo.label("month"), O.platform, O.day, O.x, O.y,
               func.count().label("raw"), func.max(accepted()).label("occupied"))
        .where(in_region(region), O.day.between(start, end))
        .group_by(yr, mo, O.platform, O.day, O.x, O.y).subquery()
    )
    statement = select(grouped.c.year, grouped.c.month, grouped.c.platform, func.sum(grouped.c.occupied), func.sum(grouped.c.raw))
    statement = statement.group_by(grouped.c.year, grouped.c.month, grouped.c.platform)
    result = defaultdict(dict)
    for year, month, platform, cells, raw in connection.execute(statement):
        result[(int(year), int(month))][platform] = (int(cells), int(raw))
    return result


def daily_calendar(connection, region, first, last):
    spans = coverage_for(connection, region)
    limits = [day for ranges in spans.values() for span in ranges for day in span]
    science_spans = coverage_for(connection, region, science_only=True)
    fit = calibrate(monthly_counts(connection, region, min(limits), max(limits)), science_spans) if limits else calibrate({}, spans)
    cells = select(O.day, O.platform, O.x, O.y, func.count().label("raw"), func.max(accepted()).label("occupied")).where(
        in_region(region), O.day.between(first, last)
    ).group_by(O.day, O.platform, O.x, O.y).subquery()
    counts = defaultdict(dict)
    for day, platform, occupied, raw in connection.execute(
        select(cells.c.day, cells.c.platform, func.sum(cells.c.occupied), func.sum(cells.c.raw)).group_by(cells.c.day, cells.c.platform)
    ):
        counts[day][platform] = (int(occupied), int(raw))
    result = []
    for offset in range((last - first).days + 1):
        day = first + timedelta(days=offset)
        detections = counts[day]
        value, platform = activity_for(detections, science_spans, fit, day, day)
        result.append(dict(
            day=str(day), activity=value, platform=platform,
            calibration_p90_relative_error=fit["validation"]["p90_relative_error"] if platform == "snpp" else None,
            raw={p: detections.get(p, (0, 0))[1] if p in detections or covered(spans, p, day, day) else None for p in PLATFORMS},
        ))
    return result


def calibrate(history, spans):
    ratios = []
    for (year, month), row in history.items():
        first, last = edges(year, month)
        if all(covered(spans, p, first, last) for p in ("terra", "snpp")):
            terra, snpp = (row.get(p, (0, 0))[0] for p in ("terra", "snpp"))
            if min(terra, snpp) >= 10:
                ratios.append((year, month, terra / snpp))
    years = len({y for y, _, _ in ratios})
    seasons = len({(m - 1) // 3 for _, m, _ in ratios})
    values = [ratio for _, _, ratio in ratios]
    factor = float(np.median(values)) if values else None
    iqr = [float(v) for v in np.percentile(values, [25, 75])] if values else None
    stable = iqr is not None and iqr[1] <= 2 * iqr[0]
    errors = []
    raw_errors = []
    if years >= 2:
        for year in sorted({y for y, _, _ in ratios}):
            training = [ratio for y, _, ratio in ratios if y != year]
            if len(training) < 6:
                continue
            fold_factor = float(np.median(training))
            for y, month, _ in ratios:
                if y == year:
                    ref = history[(y, month)]["terra"][0]
                    other = history[(y, month)]["snpp"][0]
                    errors.append(abs(fold_factor * other - ref) / ref)
                    raw_errors.append(abs(other - ref) / ref)
    validation = {
        "held_out_months": len(errors),
        "median_relative_error": float(np.median(errors)) if errors else None,
        "uncalibrated_median_relative_error": float(np.median(raw_errors)) if errors else None,
        "p90_relative_error": float(np.percentile(errors, 90)) if errors else None,
    }
    passed = len(errors) >= 12 and validation["median_relative_error"] <= validation["uncalibrated_median_relative_error"]
    return {
        "factor": factor if len(values) >= 12 and years >= 2 and seasons == 4 and stable and passed else None,
        "overlap_months": len(values), "overlap_years": years, "quarters": seasons,
        "ratio_iqr": iqr, "reference": "terra", "secondary": "snpp", "validation": validation,
    }


def activity_for(detections, spans, calibration, first, last):
    if covered(spans, "terra", first, last):
        return float(detections.get("terra", (0, 0))[0]), "terra"
    if calibration["factor"] is not None and covered(spans, "snpp", first, last):
        return round(detections.get("snpp", (0, 0))[0] * calibration["factor"], 4), "snpp"
    return None, None


def build_calendar(connection, region, start, end):
    spans = coverage_for(connection, region)
    limits = [day for ranges in spans.values() for span in ranges for day in span]
    calibration = calibrate({}, spans)
    baseline = defaultdict(list)
    science_spans = coverage_for(connection, region, science_only=True)
    if limits:
        history = monthly_counts(connection, region, min(limits), max(limits))
        calibration = calibrate(history, science_spans)
        for year, month in months(min(limits), max(limits)):
            first, last = edges(year, month)
            if covered(science_spans, "terra", first, last):
                value = history.get((year, month), {}).get("terra", (0, 0))[0]
                baseline[month].append((year, value))

    selected = monthly_counts(connection, region, start, end)
    rows = []
    for year, month in months(start, end):
        first, last = edges(year, month)
        a, b = max(start, first), min(end, last)
        detections = selected.get((year, month), {})
        raw = {
            p: detections.get(p, (0, 0))[1] if p in detections or covered(spans, p, a, b) else None
            for p in PLATFORMS
        }
        activity, platform = activity_for(detections, science_spans, calibration, first, last) if (a, b) == (first, last) else (None, None)
        prior = [v for y, v in baseline[month] if y < year]
        typical = float(np.median(prior)) if len(prior) >= 5 else None
        score = None
        if typical is not None and activity is not None:
            mad = float(np.median(np.abs(np.asarray(prior) - typical)))
            if mad > 0:
                score = round((activity - typical) / (1.4826 * mad), 2)
        rows.append(dict(
            month=f"{year}-{month:02d}", raw=raw, activity=activity, platform=platform,
            calibration_p90_relative_error=calibration["validation"]["p90_relative_error"] if platform == "snpp" else None,
            complete_platforms=[p for p in PLATFORMS if covered(spans, p, a, b)],
            partial=(a, b) != (first, last), baseline=typical, baseline_years=len(prior),
            robust_z=score, anomaly=abs(score) >= 3.5 if score is not None else None,
        ))
    return {"months": rows, "calibration": calibration}


def trends(rows):
    years = defaultdict(list)
    seasons = defaultdict(list)
    for row in rows:
        years[row["month"][:4]].append(row)
        if row["activity"] is not None:
            seasons[int(row["month"][5:])].append(row["activity"])
    yearly = []
    for year, records in years.items():
        values = [r["activity"] for r in records if r["activity"] is not None]
        yearly.append(dict(year=year, activity=round(sum(values), 4) if len(values) == 12 else None,
                           comparable_months=len(values)))
    seasonal = [
        dict(month=m, median=float(np.median(seasons[m])) if seasons[m] else None, years=len(seasons[m]))
        for m in range(1, 13)
    ]
    return {"yearly": yearly, "seasonal": seasonal}
