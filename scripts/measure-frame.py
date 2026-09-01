#!/usr/bin/env python3
"""
Measure the OFF (black) screen rectangle in a photoreal device-frame image, and emit the
numbers the device stage needs (as % of the image, so the frame scales freely).

  python3 measure-frame.py <frame.png> [--json]

Finds the largest dark connected region (the switched-off screen), reports its box, and
estimates the screen's corner radius by walking in from the top edge of that box.
"""
import sys, json, argparse
import numpy as np
from PIL import Image
from collections import deque

def largest_dark(img, thresh=62, ds=4, seed=None):
    """With a seed, take the component containing it — a screen can otherwise merge with
    dark scenery (a dark floor, a shadowed counter) and blow up the measurement."""
    a = np.asarray(img.convert("RGB")).astype(np.int16)
    dark = a.max(2) < thresh
    if seed is not None:
        import sys as _s, os as _o
        _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__)))
        from screenlib import _largest_component
        comp, _ = _largest_component(dark, seed)
        if comp is None: _s.exit('no dark screen at that seed')
        return comp
    small = dark[::ds, ::ds]
    H, W = small.shape
    seen = np.zeros((H, W), np.int32); cid = 0; comps = []
    ys, xs = np.nonzero(small)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]: continue
        cid += 1; q = deque([(y0, x0)]); seen[y0, x0] = cid; n = 0
        while q:
            y, x = q.popleft(); n += 1
            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny, nx = y+dy, x+dx
                if 0 <= ny < H and 0 <= nx < W and small[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = cid; q.append((ny, nx))
        comps.append((n, cid))
    if not comps: sys.exit('no dark screen region found')
    pick = max(comps)[1]
    comp = np.repeat(np.repeat(seen == pick, ds, 0), ds, 1)[:dark.shape[0], :dark.shape[1]]
    return comp & dark

def largest_bright(img, thresh=225, sat=22, ds=4, seed=None):
    """For plates whose screen is BLANK/LIT rather than off."""
    import sys as _s, os as _o
    _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__)))
    from screenlib import _mask, _largest_component
    m = _mask(img, bright=thresh, sat=sat)
    comp, _ = _largest_component(m, seed)
    if comp is None: _s.exit('no bright screen region found')
    return comp

def largest_green(img, seed=None):
    """For CHROMA plates: the screen is rendered as a saturated green screen.

    This is the whole reason chroma plates exist. With a black screen there is no unambiguous
    boundary to find — the bezel, the body, the contact shadow and (on the POV plates) the
    feathers are all black too, so 'where the screen ends' shifts 10-30px with the darkness
    threshold, and every downstream number inherits that error. Green is separable by HUE, so
    the mask is exact and the edge lands on a pixel.
    """
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(2); mn = a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    # green dominant, saturated, and not near-black
    m = (g > r * 1.25) & (g > b * 1.25) & (sat > 0.30) & (mx > 45)
    if not m.any(): sys.exit('no green screen found — is this a chroma plate?')
    import sys as _s, os as _o
    _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__)))
    from screenlib import _largest_component
    comp, _ = _largest_component(m, seed if seed else None)
    return comp if comp is not None else m

def measure(path, bright=False, seed=None, thresh=62, region=None, green=False):
    img = Image.open(path)
    W, H = img.size
    comp = (largest_green(img, seed=seed) if green else
            largest_bright(img, seed=seed) if bright else
            largest_dark(img, seed=seed, thresh=thresh))
    if region:
        # Brightness alone cannot always separate an OFF screen from an equally dark chassis
        # (a low-angle laptop shot puts a big black keyboard deck right under the screen, and
        # they connect through the bezel). Constrain the search to where the screen actually
        # is. Safe for a STATIC plate; never do this for tracking through camera motion.
        x0, y0, x1, y1 = region
        m = np.zeros_like(comp)
        m[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = True
        comp = comp & m
    ys, xs = np.nonzero(comp)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    sw, sh = x1 - x0 + 1, y1 - y0 + 1

    # Corner radius = how far down from the top the screen takes to reach full width.
    #
    # Measuring it as the MAX left-inset over the top rows is wrong on any phone with a notch
    # or Dynamic Island: that cutout is inset far deeper than the corner arc, and it reported
    # 256px where the real radius is ~90px. Since the radius drives the arc correction below,
    # over-estimating it pushes the quad clean off the device.
    widths = []
    for y in range(y0, y0 + max(1, int(sh * .30))):
        nz = np.nonzero(comp[y])[0]
        widths.append(nz.max() - nz.min() + 1 if len(nz) else 0)
    widths = np.asarray(widths, float)
    full = np.median(widths[widths > 0.9 * sw]) if (widths > 0.9 * sw).any() else sw
    reached = np.nonzero(widths >= full * 0.995)[0]
    radius = int(reached[0]) if len(reached) else 0

    # corner quad (tl,tr,br,bl) — needed when the screen is tilted (POV shots), where a
    # rect placement is visibly wrong and the stage needs a homography instead.
    #
    # Fit the four EDGES and intersect them. The obvious approach — take the extreme points
    # of the mask (argmin of x+y for top-left, etc.) — is subtly wrong on a rounded screen:
    # the extreme point lies on the CORNER ARC, not at the true corner, so every corner is
    # pulled diagonally inward by ~0.29*radius. At a ~75px radius that inset the whole UI by
    # ~22px on all four sides, which reads as "the line-up is just barely off".
    # Sampling only the middle of each edge avoids the arcs entirely.
    pts_all = np.stack([xs, ys], 1)
    ssum, sdif = xs + ys, xs - ys
    quad = [pts_all[np.argmin(ssum)].astype(float), pts_all[np.argmax(sdif)].astype(float),
            pts_all[np.argmax(ssum)].astype(float), pts_all[np.argmin(sdif)].astype(float)]

    # Push each corner back out along its bisector by r*(1 - 1/sqrt(2)).
    #
    # The extreme points land on the corner ARCS, not the true corners, so the raw quad is
    # inset diagonally by exactly that amount — ~22px at a 75px radius, which reads on screen
    # as "the line-up is just barely off". Correcting analytically beats re-fitting the edges:
    # an edge fit needs a clean mask, and this mask leaks wherever something equally dark
    # touches the screen (the phone's shadowed side, feathers round the case), which threw a
    # corner 131px off the device even with outlier rejection.
    def _unit(v):
        n = float(np.hypot(v[0], v[1]))
        return v / n if n > 1e-6 else v

    if green:
        # A chroma mask is CLEAN, so the four edges can be fitted and intersected, which gives
        # the true corners outright — no arc guessing. This is what failed on the black plates:
        # there the mask leaked into the bezel/body/feathers and dragged a corner 131px off the
        # device. The whole point of the green screen is making this method safe.
        def fit_edge(axis, take_min):
            if axis == 'row':                      # left/right edges: x as a function of y
                lo, hi = y0 + int(sh * .18), y0 + int(sh * .82)
                ind, vals = [], []
                for y in range(lo, hi):
                    nz = np.nonzero(comp[y])[0]
                    if len(nz): ind.append(y); vals.append(nz.min() if take_min else nz.max())
            else:                                  # top/bottom edges: y as a function of x
                lo, hi = x0 + int(sw * .18), x0 + int(sw * .82)
                ind, vals = [], []
                for x in range(lo, hi):
                    # The notch / Dynamic Island bites into the TOP edge at dead centre, and
                    # it is wide enough to drag the fit (it put the top edge 50px too low).
                    # Sample the outer thirds only when fitting the top.
                    if take_min and abs(x - (x0 + sw / 2)) < sw * 0.22: continue
                    nz = np.nonzero(comp[:, x])[0]
                    if len(nz): ind.append(x); vals.append(nz.min() if take_min else nz.max())
            if len(ind) < 8: raise ValueError('too few edge samples')
            ind = np.asarray(ind, float); vals = np.asarray(vals, float)
            for _ in range(3):                     # trim residual outliers by MAD
                a_, b_ = np.polyfit(ind, vals, 1)
                resid = np.abs(vals - (a_ * ind + b_))
                mad = np.median(resid) or 1.0
                k = resid <= max(3.0 * mad, 1.0)
                if k.sum() < 8 or k.all(): break
                ind, vals = ind[k], vals[k]
            return np.polyfit(ind, vals, 1)

        aL, bL = fit_edge('row', True)
        aR, bR = fit_edge('row', False)
        aT, bT = fit_edge('col', True)
        aB, bB = fit_edge('col', False)
        def isect(av, bv, ah, bh):
            x = (av * bh + bv) / (1 - av * ah)
            return np.array([x, ah * x + bh])
        fitted = [isect(aL, bL, aT, bT), isect(aR, bR, aT, bT),
                  isect(aR, bR, aB, bB), isect(aL, bL, aB, bB)]
        # accept only if it stays near the mask — else keep the extreme-point quad
        if all(x0 - 0.06 * sw <= p[0] <= x1 + 0.06 * sw and
               y0 - 0.06 * sh <= p[1] <= y1 + 0.06 * sh for p in fitted):
            quad = fitted
        else:
            print('edge fit rejected (out of bounds); keeping extreme points', file=sys.stderr)
    else:
        # Black plates: the mask boundary cannot be trusted enough to fit, so take the extreme
        # points and push each corner back out along its bisector by r*(1 - 1/sqrt(2)) — the
        # exact amount by which an extreme point on a rounded corner misses the true corner.
        _push = radius * (1.0 - 1.0 / np.sqrt(2.0))
        _adj = [(1, 3), (0, 2), (3, 1), (2, 0)]    # for each corner: its two neighbours
        quad = [c + _push * _unit(_unit(c - quad[i]) + _unit(c - quad[j]))
                for c, (i, j) in zip(quad, _adj)]
    quad_pct = [[round(float(p[0]) / W * 100, 4), round(float(p[1]) / H * 100, 4)] for p in quad]
    corner_dev = max(
        float(np.hypot(quad[0][0]-x0, quad[0][1]-y0)), float(np.hypot(quad[1][0]-x1, quad[1][1]-y0)),
        float(np.hypot(quad[2][0]-x1, quad[2][1]-y1)), float(np.hypot(quad[3][0]-x0, quad[3][1]-y1)))

    return {
        'image': {'w': W, 'h': H},
        'quad_pct': quad_pct,
        'corner_deviation_px': round(corner_dev, 1),
        'is_rectangular': bool(corner_dev < sw * 0.02),
        'screen_px': {'x': x0, 'y': y0, 'w': sw, 'h': sh},
        'screen_pct': {
            'left':   round(x0 / W * 100, 4),
            'top':    round(y0 / H * 100, 4),
            'width':  round(sw / W * 100, 4),
            'height': round(sh / H * 100, 4),
        },
        'screen_aspect': round(sw / sh, 4),
        'radius_px': radius,
        'radius_pct_of_screen_w': round(radius / sw * 100, 3),
    }

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('frame'); p.add_argument('--json', action='store_true')
    p.add_argument('--bright', action='store_true', help='screen is blank/lit, not off')
    p.add_argument('--seed', default=None, help='x,y inside the screen (disambiguates)')
    # A dark OFF screen can merge with a dark CHASSIS through the bezel (space-black
    # MacBook: screen ~0-10, aluminium ~30-60). Lower this to separate them.
    p.add_argument('--thresh', type=int, default=62, help='darkness cutoff for the OFF screen')
    p.add_argument('--region', default=None, help='x0,y0,x1,y1 as FRACTIONS — restrict the search')
    p.add_argument('--green', action='store_true', help='CHROMA plate: screen is a green screen')
    a = p.parse_args()
    seed = tuple(float(v) for v in a.seed.split(',')) if a.seed else None
    region = tuple(float(v) for v in a.region.split(',')) if a.region else None
    m = measure(a.frame, bright=a.bright, seed=seed, thresh=a.thresh, region=region, green=a.green)
    if a.json:
        print(json.dumps(m, indent=1))
    else:
        s, pc = m['screen_px'], m['screen_pct']
        print(f"image      {m['image']['w']}x{m['image']['h']}")
        print(f"screen px  x={s['x']} y={s['y']} {s['w']}x{s['h']}  aspect {m['screen_aspect']}")
        print(f"screen %   left {pc['left']}  top {pc['top']}  w {pc['width']}  h {pc['height']}")
        print(f"radius     {m['radius_px']}px  ({m['radius_pct_of_screen_w']}% of screen width)")
        print(f"quad %     {m['quad_pct']}")
        print(f"corner dev {m['corner_deviation_px']}px  rectangular={m['is_rectangular']}"
              + ('' if m['is_rectangular'] else '  -> use quad mode'))
