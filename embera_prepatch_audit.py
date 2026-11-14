#!/usr/bin/env python3
"""Read-only EMBERA local audit; does not import/modify observations or DB.

Run from any location with Python 3.9+:
  python embera_prepatch_audit.py --project "D:\\Mirna\\NASA Space App\\Hot-Spots" --code-bundle
Optional: --archives "D:\\path\\to\\NASA ZIP folder" --db "D:\\path\\to\\existing.sqlite"

Results are written *outside* the project in EMBERA_AUDIT_OUTPUT by default.
No CSV contents, observation rows, credentials or databases are exported.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
import zipfile

SKIP_DIRS = {
    '.git', '.next', '.venv', 'venv', 'env', 'node_modules', '__pycache__',
    'dist', 'build', '.cache', '.pytest_cache', '.mypy_cache', '.turbo',
    'coverage', 'data', 'datasets', 'raw', 'exports', 'output', 'outputs',
    'logs', 'site-packages',
}
CODE_EXTS = {'.py', '.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.sql', '.md', '.toml', '.yaml', '.yml'}
CODE_NAMES = {'package.json', 'tsconfig.json', '.gitignore', 'requirements.txt', 'next.config.js',
              'next.config.mjs', 'next.config.ts', 'vite.config.ts', 'vite.config.js',
              'pytest.ini', 'pyproject.toml', 'Dockerfile', '.dockerignore'}
BLOCKED_NAME = re.compile(r'(\.env|secret|credential|password|private|token|keyfile|service.account|\.pem$|\.p12$)', re.I)
KEY_PATTERN = re.compile(rb'(?:AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')
YEAR_RX = re.compile(r'(?<!\d)(20(?:0\d|1\d|2\d))(?!\d)')
CHECKPOINT_NAMES = ('member', 'archive_inventory', 'checkpoint', 'import_log', 'ingest_log')
DB_EXTS = {'.sqlite', '.sqlite3', '.db'}
DATA_SCAN_SKIP = SKIP_DIRS - {'data', 'datasets', 'raw', 'exports', 'output', 'outputs', 'logs'}
MAX_CODE_FILE = 1_200_000
MAX_BUNDLE = 25_000_000


def path_str(p):
    return str(p).replace('\\', '/')


def list_files(root, skip=SKIP_DIRS, max_depth=10):
    if not root.is_dir():
        return
    for base, dirs, files in os.walk(root):
        bp = Path(base)
        try:
            level = len(bp.relative_to(root).parts)
        except ValueError:
            continue
        dirs[:] = sorted(d for d in dirs if d not in skip and (level + 1) <= max_depth)
        for name in sorted(files):
            yield bp / name


def run_git(root):
    def call(*args):
        try:
            p = subprocess.run(['git', '-C', str(root), *args], capture_output=True, text=True,
                               timeout=12, encoding='utf-8', errors='replace')
            return p.stdout.strip() if p.returncode == 0 else f'[unavailable] {p.stderr.strip()[:180]}'
        except (OSError, subprocess.TimeoutExpired) as exc:
            return f'[unavailable] {exc}'
    return {
        'branch': call('branch', '--show-current'),
        'head': call('rev-parse', 'HEAD'),
        'remote': call('remote', 'get-url', 'origin'),
        'status_porcelain': call('status', '--porcelain=v1', '--untracked-files=normal').splitlines()[:200],
        'recent_commits': call('log', '-3', '--format=%h %cs %s').splitlines(),
    }


def archive_paths(project, extra):
    found = {}
    search_roots = [project] + [Path(x).expanduser() for x in extra]
    for root in search_roots:
        if root.is_file() and root.suffix.lower() == '.zip':
            found[str(root.resolve())] = root
        elif root.is_dir():
            for f in list_files(root, skip=DATA_SCAN_SKIP, max_depth=8):
                if f.suffix.lower() == '.zip':
                    found[str(f.resolve())] = f
    return sorted(found.values(), key=lambda f: str(f).casefold())


def inspect_archives(archives):
    records = []
    errors = []
    counts = collections.Counter()
    years = collections.Counter()
    unique_names = collections.Counter()
    for p in archives:
        try:
            with zipfile.ZipFile(p) as z:
                csvs = [info for info in z.infolist() if not info.is_dir() and info.filename.lower().endswith('.csv')]
                counts['zip_archives'] += 1
                counts['csv_members'] += len(csvs)
                for info in csvs:
                    name = info.filename.replace('\\', '/')
                    unique_names[name.casefold()] += 1
                    matches = YEAR_RX.findall(name)
                    if matches:
                        for year in set(matches):
                            years[year] += 1
                    else:
                        years['undetermined_from_name'] += 1
                    records.append({
                        'archive': p.name, 'member': name, 'crc32': f'{info.CRC:08x}',
                        'uncompressed_bytes': info.file_size,
                    })
        except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
            errors.append({'archive': path_str(p), 'error': str(exc)[:250]})
    return {
        'archives': [path_str(p) for p in archives],
        'counts': dict(counts),
        'member_years_in_filename_only': dict(sorted(years.items())),
        'duplicate_member_paths_across_archives': sum(1 for n in unique_names.values() if n > 1),
        'errors': errors,
        'members_metadata_only': records,
    }


def quote_ident(name):
    return '"' + name.replace('"', '""') + '"'


def inspect_db(p):
    result = {'path': path_str(p), 'size_bytes': p.stat().st_size if p.is_file() else None}
    if not p.is_file():
        result['error'] = 'file does not exist'; return result
    try:
        with sqlite3.connect(p.resolve().as_uri() + '?mode=ro', uri=True, timeout=8) as conn:
            conn.execute('PRAGMA query_only=ON')
            tables = [r[0] for r in conn.execute('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name')]
            result['tables'] = {}
            for name in tables:
                if name.startswith('sqlite_'):
                    continue
                columns = [row[1] for row in conn.execute(f'PRAGMA table_info({quote_ident(name)})')]
                rec = {'columns': columns}
                if any(tag in name.lower() for tag in CHECKPOINT_NAMES):
                    rec['row_count'] = conn.execute(f'SELECT COUNT(*) FROM {quote_ident(name)}').fetchone()[0]
                    status = next((x for x in columns if x.lower() in ('status', 'state', 'ingest_status', 'processing_status')), None)
                    if status:
                        vals = conn.execute(
                            f'SELECT {quote_ident(status)}, COUNT(*) FROM {quote_ident(name)} '
                            f'GROUP BY {quote_ident(status)} LIMIT 25'
                        ).fetchall()
                        rec['status_counts'] = {str(k): v for k, v in vals}
                    # Only small checkpoint tables, never sample or dump raw rows.
                    if rec['row_count'] <= 15000:
                        for col in ('sensor', 'year', 'country', 'country_name'):
                            chosen = next((x for x in columns if x.lower() == col), None)
                            if chosen:
                                count = conn.execute(
                                    f'SELECT COUNT(DISTINCT {quote_ident(chosen)}) FROM {quote_ident(name)}'
                                ).fetchone()[0]
                                rec[f'distinct_{col}'] = count
                result['tables'][name] = rec
    except (sqlite3.Error, ValueError, OSError) as exc:
        result['error'] = str(exc)[:250]
    return result


def reconcile_checkpoints(db_path, zip_members):
    """Conservative path+optional CRC reconciliation; never modifies source database."""
    if not zip_members or not db_path.is_file():
        return None
    paths = collections.Counter(m['member'].casefold() for m in zip_members)
    if not paths:
        return None
    candidates = []
    try:
        with sqlite3.connect(db_path.resolve().as_uri() + '?mode=ro', uri=True, timeout=8) as conn:
            conn.execute('PRAGMA query_only=ON')
            tables = [r[0] for r in conn.execute('SELECT name FROM sqlite_master WHERE type="table"')]
            for table in tables:
                if not any(t in table.lower() for t in ('member', 'inventory', 'checkpoint')):
                    continue
                cols = [r[1] for r in conn.execute(f'PRAGMA table_info({quote_ident(table)})')]
                norm = {c.lower(): c for c in cols}
                path_col = next((norm[c] for c in ('member_path','member_name','csv_member','csv_path',
                      'zip_member','member','filename','name','path') if c in norm), None)
                status_col = next((norm[c] for c in ('status','state','ingest_status','processing_status') if c in norm), None)
                if not path_col or not status_col:
                    continue
                count = conn.execute(f'SELECT COUNT(*) FROM {quote_ident(table)}').fetchone()[0]
                if count > 15000:
                    continue
                crc_col = next((norm[c] for c in ('crc32','crc','member_crc') if c in norm), None)
                column_query = ','.join(quote_ident(c) for c in [path_col,status_col]+([crc_col] if crc_col else []))
                rows = conn.execute(f'SELECT {column_query} FROM {quote_ident(table)}').fetchall()
                by_path = collections.defaultdict(list)
                for row in rows:
                    if row[0] is None:
                        continue
                    k = str(row[0]).replace('\\','/').lstrip('./').casefold()
                    by_path[k].append(row[1:])
                matched = committed = crc_verified = crc_mismatch = ambiguous = 0
                for member in zip_members:
                    key = member['member'].casefold()
                    if paths[key] != 1 or len(by_path.get(key,[])) > 1:
                        ambiguous += 1
                        continue
                    matches = by_path.get(key,[])
                    if not matches:
                        continue
                    matched += 1
                    status = str(matches[0][0]).lower()
                    if status not in {'committed','completed','done','success','ok','processed','imported'}:
                        continue
                    if crc_col and len(matches[0]) > 1 and matches[0][1] is not None:
                        crcvalue = matches[0][1]
                        try:
                            if isinstance(crcvalue, int):
                                parsed = crcvalue
                            else:
                                v = str(crcvalue).strip().lower().removeprefix('0x')
                                parsed = int(v, 16) if re.search('[a-f]',v) or len(v)==8 else int(v)
                            if f'{parsed & 0xffffffff:08x}' != member['crc32']:
                                crc_mismatch += 1
                                continue
                            crc_verified += 1
                        except (TypeError, ValueError):
                            pass
                    committed += 1
                candidates.append({
                    'table': table, 'path_column': path_col, 'status_column': status_col,
                    'zip_member_count': len(zip_members), 'exact_unique_path_matches': matched,
                    'successful_status_matches': committed, 'successful_matches_with_confirmed_crc': crc_verified,
                    'crc_mismatches': crc_mismatch, 'ambiguous_zip_or_db_paths': ambiguous,
                    'not_exactly_matched': len(zip_members) - matched,
                    'interpretation': 'This is metadata-only reconciliation, not proof of observation row integrity.'
                })
    except (sqlite3.Error, ValueError, OSError):
        return None
    return max(candidates, key=lambda x: x['exact_unique_path_matches'], default=None)


def discover_dbs(project, extras):
    found = {str(Path(p).expanduser().resolve()): Path(p).expanduser() for p in extras}
    for f in list_files(project, skip=DATA_SCAN_SKIP, max_depth=10):
        if f.suffix.lower() in DB_EXTS:
            found[str(f.resolve())] = f
    return sorted(found.values(), key=lambda f: str(f).casefold())


def scan_code(project):
    counts = collections.Counter()
    api_routes = []
    pages = []
    source_files = []
    file_warnings = []
    for f in list_files(project):
        try:
            rel = f.relative_to(project)
            size = f.stat().st_size
        except OSError:
            continue
        if f.suffix.lower() in CODE_EXTS or f.name in CODE_NAMES:
            source_files.append(path_str(rel))
            counts[f.suffix.lower() or f.name] += 1
            if size <= MAX_CODE_FILE and f.suffix.lower() in {'.py', '.ts', '.tsx', '.js', '.jsx'}:
                try:
                    body = f.read_text(encoding='utf-8', errors='replace')
                except OSError:
                    continue
                if f.suffix.lower() == '.py':
                    for method, route in re.findall(r'@\w+\.(get|post|put|patch|delete)\(\s*[\"\']([^\"\']+)', body, re.I):
                        api_routes.append({'file': path_str(rel), 'method': method.upper(), 'route': route})
                if re.search(r'(?i)\b(?:mock|fake|dummy|synthetic)\b', body):
                    file_warnings.append(path_str(rel))
        if f.name.lower() in {'page.tsx','page.jsx','page.js','page.ts'}:
            pages.append(path_str(rel))
    return {'source_file_counts': dict(sorted(counts.items())), 'source_files': sorted(source_files),
            'api_routes_detected_static_only': api_routes[:500], 'page_files': sorted(pages),
            'files_containing_demo_or_mock_words_review_manually': file_warnings[:150]}


def create_code_bundle(project, out_dir):
    bundle = out_dir / 'EMBERA_code_only_for_patch.zip'
    included = []
    skipped_unsafe = []
    total = 0
    with zipfile.ZipFile(bundle, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for p in list_files(project):
            rel = p.relative_to(project)
            if not (p.suffix.lower() in CODE_EXTS or p.name in CODE_NAMES):
                continue
            if any(BLOCKED_NAME.search(part) for part in rel.parts):
                skipped_unsafe.append(path_str(rel)); continue
            try:
                size = p.stat().st_size
                if size > MAX_CODE_FILE or total + size > MAX_BUNDLE:
                    skipped_unsafe.append(path_str(rel) + ' [size limit]'); continue
                data = p.read_bytes()
            except OSError:
                continue
            if b'\0' in data[:1000] or KEY_PATTERN.search(data):
                skipped_unsafe.append(path_str(rel) + ' [potential secret or binary]'); continue
            z.writestr(path_str(rel), data)
            included.append(path_str(rel))
            total += len(data)
    return {'path': path_str(bundle), 'file_count': len(included),
            'uncompressed_bytes': total, 'excluded_potentially_sensitive': skipped_unsafe,
            'warning': 'Review the ZIP before sharing: automated filtering cannot guarantee secrets are absent.'}


def brief_markdown(data):
    arc = data['archives']; dbs = data['databases']; src = data['code']; git = data['git']
    lines = [
        '# EMBERA pre-patch audit (read only)', '',
        'All ZIP/DB inspections use metadata only. No fire CSVs were read, copied, or changed.', '',
        f'Generated UTC: `{data["generated_utc"]}`',
        f'Project: `{data["project"]}`',
        f'Git branch: `{git["branch"]}`', f'Git HEAD: `{git["head"]}`',
        f'Git status entries (including untracked): **{len(git["status_porcelain"])}**', '',
        f'ZIP archives found: **{arc["counts"].get("zip_archives",0)}**',
        f'CSV ZIP members found: **{arc["counts"].get("csv_members",0)}**',
        'CSV filename years (not verified observation dates): ' + json.dumps(arc['member_years_in_filename_only'], ensure_ascii=False),
        f'Archive reading errors: **{len(arc["errors"])}**', '',
        f'SQLite DB candidates: **{len(dbs)}**',
    ]
    for db in dbs:
        lines.append(f'- `{db["path"]}` ({db.get("size_bytes") or 0:,} bytes)')
        if 'error' in db: lines.append('  - Error: ' + db['error'])
        reconc = db.get('checkpoint_reconciliation')
        if reconc:
            lines.append(f'  - ZIP/checkpoint exact member matches: **{reconc["exact_unique_path_matches"]}** / **{reconc["zip_member_count"]}**; successful status: **{reconc["successful_status_matches"]}**; CRC mismatches: **{reconc["crc_mismatches"]}**')
        for k,v in db.get('tables',{}).items():
            if 'row_count' in v:
                lines.append(f'  - Checkpoint-like table `{k}`: **{v["row_count"]}** rows; status {json.dumps(v.get("status_counts",{}))}')
    lines.extend(['', f'Source files detected: **{len(src["source_files"])}**',
                  f'API routes detected (static): **{len(src["api_routes_detected_static_only"])}**',
                  f'Frontend page files: **{len(src["page_files"])}**',
                  ''])
    if 'code_bundle' in data:
        lines.append('Code-only archive: `' + data['code_bundle']['path'] + '`')
        lines.append('**Review code ZIP for sensitive strings before uploading.**')
    lines.extend(['', '**Important:** Actual ingested row totals, unmatched members, calibration accuracy, API runtime and build success cannot be inferred solely from this metadata audit.'])
    return '\n'.join(lines) + '\n'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', type=Path, default=Path.cwd())
    ap.add_argument('--archives', action='append', default=[], help='ZIP file or directory (repeatable)')
    ap.add_argument('--db', action='append', default=[], help='SQLite database path (repeatable)')
    ap.add_argument('--output', type=Path, help='Directory for reports (default: sibling of project)')
    ap.add_argument('--code-bundle', action='store_true', help='Create small code-only ZIP for patching, excluding data/db/env')
    args = ap.parse_args()
    project = args.project.expanduser().resolve()
    if not project.is_dir():
        ap.error(f'project folder not found: {project}')
    out = (args.output or project.parent / 'EMBERA_AUDIT_OUTPUT').expanduser().resolve()
    if out == project or project in out.parents:
        ap.error('Output must be OUTSIDE project to avoid modifying working tree')
    out.mkdir(parents=True, exist_ok=True)
    git = run_git(project)
    archives = inspect_archives(archive_paths(project, args.archives))
    db_paths = discover_dbs(project, args.db)
    dbs = [inspect_db(p) for p in db_paths]
    for p, dbinfo in zip(db_paths, dbs):
        reconciliation = reconcile_checkpoints(p, archives['members_metadata_only'])
        if reconciliation:
            dbinfo['checkpoint_reconciliation'] = reconciliation
    code = scan_code(project)
    report = {
        'generated_utc': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'project': path_str(project), 'git': git, 'archives': archives,
        'databases': dbs, 'code': code,
        'limitations': ['ZIP metadata only: CSV contents not read',
                        'No exact ZIP-to-checkpoint reconciliation without database schema-specific key audit',
                        'Database observation counts and scientific validation not inferred',
                        'No local API/build/tests executed'],
    }
    if args.code_bundle:
        report['code_bundle'] = create_code_bundle(project, out)
    # keep raw ZIP member inventory locally; report summary stays small for sharing
    members = report['archives'].pop('members_metadata_only')
    (out/'embera_zip_member_inventory.json').write_text(json.dumps(members, indent=2, ensure_ascii=False), encoding='utf-8')
    (out/'embera_audit.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    (out/'embera_audit.md').write_text(brief_markdown(report), encoding='utf-8')
    print(brief_markdown(report))
    print('Reports saved in:', out)
    return 0


if __name__ == '__main__':
    sys.exit(main())
