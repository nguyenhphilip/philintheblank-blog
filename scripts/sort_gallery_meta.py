import json
from datetime import datetime
from pathlib import Path

META_FILE = Path("src/_data/gallery-meta.json")


def parse_date(value):
    if not value:
        return None

    value = str(value).strip()

    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def sort_key(item):
    filename, metadata = item
    dt = parse_date(metadata.get("date"))
    # valid dates first, newest first; undated items last
    return (dt is not None, dt or datetime.min, filename.lower())


def main():
    if not META_FILE.exists():
        raise FileNotFoundError(f"Could not find {META_FILE}")

    with META_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError("gallery-meta.json must contain an object keyed by filename.")

    sorted_items = sorted(data.items(), key=sort_key, reverse=True)
    sorted_data = {filename: metadata for filename, metadata in sorted_items}

    with META_FILE.open("w", encoding="utf-8") as f:
        json.dump(sorted_data, f, indent=2, ensure_ascii=False)

    print(f"Sorted {len(sorted_data)} gallery items by date (newest first).")


if __name__ == "__main__":
    main()