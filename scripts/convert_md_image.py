from pathlib import Path
import re

ROOT_DIRS = [
    Path("src/blog"),
    Path("src/poems"),
    Path("src/projects"),
]

SIZES = '(min-width: 900px) 760px, 100vw'
WIDTHS = '[500, 760, 1200]'

# Dry run by default: previews changes without writing
DRY_RUN = False

# Matches Markdown image syntax:
# ![alt text](path)
IMG_PATTERN = re.compile(r'!\[(.*?)\]\(([^)\s]+)(?:\s+"[^"]*")?\)')

def is_local_image(path: str) -> bool:
    """
    Only convert local site images like /images/gallery/foo.jpg.
    Skip external URLs and other paths.
    """
    return path.startswith("/images/")

def filename_to_alt(image_path: str) -> str:
    stem = Path(image_path).stem
    stem = stem.replace("-", " ").replace("_", " ")
    # split camel-ish cases poorly handled by title()
    return " ".join(word for word in stem.split()).title()

def replace_image(match: re.Match) -> str:
    alt_text = match.group(1).strip()
    image_path = match.group(2).strip()

    # Leave external/non-local images unchanged
    if not is_local_image(image_path):
        return match.group(0)

    if not alt_text:
        alt_text = filename_to_alt(image_path)

    alt_text = alt_text.replace('"', '\\"')

    return (
        f'{{% image "{image_path}", "{alt_text}", '
        f'"{SIZES}", {WIDTHS} %}}'
    )

def process_file(path: Path, dry_run: bool = True) -> bool:
    original = path.read_text(encoding="utf-8")
    updated = IMG_PATTERN.sub(replace_image, original)

    if updated != original:
        if dry_run:
            print(f"\n--- {path} ---")
            print("Preview of updated content:\n")
            print(updated[:2000])
            if len(updated) > 2000:
                print("\n... [truncated]")
        else:
            path.write_text(updated, encoding="utf-8")
        return True
    return False

def main():
    changed_files = []

    for root in ROOT_DIRS:
        if not root.exists():
            print(f"Skipping missing directory: {root}")
            continue

        for path in root.rglob("*.md"):
            if process_file(path, dry_run=DRY_RUN):
                changed_files.append(path)

    mode = "DRY RUN" if DRY_RUN else "WRITE MODE"
    print(f"\n[{mode}] Updated {len(changed_files)} files.")
    for path in changed_files:
        print(f" - {path}")

if __name__ == "__main__":
    main()