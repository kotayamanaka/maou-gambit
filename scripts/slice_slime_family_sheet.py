from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/generated/characters/slime-family/sheet-v1.png"

VARIANTS = [
    ("slime", 0),
    ("poisonSlime", 1),
    ("darkSlime", 2),
]
ROWS = ["idle", "walk", "attack", "downed"]
COLS = ["front", "back", "left", "right"]


def remove_key(cell):
    rgba = cell.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if r > 215 and g < 45 and b > 190:
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
    sheet = Image.open(SOURCE)
    cell_w = sheet.width // (len(VARIANTS) * len(COLS))
    cell_h = sheet.height // len(ROWS)
    for unit_id, variant_index in VARIANTS:
        generated_out = ROOT / f"assets/generated/characters/{unit_id}"
        public_out = ROOT / f"public/assets/sprites/{unit_id}"
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


if __name__ == "__main__":
    main()
