#!/usr/bin/env bash
# Mux a music track under a (silent) video: trims to video length, fades audio
# in/out, normalizes to background loudness, keeps video stream untouched.
#   scripts/add-music.sh <video.mp4> <track.mp3> [out.mp4] [loudness LUFS, default -18]
set -euo pipefail
VIDEO="$1"; TRACK="$2"
OUT="${3:-${VIDEO%.*}-music.mp4}"
LUFS="${4:--18}"   # -18 = clearly audible but under any future VO; -14 = music-forward

DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO")
FADE_OUT_START=$(echo "$DUR - 1.5" | bc)

ffmpeg -y -v error -i "$VIDEO" -i "$TRACK" \
  -filter_complex "[1:a]atrim=0:${DUR},afade=t=in:st=0:d=1.0,afade=t=out:st=${FADE_OUT_START}:d=1.5,loudnorm=I=${LUFS}:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"

echo "muxed: $OUT ($(printf '%.1f' "$DUR")s @ ${LUFS} LUFS)"
