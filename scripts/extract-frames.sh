#!/usr/bin/env bash
# Rebuilds ./frames from your source video (requires ffmpeg).
# Usage: ./scripts/extract-frames.sh path/to/video.mp4
# Keeps 0–7.15s and 14.7–23.9s (drops the black title cards), 20fps, 1440px wide WebP.
# If you change the cut points or fps, update N in script.js to the new frame count.
set -e
mkdir -p frames && rm -f frames/*.webp
ffmpeg -i "$1" -an -vf "select='between(t,0,7.15)+between(t,14.7,23.9)',setpts=N/FRAME_RATE/TB,fps=20,scale=1440:-2:flags=lanczos" \
  -c:v libwebp -quality 68 -compression_level 4 -start_number 1 frames/f_%04d.webp
echo "Frames written: $(ls frames | wc -l)"
