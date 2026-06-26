from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]

UNIT_SHEETS = [
    ("guard", ROOT / "assets" / "generated" / "characters" / "guard" / "sheet-v2-4dir.png"),
]
ROWS = ["idle", "walk", "attack", "downed"]
COLS = ["front", "back", "left", "right"]


def remove_key(cell):
    rgba = cell.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if r > 190 and g < 90 and b > 170:
                pixels[x, y] = (r, g, b, 0)
    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    frame = rgba.crop(bbox)
    return frame.resize((max(1, frame.width // 2), max(1, frame.height // 2)), Image.Resampling.LANCZOS)


def save_frame(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def clean_frames(directory, keep):
    directory.mkdir(parents=True, exist_ok=True)
    for frame in directory.glob("*.png"):
        if frame.name not in keep:
            frame.unlink()


def main():
    for unit_id, source in UNIT_SHEETS:
        if not source.exists():
            raise SystemExit(f"Missing source sheet: {source}")
        sheet = Image.open(source).convert("RGBA")
        x_edges = [round(index * sheet.width / len(COLS)) for index in range(len(COLS) + 1)]
        y_edges = [round(index * sheet.height / len(ROWS)) for index in range(len(ROWS) + 1)]
        generated_out = ROOT / "assets" / "generated" / "characters" / unit_id
        public_out = ROOT / "public" / "assets" / "sprites" / unit_id
        keep = {source.name}
        clean_frames(generated_out, keep)
        clean_frames(public_out, set())

        for row_index, action in enumerate(ROWS):
            for col_index, direction in enumerate(COLS):
                box = (
                    x_edges[col_index],
                    y_edges[row_index],
                    x_edges[col_index + 1],
                    y_edges[row_index + 1],
                )
                frame = remove_key(sheet.crop(box))
                name = "downed.png" if action == "downed" and direction == "front" else f"{action}-{direction}.png"
                save_frame(frame, generated_out / name)
                save_frame(frame, public_out / name)

    print(f"Sliced {len(UNIT_SHEETS)} dedicated enemy sheets into {len(UNIT_SHEETS) * len(ROWS) * len(COLS)} frames")


if __name__ == "__main__":
    main()
