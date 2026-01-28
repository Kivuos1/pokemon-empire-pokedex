from __future__ import annotations

import csv
import json
from pathlib import Path

# 🔒 MANUAL PROJECT ROOT
PROJECT_ROOT = Path(r"C:\Users\ADMIN\Desktop\Empire Project\pokedex")

INPUT_PATH = PROJECT_ROOT / "data" / "raw" / "abilities.txt"
OUTPUT_PATH = PROJECT_ROOT / "data" / "abilities.json"

def main():
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Missing input file: {INPUT_PATH}")

    abilities_by_key = {}

    with INPUT_PATH.open("r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue

            first = row[0].strip()
            if first.startswith("#"):
                continue
            if len(row) < 4:
                continue

            aid = int(row[0]) if row[0].isdigit() else None
            key = row[1].strip()
            name = row[2].strip()
            desc = row[3].strip()

            if not key:
                continue

            abilities_by_key[key] = {
                "id": aid,
                "key": key,
                "name": name or key,
                "desc": desc or None,
            }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(abilities_by_key, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {len(abilities_by_key)} abilities to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
