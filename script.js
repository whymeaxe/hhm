/* Haviella Homes: scroll-scrubbed film.
   329 frames were rendered; this site plays the ones that carry the story:
   frames 59–143 (approach, glass, interior), a dip to dark, then 152–328 (walk the
   perimeter, pull back). Frames 1–58 are the baked-in title sequence and 144–151
   are a dip to black between two shots, so they are skipped on purpose.
   The gallery and contact sections live in gallery.js (GSAP).                 */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- tuning */
  const path = n => `frames/f_${String(n).padStart(4, '0')}.webp`;
  const SHOT_A = { first: 59, last: 143 };
  const SHOT_B = { first: 152, last: 328 };

  // Scroll progress (0–1) → frame number. Steeper = the film moves faster.
  const MAP_A = [[0, 59], [.05, 61], [.19, 88], [.30, 106], [.40, 121], [.47, 143]];
  const DISSOLVE = [.47, .52];                       // dip-to-dark between frame 143 and 152
  const MAP_B = [[.52, 152], [.62, 176], [.72, 198], [.80, 218], [.91, 262], [1, 328]];

  // Portrait screens: [frame, k, cx]. k = film width ÷ screen width (99 = fill the screen),
  // cx = the part of the film (0–1 across) that sits in the middle of the screen.
  const PORTRAIT = [[59, 1.5, .5], [72, 1.35, .54], [80, 1.5, .5], [92, 99, .5], [124, 99, .5],
    [140, 1.5, .54], [143, 1.5, .54], [152, 1.9, .56], [176, 2.1, .57], [196, 99, .6],
    [216, 99, .58], [232, 1.7, .56], [260, 1.55, .53], [328, 1.55, .53]];

  /* --------------------------------------------------------------- helpers */
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const canvas = $('#film'), ctx = canvas.getContext('2d');
  const stage = $('#stage'), track = $('.track');
  const loader = $('#loader'), count = $('#count'), lbar = $('#lbar');
  const gL = $('#gL'), gR = $('#gR'), marks = $('#marks');
  const hud = $('#hud'), hudLabel = $('#hudLabel'), hudPct = $('#hudPct'), bar = $('#bar'), rail = $('#rail');
  $('#yr').textContent = new Date().getFullYear();
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  /* --------------------------------------------------------------- loading */
  const FRAMES = [];
  for (let n = SHOT_A.first; n <= SHOT_A.last; n++) FRAMES.push(n);
  for (let n = SHOT_B.first; n <= SHOT_B.last; n++) FRAMES.push(n);
  const anchors = [...MAP_A, ...MAP_B].map(a => Math.round(a[1]));
  const coarseSet = new Set(FRAMES.filter((n, i) => i % 4 === 0).concat(anchors, [143, 152, 328]));
  const coarse = FRAMES.filter(n => coarseSet.has(n));
  const rest = FRAMES.filter(n => !coarseSet.has(n));
  const imgs = {};

  const load = n => new Promise(res => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { imgs[n] = im; res(); };
    im.onerror = () => res();
    im.src = path(n);
  });
  const pool = async (list, size, tick) => {
    let i = 0;
    await Promise.all(Array.from({ length: size }, async () => {
      while (i < list.length) { await load(list[i++]); if (tick) tick(); }
    }));
  };
  const nearest = n => {                               // closest loaded frame inside the same shot
    const lo = n <= SHOT_A.last ? SHOT_A.first : SHOT_B.first;
    const hi = n <= SHOT_A.last ? SHOT_A.last : SHOT_B.last;
    for (let d = 0; d <= hi - lo; d++) {
      if (n - d >= lo && imgs[n - d]) return imgs[n - d];
      if (n + d <= hi && imgs[n + d]) return imgs[n + d];
    }
    return null;
  };

  /* ---------------------------------------------------------------- canvas */
  const band = document.createElement('canvas'), bctx = band.getContext('2d');
  const sTop = document.createElement('canvas'), sBot = document.createElement('canvas');
  sTop.width = sBot.width = 24; sTop.height = sBot.height = 8;
  let W = 0, H = 0, CW = 0, CH = 0, portrait = false, lastKey = '';

  const resize = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2, 2000 / W);
    CW = Math.round(W * dpr); CH = Math.round(H * dpr);
    canvas.width = band.width = CW; canvas.height = band.height = CH;
    portrait = W / H < 1.15; lastKey = '';
  };

  const framing = (f, coverK) => {
    let i = 0;
    while (i < PORTRAIT.length - 2 && f > PORTRAIT[i + 1][0]) i++;
    const a = PORTRAIT[i], b = PORTRAIT[i + 1], t = ease(clamp((f - a[0]) / (b[0] - a[0])));
    const ka = Math.min(a[1], coverK), kb = Math.min(b[1], coverK);
    return { k: Math.exp(Math.log(ka) + (Math.log(kb) - Math.log(ka)) * t), cx: lerp(a[2], b[2], t) };
  };
  const strip = (c, img, sy, sh) => {                  // soft, mirrored edge colour for portrait fills
    const s = c.getContext('2d');
    s.setTransform(1, 0, 0, -1, 0, c.height);
    s.drawImage(img, 0, sy, img.naturalWidth, sh, 0, 0, c.width, c.height);
    s.setTransform(1, 0, 0, 1, 0, 0);
  };

  const paint = (img, f, alpha) => {
    const iw = img.naturalWidth, ih = img.naturalHeight; if (!iw) return;
    ctx.globalAlpha = alpha;
    if (!portrait) {                                   // landscape: fill the screen
      const s = Math.max(CW / iw, CH / ih), w = iw * s, h = ih * s;
      ctx.drawImage(img, (CW - w) / 2, (CH - h) / 2, w, h);
    } else {                                           // portrait: keep the whole house in view
      const { k, cx } = framing(f, (CH / ih * iw) / CW);
      const s = k * CW / iw, w = iw * s, h = ih * s;
      const x = Math.min(0, Math.max(CW - w, CW / 2 - cx * w));
      if (h >= CH - 1) { ctx.drawImage(img, x, (CH - h) / 2, w, h); }
      else {
        const y0 = (CH - h) * .46, ov = Math.round(h * .07);
        strip(sTop, img, 0, ih * .12); strip(sBot, img, ih * .93, ih * .07);
        ctx.drawImage(sTop, x, 0, w, y0 + ov);
        ctx.drawImage(sBot, x, y0 + h - ov, w, CH - (y0 + h - ov));
        bctx.globalCompositeOperation = 'source-over';
        bctx.clearRect(0, 0, CW, CH);
        bctx.drawImage(img, x, 0, w, h);
        const g = bctx.createLinearGradient(0, 0, 0, h), e = ov / h;
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(e, '#000');
        g.addColorStop(1 - e, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
        bctx.globalCompositeOperation = 'destination-in';
        bctx.fillStyle = g; bctx.fillRect(0, 0, CW, h);
        ctx.drawImage(band, 0, 0, CW, h, 0, y0, CW, h);
      }
    }
    ctx.globalAlpha = 1;
  };

  const seg = (map, p) => {
    for (let i = 0; i < map.length - 1; i++) {
      if (p <= map[i + 1][0]) {
        const [p0, f0] = map[i], [p1, f1] = map[i + 1];
        return f0 + (f1 - f0) * clamp((p - p0) / (p1 - p0));
      }
    }
    return map[map.length - 1][1];
  };
  const pose = p => {
    if (p <= DISSOLVE[0]) return { f: seg(MAP_A, p), t: 0 };
    if (p >= DISSOLVE[1]) return { f: seg(MAP_B, p), t: 0 };
    return { f: SHOT_A.last, t: ease((p - DISSOLVE[0]) / (DISSOLVE[1] - DISSOLVE[0])) };
  };
  const draw = (p, force) => {
    const ps = pose(p);
    let n = Math.round(ps.f), f = ps.f, dip = 0;
    if (ps.t > 0) {                                    // the cut between the two shots dips through dark, like the film itself
      if (ps.t >= .5) { n = SHOT_B.first; f = n; }
      dip = ps.t < .5 ? ease(ps.t * 2) : 1 - ease((ps.t - .5) * 2);
    }
    const key = n + '|' + (portrait ? f.toFixed(2) : '') + '|' + dip.toFixed(3);
    if (key === lastKey && !force) return; lastKey = key;
    const img = nearest(n); if (!img) return;
    ctx.clearRect(0, 0, CW, CH);
    paint(img, f, 1);
    if (dip > 0) { ctx.fillStyle = `rgba(11,17,10,${(dip * .88).toFixed(3)})`; ctx.fillRect(0, 0, CW, CH); }
  };

  /* -------------------------------------------------------------- chapters */
  const chapters = $$('.ch').map(el => {
    const h = el.querySelector('h1,h2');
    if (h) {
      h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
      h.querySelectorAll('.ln').forEach(ln => {
        ln.innerHTML = ln.textContent.trim().split(/\s+/).map(t => `<span class="w" aria-hidden="true"><i>${t}</i></span>`).join('');
      });
    }
    const words = h ? [...h.querySelectorAll('i')] : [];
    return { el, words, step: Math.min(.16, .8 / Math.max(1, words.length - 1)),
      rest: [...el.children].filter(c => c !== h), a: +el.dataset.a, b: +el.dataset.b,
      hero: el.classList.contains('ch--hero'),
      side: el.classList.contains('ch--right') ? 'R' : 'L', label: el.dataset.label || '', vis: null, v: 0 };
  });
  const story = chapters.filter(c => c.label);         // chapters that appear in the chapter bar
  story.forEach((c, i) => { c.tag = `${String(i + 1).padStart(2, '0')}  ${c.label}`; });

  /* ------------------------------------------------------------ scrolling */
  let lenis = null;
  if (window.Lenis && !reduce) { lenis = new Lenis({ lerp: .085, smoothWheel: true }); lenis.stop(); }
  // the last screen of the track is covered by the gallery sliding up, so the film ends one screen early
  const scrollRange = () => Math.max(1, track.offsetHeight - 2 * stage.clientHeight);
  const scrollToP = (p, immediate) => {
    const y = track.offsetTop + p * scrollRange();
    if (lenis) lenis.scrollTo(y, { immediate: !!immediate, duration: 2.4, easing: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 });
    else scrollTo({ top: y, behavior: reduce || immediate ? 'auto' : 'smooth' });
  };

  // chapter bar: one dot per chapter, placed where that chapter is fully on screen
  const ticks = story.map(c => {
    const mid = (c.a + Math.min(c.b, 1)) / 2;
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'tick'; t.style.left = (mid * 100) + '%';
    t.setAttribute('aria-label', 'Go to: ' + c.label);
    t.addEventListener('click', () => scrollToP(mid));
    rail.appendChild(t); return t;
  });
  $('.nav__brand').addEventListener('click', e => { e.preventDefault(); scrollToP(0); });
  const scrollToEl = (el, immediate) => {
    const y = el.getBoundingClientRect().top + scrollY;
    if (lenis) lenis.scrollTo(y, { immediate: !!immediate, duration: 2.6, easing: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 });
    else scrollTo({ top: y, behavior: reduce || immediate ? 'auto' : 'smooth' });
  };
  $('#skip').addEventListener('click', e => {
    e.preventDefault(); scrollToEl($('#contact'), true); setTimeout(() => $('#cta').focus({ preventScroll: true }), 450);
  });
  $('#toTop').addEventListener('click', e => { e.preventDefault(); scrollToP(0); });

  let mx = 0, my = 0, tmx = 0, tmy = 0;
  if (finePointer && !reduce) addEventListener('pointermove', e => { tmx = e.clientX / W * 2 - 1; tmy = e.clientY / H * 2 - 1; }, { passive: true });

  /* ------------------------------------------------------------- the loop */
  let sp = 0, intro = reduce ? 1 : 0, introAt = 0, started = false, curTag = '', tform = '', last = 0;
  const swapLabel = (txt, isIntro) => {
    if (txt === curTag) return; curTag = txt;
    hud.classList.toggle('is-intro', isIntro);
    hudLabel.textContent = txt;
    if (!reduce && hudLabel.animate) hudLabel.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.32,.72,0,1)' });
  };

  const tick = now => {
    const dt = Math.min(.05, (now - last) / 1000) || .016; last = now;
    if (lenis) lenis.raf(now);
    const p = clamp((scrollY - track.offsetTop) / scrollRange());
    sp = reduce ? p : lerp(sp, p, 1 - Math.pow(1 - .16, dt * 60));
    if (Math.abs(sp - p) < .0002) sp = p;
    if (started && intro < 1) intro = clamp((now - introAt) / 1700);

    draw(sp);

    let L = 0, R = 0, active = -1;
    chapters.forEach(c => {
      const inn = c.hero ? intro : clamp((sp - c.a) / .045);
      const out = clamp((sp - (c.b - .035)) / .035);
      const vis = inn > 0 && out < 1;
      if (vis !== c.vis) { c.el.style.visibility = vis ? 'visible' : 'hidden'; c.vis = vis; }
      c.v = vis ? ease(inn) * (1 - out) : 0;
      if (!vis) { if (c.el.style.opacity !== '0') c.el.style.opacity = 0; return; }
      c.el.style.opacity = 1 - out;
      c.words.forEach((w, i) => {
        const e = reduce ? 1 : ease(clamp(inn * 1.8 - i * c.step));
        w.style.transform = `translateY(${(1 - e) * 110 - out * 60}%)`;
      });
      c.rest.forEach(r => {
        const e = reduce ? 1 : ease(clamp(inn * 1.4 - .35));
        r.style.transform = `translateY(${(1 - e) * 24}px)`; r.style.opacity = e;
      });
      if (c.side === 'R') R = Math.max(R, c.v); else L = Math.max(L, c.v);
      const si = story.indexOf(c);
      if (si > -1 && inn > .35 && out < .6) active = si;
    });
    gL.style.opacity = L.toFixed(3); gR.style.opacity = R.toFixed(3);

    marks.style.setProperty('--m', (story[3] ? story[3].v : 0).toFixed(3));

    // chapter bar
    if (sp < .08) swapLabel('Scroll to walk the site', true);
    else if (active > -1) swapLabel(story[active].tag, false);
    ticks.forEach((t, i) => t.classList.toggle('on', i === active));
    bar.style.transform = `scaleX(${sp.toFixed(4)})`;
    hudPct.textContent = String(Math.round(sp * 100)).padStart(3, '0');

    // a touch of depth from the pointer
    mx = lerp(mx, tmx, .06); my = lerp(my, tmy, .06);
    const t = `translate3d(${(-mx * 10).toFixed(2)}px,${(-my * 6).toFixed(2)}px,0) scale(${finePointer && !reduce ? 1.03 : 1})`;
    if (t !== tform) { canvas.style.transform = t; tform = t; }

    requestAnimationFrame(tick);
  };

  /* the gallery (gallery.js) shares the smooth-scroll instance and the word-mask helper */
  window.HHM = { lenis, reduce, scrollToEl };

  /* ------------------------------------------------------------- start up */
  const begin = () => {
    if (started) return; started = true;
    resize(); sp = clamp((scrollY - track.offsetTop) / scrollRange()); draw(sp, true);
    setTimeout(() => {
      loader.classList.add('done');
      document.body.classList.remove('is-loading'); document.body.classList.add('is-ready');
      if (lenis) lenis.start();
      introAt = performance.now();
    }, 350);
    pool(rest, 4);                                       // the remaining frames stream in behind
  };

  new ResizeObserver(() => { resize(); if (started) draw(sp, true); }).observe(stage);
  resize();
  let done = 0;
  const bump = () => {
    const v = Math.round(++done / coarse.length * 100);
    count.textContent = v; lbar.style.transform = `scaleX(${v / 100})`;
    if (done === coarse.length) begin();
  };
  pool(coarse, 8, bump);
  setTimeout(begin, 15000);                              // never leave anyone on a loader
  requestAnimationFrame(tick);
})();
