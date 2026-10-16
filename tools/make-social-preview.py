#!/usr/bin/env python3
"""Generate Manda Pixel social preview card (1200x630) + favicon.

Portable: only depends on Pillow. Run from repo root:
    python3 tools/make-social-preview.py
Writes public/og-image.png and public/favicon.svg is already present (logo).
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PURPLE = (106, 51, 120)      # #6A3378 brand
DEEP = (46, 18, 56)          # darker purple for gradient feel
YELLOW = (252, 217, 83)      # #FCD953 brand
CREAM = (250, 245, 240)
GRAY = (196, 178, 200)

FONT_DIRS = [
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/truetype/liberation",
    "/usr/share/fonts/truetype/liberation2",
]
FONT_CANDIDATES = [
    ("DejaVuSans-Bold.ttf", "DejaVuSans.ttf"),
    ("LiberationSans-Bold.ttf", "LiberationSans-Regular.ttf"),
]


def load_font(size, bold=True):
    for d in FONT_DIRS:
        for bold_name, reg_name in FONT_CANDIDATES:
            name = bold_name if bold else reg_name
            p = os.path.join(d, name)
            if os.path.exists(p):
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    continue
    return ImageFont.load_default()


def pixel_logo(draw, ox, oy, scale):
    """The 5x5 logo pattern from public/logo.svg, drawn at given origin/scale."""
    pattern = [
        "#6A3378", ".", "#6A3378", ".", "#6A3378",
        ".", "#6A3378", "#6A3378", "#6A3378", ".",
        "#6A3378", "#6A3378", "#FCD953", "#6A3378", "#6A3378",
        ".", "#6A3378", "#6A3378", "#6A3378", ".",
        "#6A3378", ".", "#6A3378", ".", "#6A3378",
    ]
    for i, cell in enumerate(pattern):
        r, c = divmod(i, 5)
        if cell == ".":
            continue
        color = YELLOW if cell == "#FCD953" else PURPLE
        draw.rectangle([ox + c * scale, oy + r * scale,
                        ox + (c + 1) * scale - 2, oy + (r + 1) * scale - 2],
                       fill=color)


def main():
    img = Image.new("RGB", (W, H), DEEP)
    draw = ImageDraw.Draw(img)

    # vertical gradient DEEP -> PURPLE
    for y in range(H):
        t = y / H
        col = tuple(int(DEEP[i] * (1 - t) + PURPLE[i] * t) for i in range(3))
        draw.line([(0, y), (W, y)], fill=col)

    # scattered pixel "sold blocks" on the right side (the concept: 1M pixels for sale)
    import random
    random.seed(20261016)
    px = 22
    for _ in range(26):
        x = random.randint(720, W - 60)
        y = random.randint(60, H - 60)
        if random.random() < 0.55:
            draw.rectangle([x, y, x + px, y + px], fill=YELLOW)
        else:
            draw.rectangle([x, y, x + px, y + px],
                           fill=tuple(int(PURPLE[i] * 0.8 + CREAM[i] * 0.2) for i in range(3)))

    # large pixel logo mark (left)
    pixel_logo(draw, 90, 410, 34)

    # headline
    font_big = load_font(92)
    draw.text((90, 120), "Manda Pixel", font=font_big, fill=CREAM)

    # tagline
    font_mid = load_font(40, bold=False)
    draw.text((92, 250), "1.000.000 de pixels por R$ 1 cada", font=font_mid, fill=GRAY)

    # URL chip
    font_url = load_font(30)
    url = "mandapixel.com.br"
    tw = draw.textlength(url, font=font_url)
    chip_x, chip_y = 92, 330
    draw.rounded_rectangle([chip_x, chip_y, chip_x + tw + 44, chip_y + 56],
                           radius=28, fill=YELLOW)
    draw.text((chip_x + 22, chip_y + 10), url, font=font_url, fill=DEEP)

    out = os.path.join(os.path.dirname(__file__), "..", "public", "og-image.png")
    out = os.path.abspath(out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.save(out, "PNG")
    print(f"wrote {out} ({W}x{H})")


if __name__ == "__main__":
    main()
