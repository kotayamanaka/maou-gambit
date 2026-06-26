from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "screenshots" / "sprite-direction-audit-enemies.png"
UNITS = [
    "warrior", "rogue", "mage",
    "guard", "ranger", "cleric",
    "knight", "alchemist", "beastTamer",
    "paladin", "sage", "hero",
]
ACTIONS = ["idle", "walk", "attack", "downed"]
DIRECTIONS = ["front", "back", "left", "right"]
CELL = 92
HEADER_H = 52
LABEL_W = 132


def sprite_path(unit_id, action, direction):
    if action == "downed" and direction == "front":
        return ROOT / "public" / "assets" / "sprites" / unit_id / "downed.png"
    return ROOT / "public" / "assets" / "sprites" / unit_id / f"{action}-{direction}.png"


def paste_centered(canvas, image, x, y):
    frame = image.convert("RGBA")
    scale = min((CELL - 18) / frame.width, (CELL - 18) / frame.height, 2.0)
    resized = frame.resize((max(1, int(frame.width * scale)), max(1, int(frame.height * scale))), Image.Resampling.NEAREST)
    px = x + (CELL - resized.width) // 2
    py = y + (CELL - resized.height) // 2
    canvas.alpha_composite(resized, (px, py))


def main():
    font = ImageFont.load_default()
    width = LABEL_W + len(DIRECTIONS) * CELL
    height = len(UNITS) * (HEADER_H + len(ACTIONS) * CELL)
    canvas = Image.new("RGBA", (width, height), (22, 18, 16, 255))
    draw = ImageDraw.Draw(canvas)

    y = 0
    for unit_id in UNITS:
        draw.rectangle((0, y, width, y + HEADER_H), fill=(38, 30, 24, 255))
        draw.text((12, y + 18), unit_id, fill=(244, 223, 176, 255), font=font)
        for col, direction in enumerate(DIRECTIONS):
            draw.text((LABEL_W + col * CELL + 24, y + 18), direction, fill=(216, 170, 74, 255), font=font)
        y += HEADER_H

        for action in ACTIONS:
            draw.rectangle((0, y, LABEL_W, y + CELL), fill=(30, 25, 22, 255))
            draw.text((12, y + 38), action, fill=(220, 202, 170, 255), font=font)
            for col, direction in enumerate(DIRECTIONS):
                x = LABEL_W + col * CELL
                draw.rectangle((x, y, x + CELL, y + CELL), outline=(78, 63, 46, 255), fill=(14, 12, 11, 255))
                paste_centered(canvas, Image.open(sprite_path(unit_id, action, direction)), x, y)
            y += CELL

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
