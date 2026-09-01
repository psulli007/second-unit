#!/usr/bin/env python3
"""
Auto-calibrate a CHROMA plate's screen quad by closing the loop on the render.

    python3 scripts/autocal.py assets/plates/pov-desk.png [layoutw]

Measuring the plate alone can only ever approximate: it tells you where the green is, not
where the UI actually lands after the homography, the corner rounding and the browser's
sub-pixel rasterisation. So instead render the real stage, look at what is still green, and
solve.

The key idea: on a chroma plate the TRUE screen is exactly

    (pixels still green)  UNION  (pixels the UI is currently covering)

Green left over means the quad is too small; the union tells you the real extent either way.
Re-fit the four edges to that union and the quad converges in a couple of passes — no
threshold guessing, no arc correction, no dragging corners by hand.
"""
import json, subprocess, sys, os
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATE = sys.argv[1]
LAYOUTW = sys.argv[2] if len(sys.argv) > 2 else '402'
DEVICE = 'laptop' if 'mbp' in PLATE or 'laptop' in PLATE else 'phone'
CHROME = 'macos' if DEVICE == 'laptop' else 'safari'
JS = os.path.join(ROOT, 'scripts', 'probe-stage.js')
JPATH = os.path.join(ROOT, PLATE.replace('.png', '.json'))
SHOT = '/tmp/autocal-render.png'
ROUNDS = 3

def is_green(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(2); mn = a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return (g > r * 1.25) & (g > b * 1.25) & (sat > 0.30) & (mx > 45)

def fit_quad(mask, notch_guard=True):
    """Fit the four edges of a clean mask and intersect them -> true corners."""
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    sw, sh = x1 - x0 + 1, y1 - y0 + 1

    def edge(axis, take_min):
        ind, vals = [], []
        if axis == 'row':
            for y in range(y0 + int(sh * .18), y0 + int(sh * .82)):
                nz = np.nonzero(mask[y])[0]
                if len(nz): ind.append(y); vals.append(nz.min() if take_min else nz.max())
        else:
            for x in range(x0 + int(sw * .18), x0 + int(sw * .82)):
                # the notch bites into the TOP edge at dead centre and drags the fit down
                if take_min and notch_guard and abs(x - (x0 + sw / 2)) < sw * 0.22: continue
                nz = np.nonzero(mask[:, x])[0]
                if len(nz): ind.append(x); vals.append(nz.min() if take_min else nz.max())
        ind = np.asarray(ind, float); vals = np.asarray(vals, float)
        for _ in range(3):
            a_, b_ = np.polyfit(ind, vals, 1)
            res = np.abs(vals - (a_ * ind + b_)); mad = np.median(res) or 1.0
            k = res <= max(3.0 * mad, 1.0)
            if k.sum() < 8 or k.all(): break
            ind, vals = ind[k], vals[k]
        return np.polyfit(ind, vals, 1)

    aL, bL = edge('row', True); aR, bR = edge('row', False)
    aT, bT = edge('col', True); aB, bB = edge('col', False)
    def isect(av, bv, ah, bh):
        x = (av * bh + bv) / (1 - av * ah)
        return [x, ah * x + bh]
    return [isect(aL, bL, aT, bT), isect(aR, bR, aT, bT),
            isect(aR, bR, aB, bB), isect(aL, bL, aB, bB)]

for it in range(ROUNDS):
    m = json.load(open(JPATH))
    subprocess.run(['node', JS, PLATE, CHROME, DEVICE, SHOT, LAYOUTW],
                   cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    im = Image.open(SHOT).convert('RGB')
    W, H = im.size
    a = np.asarray(im).astype(np.float32)
    green = is_green(a)

    q = [(x / 100 * W, y / 100 * H) for x, y in m['quad_pct']]
    covered = Image.new('L', (W, H), 0); ImageDraw.Draw(covered).polygon(q, fill=255)
    covered = np.asarray(covered) > 0
    # only green NEAR the screen — the kitchen has herbs and apples that also read as green
    cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
    nearimg = Image.new('L', (W, H), 0)
    ImageDraw.Draw(nearimg).polygon([(cx + (x - cx) * 1.10, cy + (y - cy) * 1.10) for x, y in q], fill=255)
    near = np.asarray(nearimg) > 0
    fringe = green & near

    screen = fringe | covered                       # <- the true screen
    print(f'pass {it + 1}: green fringe {int(fringe.sum()):>6} px', flush=True)
    if fringe.sum() < 400:
        print('converged'); break

    newq = fit_quad(screen)
    m['quad_pct'] = [[round(p[0] / W * 100, 4), round(p[1] / H * 100, 4)] for p in newq]
    m['autocalibrated'] = True
    json.dump(m, open(JPATH, 'w'), indent=1)

print('final quad ->', os.path.relpath(JPATH, ROOT))
