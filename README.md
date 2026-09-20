# Haviella Homes

A scroll-driven film site. The house video is stored as a 328-frame WebP sequence drawn to a `<canvas>`; scrolling scrubs through it with eased motion (Lenis), while headlines reveal word by word on scroll.

No build step. Plain HTML, CSS and JS.

## Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
(Opening `index.html` by double-click won't work in some browsers, so use a local server.)

## Structure
```
index.html   content and chapters (data-a / data-b = scroll range 0–1 where each shows)
styles.css   design tokens (:root) and layout
script.js    frame preload, canvas drawing, scroll choreography
frames/      f_0001.webp … f_0328.webp
scripts/extract-frames.sh   rebuild frames from a source video (needs ffmpeg)
```

## Editing
- Copy: edit the text in `index.html`. Contact email is `hello@haviellahomes.com` (placeholder).
- Chapter timing: change `data-a` / `data-b` on each `<section class="ch">`.
- New video: run `./scripts/extract-frames.sh your.mp4`, then set `N` at the top of `script.js` to the new frame count.
- Scroll length: `.track { height: 900vh }` in `styles.css`.

## Deploy (GitHub Pages)
Repo → Settings → Pages → Deploy from a branch → `main` / root.
