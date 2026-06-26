from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "generated" / "dungeon" / "tiles" / "sheet-v1.png"
GENERATED_DIR = ROOT / "assets" / "generated" / "dungeon" / "tiles"
PUBLIC_DIR = ROOT / "public" / "assets" / "tiles"
TILE_NAMES = ["floor-stone", "room-stone", "corridor-stone"]
TILE_SIZE = 128


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing source sheet: {SOURCE}")

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    sheet = Image.open(SOURCE).convert("RGBA")
    panel_width = sheet.width // len(TILE_NAMES)
    crop_size = min(panel_width, sheet.height)
    top = max(0, (sheet.height - crop_size) // 2)

    for index, name in enumerate(TILE_NAMES):
        left = index * panel_width
        tile = sheet.crop((left, top, left + crop_size, top + crop_size))
        tile = tile.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.NEAREST)
        for output_dir in (GENERATED_DIR, PUBLIC_DIR):
            tile.save(output_dir / f"{name}.png")

    print(f"Sliced {len(TILE_NAMES)} dungeon tiles from {SOURCE.name}")


if __name__ == "__main__":
    main()
