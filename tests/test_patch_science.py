"""Unit-test-only aggregate fixtures; these are NOT observational datasets."""
import json
import sqlite3
from datetime import date

import pytest
from fastapi.testclient import TestClient

from backend import zip_api
from backend.api import app
from backend.zip_pipeline import SCHEMA


def fixture_db(path):
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.executescript(SCHEMA)
    db.execute("CREATE TABLE archive_inventory(path TEXT PRIMARY KEY,crc INTEGER)")
    for year in (2022, 2023, 2024):
        for sensor in ("MODIS", "VIIRS"):
            path_key = f"{sensor}/{year}/unit-test.csv"
            report = json.dumps({"rows": 240 if sensor == "MODIS" else 480,
                                 "first": f"{year}-01-01", "last": f"{year}-12-20",
                                 "bounds": [0, 0, 5, 5]})
            db.execute("INSERT INTO members VALUES (?,?,?,?,?,?)", (path_key, "Test_Country", year, sensor, year, report))
            db.execute("INSERT INTO archive_inventory VALUES (?,?)", (path_key, year))
        for month in range(1, 13):
            for day_no in range(1, 21):
                day = f"{year}-{month:02}-{day_no:02}"
                db.executemany("INSERT INTO daily VALUES (?,?,?,?,?)", [
                    ("Test_Country", day, "MODIS", 1, 1),
                    ("Test_Country", day, "VIIRS", 2, 2),
                ])
                db.executemany("INSERT INTO cells VALUES (?,?,?,?,?,?,?)", [
                    ("Test_Country", day, "MODIS", 90, 57, 1, 1),
                    ("Test_Country", day, "VIIRS", 90, 57, 1, 1),
                    ("Test_Country", day, "VIIRS", 91, 57, 1, 1),
                ])
    db.commit()
    return db


def test_world_aggregates_and_validated_grid(tmp_path):
    db = fixture_db(tmp_path / 'fixture.db')
    try:
        world = zip_api.counts(db, 'world')
        assert world['2024-01-01', 'MODIS'] == (1, 1)
        assert world['2024-01-01', 'VIIRS'] == (2, 2)
        # Extra MODIS-only geography cannot inflate worldwide paired activity.
        for n in range(1, 21):
            day = f'2024-01-{n:02}'
            db.execute('INSERT INTO daily VALUES (?,?,?,?,?)', ('Unpaired_Country', day, 'MODIS', 100, 100))
            db.execute('INSERT INTO cells VALUES (?,?,?,?,?,?,?)', ('Unpaired_Country', day, 'MODIS', 95, 60, 100, 1))
        db.commit()
        assert zip_api.counts(db, 'world')['2024-01-01', 'MODIS'] == (101, 101)
        _, pairs, matched, calibration = zip_api.model(db, 'world')
        assert len(pairs) == 36
        assert matched['2024-01'] == 20
        assert calibration['factor'] == pytest.approx(.5)
        assert calibration['validation']['held_out_months'] == 36
        assert pairs['2024-01'] == [20, 40]
        result = zip_api.analysis(db, 'world', date(2024, 1, 1), date(2024, 1, 31))
        row = result['months'][0]
        assert row['activity'] == 20
        assert row['paired_days'] == 20
        assert row['paired_day_fraction'] == pytest.approx(20 / 31, abs=.0001)
        a = zip_api.hotspots(db, 'world', date(2024, 1, 1), date(2024, 1, 31), sensor='HARMONIZED', limit=1)
        assert a['points'][0]['weight'] == 15
        assert a['next_after'] == 1
        b = zip_api.hotspots(db, 'world', date(2024, 1, 1), date(2024, 1, 31), sensor='HARMONIZED', limit=1, after=1)
        assert b['points'][0]['weight'] == 5
        assert b['next_after'] is None
        raw = zip_api.hotspots(db, 'country:Test_Country', date(2024, 1, 1), date(2024, 1, 31), sensor='MODIS')
        assert len(raw['points']) == 1
        assert raw['points'][0]['platform'] == 'modis_all'
        assert raw['points'][0]['weight'] == 20
        with pytest.raises(Exception):
            zip_api.hotspots(db, 'world', date(2024, 1, 1), date(2024, 1, 31), sensor='BOGUS')
    finally:
        db.close()


def test_archive_api_filters_and_csv(tmp_path, monkeypatch):
    path = tmp_path / 'fixture.db'
    fixture_db(path).close()
    monkeypatch.setenv('EMBERA_ZIP_DB', str(path))
    client = TestClient(app)
    qs = 'region=country:Test_Country&start=2024-01-01&end=2024-01-31'
    response = client.get('/api/analysis?' + qs)
    assert response.status_code == 200, response.text
    assert response.json()['months'][0]['paired_days'] == 20
    result = client.get('/api/hotspots?' + qs + '&platform=paired&limit=1')
    assert result.status_code == 200, result.text
    assert result.json()['aggregated'] is True
    assert result.json()['points'][0]['sensor'] == 'HARMONIZED'
    assert result.json()['next_after'] == 1
    assert client.get('/api/hotspots?' + qs + '&platform=nonexistent').status_code == 422
    csv = client.get('/api/exports/hotspots.csv?' + qs + '&platform=aqua')
    assert csv.status_code == 200 and 'MODIS' in csv.text and 'VIIRS' not in csv.text
    assert 'paired_day_fraction' in client.get('/api/exports/calendar.csv?' + qs).text
    assert client.get('/api/processing').json()['checkpoint_verified'] is True
