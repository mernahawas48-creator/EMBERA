REGIONS = {
    "world": {"name": "Global", "bounds": [-180, -90, 180, 90]},
    "western-us": {"name": "Western United States", "bounds": [-125, 31, -105, 49]},
    "amazon": {"name": "Amazon Basin window", "bounds": [-80, -21, -44, 6]},
    "mediterranean": {"name": "Mediterranean window", "bounds": [-10, 30, 38, 46]},
    "se-asia": {"name": "Southeast Asia window", "bounds": [92, -11, 142, 28]},
    "australia": {"name": "Australia window", "bounds": [112, -44, 154, -10]},
}

PLATFORMS = {
    "terra": "MODIS", "aqua": "MODIS", "snpp": "VIIRS",
    "noaa20": "VIIRS", "noaa21": "VIIRS",
}


def contains(outer, inner):
    w, s, e, n = REGIONS[outer]["bounds"]
    iw, ins, ie, inn = REGIONS[inner]["bounds"]
    return w <= iw and s <= ins and e >= ie and n >= inn
