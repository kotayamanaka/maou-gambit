from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "generated" / "characters" / "enemy-adventurers" / "sheet-v1.png"

VARIANTS = [
    ("warrior", 0),
    ("rogue", 1),
    ("mage", 2),
]
ROWS = ["idle", "walk", "attack", "downed"]
COLS = ["front", "back", "left", "right"]


def remove_key(cell):
    rgba = cell.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if r > 190 and g < 120 and b > 175:
                pixels[x, y] = (r, g, b, 0)
    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    frame = rgba.crop(bbox)
    return frame.resize((max(1, frame.width // 2), max(1, frame.height // 2)), Image.Resampling.LANCZOS)


def save_frame(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing source sheet: {SOURCE}")
    sheet = Image.open(SOURCE)
    cell_w = sheet.width // (len(VARIANTS) * len(COLS))
    cell_h = sheet.height // len(ROWS)

    for unit_id, variant_index in VARIANTS:
        generated_out = ROOT / "assets" / "generated" / "characters" / unit_id
        public_out = ROOT / "public" / "assets" / "sprites" / unit_id
        for row_index, action in enumerate(ROWS):
            for col_index, direction in enumerate(COLS):
                global_col = variant_index * len(COLS) + col_index
                box = (
                    global_col * cell_w,
                    row_index * cell_h,
                    (global_col + 1) * cell_w,
                    (row_index + 1) * cell_h,
                )
                frame = remove_key(sheet.crop(box))
                name = "downed.png" if action == "downed" and direction == "front" else f"{action}-{direction}.png"
                save_frame(frame, generated_out / name)
                save_frame(frame, public_out / name)

    print(f"Sliced enemy adventurer sheet into {len(VARIANTS) * len(ROWS) * len(COLS)} frames")


if __name__ == "__main__":
    main()
