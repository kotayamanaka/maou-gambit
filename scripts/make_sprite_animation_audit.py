from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public" / "assets" / "sprites"
OUT = ROOT / "screenshots" / "sprite-animation-audit.png"
UNITS = ["goblin", "slime", "warrior", "rogue", "mage", "guard"]
DIRECTIONS = ["front", "back", "left", "right"]
ROWS = [
    ("walk", 3),
    ("attack", 2),
]
CELL = 74
LABEL_W = 112
UNIT_H = 34
ROW_H = CELL
MAX_FRAMES = max(count for _, count in ROWS)


def frame_path(unit_id, action, direction, index):
    return SPRITES / unit_id / f"{action}-{direction}-{index}.png"


def paste_centered(canvas, image, x, y):
    frame = image.convert("RGBA")
    scale = min((CELL - 14) / frame.width, (CELL - 14) / frame.height, 2.0)
    size = (max(1, int(frame.width * scale)), max(1, int(frame.height * scale)))
    resized = frame.resize(size, Image.Resampling.NEAREST)
    px = x + (CELL - resized.width) // 2
    py = y + (CELL - resized.height) // 2
    canvas.alpha_composite(resized, (px, py))


def main():
    font = ImageFont.load_default()
    width = LABEL_W + len(DIRECTIONS) * MAX_FRAMES * CELL
    height = len(UNITS) * (UNIT_H + len(ROWS) * ROW_H)
    canvas = Image.new("RGBA", (width, height), (22, 18, 16, 255))
    draw = ImageDraw.Draw(canvas)

    y = 0
    for unit_id in UNITS:
        draw.rectangle((0, y, width, y + UNIT_H), fill=(38, 30, 24, 255))
        draw.text((12, y + 11), unit_id, fill=(244, 223, 176, 255), font=font)
        x = LABEL_W
        for direction in DIRECTIONS:
            draw.text((x + 8, y + 11), direction, fill=(216, 170, 74, 255), font=font)
            x += MAX_FRAMES * CELL
        y += UNIT_H

        for action, count in ROWS:
            draw.rectangle((0, y, LABEL_W, y + ROW_H), fill=(30, 25, 22, 255))
            draw.text((12, y + 28), action, fill=(220, 202, 170, 255), font=font)
            x = LABEL_W
            for direction in DIRECTIONS:
                for index in range(count):
                    draw.rectangle((x, y, x + CELL, y + CELL), outline=(78, 63, 46, 255), fill=(14, 12, 11, 255))
                    path = frame_path(unit_id, action, direction, index)
                    if path.exists():
                        paste_centered(canvas, Image.open(path), x, y)
                    else:
                        draw.text((x + 10, y + 30), "missing", fill=(211, 75, 75, 255), font=font)
                    draw.text((x + 4, y + 4), str(index), fill=(140, 119, 87, 255), font=font)
                    x += CELL
                x += (MAX_FRAMES - count) * CELL
            y += ROW_H

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
