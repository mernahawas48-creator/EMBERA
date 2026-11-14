"""Train-once multivariate anomaly detector for historical paired occupancy.

No wildfire labels exist. Scores measure novelty within the supplied archive,
not fire risk or prediction accuracy. The seven-day NRT files are excluded.
"""
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from backend.zip_api import connection, fit_model, model

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "data" / "processed" / "ml_model.json"
RESULTS = ROOT / "data" / "processed" / "ml_results.json"
FEATURES = ["seasonal_log_ratio", "prior_month_log_change", "repeat_cell_fraction",
            "sensor_occupancy_gap", "paired_day_fraction"]


def cell_repetition(db, country):
    """Fraction of MODIS occupied cell-days recurring in a month's grid cells."""
    rows = db.execute(
        "SELECT substr(day,1,7),COUNT(*),COUNT(DISTINCT x*114+y) FROM cells "
        "WHERE country=? AND sensor='MODIS' AND occupied=1 GROUP BY substr(day,1,7)", (country,)
    )
    return {month: 1 - unique / visits for month, visits, unique in rows if visits}


def feature_rows(db):
    candidates = [r[0] for r in db.execute(
        "SELECT country FROM daily WHERE day<'2024-01-01' GROUP BY country "
        "HAVING SUM(occupied)>=1000 ORDER BY country"
    )]
    rows, countries, excluded = [], {}, defaultdict(int)
    for country in candidates:
        _, pairs, matched, _ = model(db, "country:" + country)
        train_pairs = {month: value for month, value in pairs.items() if month < "2024-01"}
        calibration = fit_model(train_pairs)
        factor = calibration["factor"]
        if factor is None or len(train_pairs) < 24:
            excluded["insufficient_pre_2024_calibration"] += 1
            continue
        activities = {month: (a + factor * b) / (2 * matched[month]) for month, (a, b) in pairs.items()}
        seasonal = {m: float(np.median([value for month, value in activities.items()
                       if month < "2024-01" and month[5:] == m])) for m in
                    {month[5:] for month in train_pairs}}
        if len(seasonal) < 12:
            excluded["incomplete_train_season"] += 1
            continue
        repeats = cell_repetition(db, country)
        countries[country] = {"factor": factor, "calibration": calibration,
                              "baseline": seasonal, "train_months": len(train_pairs)}
        previous = None
        for month in sorted(activities):
            a, b = pairs[month]
            value = activities[month]
            baseline = seasonal[month[5:]]
            if previous is None or month not in repeats:
                previous = value
                excluded["missing_prior_or_spatial_feature"] += 1
                continue
            days = int(month[5:])
            year = int(month[:4])
            from calendar import monthrange
            fraction = matched[month] / monthrange(year, days)[1]
            gap = abs(a - factor * b) / (a + factor * b + 1)
            vector = [float(np.log((value + 1) / (baseline + 1))),
                      float(np.log((value + 1) / (previous + 1))),
                      repeats[month], gap, fraction]
            rows.append({"country": country, "month": month, "activity": value,
                         "baseline": baseline, "paired_days": matched[month],
                         "raw_occupied": {"MODIS": a, "VIIRS": b},
                         "features": vector})
            previous = value
    return rows, countries, dict(excluded)


def train():
    with connection() as db:
        rows, countries, excluded = feature_rows(db)
    train_rows = [r for r in rows if r["month"] < "2024-01"]
    validation = [r for r in rows if "2024-01" <= r["month"] < "2025-01"]
    holdout = [r for r in rows if "2025-01" <= r["month"] < "2026-01"]
    if len(train_rows) < 100 or len(validation) < 20 or len(holdout) < 20:
        raise ValueError("Insufficient chronological country-month coverage for ML training")
    x = np.asarray([r["features"] for r in train_rows], dtype=float)
    center = np.median(x, axis=0)
    spread = np.maximum(np.percentile(x, 75, axis=0) - np.percentile(x, 25, axis=0), .05)
    z = (x - center) / spread
    mean = z.mean(axis=0)
    cov = np.cov(z, rowvar=False)
    shrinkage = .25
    regularized = (1 - shrinkage) * cov + shrinkage * np.diag(np.maximum(np.diag(cov), .1))
    inverse = np.linalg.inv(regularized)

    def score(items):
        values = (np.asarray([r["features"] for r in items], dtype=float) - center) / spread - mean
        return np.sqrt(np.maximum(0, np.einsum("ij,jk,ik->i", values, inverse, values)))

    train_scores = score(train_rows)
    threshold = float(np.percentile(train_scores, 97.5))
    all_rows = train_rows + validation + holdout
    for row, value in zip(all_rows, score(all_rows)):
        row["score"] = round(float(value), 4)
        row["anomaly"] = bool(value > threshold)
        row["seasonal_z"] = round((row["activity"] - row["baseline"]) /
                                  max(1.0, .1 * row["baseline"]), 3)
        row["seasonal_flag"] = abs(row["seasonal_z"]) >= 3.5
        row["split"] = "train" if row["month"] < "2024-01" else "validation" if row["month"] < "2025-01" else "holdout"

    def metrics(items):
        values = np.asarray([r["score"] for r in items])
        ml = {i for i, r in enumerate(items) if r["anomaly"]}
        seasonal = {i for i, r in enumerate(items) if r["seasonal_flag"]}
        return {"samples": len(items), "countries": len({r["country"] for r in items}),
                "score_median": float(np.median(values)), "score_p95": float(np.percentile(values, 95)),
                "ml_flags": len(ml), "ml_flag_rate": len(ml) / len(items),
                "seasonal_flags": len(seasonal), "flag_overlap": len(ml & seasonal)}

    model_data = {"name": "Regularized robust-covariance novelty model", "version": 1,
                  "trained_utc": datetime.now(timezone.utc).isoformat(),
                  "source": "uploaded standard-product historical archive only; no recent NRT in training",
                  "periods": {"train": "2020-2023", "validation": "2024", "holdout": "2025"},
                  "features": FEATURES, "center": center.tolist(), "spread": spread.tolist(),
                  "mean": mean.tolist(), "inverse_covariance": inverse.tolist(),
                  "shrinkage": shrinkage, "threshold": threshold,
                  "threshold_method": "97.5th percentile of training novelty distances",
                  "countries": countries, "excluded": excluded,
                  "metrics": {"train": metrics(train_rows), "validation": metrics(validation),
                              "holdout": metrics(holdout)},
                  "limitations": ["No independent wildfire event labels; no precision/recall or hazard prediction",
                                  "Country-month samples are not unique fires or burned area",
                                  "Historical archive lacks comparable FRP aggregates",
                                  "Recent NRT files lack vegetation type and have no validated calibration transfer"]}
    results = {"records": all_rows, "case": choose_case(holdout, countries)}
    MODEL.parent.mkdir(parents=True, exist_ok=True)
    for path, data in ((MODEL, model_data), (RESULTS, results)):
        temp = path.with_suffix(".json.part")
        temp.write_text(json.dumps(data, indent=2), encoding="utf-8")
        temp.replace(path)
    return model_data, results


def choose_case(holdout, countries):
    # The highest model novelty with a valid paired month is a reproducible
    # observed case; it may be flagged or normal under the trained threshold.
    row = max(holdout, key=lambda item: item["score"])
    return {**row, "factor": countries[row["country"]]["factor"],
            "calibration": countries[row["country"]]["calibration"]}


def load():
    if not MODEL.is_file() or not RESULTS.is_file():
        return None
    return json.loads(MODEL.read_text(encoding="utf-8")), json.loads(RESULTS.read_text(encoding="utf-8"))


if __name__ == "__main__":
    metadata, output = train()
    print(json.dumps({"metrics": metadata["metrics"], "countries": len(metadata["countries"]),
                      "threshold": metadata["threshold"], "case": output["case"]["country"] + " " + output["case"]["month"]}, indent=2))
