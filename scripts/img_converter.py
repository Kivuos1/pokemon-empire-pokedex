from pathlib import Path
import re

# CHANGE THIS if needed
IMG_DIR = Path(r"C:\Users\ADMIN\Desktop\Empire Project\pokedex\assets\img")

# What to keep
KEEP_SUFFIXES = {
    "",        # base -> 007.png
    "_s",      # shiny -> 007_s.png
    "_1",      # alt form -> 007_1.png
    "_x",      # optional alt naming
}

# Set to False ONLY when you are confident
DRY_RUN = False


def parse_sprite(filename):
    """
    Returns (dex_number, suffix) or (None, None) if invalid
    """
    match = re.match(r"^(\d{3})(.*)\.png$", filename)
    if not match:
        return None, None
    return match.group(1), match.group(2)


def main():
    deleted = []
    kept = []

    for file in IMG_DIR.glob("*.png"):
        dex, suffix = parse_sprite(file.name)
        if dex is None:
            continue

        if suffix in KEEP_SUFFIXES:
            kept.append(file.name)
        else:
            deleted.append(file)
            if not DRY_RUN:
                file.unlink()

    print(f"Kept {len(kept)} files")
    print(f"{'Would delete' if DRY_RUN else 'Deleted'} {len(deleted)} files")

    if DRY_RUN:
        print("\nSample files to be deleted:")
        for f in deleted[:20]:
            print(" -", f.name)


if __name__ == "__main__":
    main()
