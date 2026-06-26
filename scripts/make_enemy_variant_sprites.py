from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ACTIONS = [
    "idle-front.png", "idle-back.png", "idle-left.png", "idle-right.png",
    "walk-front.png", "walk-back.png", "walk-left.png", "walk-right.png",
    "attack-front.png", "attack-back.png", "attack-left.png", "attack-right.png",
    "downed.png", "downed-back.png", "downed-left.png", "downed-right.png",
]

VARIANTS = {
    "guard": {"base": "warrior", "tint": (122, 150, 188), "strength": 0.24},
    "knight": {"base": "warrior", "tint": (194, 166, 88), "strength": 0.30},
    "paladin": {"base": "warrior", "tint": (232, 220, 172), "strength": 0.34},
    "hero": {"base": "warrior", "tint": (210, 78, 58), "strength": 0.26},
    "ranger": {"base": "rogue", "tint": (92, 142, 84), "strength": 0.30},
    "beastTamer": {"base": "rogue", "tint": (177, 115, 62), "strength": 0.34},
    "cleric": {"base": "mage", "tint": (224, 218, 190), "strength": 0.36},
    "alchemist": {"base": "mage", "tint": (82, 172, 112), "strength": 0.32},
    "sage": {"base": "mage", "tint": (154, 96, 214), "strength": 0.30},
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
        frame.save(generated_out / name)
        frame.save(public_out / name)


def main():
    for unit_id, spec in VARIANTS.items():
        save_variant(unit_id, spec["base"], spec["tint"], spec["strength"])
    print(f"Wrote {len(VARIANTS)} enemy visual variants")


if __name__ == "__main__":
    main()
