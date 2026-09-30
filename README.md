# Haviella Homes

A scroll-driven film site. The house video is stored as a WebP frame sequence drawn to a `<canvas>`;
scrolling scrubs through it (Lenis for the smooth feel), chapters reveal word by word, and a chapter bar
lets people jump around. No build step. Plain HTML, CSS and JS.

## Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
(Opening `index.html` by double-click won't work in some browsers, so use a local server.)

## Structure
```
index.html          content: film chapters, the six-house gallery, contact (data-a / data-b = scroll range 0–1 where each film chapter shows)
styles.css          design tokens (:root) and layout
script.js           film: frame loading, canvas drawing, chapter choreography
gallery.js          GSAP: pinned cover-flow gallery, contact reveals
homes/              h1.webp … h6.webp (gallery photos)
frames/             f_0001.webp … f_0328.webp
fonts/              Geist + Geist Mono (self-hosted, OFL)
vendor/             lenis, gsap, ScrollTrigger (self-hosted)
og.jpg              social share image
scripts/extract-frames.sh   rebuild frames from a source video (needs ffmpeg)
```

## Editing
- **Copy:** edit the text in `index.html`. Contact email is `hello@haviellahomes.com` (placeholder).
- **Chapter timing:** change `data-a` / `data-b` on each `<section class="ch">`.
- **Which frames play, and how fast:** the tuning block at the top of `script.js`.
  - Frames 1–58 (the baked-in title sequence) and 144–151 (a dip to black between two shots) are skipped on purpose.
  - `MAP_A` / `MAP_B` map scroll progress to frame numbers. Steeper = faster.
  - `DISSOLVE` is the scroll range of the dip-to-dark between the two shots.
  - `PORTRAIT` controls how the widescreen film is framed on phones.
- **New video:** run `./scripts/extract-frames.sh your.mp4`, then update the frame numbers in the tuning block.
- **Scroll length:** `.track { height: 900vh }` in `styles.css` (the last screen is covered by the gallery sliding up).
- **Gallery:** add or swap houses by editing the `<li class="card">` items in `index.html` (image path in both `--src` and `<img>`, plus `data-title`). The flow loops endlessly (buttons, arrow keys, drag/swipe); the scroll pin lasts `S` steps of `STEP_VH` screen-heights each, both in `gallery.js`.
- **Motion:** the site respects the system "reduce motion" setting (the gallery becomes a plain grid). Add `?motion=full` to the URL to preview the full animation anyway.
- **Share image:** `og.jpg` is referenced by its full `https://whymeaxe.github.io/hhm/` URL in `index.html`. Change it if the site moves to its own domain.

## Deploy (GitHub Pages)
Repo → Settings → Pages → Deploy from a branch → `main` / root.
