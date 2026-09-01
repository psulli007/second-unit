#!/usr/bin/env bash
# ai-video-studio — per-machine bootstrap.
# Idempotent: safe to re-run any time. Verifies the toolchain, optionally pulls
# your app into ./app/, installs recording deps, prepares the library folders.
set -euo pipefail

STUDIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ ! -f "$STUDIO_DIR/config.env" ]; then
  echo "no config.env — creating one from config.example.env"
  cp "$STUDIO_DIR/config.example.env" "$STUDIO_DIR/config.env"
  echo "  -> edit $STUDIO_DIR/config.env before recording anything"
fi
# shellcheck disable=SC1091
source "$STUDIO_DIR/config.env"

echo "== ai-video-studio bootstrap =="
echo "studio: $STUDIO_DIR"

# --- 1. Toolchain ------------------------------------------------------------
fail=0
command -v node   >/dev/null || { echo "MISSING: node (install Node 20+)"; fail=1; }
command -v ffmpeg >/dev/null || { echo "MISSING: ffmpeg (brew install ffmpeg / apt install ffmpeg)"; fail=1; }
command -v git    >/dev/null || { echo "MISSING: git"; fail=1; }
[ $fail -eq 1 ] && { echo "Install the missing tools and re-run."; exit 1; }
echo "toolchain: node $(node --version), ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}'), git ok"

# Python bits (screen compositing, frame measurement) are optional.
if command -v python3 >/dev/null; then
  python3 -c "import PIL, numpy" 2>/dev/null \
    && echo "python: Pillow + numpy ok" \
    || echo "python: optional deps missing — 'pip install pillow numpy opencv-python' for the scripts/*.py compositors"
else
  echo "python: not found — the scripts/*.py compositors will be unavailable"
fi

# --- 2. Optional: your app's own checkout ------------------------------------
# Cloning your app into ./app/ keeps the studio self-contained and your product
# repo clean, and means any machine can film any commit. Skip it entirely by
# leaving APP_REMOTES empty and pointing APP_URL at a running deploy.
APP_DIR="$STUDIO_DIR/app"
if [ -n "${APP_REMOTES:-}" ]; then
  if [ ! -d "$APP_DIR/.git" ]; then
    echo "cloning app repo…"
    cloned=0
    for remote in $APP_REMOTES; do
      if git clone "$remote" "$APP_DIR" 2>/dev/null; then cloned=1; echo "cloned from $remote"; break; fi
      echo "  (could not clone from $remote — trying next)"
    done
    [ $cloned -eq 0 ] && { echo "FAILED to clone. Check your git auth and APP_REMOTES."; exit 1; }
  else
    echo "updating app repo…"
    git -C "$APP_DIR" pull --ff-only || echo "WARN: pull failed — recording will use the current checkout"
  fi
  git -C "$APP_DIR" log -1 --format="app at: %h %s (%cr)"
  echo "installing app deps…"
  npm --prefix "$APP_DIR" install --no-audit --no-fund | tail -1
else
  echo "APP_REMOTES empty — skipping app checkout, will film ${APP_URL:-<APP_URL unset>}"
fi

# --- 3. Recording deps (Playwright + Chromium) -------------------------------
echo "installing recording deps…"
npm --prefix "$STUDIO_DIR" install --no-audit --no-fund | tail -1
(cd "$STUDIO_DIR" && npx playwright install chromium 2>&1 | tail -1)

# --- 4. Library folder -------------------------------------------------------
mkdir -p "${LIBRARY_DIR:-$HOME/video-library}"/{demos,highlights,vertical,square,tours}
echo "library: ${LIBRARY_DIR:-$HOME/video-library}"

cat <<MSG

Bootstrap complete. Next:
  scripts/dev-server.sh                      # only if you cloned an app into ./app/
  node examples/01-record-desktop.js         # or adapt one of the other examples
  node scripts/qa-take.js out/desktop/*.mp4  # gate every take before you look at it
MSG
