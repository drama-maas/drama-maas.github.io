"""Save a copy of each published Google Sheet tab into data/sheet-cache/.

The website falls back to these copies if it cannot reach the Sheet, so a
visitor sees the latest saved schedule instead of the old site files. A tab is
only rewritten when its content changed, and only if what came back looks like
the real tab (CSV, with the columns the website needs). Anything else, such as
an error page or a renamed column, leaves the last good copy alone.
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "data" / "sheet-cache"
REQUIRED = {
    "calendar": ["Date", "Title"],
    "announcements": ["Title"],
    "cast": ["Actor", "Role"],
}


def fetch(url):
    sep = "&" if "?" in url else "?"
    with urllib.request.urlopen(f"{url}{sep}t={int(datetime.now().timestamp())}", timeout=60) as r:
        return r.read().decode("utf-8-sig")


def looks_right(text, required):
    if text.lstrip().startswith("<"):
        return "got a web page, not CSV"
    first = text.splitlines()[0] if text else ""
    heads = [h.strip().strip('"') for h in first.split(",")]
    missing = [h for h in required if h not in heads]
    return f"missing columns {missing}" if missing else None


def main():
    site = json.loads((ROOT / "data" / "site.json").read_text(encoding="utf-8"))
    links = site.get("sheet") or {}
    CACHE.mkdir(parents=True, exist_ok=True)
    meta_path = CACHE / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}

    changed = False
    for name, required in REQUIRED.items():
        url = links.get(name)
        if not url:
            print(f"{name}: no Sheet link set, skipped")
            continue
        try:
            text = fetch(url).replace("\r\n", "\n")
        except Exception as err:
            print(f"{name}: could not fetch ({err}); keeping the last copy")
            continue
        problem = looks_right(text, required)
        if problem:
            print(f"{name}: {problem}; keeping the last copy")
            continue
        path = CACHE / f"{name}.csv"
        if path.exists() and path.read_text(encoding="utf-8") == text:
            print(f"{name}: unchanged")
            continue
        path.write_text(text, encoding="utf-8", newline="")
        meta[name] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        changed = True
        print(f"{name}: saved")

    if changed:
        meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
