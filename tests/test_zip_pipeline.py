from io import BytesIO

from backend.zip_api import fit_model
from backend.zip_pipeline import process_member

HEADER = "latitude,longitude,acq_date,acq_time,confidence,satellite,version,frp,type,daynight,instrument\n"


def test_archive_grid_preserves_raw_and_filters_occupancy():
    rows = [
        "0,0,2025-01-01,1330,90,Aqua,6.1,4,0,D,MODIS",
        "0,0,2025-01-01,1330,90,Aqua,6.1,4,0,D,MODIS",
        "0.1,0.1,2025-01-01,1331,90,Aqua,6.1,5,0,D,MODIS",
        "5,5,2025-01-01,1331,90,Terra,6.1,6,0,D,MODIS",
        "6,6,2025-01-01,1331,90,Aqua,6.1NRT,7,0,D,MODIS",
        "8,8,2025-01-01,1331,10,Aqua,6.1,,0,D,MODIS",
        "9,9,2025-01-01,1331,90,Aqua,6.1,8,2,D,MODIS",
        "110,5,2025-01-01,1331,90,Aqua,6.1,8,0,D,MODIS",
    ]
    grid, report = process_member(BytesIO((HEADER + "\n".join(rows)).encode()), "MODIS", 2025)
    assert report["rejected"] == report["duplicates"] == report["missing_frp"] == report["nrt"] == 1
    assert int(grid.raw.sum()) == 6
    assert int(grid.occupied.sum()) == 1


def test_leave_year_out_calibration():
    pairs = {f"{year}-{month:02d}": (100, 200) for year in (2023, 2024, 2025) for month in range(1, 13)}
    model = fit_model(pairs)
    assert model["factor"] == .5
    assert model["validation"]["held_out_months"] == 36
    assert model["validation"]["median_relative_error"] == 0
    assert fit_model({k: v for k, v in pairs.items() if k.startswith("2025")})["factor"] is None
