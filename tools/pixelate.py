#!/usr/bin/env python3
"""
Turns any image (your own photo, an AI-generated texture, a scan) into a game-ready pixel-art tile, for the
things the pack lacks (thatch, log walls, ...). The result goes straight into textures/ and the manifest.

  python3 tools/pixelate.py source.png thatch_roof --as roof_thatch            # 64px, 24 colours, seamless
  python3 tools/pixelate.py logs.jpg wall_logs --size 64 --colors 20 --bright 0.9
  python3 tools/pixelate.py cloth.png fab_plaid --grey                         # soft greyscale (tintable) 32px

Any name the game already looks up (roof_thatch, wall_logs, wall_brick, floor_wood, int_*, fab_*, ground_* ...) replaces
that texture; see tools/build_textures.py for the list. Options:
  --size N      output width/height in pixels (default 64)
  --colors N    palette size after quantising (default 24, 0 = keep full colour)
  --bright F    brightness multiplier (default 1.0)
  --grey        convert to a soft greyscale tint map (for fabrics / wood that get tinted in game)
  --no-seamless skip the edge blend that makes the tile repeat without seams
  --as NAME     manifest key to write (default: the output name)
"""
import argparse, json, os
from PIL import Image, ImageEnhance, ImageOps

def seamless(im):
    """Offset-and-feather: blends the image with itself shifted by half, so opposite edges match."""
    w, h = im.size; s = im.copy()
    shifted = ImageChops_offset(im, w // 2, h // 2)
    mask = Image.new('L', (w, h)); px = mask.load()
    for y in range(h):
        for x in range(w):
            dx = abs(x - w / 2) / (w / 2); dy = abs(y - h / 2) / (h / 2); px[x, y] = int(255 * max(0.0, 1 - max(dx, dy) ** 2))
    return Image.composite(im, shifted, mask)

def ImageChops_offset(im, dx, dy):
    from PIL import ImageChops
    return ImageChops.offset(im, dx, dy)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('source'); ap.add_argument('name'); ap.add_argument('--size', type=int, default=64); ap.add_argument('--colors', type=int, default=24)
    ap.add_argument('--bright', type=float, default=1.0); ap.add_argument('--grey', action='store_true'); ap.add_argument('--no-seamless', action='store_true'); ap.add_argument('--as', dest='key')
    a = ap.parse_args()
    im = Image.open(a.source).convert('RGB'); w, h = im.size; m = min(w, h); im = im.crop(((w - m) // 2, (h - m) // 2, (w - m) // 2 + m, (h - m) // 2 + m))   # centre square
    if not a.no_seamless: im = seamless(im.resize((max(a.size * 4, 128),) * 2, Image.LANCZOS))
    im = im.resize((a.size, a.size), Image.BOX)                                                   # box filter = clean pixel blocks
    if a.bright != 1.0: im = ImageEnhance.Brightness(im).enhance(a.bright)
    if a.grey:
        g = ImageOps.grayscale(im); px = list(g.get_flattened_data() if hasattr(g, 'get_flattened_data') else g.getdata()); mean = sum(px) / len(px)
        im = g.point(lambda v: max(0, min(255, int(222 + (v - mean) * 0.75)))).convert('RGB')
    elif a.colors > 0: im = im.quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'textures'); os.makedirs(out, exist_ok=True)
    key = a.key or a.name; fn = key + '.png'; im.save(os.path.join(out, fn))
    mp = os.path.join(out, 'manifest.json'); man = json.load(open(mp)) if os.path.exists(mp) else {}; man[key] = fn; json.dump(man, open(mp, 'w'), indent=1)
    print('wrote textures/' + fn, im.size, '(manifest key %s)' % key)
main()
