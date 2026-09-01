"""
Screen detection + compositing shared by screen-comp*.py.

Detection is SEED-BASED, not box-based. A bounding box fails the moment the camera
pushes in (the screen grows outside the box and you warp onto a clipped sub-region —
the white-margin bug). Instead:

  1. bright + low-saturation mask (the blank screen)
  2. connected-component label at reduced res (pure numpy/BFS; no scipy/cv2 here)
  3. take the component containing the SEED point (or the largest, if no seed)
  4. corners of THAT component only, refined at full res

In track mode the seed for frame N+1 is the centroid of frame N's screen, so it
follows the screen through motion at any scale.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from collections import deque

BRIGHT, SAT = 218, 26          # blank-screen thresholds (a lit white panel)

def _mask(img, bright=BRIGHT, sat=SAT):
    a = np.asarray(img.convert("RGB")).astype(np.int16)
    return (a.min(2) > bright) & ((a.max(2) - a.min(2)) < sat)

def _largest_component(mask, seed=None, ds=4):
    """Label at 1/ds res, return a full-res boolean mask of one component."""
    small = mask[::ds, ::ds]
    H, W = small.shape
    seen = np.zeros((H, W), np.int32)
    comps = []                                  # (size, id, cells)
    cid = 0
    ys, xs = np.nonzero(small)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        cid += 1
        q = deque([(y0, x0)]); seen[y0, x0] = cid; n = 0
        miny = maxy = y0; minx = maxx = x0
        while q:
            y, x = q.popleft(); n += 1
            if y < miny: miny = y
            if y > maxy: maxy = y
            if x < minx: minx = x
            if x > maxx: maxx = x
            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny, nx = y+dy, x+dx
                if 0 <= ny < H and 0 <= nx < W and small[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = cid; q.append((ny, nx))
        comps.append((n, cid, (miny, maxy, minx, maxx)))
    if not comps:
        return None, None
    pick = None
    if seed is not None:
        sy, sx = int(seed[1]) // ds, int(seed[0]) // ds
        if 0 <= sy < H and 0 <= sx < W and seen[sy, sx]:
            pick = seen[sy, sx]
        else:                                   # seed drifted off: nearest big comp
            best = None
            for n, c, (a, b, cc, d) in comps:
                if n < 40: continue
                cy, cx = (a+b)/2, (cc+d)/2
                dist = (cy-sy)**2 + (cx-sx)**2
                if best is None or dist < best[0]: best = (dist, c)
            pick = best[1] if best else None
    if pick is None:
        pick = max(comps)[1]
    # upsample that component's cells back to full res
    comp_small = (seen == pick)
    full = np.repeat(np.repeat(comp_small, ds, 0), ds, 1)[:mask.shape[0], :mask.shape[1]]
    return (full & mask), comp_small

def detect_screen(img, seed=None, min_px=4000):
    """-> (quad tl,tr,br,bl | None, centroid | None). Seed-following, box-free."""
    m = _mask(img)
    comp, _ = _largest_component(m, seed)
    if comp is None or comp.sum() < min_px:
        return None, None
    ys, xs = np.nonzero(comp)
    pts = np.stack([xs, ys], 1)
    s = xs + ys; d = xs - ys
    quad = [tuple(pts[np.argmin(s)]), tuple(pts[np.argmax(d)]),
            tuple(pts[np.argmax(s)]), tuple(pts[np.argmin(d)])]
    return quad, (float(xs.mean()), float(ys.mean()))

# ---------- compositing ----------

def find_coeffs(dest, src):
    m = []
    for (dx, dy), (sx, sy) in zip(dest, src):
        m.append([dx, dy, 1, 0, 0, 0, -sx*dx, -sx*dy])
        m.append([0, 0, 0, dx, dy, 1, -sy*dx, -sy*dy])
    A = np.array(m, dtype=np.float64); B = np.array(src, dtype=np.float64).reshape(8)
    return np.linalg.solve(A, B)

def rrect(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w-1, h-1], radius=r, fill=255)
    return m

def autocrop_content(ui):
    """Strip flat gray page-margins (widget-modal-on-a-page recordings)."""
    a = np.asarray(ui.convert("RGB")).astype(np.int16)
    content = (a.mean(2) > 224) | ((a.max(2) - a.min(2)) > 40)
    ys, xs = np.nonzero(content)
    if len(xs) == 0: return ui
    p = 2
    x0, y0 = max(xs.min()-p, 0), max(ys.min()-p, 0)
    x1, y1 = min(xs.max()+p, ui.width), min(ys.max()+p, ui.height)
    if x0 < ui.width*.03 and y0 < ui.height*.03 and x1 > ui.width*.97 and y1 > ui.height*.97:
        return ui
    return ui.crop((x0, y0, x1, y1))

def fit_cover(ui, quad):
    """Center-crop the UI to the quad's aspect so it FILLS the screen without stretching."""
    (tlx, tly), (trx, try_), (brx, bry), (blx, bly) = [(float(a), float(b)) for a, b in quad]
    wq = (np.hypot(trx-tlx, try_-tly) + np.hypot(brx-blx, bry-bly)) / 2
    hq = (np.hypot(blx-tlx, bly-tly) + np.hypot(brx-trx, bry-try_)) / 2
    if wq <= 0 or hq <= 0: return ui
    target, cur = wq / hq, ui.width / ui.height
    if abs(target - cur) < 0.01: return ui
    if cur > target:                       # UI too wide -> crop sides
        w = int(round(ui.height * target)); x = (ui.width - w) // 2
        return ui.crop((x, 0, x + w, ui.height))
    h = int(round(ui.width / target)); y = (ui.height - h) // 2   # too tall -> crop top/bottom
    return ui.crop((0, y, ui.width, y + h))

def blend(device_img, ui_img, quad, rad, rng, cover=True):
    W, H = device_img.size
    ui = fit_cover(ui_img, quad) if cover else ui_img
    a = np.asarray(ui.convert("RGB")).astype(np.float32)
    a[..., 0] *= .90; a[..., 1] *= .875; a[..., 2] *= .83        # warm pickup + dim
    ui = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")
    uw, uh = ui.size
    ui.putalpha(rrect(uw, uh, rad))
    warp = ui.transform((W, H), Image.PERSPECTIVE,
                        find_coeffs(quad, [(0,0),(uw,0),(uw,uh),(0,uh)]),
                        resample=Image.BICUBIC)
    scr = np.asarray(warp.split()[3]).astype(np.float32) / 255.0
    sm3 = scr[..., None]
    base = device_img.convert("RGBA"); base.alpha_composite(warp)
    base = np.asarray(base.convert("RGB")).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    g = (xx/W)*.5 + (yy/H)*.5
    base += (np.clip(1.0 - np.abs(g-.32)/.10, 0, 1)**2 * 34.0)[..., None] * sm3   # glare
    base += rng.normal(0, 4.2, (H, W, 1)).astype(np.float32) * sm3                # grain
    shrunk = np.asarray(Image.fromarray((scr*255).astype(np.uint8))
                        .filter(ImageFilter.GaussianBlur(9))).astype(np.float32)
    base -= np.clip((scr*255 - shrunk), 0, 255)[..., None] * .6                   # bezel
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))

def smooth_quads(quads, win=5):
    out, n = [], len(quads)
    for i in range(n):
        lo, hi = max(0, i-win//2), min(n, i+win//2+1)
        acc = [q for q in quads[lo:hi] if q is not None]
        out.append(None if not acc else
                   [tuple(np.mean([q[c] for q in acc], axis=0)) for c in range(4)])
    return out
