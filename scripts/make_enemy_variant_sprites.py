from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ACTIONS = [
    "idle-front.png", "idle-back.png", "idle-left.png", "idle-right.png",
    "walk-front.png", "walk-back.png", "walk-left.png", "walk-right.png",
    "attack-front.png", "attack-back.png", "attack-left.png", "attack-right.png",
    "downed.png", "downed-back.png", "downed-left.png", "downed-right.png",
]

VARIANTS = {
    "knight": {"base": "warrior", "tint": (194, 166, 88), "strength": 0.30},
    "paladin": {"base": "warrior", "tint": (232, 220, 172), "strength": 0.34},
    "hero": {"base": "warrior", "tint": (210, 78, 58), "strength": 0.26},
    "ranger": {"base": "rogue", "tint": (92, 142, 84), "strength": 0.30},
    "beastTamer": {"base": "rogue", "tint": (177, 115, 62), "strength": 0.34},
    "cleric": {"base": "mage", "tint": (224, 218, 190), "strength": 0.36},
    "alchemist": {"base": "mage", "tint": (82, 172, 112), "strength": 0.32},
    "sage": {"base": "mage", "tint": (154, 96, 214), "strength": 0.30},
}

PALETTE = {
    "gold": (238, 203, 105, 255),
    "gold_dark": (122, 85, 38, 255),
    "silver": (207, 215, 215, 255),
    "silver_dark": (77, 84, 91, 255),
    "wood": (105, 70, 35, 255),
    "string": (238, 222, 178, 255),
    "green": (92, 220, 130, 255),
    "green_dark": (27, 93, 55, 255),
    "blue": (97, 190, 230, 255),
    "violet": (179, 104, 255, 255),
    "white": (247, 239, 205, 255),
    "red": (218, 62, 54, 255),
}


def tint_image(image, tint, strength):
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    tr, tg, tb = tint
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            # Preserve sprite value/readability while pushing the job palette apart.
            nr = round(r * (1 - strength) + tr * strength)
            ng = round(g * (1 - strength) + tg * strength)
            nb = round(b * (1 - strength) + tb * strength)
            pixels[x, y] = (nr, ng, nb, a)
    return rgba


def alpha_bbox(image):
    return image.getchannel("A").getbbox()


def clamp(value, low, high):
    return max(low, min(high, value))


def point(x, y, image):
    return (clamp(round(x), 0, image.width - 1), clamp(round(y), 0, image.height - 1))


def frame_direction(name):
    stem = name.removesuffix(".png")
    if stem == "downed":
        return "front"
    return stem.split("-")[-1]


def draw_line(draw, image, a, b, fill, width=2):
    draw.line([point(*a, image), point(*b, image)], fill=fill, width=width)


def draw_rect(draw, image, box, fill, outline=None):
    x1, y1, x2, y2 = box
    draw.rectangle(
        [point(x1, y1, image), point(x2, y2, image)],
        fill=fill,
        outline=outline,
    )


def draw_cross(draw, image, cx, cy, size=4, fill=PALETTE["gold"]):
    draw_line(draw, image, (cx, cy - size), (cx, cy + size), fill, 2)
    draw_line(draw, image, (cx - size, cy), (cx + size, cy), fill, 2)


def draw_staff(draw, image, bbox, direction, color=PALETTE["gold"]):
    left, top, right, bottom = bbox
    h = bottom - top
    if direction == "left":
        x = left + 3
        draw_line(draw, image, (x, top + h * 0.22), (x - 6, bottom - h * 0.06), PALETTE["wood"], 2)
        draw_rect(draw, image, (x - 8, top + h * 0.16, x - 4, top + h * 0.22), color)
    elif direction == "right":
        x = right - 3
        draw_line(draw, image, (x, top + h * 0.22), (x + 6, bottom - h * 0.06), PALETTE["wood"], 2)
        draw_rect(draw, image, (x + 4, top + h * 0.16, x + 8, top + h * 0.22), color)
    else:
        x = right - 5
        draw_line(draw, image, (x, top + h * 0.18), (x, bottom - h * 0.06), PALETTE["wood"], 2)
        draw_rect(draw, image, (x - 3, top + h * 0.13, x + 3, top + h * 0.19), color)


def draw_bow(draw, image, bbox, direction):
    left, top, right, bottom = bbox
    h = bottom - top
    if direction == "left":
        x = left + 4
        draw_line(draw, image, (x, top + h * 0.28), (x - 5, top + h * 0.48), PALETTE["wood"], 2)
        draw_line(draw, image, (x - 5, top + h * 0.48), (x, bottom - h * 0.20), PALETTE["wood"], 2)
        draw_line(draw, image, (x, top + h * 0.28), (x, bottom - h * 0.20), PALETTE["string"], 1)
    elif direction == "right":
        x = right - 4
        draw_line(draw, image, (x, top + h * 0.28), (x + 5, top + h * 0.48), PALETTE["wood"], 2)
        draw_line(draw, image, (x + 5, top + h * 0.48), (x, bottom - h * 0.20), PALETTE["wood"], 2)
        draw_line(draw, image, (x, top + h * 0.28), (x, bottom - h * 0.20), PALETTE["string"], 1)
    else:
        x = left + 4
        draw_line(draw, image, (x, top + h * 0.26), (x - 3, top + h * 0.48), PALETTE["wood"], 2)
        draw_line(draw, image, (x - 3, top + h * 0.48), (x, bottom - h * 0.22), PALETTE["wood"], 2)
        draw_line(draw, image, (x, top + h * 0.26), (x, bottom - h * 0.22), PALETTE["string"], 1)


def draw_lance(draw, image, bbox, direction, color=PALETTE["silver"]):
    left, top, right, bottom = bbox
    h = bottom - top
    if direction == "left":
        draw_line(draw, image, (left + 8, top + h * 0.45), (left - 8, top + h * 0.34), color, 2)
        draw_line(draw, image, (left - 8, top + h * 0.34), (left - 2, top + h * 0.31), PALETTE["gold"], 2)
    elif direction == "right":
        draw_line(draw, image, (right - 8, top + h * 0.45), (right + 8, top + h * 0.34), color, 2)
        draw_line(draw, image, (right + 8, top + h * 0.34), (right + 2, top + h * 0.31), PALETTE["gold"], 2)
    else:
        x = right - 4
        draw_line(draw, image, (x, top + h * 0.10), (x, bottom - h * 0.12), color, 2)
        draw_line(draw, image, (x - 3, top + h * 0.12), (x, top + h * 0.04), PALETTE["gold"], 2)
        draw_line(draw, image, (x + 3, top + h * 0.12), (x, top + h * 0.04), PALETTE["gold"], 2)


def draw_potion(draw, image, bbox):
    left, top, right, bottom = bbox
    w = right - left
    h = bottom - top
    x = left + w * 0.58
    y = top + h * 0.56
    draw_rect(draw, image, (x, y, x + 5, y + 7), PALETTE["green"], PALETTE["green_dark"])
    draw_rect(draw, image, (x + 1, y - 2, x + 4, y), PALETTE["silver_dark"])


def draw_goggles(draw, image, bbox):
    left, top, right, bottom = bbox
    w = right - left
    h = bottom - top
    y = top + h * 0.23
    x = left + w * 0.36
    draw_rect(draw, image, (x, y, x + 4, y + 3), PALETTE["blue"])
    draw_rect(draw, image, (x + 6, y, x + 10, y + 3), PALETTE["blue"])


def draw_whip(draw, image, bbox, direction):
    left, top, right, bottom = bbox
    h = bottom - top
    if direction == "left":
        points = [(left + 6, top + h * 0.45), (left - 4, top + h * 0.55), (left + 3, bottom - h * 0.12)]
    elif direction == "right":
        points = [(right - 6, top + h * 0.45), (right + 4, top + h * 0.55), (right - 3, bottom - h * 0.12)]
    else:
        points = [(right - 6, top + h * 0.46), (right + 4, top + h * 0.56), (right - 2, bottom - h * 0.12)]
    for a, b in zip(points, points[1:]):
        draw_line(draw, image, a, b, PALETTE["wood"], 2)


def draw_crest(draw, image, bbox, fill=PALETTE["red"]):
    left, top, right, bottom = bbox
    cx = (left + right) / 2
    y = top + (bottom - top) * 0.13
    draw.polygon([
        point(cx, y - 5, image),
        point(cx - 3, y + 3, image),
        point(cx + 3, y + 3, image),
    ], fill=fill)


def decorate_variant(unit_id, image, name):
    bbox = alpha_bbox(image)
    if not bbox:
        return image
    direction = frame_direction(name)
    decorated = image.copy()
    draw = ImageDraw.Draw(decorated)
    left, top, right, bottom = bbox
    cx = (left + right) / 2
    cy = top + (bottom - top) * 0.48

    if unit_id == "ranger":
        draw_bow(draw, decorated, bbox, direction)
    elif unit_id == "cleric":
        draw_cross(draw, decorated, cx, cy, 4, PALETTE["gold"])
        draw_staff(draw, decorated, bbox, direction, PALETTE["white"])
    elif unit_id == "alchemist":
        draw_potion(draw, decorated, bbox)
        if direction == "front":
            draw_goggles(draw, decorated, bbox)
    elif unit_id == "sage":
        draw_staff(draw, decorated, bbox, direction, PALETTE["violet"])
        draw_cross(draw, decorated, cx, top + (bottom - top) * 0.18, 3, PALETTE["violet"])
    elif unit_id == "knight":
        draw_lance(draw, decorated, bbox, direction)
        draw_crest(draw, decorated, bbox, PALETTE["gold"])
    elif unit_id == "paladin":
        draw_lance(draw, decorated, bbox, direction, PALETTE["white"])
        draw_cross(draw, decorated, cx, cy, 5, PALETTE["gold"])
    elif unit_id == "hero":
        draw_crest(draw, decorated, bbox, PALETTE["red"])
        draw_line(draw, decorated, (right - 6, top + (bottom - top) * 0.34), (right + 6, top + (bottom - top) * 0.18), PALETTE["silver"], 2)
        draw_line(draw, decorated, (right + 5, top + (bottom - top) * 0.18), (right + 1, top + (bottom - top) * 0.15), PALETTE["gold"], 2)
    elif unit_id == "beastTamer":
        draw_whip(draw, decorated, bbox, direction)
        draw_crest(draw, decorated, bbox, (120, 78, 42, 255))
    return decorated


def save_variant(unit_id, source_id, tint, strength):
    source_dir = ROOT / "public" / "assets" / "sprites" / source_id
    generated_out = ROOT / "assets" / "generated" / "characters" / unit_id
    public_out = ROOT / "public" / "assets" / "sprites" / unit_id
    generated_out.mkdir(parents=True, exist_ok=True)
    public_out.mkdir(parents=True, exist_ok=True)

    for name in ACTIONS:
        source = source_dir / name
        if not source.exists():
            raise SystemExit(f"Missing source sprite: {source}")
        frame = tint_image(Image.open(source), tint, strength)
        frame = decorate_variant(unit_id, frame, name)
        frame.save(generated_out / name)
        frame.save(public_out / name)


def main():
    for unit_id, spec in VARIANTS.items():
        save_variant(unit_id, spec["base"], spec["tint"], spec["strength"])
    print(f"Wrote {len(VARIANTS)} enemy visual variants")


if __name__ == "__main__":
    main()
