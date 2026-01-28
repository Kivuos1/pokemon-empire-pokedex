from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional


from pathlib import Path

PROJECT_ROOT = Path(r"C:\Users\ADMIN\Desktop\Empire Project\pokedex")

INPUT_PATH = PROJECT_ROOT / "data" / "raw" / "pokemon.txt"
OUTPUT_PATH = PROJECT_ROOT / "data" / "pokemon.json"
IMG_DIR = PROJECT_ROOT / "assets" / "img"
IMG_EXT = ".png"


def to_int(s: str) -> Optional[int]:
    try:
        return int(str(s).strip())
    except Exception:
        return None


def to_float(s: str) -> Optional[float]:
    try:
        return float(str(s).strip())
    except Exception:
        return None


def split_csv(s: str) -> List[str]:
    return [p.strip() for p in str(s).split(",") if p.strip()]


def parse_base_stats(s: str) -> Optional[Dict[str, Optional[int]]]:
    # HP, ATK, DEF, SPEED, Sp. ATK, Sp. DEF
    parts = [to_int(x) for x in split_csv(s)]
    if not parts:
        return None
    # pad to 6
    while len(parts) < 6:
        parts.append(None)
    return {
        "hp": parts[0],
        "atk": parts[1],
        "def": parts[2],
        "speed": parts[3],
        "spAtk": parts[4],
        "spDef": parts[5],
    }


def parse_moves(s: str) -> List[Dict[str, Any]]:
    # level,move,level,move,...
    parts = split_csv(s)
    out: List[Dict[str, Any]] = []
    for i in range(0, len(parts) - 1, 2):
        level = to_int(parts[i])
        move = parts[i + 1]
        if level is None or not move:
            continue
        out.append({"level": level, "move": move})
    return out


def parse_evolutions(s: str) -> List[Dict[str, Any]]:
    # Usually triples: TO,Method,Param. Sometimes empty.
    parts = split_csv(s)
    if len(parts) < 3:
        return []
    out: List[Dict[str, Any]] = []
    for i in range(0, len(parts) - 2, 3):
        to = parts[i]
        method = parts[i + 1]
        param = parts[i + 2] if i + 2 < len(parts) else None
        if not to or not method:
            continue
        out.append({"to": to, "method": method, "param": param})
    return out


def padded_id(pid: int) -> str:
    return str(pid).zfill(3)


def build_sprite_info(pid: int) -> Dict[str, Any]:
    """
    Detects sprites based on your naming:
      default: 001.png
      shiny:   001s.png
      forms:   001_1.png, 001_2.png, ...
    Only includes paths that exist.
    """
    base = padded_id(pid)

    def p(name: str) -> str:
        # store as web-relative paths
        return f"assets/img/{name}{IMG_EXT}"

    default_file = IMG_DIR / f"{base}{IMG_EXT}"
    shiny_file = IMG_DIR / f"{base}s{IMG_EXT}"

    forms: List[str] = []
    # Scan for forms like 001_1.png, 001_2.png
    # We scan directory once per pokemon id (cheap enough for 151, fine).
    form_re = re.compile(rf"^{re.escape(base)}_(\d+){re.escape(IMG_EXT)}$")
    if IMG_DIR.exists():
        for f in IMG_DIR.iterdir():
            if not f.is_file():
                continue
            m = form_re.match(f.name)
            if m:
                forms.append(p(f.stem))  # f.stem is like "001_1"

    # sort forms numerically by suffix
    def form_num(path_str: str) -> int:
        # path_str ends like assets/img/001_2.png
        m = re.search(r"_(\d+)\.", path_str)
        return int(m.group(1)) if m else 0

    forms.sort(key=form_num)

    sprite_info: Dict[str, Any] = {
        "default": p(base) if default_file.exists() else None,
        "shiny": p(f"{base}s") if shiny_file.exists() else None,
        "forms": forms,
    }
    return sprite_info


def parse_pokemon_txt(text: str) -> List[Dict[str, Any]]:
    lines = text.splitlines()

    mons: List[Dict[str, Any]] = []
    current: Dict[str, str] | None = None
    current_id: Optional[int] = None

    section_re = re.compile(r"^\[(\d+)\]$")

    def flush():
        nonlocal current, current_id
        if not current or current_id is None:
            current = None
            current_id = None
            return

        type1 = current.get("Type1")
        type2 = current.get("Type2")
        types = [t for t in [type1, type2] if t]

        rec: Dict[str, Any] = {
            "id": current_id,
            "name": current.get("Name"),
            "internalName": current.get("InternalName"),
            "types": types,

            "baseStats": parse_base_stats(current["BaseStats"]) if "BaseStats" in current else None,

            "genderRate": current.get("GenderRate"),
            "growthRate": current.get("GrowthRate"),
            "baseEXP": to_int(current["BaseEXP"]) if "BaseEXP" in current else None,
            "effortPoints": [to_int(x) for x in split_csv(current.get("EffortPoints", ""))] if current.get("EffortPoints") else [],

            "rareness": to_int(current["Rareness"]) if "Rareness" in current else None,
            "happiness": to_int(current["Happiness"]) if "Happiness" in current else None,

            "abilities": split_csv(current.get("Abilities", "")) if current.get("Abilities") else [],
            "hiddenAbility": current.get("HiddenAbility"),

            "moves": parse_moves(current["Moves"]) if "Moves" in current and current["Moves"].strip() else [],
            "eggMoves": split_csv(current.get("EggMoves", "")) if current.get("EggMoves") else [],

            "compatibility": split_csv(current.get("Compatibility", "")) if current.get("Compatibility") else [],
            "stepsToHatch": to_int(current["StepsToHatch"]) if "StepsToHatch" in current else None,

            "height": to_float(current["Height"]) if "Height" in current else None,
            "weight": to_float(current["Weight"]) if "Weight" in current else None,

            "color": current.get("Color"),
            "shape": to_int(current["Shape"]) if "Shape" in current else None,
            "habitat": current.get("Habitat"),
            "kind": current.get("Kind"),

            "pokedex": current.get("Pokedex"),

            "battler": {
                "playerY": to_int(current["BattlerPlayerY"]) if "BattlerPlayerY" in current else None,
                "enemyY": to_int(current["BattlerEnemyY"]) if "BattlerEnemyY" in current else None,
                "altitude": to_int(current["BattlerAltitude"]) if "BattlerAltitude" in current else None,
            },

            "evolutions": parse_evolutions(current["Evolutions"]) if "Evolutions" in current and current["Evolutions"].strip() else [],

            # images
            "sprites": build_sprite_info(current_id),
        }

        mons.append(rec)
        current = None
        current_id = None

    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        m = section_re.match(line)
        if m:
            flush()
            current_id = to_int(m.group(1))
            current = {}
            continue

        if current is None:
            continue

        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        current[key.strip()] = value.strip()

    flush()
    mons.sort(key=lambda x: x.get("id") or 0)
    return mons


def main():
    print("INPUT_PATH:", INPUT_PATH)
    print("Exists:", INPUT_PATH.exists())

    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Missing input file: {INPUT_PATH}")

    text = INPUT_PATH.read_text(encoding="utf-8", errors="replace")
    mons = parse_pokemon_txt(text)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(mons, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(mons)} Pokémon to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
