from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/generated/characters/goblin/sheet-v2-cardinal-fft.png"
GENERATED_OUT = ROOT / "assets/generated/characters/goblin"
PUBLIC_OUT = ROOT / "public/assets/sprites/goblin"

ROWS = ["idle", "walk", "attack", "downed"]
COLS = ["front", "back", "left", "right"]


def make_transparent(cell):
    rgba = cell.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if max(r, g, b) < 42:
                pixels[x, y] = (r, g, b, 0)
    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    return rgba.crop(bbox)


def save_frame(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def main():
    sheet = Image.open(SOURCE)
    cell_w = sheet.width // len(COLS)
    cell_h = sheet.height // len(ROWS)
    for row_index, action in enumerate(ROWS):
        for col_index, direction in enumerate(COLS):
            box = (
                col_index * cell_w,
                row_index * cell_h,
                (col_index + 1) * cell_w,
                (row_index + 1) * cell_h,
            )
            frame = make_transparent(sheet.crop(box))
            name = "downed.png" if action == "downed" and direction == "front" else f"{action}-{direction}.png"
            save_frame(frame, GENERATED_OUT / name)
            save_frame(frame, PUBLIC_OUT / name)


if __name__ == "__main__":
    main()
