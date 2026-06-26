from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public" / "assets" / "sprites"
UNITS = ["goblin", "slime", "warrior", "rogue", "mage", "guard"]
DIRECTIONS = ["front", "back", "left", "right"]
WALK_OFFSETS = {
    "front": [(0, 0), (-1, -1), (1, 0)],
    "back": [(0, 0), (1, -1), (-1, 0)],
    "left": [(0, 0), (-2, -1), (-1, 0)],
    "right": [(0, 0), (2, -1), (1, 0)],
}
ATTACK_OFFSETS = {
    "front": (0, 4),
    "back": (0, -4),
    "left": (-4, 0),
    "right": (4, 0),
}


def shifted(image, offset, brighten=1.0):
    source = image.convert("RGBA")
    if brighten != 1.0:
        alpha = source.getchannel("A")
        rgb = Image.new("RGBA", source.size, (0, 0, 0, 0))
        rgb.alpha_composite(source)
        rgb = ImageEnhance.Brightness(rgb).enhance(brighten)
        rgb.putalpha(alpha)
        source = rgb
    canvas = Image.new("RGBA", source.size, (0, 0, 0, 0))
    canvas.alpha_composite(source, offset)
    return canvas


def write_walk_frames(unit_dir, direction):
    src = unit_dir / f"walk-{direction}.png"
    if not src.exists():
        return 0
    image = Image.open(src)
    count = 0
    for index, offset in enumerate(WALK_OFFSETS[direction]):
        shifted(image, offset).save(unit_dir / f"walk-{direction}-{index}.png")
        count += 1
    return count


def write_attack_frames(unit_dir, direction):
    src = unit_dir / f"attack-{direction}.png"
    if not src.exists():
        return 0
    image = Image.open(src)
    shifted(image, (0, 0)).save(unit_dir / f"attack-{direction}-0.png")
    shifted(image, ATTACK_OFFSETS[direction], brighten=1.18).save(unit_dir / f"attack-{direction}-1.png")
    return 2


def main():
    written = 0
    for unit_id in UNITS:
        unit_dir = SPRITES / unit_id
        if not unit_dir.exists():
            print(f"skip missing {unit_id}")
            continue
        for direction in DIRECTIONS:
            written += write_walk_frames(unit_dir, direction)
            written += write_attack_frames(unit_dir, direction)
    print(f"wrote {written} micro animation frames")


if __name__ == "__main__":
    main()
