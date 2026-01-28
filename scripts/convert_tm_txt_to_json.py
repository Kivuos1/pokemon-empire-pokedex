from __future__ import annotations

import json
import re
from pathlib import Path

# 🔒 MANUAL PROJECT ROOT
PROJECT_ROOT = Path(r"C:\Users\ADMIN\Desktop\Empire Project\pokedex")

INPUT_PATH = PROJECT_ROOT / "data" / "raw" / "tm.txt"
OUTPUT_PATH = PROJECT_ROOT / "data" / "tm.json"

SECTION_RE = re.compile(r"^\s*\[([A-Z0-9_]+)\]\s*$")

def main():
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Missing input file: {INPUT_PATH}")

    tm_by_pokemon: dict[str, list[str]] = {}
    current_move = None

    lines = INPUT_PATH.read_text(encoding="utf-8", errors="replace").splitlines()
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        m = SECTION_RE.match(line)
        if m:
            current_move = m.group(1)
            continue

        if current_move is None:
            continue

        mons = [x.strip() for x in line.split(",") if x.strip()]
        for mon in mons:
            tm_by_pokemon.setdefault(mon, []).append(current_move)

    for mon, moves in tm_by_pokemon.items():
        tm_by_pokemon[mon] = sorted(set(moves))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(tm_by_pokemon, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote TM compatibility for {len(tm_by_pokemon)} Pokémon to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
