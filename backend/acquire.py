"""Acquire reviewed challenge archive batches. This module has no implicit data sources."""
import argparse
import hashlib
import json
import os
import time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

import httpx
from filelock import FileLock

from backend.db import database_url, engine_for
from backend.importer import ingest

CHALLENGE = "https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/?tab=resources"
START = date(2021, 11, 14)
END = date(2026, 11, 14)


def validate_manifest(manifest):
    if manifest.get("challenge_resources") != CHALLENGE:
        raise ValueError("The manifest must cite the exact challenge Resources tab")
    resources = set()
    for link in manifest["reviewed_https_resources"]:
        url = urlsplit(link)
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            raise ValueError("Reviewed resources must be HTTPS URLs")
        resources.add(link.rstrip("/"))
    batches = sorted(manifest["batches"], key=lambda b: (b["quality"] == "nrt", b["start"], b["platform"]))
    occupied = {}
    for batch in batches:
        url = urlsplit(batch["url"])
        path = unquote(url.path)
        if url.scheme != "https" or url.username or url.password or "\\" in path or ".." in path.split("/") or not any(
            batch["url"] == resource or batch["url"].startswith(resource + "/") for resource in resources
        ):
            raise ValueError("Every batch must use an explicitly reviewed resource URL or directory")
        start, end = date.fromisoformat(batch["start"]), date.fromisoformat(batch["end"])
        platform, quality = batch["platform"], batch["quality"]
        if platform not in {"terra", "aqua", "snpp", "noaa20", "noaa21"} or quality not in {"science", "nrt"}:
            raise ValueError("Unknown platform or product quality")
        if not START <= start <= end <= END:
            raise ValueError("Batch dates outside the requested five-year window")
        for first, last in occupied.setdefault(platform, []):
            if start <= last and end >= first:
                raise ValueError("Overlapping batches for one platform. Use NRT only to fill science-quality gaps.")
        occupied[platform].append((start, end))
        if batch.get("region") != "world":
            raise ValueError("Each manifest batch must declare a global product")
    return batches


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def save_json(path, document):
    pending = path.with_suffix(".tmp")
    pending.write_text(json.dumps(document, indent=2), encoding="utf-8")
    pending.replace(path)


def download(client, url, path, token):
    partial = path.with_suffix(".part")
    for attempt in range(5):
        try:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            with client.stream("GET", url, headers=headers) as response:
                if response.status_code in {429, 500, 502, 503, 504}:
                    delay = response.headers.get("Retry-After", "")
                    time.sleep(min(120, int(delay)) if delay.isdigit() else 2 ** attempt)
                    continue
                if response.status_code != 200:
                    raise ValueError(f"Archive returned HTTP {response.status_code}; check approved URL and credentials")
                with partial.open("wb") as output:
                    for chunk in response.iter_bytes(1024 * 1024):
                        output.write(chunk)
            partial.replace(path)
            return
        except (httpx.TimeoutException, httpx.NetworkError):
            if attempt < 4:
                time.sleep(2 ** attempt)
    raise ValueError("Download failed after five attempts")


def acquire(manifest, root, limit=None):
    batches = validate_manifest(manifest)
    if not batches:
        raise ValueError("No verified resource batches supplied")
    if engine_for(database_url()).url == engine_for(database_url(True)).url:
        raise ValueError("Production and demo databases must be distinct")
    root.mkdir(parents=True, exist_ok=True)
    processed = 0
    with FileLock(str(root / ".acquire.lock"), timeout=1), httpx.Client(timeout=90, follow_redirects=False) as client:
        for batch in batches:
            first, last = date.fromisoformat(batch["start"]), date.fromisoformat(batch["end"])
            platform, quality = batch["platform"], batch["quality"]
            key = f"{platform}-{quality}-{first}-{last}"
            name = root / f"{key}.csv"
            record = root / f"{key}.json"
            previous = json.loads(record.read_text(encoding="utf-8")) if record.exists() else {}
            source = urlsplit(batch["url"])._replace(query="", fragment="").geturl()
            if previous.get("source") and previous["source"] != source:
                raise ValueError(f"{key}: source changed for an existing batch")
            if name.exists() and not previous.get("source"):
                raise ValueError(f"{key}: raw file lacks a provenance record; review before retrying")
            metadata = dict(platform=platform, quality=quality, source=source, start=str(first),
                            end=str(last), region="world", challenge_resources=CHALLENGE)
            if not name.exists():
                save_json(record, {**metadata, "status": "pending"})
                download(client, batch["url"], name, os.getenv("EARTHDATA_TOKEN") if batch.get("bearer_auth") else None)
            sha = digest(name)
            if (previous.get("sha256") and previous["sha256"] != sha) or (batch.get("sha256") and batch["sha256"] != sha):
                raise ValueError(f"{key}: SHA-256 mismatch")
            target = hashlib.sha256(database_url().encode()).hexdigest()
            if previous.get("status") == "processed" and previous.get("target") == target:
                continue
            provenance = dict(**metadata, status="downloaded", sha256=sha, bytes=name.stat().st_size,
                              downloaded_at=previous.get("downloaded_at") or datetime.now(timezone.utc).isoformat())
            save_json(record, provenance)
            count = ingest(name, ("world", platform, first, last), require_rows=True, expected_quality=quality)
            save_json(record, {**provenance, "status": "processed", "inserted": count, "target": target})
            print(f"{key}: {count:,} new records", flush=True)
            processed += 1
            if limit is not None and processed >= limit:
                break


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--raw-dir", type=Path, default=Path(os.getenv("EMBERA_RAW_DIR", "data/raw")))
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")
    try:
        acquire(json.loads(args.manifest.read_text(encoding="utf-8-sig")), args.raw_dir, args.limit)
    except (ValueError, OSError, KeyError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
