(() => {
  const N = 328, path = i => `frames/f_${String(i + 1).padStart(4, '0')}.webp`;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  const canvas = $('#film'), ctx = canvas.getContext('2d'), track = $('.track');
  const veil = $('#veil'), bar = $('#bar'), loader = $('#loader'), pct = $('#pct');
  const imgs = new Array(N);
  let last = -1, cur = 0;
  $('#yr').textContent = new Date().getFullYear();

  // Split headlines into words for a scroll-driven mask reveal
  const chapters = [...document.querySelectorAll('.ch')].map(el => {
    const h = el.querySelector('h2');
    if (h) {
      h.setAttribute('aria-label', h.textContent);
      h.innerHTML = h.textContent.split(' ').map(t => `<span class="w" aria-hidden="true"><i>${t}</i></span>`).join('');
    }
    return { el, words: h ? [...h.querySelectorAll('i')] : [], rest: [...el.children].filter(c => c !== h),
      a: +el.dataset.a, b: +el.dataset.b, hold: 'hold' in el.dataset };
  });

  // Preload every frame, then reveal
  let loaded = 0;
  const done = () => {
    pct.textContent = Math.round(++loaded / N * 100);
    if (loaded === N) { setTimeout(() => loader.classList.add('done'), 350); render(true); }
  };
  for (let i = 0; i < N; i++) { const im = new Image(); im.decoding = 'async'; im.onload = im.onerror = done; im.src = path(i); imgs[i] = im; }

  let dpr = 1, W = 0, H = 0;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; last = -1;
  };

  const draw = f => {
    const im = imgs[f]; if (!im || !im.naturalWidth) return;
    const cw = canvas.width, ch = canvas.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h); last = f;
  };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t * t * (3 - 2 * t);

  let lenis = null;
  if (window.Lenis && !reduce) lenis = new Lenis({ lerp: 0.085, smoothWheel: true });

  function render(force) {
    const range = track.offsetHeight - innerHeight;
    const p = clamp((scrollY - track.offsetTop) / range);
    const target = p * (N - 1);
    cur += (target - cur) * (reduce ? 1 : 0.12);
    if (Math.abs(target - cur) < 0.01) cur = target;
    const f = Math.round(cur);
    if (f !== last || force) draw(f);

    bar.style.transform = `scaleX(${p})`;
    veil.style.opacity = ease(clamp((p - 0.88) / 0.08));

    for (const c of chapters) {
      const inn = clamp((p - c.a) / 0.05);
      const out = c.hold ? 0 : clamp((p - c.b + 0.035) / 0.035);
      const vis = inn > 0 && out < 1;
      c.el.style.visibility = vis ? 'visible' : 'hidden';
      c.el.style.opacity = vis ? (1 - out) : 0;
      if (!vis) continue;
      c.words.forEach((w, i) => {
        const e = reduce ? 1 : ease(clamp(inn * 1.8 - i * 0.16));
        w.style.transform = `translateY(${(1 - e) * 110 + out * -60}%)`;
      });
      c.rest.forEach(r => r.style.transform = `translateY(${reduce ? 0 : (1 - ease(inn)) * 24}px)`);
    }
  }

  document.querySelector('a[href="#contact"]').addEventListener('click', e => {
    e.preventDefault();
    const y = document.documentElement.scrollHeight;
    lenis ? lenis.scrollTo(y, { duration: 3 }) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  });

  addEventListener('resize', resize); resize();
  const loop = t => { if (lenis) lenis.raf(t); render(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();
