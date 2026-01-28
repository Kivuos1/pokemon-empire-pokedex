from __future__ import annotations

import csv
import json
from pathlib import Path

# 🔒 MANUAL PROJECT ROOT
PROJECT_ROOT = Path(r"C:\Users\ADMIN\Desktop\Empire Project\pokedex")

INPUT_PATH = PROJECT_ROOT / "data" / "raw" / "moves.txt"
OUTPUT_PATH = PROJECT_ROOT / "data" / "moves.json"

def to_int(x: str):
    try:
        return int(x.strip())
    except Exception:
        return None

def main():
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Missing input file: {INPUT_PATH}")

    moves_by_key = {}

    with INPUT_PATH.open("r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue

            first = row[0].strip()
            if first.startswith("#") or first.startswith("###") or first.startswith("#2"):
                continue
            if len(row) < 7:
                continue

            mid = to_int(row[0])
            key = row[1].strip()
            name = row[2].strip()

            power = to_int(row[4]) if len(row) > 4 else None
            mtype = row[5].strip() if len(row) > 5 else None
            category = row[6].strip() if len(row) > 6 else None
            accuracy = to_int(row[7]) if len(row) > 7 else None
            pp = to_int(row[8]) if len(row) > 8 else None
            desc = row[-1].strip() if row else None

            if not key:
                continue

            moves_by_key[key] = {
                "id": mid,
                "key": key,
                "name": name or key,
                "type": mtype,
                "category": category,
                "power": power,
                "accuracy": accuracy,
                "pp": pp,
                "desc": desc or None,
                "raw": row,
            }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(moves_by_key, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {len(moves_by_key)} moves to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
