from datetime import date

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from backend.analytics import activity_for, calibrate
from backend.api import app
from backend.importer import ingest, normalized


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("EMBERA_LEGACY_API", "true")
    monkeypatch.setenv("EMBERA_ZIP_DB", str(tmp_path / "archive.db"))
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'production.db'}")
    monkeypatch.setenv("DEMO_DATABASE_URL", f"sqlite:///{tmp_path / 'demo.db'}")
    monkeypatch.delenv("EMBERA_MIGRATE_DEMO", raising=False)
    command.upgrade(Config("alembic.ini"), "head")
    return TestClient(app)


def test_csv_ingestion_and_api(client, tmp_path):
    path = tmp_path / "firms.csv"
    path.write_text(
        "latitude,longitude,acq_date,acq_time,satellite,instrument,confidence\n"
        "39,-121,2020-07-01,50,Terra,MODIS,80\n"
        "39.01,-120.99,2020-07-01,0051,T,MODIS,80\n"
        "39,-121,2020-07-01,0050,T,MODIS,90\n",
        encoding="utf-8",
    )
    first, last = date(2020, 7, 1), date(2020, 8, 31)
    assert ingest(path, ("world", "terra", first, last)) == 2
    assert ingest(path, ("world", "terra", first, last)) == 0
    search = "?start=2020-07-01&end=2020-09-30&region=western-us"
    result = client.get("/api/analysis" + search)
    assert result.status_code == 200, result.text
    july, august, september = result.json()["months"]
    assert july["raw"]["terra"] == 2 and july["activity"] == 1
    assert august["raw"]["terra"] == 0 and august["activity"] == 0
    assert september["raw"]["terra"] is None and september["activity"] is None
    assert result.json()["yearly"][0]["activity"] is None

    response = client.get("/api/hotspots" + search + "&limit=1").json()
    assert response["points"][0]["utc"] == "2020-07-01T00:50Z"
    next_page = client.get("/api/hotspots" + search + f"&limit=1&after={response['next_after']}").json()
    assert next_page["next_after"] is None and len(next_page["points"]) == 1
    assert client.get("/api/coverage?region=amazon").json()["start"] == "2020-07-01"
    assert client.get("/api/anomalies" + search).json()["months"] == []
    assert client.get("/api/exports/hotspots.csv" + search).text.count("confidence") == 2
    assert "raw_terra" in client.get("/api/exports/calendar.csv" + search).text
    assert client.get("/api/calendar" + search + "&demo=true").status_code == 503
    assert client.get("/api/calendar?start=2021-01-01&end=2020-01-01").status_code == 422
    partial = client.get("/api/calendar?start=2020-07-02&end=2020-07-31").json()["months"][0]
    assert partial["partial"] is True and partial["activity"] is None
    daily = client.get("/api/calendar/daily?start=2020-07-01&end=2020-07-02").json()["days"]
    assert [day["activity"] for day in daily] == [1, 0]
    assert [day["raw"]["terra"] for day in daily] == [2, 0]


def test_overlap_threshold_reference_preference_and_conversion():
    spans = {
        "terra": [(date(2018, 1, 1), date(2019, 12, 31))],
        "snpp": [(date(2018, 1, 1), date(2020, 12, 31))],
    }
    history = {(year, month): {"terra": (18, 80), "snpp": (30, 140)}
               for year in (2018, 2019) for month in range(1, 13)}
    assert calibrate(dict(list(history.items())[:12]), spans)["factor"] is None
    result = calibrate(history, spans)
    assert result["factor"] == .6
    assert result["validation"]["held_out_months"] == 24
    assert result["validation"]["median_relative_error"] == 0
    row = history[(2019, 1)]
    assert activity_for(row, spans, result, date(2019, 1, 1), date(2019, 1, 31)) == (18., "terra")
    assert activity_for({"snpp": (20, 100)}, spans, result, date(2020, 1, 1), date(2020, 1, 31)) == (12., "snpp")


def test_nrt_csv_without_instrument():
    row = dict(latitude="32.58346", longitude="-87.9208", acq_date="2026-11-12",
               acq_time="0134", satellite="T", version="6.1NRT")
    record = normalized(row, "modis-nrt.csv")
    assert record["sensor"] == "MODIS"
    assert "instrument" not in record["raw"]


@pytest.mark.parametrize("field,value", [("latitude", "nan"), ("longitude", "181"), ("acq_time", "2460"), ("satellite", "unknown")])
def test_invalid_firms_fields(field, value):
    row = dict(latitude="40", longitude="-120", acq_date="2020-07-01",
               acq_time="0150", satellite="N", instrument="VIIRS")
    with pytest.raises(ValueError):
        normalized({**row, field: value}, "fixture.csv")
