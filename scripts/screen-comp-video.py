#!/usr/bin/env python3
"""
Composite a real UI RECORDING onto a device screen, frame by frame.

  static <device.png> <ui.mp4> <out.mp4>   device is a still; screen solved once
  track  <device.mp4> <ui.mp4> <out.mp4>   screen re-detected every frame, seed-followed
                                           (device must have been generated with a BLANK
                                           screen — that's what makes it trackable)

Detection is seed-based (see screenlib): the seed for frame N+1 is frame N's screen
centroid, so it follows the screen through a push-in at any scale. A fixed bounding box
does NOT work here — the screen grows outside it and you get white margins.

The UI is center-cropped to the screen's aspect ("cover") so it FILLS the screen with no
stretching. Use --contain to letterbox instead. Realism pass: warm pickup, glare, grain,
bezel shadow. The UI itself is never re-rendered by a model.
"""
import argparse, os, shutil, subprocess, sys, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from screenlib import detect_screen, blend, autocrop_content, smooth_quads

def explode(video, outdir, fps):
    os.makedirs(outdir, exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', video,
                    '-vf', f'fps={fps}', '-q:v', '2', f'{outdir}/f%05d.jpg'], check=True)
    return sorted(f'{outdir}/{f}' for f in os.listdir(outdir) if f.endswith('.jpg'))

def main():
    p = argparse.ArgumentParser()
    p.add_argument('mode', choices=['static', 'track'])
    p.add_argument('device'); p.add_argument('ui'); p.add_argument('out')
    p.add_argument('--rad', type=int, default=10)
    p.add_argument('--fps', type=int, default=30)
    p.add_argument('--seconds', type=float, default=None)
    p.add_argument('--push', type=float, default=0.0, help='static: push-in over clip')
    p.add_argument('--ui-start', type=float, default=0.0, help='skip N s of the UI clip')
    p.add_argument('--seed', default=None, help='x,y inside the screen on frame 1')
    p.add_argument('--contain', action='store_true', help='letterbox instead of cover-crop')
    p.add_argument('--no-crop', action='store_true', help='skip gray page-margin autocrop')
    args = p.parse_args()

    tmp = tempfile.mkdtemp(prefix='screencomp_')
    rng = np.random.default_rng(7)
    seed = tuple(float(v) for v in args.seed.split(',')) if args.seed else None
    cover = not args.contain
    try:
        ui_frames = explode(args.ui, f'{tmp}/ui', args.fps)
        skip = int(args.ui_start * args.fps)
        ui_frames = ui_frames[skip:] or ui_frames
        outdir = f'{tmp}/out'; os.makedirs(outdir)

        if args.mode == 'static':
            dev = Image.open(args.device).convert('RGB')
            W, H = dev.size
            quad, _ = detect_screen(dev, seed)
            if quad is None: sys.exit('no blank screen found')
            n = len(ui_frames) if args.seconds is None else min(len(ui_frames), int(args.seconds*args.fps))
            print(f'static: {n} frames, quad={quad}')
            for i in range(n):
                ui = Image.open(ui_frames[i])
                if not args.no_crop: ui = autocrop_content(ui)
                fr = blend(dev, ui, quad, args.rad, rng, cover)
                if args.push:
                    z = 1.0 + args.push * (i / max(n-1, 1))
                    cw, ch = int(W/z), int(H/z)
                    x0, y0 = (W-cw)//2, (H-ch)//2
                    fr = fr.crop((x0, y0, x0+cw, y0+ch)).resize((W, H), Image.LANCZOS)
                fr.save(f'{outdir}/f{i:05d}.jpg', quality=94)
        else:
            dev_frames = explode(args.device, f'{tmp}/dev', args.fps)
            n = min(len(dev_frames), len(ui_frames))
            quads, cur = [], seed
            for i in range(n):
                q, c = detect_screen(Image.open(dev_frames[i]), cur)
                if q is not None: cur = c            # follow the screen
                quads.append(q)
            found = sum(q is not None for q in quads)
            print(f'track: {n} frames, screen found on {found} ({found/n*100:.0f}%)')
            if found < n * 0.6: sys.exit('screen lost too often — was it left blank?')
            for i in range(n):                        # fill gaps from neighbours
                if quads[i] is None:
                    nxt = next((k for k in range(i, n) if quads[k]), None)
                    prv = next((k for k in range(i, -1, -1) if quads[k]), None)
                    quads[i] = quads[nxt] if nxt is not None else quads[prv]
            quads = smooth_quads(quads)
            a0 = np.array(quads[0]); a1 = np.array(quads[-1])
            print(f'  screen width {np.hypot(*(a0[1]-a0[0])):.0f}px -> {np.hypot(*(a1[1]-a1[0])):.0f}px')
            for i in range(n):
                ui = Image.open(ui_frames[i])
                if not args.no_crop: ui = autocrop_content(ui)
                blend(Image.open(dev_frames[i]).convert('RGB'), ui, quads[i],
                      args.rad, rng, cover).save(f'{outdir}/f{i:05d}.jpg', quality=94)

        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(args.fps),
                        '-i', f'{outdir}/f%05d.jpg', '-c:v', 'libx264', '-preset', 'slow',
                        '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                        args.out], check=True)
        print(f'wrote {args.out}')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__':
    main()
