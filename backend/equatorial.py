from datetime import date
from backend.zip_api import analysis, coverage, regions


def compute(db):
    locations = {r["id"]: r for r in regions(db)}
    candidates = db.execute("SELECT country, SUM(occupied) FROM daily GROUP BY country HAVING SUM(occupied)>=1000").fetchall()
    equatorial_observations = {row[0] for row in db.execute(
        "SELECT DISTINCT country FROM cells WHERE y BETWEEN 47 AND 66 AND occupied=1"
    )}
    reports = []
    for country, _ in candidates:
        key = "country:" + country
        _, south, _, north = locations[key]["bounds"]
        if south > 10 or north < -10:
            continue
        if country not in equatorial_observations:
            continue
        span = coverage(db, key)
        report = analysis(db, key, date.fromisoformat(span["start"]), date.fromisoformat(span["end"]))
        if report["calibration"]["factor"] is None:
            continue
        usable = [row for row in report["months"] if row["activity"] is not None]
        if len(usable) < 24:
            continue
        scored = [row for row in usable if row["robust_z"] is not None]
        flagged = [row for row in scored if row["anomaly"]]
        reports.append(dict(**locations[key], calibration=report["calibration"], series=usable,
                            assessed=len(scored), flagged=len(flagged)))
    return {"countries": reports, "evaluated_months": sum(r["assessed"] for r in reports),
            "flagged_months": sum(r["flagged"] for r in reports)}


def cached(db):
    version = tuple(db.execute("SELECT COUNT(*), MAX(rowid), SUM(crc) FROM members").fetchone())
    return cached_for(db, version)


_cache = None


def cached_for(db, version):
    global _cache
    if _cache is None or _cache[0] != version:
        _cache = (version, compute(db))
    return _cache[1]
