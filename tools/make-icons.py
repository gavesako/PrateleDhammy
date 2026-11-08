#!/usr/bin/env python3
"""Generate the PWA icons in icons/.

Usage (from the project root):
    python3 tools/make-icons.py path/to/image.png   # icons from your image
    python3 tools/make-icons.py                     # placeholder (Dhamma wheel)

The image should be square and at least 512x512 px. Non-square images are
cropped to the centre. A PNG with a transparent background (a logo) is placed
on the app's green background with a margin; a photo fills the whole icon
(white rounded corners, if present, are filled with the photo's edge colour;
for Android's round icons the photo is shrunk a little so nothing is cut).

Needs Pillow:  python3 -m pip install Pillow
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

BG = (47, 93, 70)        # --accent  #2f5d46
FG = (224, 169, 71)      # saffron   #e0a947
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")


def placeholder(size=1024):
    im = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(im)
    c, r = size / 2, size * 0.30
    w = max(2, int(size * 0.035))
    d.ellipse([c - r, c - r, c + r, c + r], outline=FG, width=w)
    hub = size * 0.06
    d.ellipse([c - hub, c - hub, c + hub, c + hub], outline=FG, width=w)
    for i in range(8):
        a = i * math.pi / 4
        d.line([c + hub * math.cos(a), c + hub * math.sin(a),
                c + r * math.cos(a), c + r * math.sin(a)], fill=FG, width=w)
    return im


def fill_corners(im):
    """Photos exported as rounded app icons have white/transparent corners.
    Phones round the icon themselves, so paint those corners with the dark
    colour found along the image edges instead."""
    im = im.convert("RGB")
    w, h = im.size
    edge = [im.getpixel((x, y)) for x, y in
            [(w // 2, 2), (2, h // 2), (w - 3, h // 2), (w // 2, h - 3)]]
    corner = im.getpixel((0, 0))
    if sum(corner) < 600:          # corners not light -> nothing to do
        return im, None
    # darkest edge sample is closest to the colour at the corners
    fill = min(edge, key=sum)
    # Find the light corner areas (flood fill a copy with a marker colour),
    # grow that area a few pixels to swallow the anti-aliased edge, then
    # paint it with the background colour.
    probe = im.copy()
    marker = (255, 0, 255)
    for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(probe, xy, marker, thresh=120)
    mask = Image.new("L", (w, h), 0)
    mask.putdata([255 if p == marker else 0 for p in probe.getdata()])
    grow = max(3, (w // 200) | 1)          # odd kernel size, ~0.5% of width
    mask = mask.filter(ImageFilter.MaxFilter(grow)).filter(ImageFilter.GaussianBlur(1))
    im.paste(Image.new("RGB", (w, h), fill), (0, 0), mask)
    return im, fill


def square(im):
    s = min(im.size)
    l, t = (im.width - s) // 2, (im.height - s) // 2
    return im.crop((l, t, l + s, t + s))


def on_bg(im, size, scale):
    """Place im (RGBA or RGB) centred on the green background at `scale`."""
    canvas = Image.new("RGB", (size, size), BG)
    inner = int(size * scale)
    piece = im.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    if piece.mode == "RGBA":
        canvas.paste(piece, (off, off), piece)
    elif inner < size:
        # Photo shrunk onto a background: fade its edges so no seam shows.
        feather = inner // 12
        m = Image.new("L", (inner, inner), 0)
        ImageDraw.Draw(m).rectangle([feather, feather, inner - feather, inner - feather], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(feather / 2))
        canvas.paste(piece, (off, off), m)
    else:
        canvas.paste(piece, (off, off))
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)
    if len(sys.argv) > 1:
        src = square(Image.open(sys.argv[1]))
        logo = src.mode in ("RGBA", "LA", "P") and "A" in src.convert("RGBA").getbands()
        src = src.convert("RGBA") if logo else src.convert("RGB")
        if not logo:
            src, fill = fill_corners(src)
            if fill:
                global BG
                BG = fill
    else:
        src, logo = placeholder(), False

    # "any" icons and iPhone icon: logos get a small margin, photos fill.
    base = on_bg(src, 1024, 0.86 if logo else 1.0)
    # Android "maskable": the launcher may crop to a circle -> keep a safe zone.
    mask = on_bg(src, 1024, 0.70 if logo else 0.80)

    base.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "icon-512.png"))
    base.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, "icon-192.png"))
    base.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "apple-touch-icon.png"))
    mask.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "icon-maskable-512.png"))
    print("Icons written to", os.path.normpath(OUT))


if __name__ == "__main__":
    main()
