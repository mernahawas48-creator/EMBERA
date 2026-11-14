"""Print coverage, data quality, and out-of-period validation for the imported ZIP."""
import json
from collections import Counter
from contextlib import closing

from backend.equatorial import compute
from backend.zip_api import coverage, inventory, model
from backend.zip_pipeline import connect


def audit(db):
    files = inventory(db)
    found = {(country, year, sensor) for country, year, sensor, _ in files}
    years = sorted({year for _, year, _, _ in files})
    countries = sorted({country for country, _, _, _ in files})
    metrics = compute(db)
    calibration = {}
    for country in countries:
        result = model(db, "country:" + country)[-1]
        if result["validation"]["held_out_months"]:
            calibration[country] = result
    platforms = Counter()
    versions = Counter()
    for _, _, _, report in files:
        platforms.update(report.get("platforms", {}))
        versions.update(report.get("versions", {}))
    expected = db.execute("SELECT 1 FROM sqlite_master WHERE name='archive_inventory'").fetchone()
    pending = db.execute("SELECT path FROM archive_inventory WHERE path NOT IN (SELECT path FROM members)").fetchall() if expected else []
    return {
        "coverage": coverage(db, "world"),
        "country_labels": countries,
        "years": years,
        "platform_rows": dict(platforms),
        "product_version_rows": dict(versions),
        "pending_members": [row[0] for row in pending],
        "members_by_year_and_sensor": dict(Counter(f"{year}:{sensor}" for _, year, sensor, _ in files)),
        "missing_country_year_sensor": [[c, y, s] for c in countries for y in years for s in ("MODIS", "VIIRS")
                                        if (c, y, s) not in found],
        "quality": {k: sum(r.get(k, 0) for _, _, _, r in files)
                    for k in ("rows", "rejected", "duplicates", "missing_frp", "unknown_confidence", "nrt")},
        "failures": {f"{c}/{y}/{s}": r["error"] for c, y, s, r in files if "error" in r},
        "equatorial_scored_months": metrics["evaluated_months"],
        "equatorial_flagged_months": metrics["flagged_months"],
        "equatorial_validation": {r["name"]: r["calibration"]["validation"] for r in metrics["countries"]},
        "country_calibration": calibration,
    }


if __name__ == "__main__":
    with closing(connect()) as db:
        print(json.dumps(audit(db), indent=2))
