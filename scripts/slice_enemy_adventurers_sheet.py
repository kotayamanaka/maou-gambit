from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "generated" / "characters" / "enemy-adventurers" / "sheet-v1.png"

VARIANTS = [
    ("warrior", [0, 1, 2, 3], None),
    ("rogue", [4, 5, 6, 6], {"right"}),
    ("mage", [7, 8, 9, 9], {"right"}),
]
ROWS = ["idle", "walk", "attack", "downed"]
COLS = ["front", "back", "left", "right"]


def is_key_pixel(r, g, b):
    return r > 170 and g < 140 and b > 150


def remove_key(cell):
    rgba = cell.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if is_key_pixel(r, g, b):
                pixels[x, y] = (r, g, b, 0)
    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    frame = rgba.crop(bbox)
    return frame.resize((max(1, frame.width // 2), max(1, frame.height // 2)), Image.Resampling.LANCZOS)


def save_frame(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def row_boxes(sheet, row_index):
    row_h = sheet.height // len(ROWS)
    y0 = row_index * row_h
    y1 = (row_index + 1) * row_h
    rgb = sheet.convert("RGB")
    active = []
    for x in range(sheet.width):
      has_subject = False
      for y in range(y0, y1):
          r, g, b = rgb.getpixel((x, y))
          if not is_key_pixel(r, g, b):
              has_subject = True
              break
      active.append(has_subject)

    groups = []
    start = None
    gap = 0
    for x, has_subject in enumerate(active):
        if has_subject:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap > 10:
                groups.append((start, x - gap))
                start = None
                gap = 0
    if start is not None:
        groups.append((start, sheet.width - 1))

    # Tiny antialias specks should not become their own frame.
    groups = [(a, b) for a, b in groups if b - a > 18]
    if len(groups) != 10:
        raise SystemExit(f"Expected 10 sprite groups in {ROWS[row_index]}, found {len(groups)}: {groups}")

    boxes = []
    for x0, x1 in groups:
        crop = sheet.crop((max(0, x0 - 6), y0, min(sheet.width, x1 + 7), y1))
        frame = remove_key(crop)
        boxes.append(frame)
    return boxes


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing source sheet: {SOURCE}")
    sheet = Image.open(SOURCE)
    frames_by_row = [row_boxes(sheet, row_index) for row_index in range(len(ROWS))]

    for unit_id, frame_indices, mirrored_directions in VARIANTS:
        generated_out = ROOT / "assets" / "generated" / "characters" / unit_id
        public_out = ROOT / "public" / "assets" / "sprites" / unit_id
        for row_index, action in enumerate(ROWS):
            for col_index, direction in enumerate(COLS):
                frame = frames_by_row[row_index][frame_indices[col_index]]
                if mirrored_directions and direction in mirrored_directions:
                    frame = frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                name = "downed.png" if action == "downed" and direction == "front" else f"{action}-{direction}.png"
                save_frame(frame, generated_out / name)
                save_frame(frame, public_out / name)

    print(f"Sliced enemy adventurer sheet into {len(VARIANTS) * len(ROWS) * len(COLS)} frames")


if __name__ == "__main__":
    main()
