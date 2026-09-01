#!/usr/bin/env python3
"""
Turn a photoreal device shot (device on a plain seamless backdrop) into a transparent
cutout PNG, PRESERVING the contact shadow as soft alpha.

  python3 frame-cutout.py <in.png> <out.png> [--tol 30] [--shadow 0.9] [--margin 0.08]

Why not a flood fill against the corner colour: a studio backdrop is a smooth GRADIENT, so
a fixed tolerance stops partway across the field and leaves a ragged blob around the device.

Instead the backdrop is MODELLED per row: sample the outer `margin` of each row on the left
and right (guaranteed backdrop, since the device is centred with margin), then interpolate
across the row. A pixel is device if it differs from that local estimate; the device is then
the largest connected such region containing the image centre. Everything else is backdrop:
transparent, except where it's darker than the local estimate — that's the shadow, kept as
neutral black at partial alpha.
"""
import argparse
import numpy as np
from PIL import Image
from collections import deque

def backdrop_model(rgb, margin=0.08):
    """Per-row left/right medians, linearly interpolated across the row."""
    H, W, _ = rgb.shape
    m = max(4, int(W * margin))
    left = np.median(rgb[:, :m], axis=1)          # (H,3)
    right = np.median(rgb[:, -m:], axis=1)        # (H,3)
    t = np.linspace(0.0, 1.0, W, dtype=np.float32)[None, :, None]
    return left[:, None, :] * (1 - t) + right[:, None, :] * t

def largest_component_containing(mask, seed_yx, ds=2):
    H, W = mask.shape
    small = mask[::ds, ::ds]
    sh, sw = small.shape
    sy, sx = seed_yx[0] // ds, seed_yx[1] // ds
    if not small[sy, sx]:                          # nudge to the nearest set pixel
        ys, xs = np.nonzero(small)
        if len(ys) == 0: return mask
        i = np.argmin((ys - sy) ** 2 + (xs - sx) ** 2)
        sy, sx = int(ys[i]), int(xs[i])
    seen = np.zeros((sh, sw), bool)
    seen[sy, sx] = True
    q = deque([(sy, sx)])
    while q:
        y, x = q.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < sh and 0 <= nx < sw and small[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    return np.repeat(np.repeat(seen, ds, 0), ds, 1)[:H, :W] & mask

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--tol', type=float, default=30.0)
    ap.add_argument('--shadow', type=float, default=0.9)
    ap.add_argument('--margin', type=float, default=0.08)
    a = ap.parse_args()

    img = Image.open(a.src).convert('RGB')
    rgb = np.asarray(img).astype(np.float32)
    H, W, _ = rgb.shape

    est = backdrop_model(rgb, a.margin)
    diff = np.linalg.norm(rgb - est, axis=2)

    # The soft contact shadow also "differs from the backdrop" and touches the device, so a
    # single loose mask swallows it and renders it opaque (a light ragged patch under the
    # phone). Fix: find the device body with a STRICT threshold, take its bounding box, and
    # only accept loose-mask pixels inside that box. The shadow lives outside it.
    strict = largest_component_containing(diff > a.tol * 2.2, (H // 2, W // 2))
    ys, xs = np.nonzero(strict)
    if len(ys) == 0:
        raise SystemExit('could not isolate the device body — try a lower --tol')
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    box = np.zeros_like(strict)
    box[y0:y1 + 1, x0:x1 + 1] = True

    device = largest_component_containing((diff > a.tol) & box, (H // 2, W // 2))
    # close small holes so speculars inside the metal don't punch through
    pad = np.pad(device, 1)
    grown = np.zeros_like(device)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            grown |= pad[dy:dy+H, dx:dx+W]
    device = grown & box

    est_lum = est.mean(2)
    lum = rgb.mean(2)
    shadow_a = np.clip((est_lum - lum) / np.maximum(est_lum, 1e-6), 0, 1) * a.shadow * 255.0

    out = np.zeros((H, W, 4), np.float32)
    out[..., :3] = np.where(device[..., None], rgb, 0.0)      # shadow renders neutral black
    out[..., 3] = np.where(device, 255.0, shadow_a)

    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(a.out)
    print(f'{a.out}  device {device.mean()*100:.1f}%  '
          f'shadow {(((~device) & (shadow_a > 4))).mean()*100:.1f}%  '
          f'clear {(((~device) & (shadow_a <= 4))).mean()*100:.1f}%')

if __name__ == '__main__':
    main()
