"""Even out the flavor photos: every bagel the same width, centred on a pure-white 1000x1000 canvas."""
import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC, OUT = sys.argv[1], sys.argv[2]
CANVAS, BAGEL_W = 1000, 880

def whiten(a):
    mn = a.min(axis=2); sat = a.max(axis=2) - mn
    t = np.clip((mn - 232.0) / 18.0, 0, 1) * (sat < 14)
    return a * (1 - t[..., None]) + 255.0 * t[..., None]

for f in sorted(glob.glob(os.path.join(SRC, '*.png'))):
    name = os.path.splitext(os.path.basename(f))[0]
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    mn = a.min(axis=2); sat = a.max(axis=2) - mn
    body = (sat > 40) | (mn < 110)                     # bagel crust / seeds; the grey shadow is neither
    body = ndi.binary_opening(body, iterations=2)
    lab, n = ndi.label(body)
    sizes = ndi.sum(body, lab, index=np.arange(1, n + 1))
    keep = lab == (int(np.argmax(sizes)) + 1)          # the bagel itself (drop stray crumbs)
    keep = ndi.binary_fill_holes(ndi.binary_closing(keep, iterations=6))
    ys, xs = np.where(keep)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, cx, cy = x1 - x0 + 1, (x0 + x1) / 2, (y0 + y1) / 2
    s = BAGEL_W / bw
    img = Image.fromarray(np.clip(whiten(a), 0, 255).astype(np.uint8))
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    canvas = Image.new('RGB', (CANVAS, CANVAS), (255, 255, 255))
    canvas.paste(img, (round(CANVAS / 2 - cx * s), round(CANVAS / 2 - cy * s)))
    # fade the outer 40px to white so a shadow can never end in a hard line at the frame edge
    c = np.asarray(canvas).astype(np.float32)
    yy, xx = np.mgrid[0:CANVAS, 0:CANVAS]
    d = np.minimum(np.minimum(xx, CANVAS - 1 - xx), np.minimum(yy, CANVAS - 1 - yy))
    w = np.clip(d / 40.0, 0, 1)[..., None]
    canvas = Image.fromarray((c * w + 255.0 * (1 - w)).astype(np.uint8))
    canvas.save(os.path.join(OUT, f'nybe-flavor-{name}.webp'), 'WEBP', quality=86, method=6)
    print(f'{name:16s} src {a.shape[1]}x{a.shape[0]}  bagel {bw}x{y1 - y0 + 1} ({100 * bw / a.shape[1]:.0f}% of width)  scale {s:.2f}')
