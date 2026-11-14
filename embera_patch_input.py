#!/usr/bin/env python3
"""Read-only EMBERA code + ingestion checkpoint audit for preparing a surgical patch.

Reads the current checkout and its existing SQLite checkpoint database. Does NOT
modify the project, ingest fire observations, or copy database/ZIP/data rows.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
import zipfile

SOURCE_DIRS = ("app/", "backend/", "src/", "tests/", "scripts/", "migrations/")
ROOT_SOURCE = {
    ".gitignore", ".env.example", "AGENTS.md", "README.md", "requirements.txt",
    "package.json", "package-lock.json", "tsconfig.json", "next.config.mjs",
    "next.config.js", "next-env.d.ts", "pyproject.toml", "pytest.ini",
    "eslint.config.mjs", "postcss.config.mjs", "alembic.ini", "tailwind.config.ts",
}
ALLOW_SUFFIX = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json",
                ".css", ".scss", ".md", ".toml", ".txt", ".ini", ".yml", ".yaml"}
EXCLUDED_PARTS = {"node_modules", ".venv", "venv", ".python-deps", ".next", "dist",
                  "build", ".pytest_cache", "__pycache__", ".git", "data", ".pytest-tmp"}
MAX_FILE_SIZE = 2 * 1024 * 1024
MAX_BUNDLE_SIZE = 20 * 1024 * 1024


def git(project: Path, *args: str) -> bytes:
    result = subprocess.run(["git", "-C", str(project), *args],
                            capture_output=True, check=True)
    return result.stdout


def is_allowed(path: str) -> bool:
    rel = Path(path.replace('\\', '/'))
    if rel.is_absolute() or ".." in rel.parts:
        return False
    if any(part in EXCLUDED_PARTS or part.startswith('.pytest-tmp') for part in rel.parts):
        return False
    if any(part.startswith('.env') and part != '.env.example' for part in rel.parts):
        return False
    if re.search(r"(?i)(secret|credential|token|private.key|\.pem$|\.p12$|\.db$|\.sqlite|\.zip$)", path):
        return False
    if not (path in ROOT_SOURCE or path.startswith(SOURCE_DIRS)):
        return False
    if rel.suffix.lower() not in ALLOW_SUFFIX and path not in ROOT_SOURCE:
        return False
    return True


def code_bundle(project: Path, out: Path) -> dict:
    tracked = [s for s in git(project, 'ls-files', '-z').decode('utf-8','surrogateescape').split('\0') if s]
    status = git(project, 'status', '--short', '--branch').decode('utf-8','replace')
    head = git(project, 'rev-parse', 'HEAD').decode().strip()
    candidate = [name for name in tracked if is_allowed(name)]
    total = 0
    ignored = []
    selected = []
    archive = out / 'EMBERA_actual_source_for_patch.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for name in candidate:
            path = project / name
            if not path.is_file() or path.is_symlink():
                ignored.append({'file': name, 'reason':'missing or symlink'})
                continue
            size = path.stat().st_size
            if size > MAX_FILE_SIZE or total + size > MAX_BUNDLE_SIZE:
                ignored.append({'file': name, 'reason':'size limit'})
                continue
            payload = path.read_bytes()
            if b'\x00' in payload:
                ignored.append({'file':name, 'reason':'binary'})
                continue
            z.writestr(name, payload)
            selected.append({'file':name, 'bytes':len(payload), 'sha256':hashlib.sha256(payload).hexdigest()})
            total += len(payload)
        z.writestr('_PATCH_MANIFEST.json', json.dumps({
            'base_commit':head, 'git_status':status, 'files':selected, 'ignored':ignored
        },indent=2))
    if not any(f['file']=='backend/api.py' for f in selected) or not any(f['file']=='backend/zip_pipeline.py' for f in selected):
        raise RuntimeError('Missing important project source files in generated bundle. Check git tracking.')
    return {'zip_file':str(archive), 'count':len(selected), 'bytes':total,
            'git_head':head, 'git_status':status, 'excluded':ignored}


def checkpoint_review(db_path: Path) -> dict:
    res = {'database':str(db_path),'exists':db_path.exists()}
    if not db_path.is_file(): return res
    res['size_bytes']=db_path.stat().st_size
    try:
        # Explicit read-only connection. No PRAGMA writes, transactions, migration or ingestion.
        conn = sqlite3.connect(db_path.resolve().as_uri()+'?mode=ro', uri=True, timeout=4)
        try:
            tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            res['tables_present']=sorted(tables)
            if not {'members','archive_inventory'}.issubset(tables):
                res['limitation']='Missing required members/archive_inventory tables'
                return res
            cols_members = {r[1] for r in conn.execute('PRAGMA table_info(members)')}
            cols_inventory = {r[1] for r in conn.execute('PRAGMA table_info(archive_inventory)')}
            if not {'path','country','year','sensor','crc','report'}.issubset(cols_members):
                res['limitation']='members has incompatible columns'; return res
            if not {'path','crc'}.issubset(cols_inventory):
                res['limitation']='archive_inventory has incompatible columns'; return res
            inventory={str(row[0]):str(row[1]) for row in conn.execute('SELECT path, crc FROM archive_inventory')}
            years, countries, sensors = collections.Counter(),set(),collections.Counter()
            report_keys = collections.Counter(); statuses=collections.Counter()
            errors=[]; numeric_sums=collections.defaultdict(int)
            bad_json = 0; members=0; matched=0; mismatched=[]; unmatched=[]
            for path,country,year,sensor,crc,report in conn.execute('SELECT path,country,year,sensor,crc,report FROM members'):
                members+=1
                countries.add(str(country)); years[str(year)]+=1; sensors[str(sensor)]+=1
                if str(path) in inventory and inventory[str(path)]==str(crc): matched+=1
                elif str(path) in inventory: mismatched.append(str(path))
                else: unmatched.append(str(path))
                if report is None: statuses['report_null']+=1; continue
                try:
                    obj=json.loads(report) if isinstance(report,str) else report
                except (TypeError,ValueError):
                    bad_json+=1; continue
                if not isinstance(obj,dict):
                    statuses['report_not_object']+=1;continue
                for key,value in obj.items():
                    report_keys[key]+=1
                    if isinstance(value,(int,float)) and not isinstance(value,bool) and re.search('row|count|duplicate|invalid|failed|skip|reject|processed|insert',key,re.I):
                        numeric_sums[key]+=value
                value=obj.get('status',obj.get('state',obj.get('success',None)))
                statuses[str(value) if value is not None else '(no status field)']+=1
                if obj.get('error') or obj.get('failed') is True:
                    errors.append(str(path))
            res.update({
                'archive_inventory_members':len(inventory), 'member_records':members,
                'member_inventory_crc_matched':matched,
                'members_missing_from_inventory_count':len(unmatched),
                'members_crc_mismatch_count':len(mismatched),
                'inventory_not_in_members_count':len(set(inventory)-{r[0] for r in conn.execute('SELECT path FROM members')}),
                'years_by_member':dict(sorted(years.items())),
                'sensor_by_member':dict(sorted(sensors.items())),
                'country_or_territory_labels':len(countries),
                'report_keys':dict(report_keys),
                'report_status_values':dict(statuses),
                'summed_numeric_report_fields_if_present':dict(numeric_sums),
                'malformed_report_json_count':bad_json,
                'explicit_error_flagged_member_count':len(errors),
                'warning':'Matching checkpoint records alone does not prove row integrity, completion, independent geographic coverage or calibration quality.'
            })
        finally:
            conn.close()
    except (OSError,sqlite3.Error) as exc:
        res['error']=str(exc)
    return res


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--project',default='.',help='Path to existing EMBERA working tree')
    p.add_argument('--db',default=None,help='Optional existing atlas.db path')
    args=p.parse_args()
    project=Path(args.project).expanduser().resolve()
    if not project.is_dir():
        raise SystemExit(f'Project folder not found: {project}')
    out=project.parent/'EMBERA_AUDIT_OUTPUT'
    out.mkdir(exist_ok=True)
    bundle=code_bundle(project,out)
    db=Path(args.db).expanduser().resolve() if args.db else project/'data'/'processed'/'atlas.db'
    review=checkpoint_review(db)
    report=out/'EMBERA_checkpoint_review.json'
    report.write_text(json.dumps({'code':bundle,'checkpoint':review},indent=2,ensure_ascii=False),encoding='utf-8')
    print('Source ZIP:',bundle['zip_file'])
    print('Project files:',bundle['count'],'size:',bundle['bytes'],'bytes')
    print('Checkpoint report:',report)
    print('Database members:',review.get('member_records','unknown'))
    print('CRC-matched:',review.get('member_inventory_crc_matched','unknown'))
    print('Statuses:',review.get('report_status_values','unknown'))
    print('No fire data, database or archive CSVs copied. Review the output for secrets before uploading.')

if __name__=='__main__':
    main()
