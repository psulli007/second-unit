#!/usr/bin/env python3
"""
Screen-container compositor: warp a real UI screenshot onto a blank
device screen with a realism pass (warm pickup, glare, grain, bezel shadow).

Usage:
  python3 screen-comp.py <device.png> <ui.png> <out.png> [--box x0,y0,x1,y1] [--rad N]

The device screen must be a clean blank near-white rectangle. Auto-detects the
screen quad inside --box (default: whole image) via bright/low-saturation pixels.
UI is never re-rendered — it's the real screenshot, pixel-perfect.
"""
import sys, argparse, numpy as np
from PIL import Image, ImageDraw, ImageFilter

def find_coeffs(dest, src):
    m = []
    for (dx, dy), (sx, sy) in zip(dest, src):
        m.append([dx, dy, 1, 0, 0, 0, -sx*dx, -sx*dy])
        m.append([0, 0, 0, dx, dy, 1, -sy*dx, -sy*dy])
    A = np.array(m, dtype=np.float64); B = np.array(src, dtype=np.float64).reshape(8)
    return np.linalg.solve(A, B)

def detect_quad(pov, box):
    x0, y0, x1, y1 = box
    a = np.asarray(pov.convert("RGB")).astype(np.int16)[y0:y1, x0:x1]
    mn = a.min(2); mx = a.max(2); mask = (mn > 232) & ((mx - mn) < 16)
    ys, xs = np.where(mask)
    if len(xs) == 0:
        raise SystemExit("No blank screen found in --box. Widen the box or check the plate.")
    xs = xs + x0; ys = ys + y0; pts = np.stack([xs, ys], 1); s = xs + ys; d = xs - ys
    return [tuple(pts[np.argmin(s)]), tuple(pts[np.argmax(d)]),
            tuple(pts[np.argmax(s)]), tuple(pts[np.argmin(d)])]

def rrect(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w-1, h-1], radius=r, fill=255)
    return m

def autocrop_content(ui):
    """Strip flat gray page-margins (e.g. widget-modal-on-a-page recordings) so the
    UI fills the screen edge-to-edge. Keeps bright/colored content, drops uniform gray."""
    a = np.asarray(ui.convert("RGB")).astype(np.int16)
    content = (a.mean(2) > 224) | ((a.max(2) - a.min(2)) > 40)
    ys, xs = np.where(content)
    if len(xs) == 0:
        return ui
    pad = 2
    x0 = max(xs.min()-pad, 0); y0 = max(ys.min()-pad, 0)
    x1 = min(xs.max()+pad, ui.width); y1 = min(ys.max()+pad, ui.height)
    # only crop if there's a meaningful margin to remove (>3% on some side)
    if x0 < ui.width*0.03 and y0 < ui.height*0.03 and x1 > ui.width*0.97 and y1 > ui.height*0.97:
        return ui
    return ui.crop((x0, y0, x1, y1))

def composite(device_path, ui_path, out_path, box=None, rad=10, crop=True):
    dev = Image.open(device_path).convert("RGB"); W, H = dev.size
    if box is None: box = (0, 0, W, H)
    ui = Image.open(ui_path).convert("RGB")
    if crop: ui = autocrop_content(ui)
    uw, uh = ui.size
    a = np.asarray(ui).astype(np.float32)
    a[..., 0] *= 0.90; a[..., 1] *= 0.875; a[..., 2] *= 0.83     # warm pickup + dim
    ui = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")
    ui.putalpha(rrect(uw, uh, rad))
    quad = detect_quad(dev, box)
    coeffs = find_coeffs(quad, [(0, 0), (uw, 0), (uw, uh), (0, uh)])
    warp = ui.transform((W, H), Image.PERSPECTIVE, coeffs, resample=Image.BICUBIC)
    scr = np.asarray(warp.split()[3]).astype(np.float32) / 255.0
    sm3 = scr[..., None]
    base = dev.convert("RGBA"); base.alpha_composite(warp)
    base = np.asarray(base.convert("RGB")).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)                # diagonal glare
    g = (xx/W)*0.5 + (yy/H)*0.5
    glare = (np.clip(1.0 - np.abs(g - 0.32)/0.10, 0, 1)**2 * 34.0)[..., None] * sm3
    base += glare
    base += np.random.default_rng(7).normal(0, 4.2, (H, W, 1)).astype(np.float32) * sm3
    shrunk = np.asarray(Image.fromarray((scr*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))).astype(np.float32)
    base -= np.clip((scr*255 - shrunk), 0, 255)[..., None] * 0.6  # bezel shadow
    Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).save(out_path, quality=95)
    print(f"{out_path}  quad={quad}")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("device"); p.add_argument("ui"); p.add_argument("out")
    p.add_argument("--box", default=None); p.add_argument("--rad", type=int, default=10)
    p.add_argument("--no-crop", action="store_true", help="skip auto-crop of gray page margins")
    args = p.parse_args()
    box = tuple(int(v) for v in args.box.split(",")) if args.box else None
    composite(args.device, args.ui, args.out, box, args.rad, crop=not args.no_crop)
