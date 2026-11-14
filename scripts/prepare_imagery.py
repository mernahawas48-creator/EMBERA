"""Derive the two local displays from NASA SVS Black Marble 2016 (ID 30876)."""
from pathlib import Path

import numpy as np
from PIL import Image

public = Path(__file__).resolve().parents[1] / "public"
with Image.open(public / "black-marble.jpg") as source:
    flat = source.convert("RGB").crop((0, 0, 1024, 512))
flat.save(public / "earth-map.webp", quality=89)

size = 900
axis = (np.arange(size) + .5 - size / 2) / (size * .488)
x, y = np.meshgrid(axis, -axis)
r = np.hypot(x, y)
z = np.sqrt(np.maximum(0, 1 - r**2))
lat0, lon0 = np.radians([12, -15])
lat = np.arcsin(np.clip(y * np.cos(lat0) + z * np.sin(lat0), -1, 1))
lon = lon0 + np.arctan2(x, z * np.cos(lat0) - y * np.sin(lat0))
u = ((lon + np.pi) / (2 * np.pi) * 1024).astype(int) % 1024
v = np.clip(((np.pi / 2 - lat) / np.pi * 512).astype(int), 0, 511)
tex = np.asarray(flat)[v, u].astype(float)
luma = .30 * tex[..., 0] + .49 * tex[..., 1] + .21 * tex[..., 2]
light = np.clip(.65 + .32 * z - .17 * x + .17 * y, .25, 1.1)
rim = np.exp(-np.abs(r - .994) * 130) * np.clip(.54 - .6 * x + .5 * y, .04, 1)
rgb = np.stack([
    (luma * 1.73 + 7) * light + rim * 163,
    (luma * 1.10 + 3) * light + rim * 80,
    (luma * .72 + 1) * light + rim * 38,
], axis=-1)
alpha = np.where(r <= 1, np.clip((1 - r) * 390, 0, 1), rim * np.exp(-(r - 1) * 66))
out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype("uint8")
Image.fromarray(out).save(public / "earth-orb.webp", quality=92)
