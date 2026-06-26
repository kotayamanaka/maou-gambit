from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public" / "assets" / "sprites" / "demonLord"
SOURCE = SPRITES / "idle-front.png"
DIRECTIONS = ["front", "back", "left", "right"]


def load_source():
    return Image.open(SOURCE).convert("RGBA")


def alpha_glow(image, color=(220, 40, 96, 115), radius=5):
    alpha = image.getchannel("A").filter(ImageFilter.MaxFilter(radius))
    glow = Image.new("RGBA", image.size, color)
    glow.putalpha(alpha)
    glow.alpha_composite(image)
    return glow


def paste_centered(source, width_scale=1.0, x_shift=0, y_shift=0):
    canvas = Image.new("RGBA", source.size, (0, 0, 0, 0))
    scaled = source
    if width_scale != 1.0:
        scaled = source.resize((max(1, int(source.width * width_scale)), source.height), Image.Resampling.NEAREST)
    x = (source.width - scaled.width) // 2 + x_shift
    y = y_shift
    canvas.alpha_composite(scaled, (x, y))
    return canvas


def tint(image, brightness=1.0, color=(255, 255, 255, 255), blend=0.0):
    result = ImageEnhance.Brightness(image).enhance(brightness)
    if blend <= 0:
        return result
    overlay = Image.new("RGBA", result.size, color)
    return Image.blend(result, overlay, blend)


def direction_base(source, direction):
    if direction == "front":
        return source
    if direction == "right":
        return paste_centered(source, width_scale=0.78, x_shift=8)
    if direction == "left":
        return ImageOps.mirror(direction_base(source, "right"))

    back = tint(source, brightness=0.72, color=(58, 31, 78, 255), blend=0.18)
    draw = ImageDraw.Draw(back)
    draw.ellipse((47, 22, 81, 61), fill=(18, 9, 27, 210))
    draw.rectangle((48, 40, 80, 74), fill=(21, 10, 31, 190))
    return back


def shifted(image, direction, distance):
    offsets = {
        "front": (0, distance),
        "back": (0, -distance),
        "left": (-distance, 0),
        "right": (distance, 0),
    }
    dx, dy = offsets[direction]
    canvas = Image.new("RGBA", image.size, (0, 0, 0, 0))
    canvas.alpha_composite(image, (dx, dy))
    return canvas


def write_directional_sprites():
    source = load_source()
    bases = {direction: direction_base(source, direction) for direction in DIRECTIONS}

    for direction, base in bases.items():
        base.save(SPRITES / f"idle-{direction}.png")
        walk = shifted(base, direction, 2)
        walk.save(SPRITES / f"walk-{direction}.png")
        attack = alpha_glow(shifted(tint(base, brightness=1.16), direction, 5))
        attack.save(SPRITES / f"attack-{direction}.png")
        downed = Image.new("RGBA", base.size, (0, 0, 0, 0))
        rotated = base.rotate(90 if direction in ("front", "right") else -90, resample=Image.Resampling.NEAREST, expand=False)
        dimmed = tint(rotated, brightness=0.55, color=(54, 24, 34, 255), blend=0.12)
        downed.alpha_composite(dimmed, (0, 10))
        target = "downed.png" if direction == "front" else f"downed-{direction}.png"
        downed.save(SPRITES / target)


def main():
    SPRITES.mkdir(parents=True, exist_ok=True)
    write_directional_sprites()
    print(f"wrote demon lord directional sprites to {SPRITES}")


if __name__ == "__main__":
    main()
