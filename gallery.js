/* Haviella Homes: gallery + contact (GSAP).
   The houses ride an infinite cover-flow, after Jhey Tompkins' "Infinite Cover Flow w/ GSAP"
   (codepen.io/jh3y/pen/WNRvqJP). Scroll drives it while the section is pinned; the buttons,
   arrow keys, clicks and drag/swipe keep it going in either direction with no end.
   The pin lasts a fixed number of steps so the page can still carry on to the contact section. */
(() => {
  'use strict';
  const { gsap, ScrollTrigger } = window;
  const hhm = window.HHM || {};
  const reduce = hhm.reduce !== undefined ? hhm.reduce : matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!gsap || !ScrollTrigger) {
    console.warn('[Haviella] GSAP did not load (check vendor/gsap.min.js and vendor/ScrollTrigger.min.js are deployed). Showing the plain grid.');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const $ = s => document.querySelector(s);
  const lenis = hhm.lenis;
  if (lenis) lenis.on('scroll', ScrollTrigger.update);

  const homes = $('#homes'), flow = $('#flow'), stage = $('.stage'), list = $('#cards');
  const houses = gsap.utils.toArray('#cards .card');
  const H = houses.length;
  const titles = houses.map(c => c.dataset.title);
  const numEl = $('#capNum'), titleEl = $('#capTitle'), fill = $('#deckFill');
  const prev = $('#prev'), next = $('#next');
  const mod = (n, m) => ((n % m) + m) % m;

  /* word-mask reveal, same look as the film chapters */
  const split = h => {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    h.querySelectorAll('.ln').forEach(ln => {
      ln.innerHTML = ln.textContent.trim().split(/\s+/).map(t => `<span class="w" aria-hidden="true"><i>${t}</i></span>`).join('');
    });
    return h.querySelectorAll('.w i');
  };
  const headWords = split($('#homes-h')), contactWords = split($('#contact-h'));

  /* ------------------------------------------------ contact reveals (skipped for reduced motion) */
  if (!reduce) {
    gsap.set(contactWords, { yPercent: 112 });
    gsap.set('.outro__row', { opacity: 0, y: 26 });
    gsap.set('#ghost', { yPercent: 40, opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: '#contact', start: 'top 55%', once: true } })
      .to(contactWords, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: .05 }, 0)
      .to('.outro__row', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, .4)
      .to('#ghost', { yPercent: 0, opacity: 1, duration: 1.6, ease: 'expo.out' }, .2);
    gsap.fromTo('.contact__bg img', { yPercent: -6 }, { yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '#contact', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  if (!reduce) {
    /* ---------------------------------------------- the infinite cover-flow */
    homes.classList.add('is-flow');

    // Two rings of the six houses so the flow is dense, like the pen. The copies are decoration only.
    const clones = houses.map(c => {
      const k = c.cloneNode(true);
      k.setAttribute('aria-hidden', 'true'); k.classList.add('is-clone');
      list.appendChild(k); return k;
    });
    const cards = [...houses, ...clones];
    const M = cards.length;

    // The film recedes as the gallery slides up over it.
    gsap.set(stage, { transformOrigin: '50% 30%' });
    const cover = { trigger: homes, start: 'top bottom', end: 'top top', scrub: true };
    gsap.to(stage, { scale: .93, ease: 'none', scrollTrigger: cover });
    gsap.to('#dim', { opacity: .6, ease: 'none', scrollTrigger: cover });

    // Per card: pan, swing, lift to the front, fade at the ends (as in the pen). Three copies of the
    // timeline let the playhead wrap around a single cycle without a seam.
    const STAGGER = 1 / M, DURATION = 1;
    gsap.set(cards, { yPercent: -50 });
    const LOOP = gsap.timeline({ paused: true, repeat: -1, ease: 'none' });
    [...cards, ...cards, ...cards].forEach((card, index) => {
      const shade = card.querySelector('.shade');
      const tl = gsap.timeline()
        .set(card, { xPercent: 250, rotateY: -50, opacity: 0, scale: .5 })
        .to(card, { opacity: 1, scale: 1, duration: .1 }, 0)
        .to(card, { opacity: 0, scale: .5, duration: .1 }, .9)
        .fromTo(card, { xPercent: 250 }, { xPercent: -350, duration: 1, immediateRender: false, ease: 'power1.inOut' }, 0)
        .fromTo(card, { rotateY: -50 }, { rotateY: 50, duration: 1, immediateRender: false, ease: 'power4.inOut' }, 0)
        .to(card, { z: 100, scale: 1.25, duration: .1, repeat: 1, yoyo: true }, .4)
        .fromTo(card, { zIndex: 1 }, { zIndex: M, repeat: 1, yoyo: true, duration: .5, immediateRender: false, ease: 'none' }, 0)
        .fromTo(shade, { opacity: 1 }, { opacity: 0, repeat: 1, yoyo: true, duration: .5, ease: 'power2.inOut', immediateRender: false }, 0);
      LOOP.add(tl, index * STAGGER);
    });
    const CYCLE = STAGGER * M, START = CYCLE + DURATION * .5;
    const HEAD = gsap.fromTo(LOOP, { totalTime: START }, { totalTime: `+=${CYCLE}`, duration: 1, ease: 'none', repeat: -1, paused: true });
    const wrap = gsap.utils.wrap(0, HEAD.duration());

    // Position is counted in card steps. It is the scroll position plus whatever the buttons/keys/drag added.
    const S = 18, STEP_VH = .34;                    // steps across the pin, scroll per step (in screen heights)
    const state = { pos: 0 };
    let scrollSteps = 0, extra = 0, cur = -1, lastPos = NaN;

    const setIdx = i => {
      if (i === cur) return;
      const first = cur === -1; cur = i;
      numEl.textContent = String(i + 1).padStart(2, '0');
      if (first) { titleEl.textContent = titles[i]; return; }
      gsap.killTweensOf(titleEl);
      gsap.timeline()
        .to(titleEl, { yPercent: -115, duration: .2, ease: 'power2.in' })
        .add(() => { titleEl.textContent = titles[i]; })
        .fromTo(titleEl, { yPercent: 115 }, { yPercent: 0, duration: .55, ease: 'expo.out' });
    };
    const render = () => {
      HEAD.totalTime(wrap(state.pos / M));
      const c = mod(Math.round(state.pos), M);
      setIdx(c % H);
      cards.forEach((card, k) => card.classList.toggle('is-active', k === c));
    };
    gsap.ticker.add(() => { if (state.pos !== lastPos) { lastPos = state.pos; render(); } });
    const glide = gsap.quickTo(state, 'pos', { duration: .7, ease: 'power3.out' });
    const aim = () => glide(scrollSteps + extra);
    render();

    // The pin. Its length is fixed, so scrolling on eventually reaches the contact section.
    const st = ScrollTrigger.create({
      trigger: flow, start: 'top top', end: () => '+=' + Math.round(S * STEP_VH * innerHeight),
      pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      snap: lenis ? undefined : { snapTo: 1 / S, duration: { min: .2, max: .6 }, delay: .05, ease: 'power2.inOut' },
      onUpdate: self => { scrollSteps = self.progress * S; fill.style.transform = `scaleX(${self.progress.toFixed(4)})`; aim(); }
    });

    // Snap the scroll to whole cards. (ScrollTrigger's snap fights Lenis, so with Lenis we do it here.)
    const posOf = step => st.start + (gsap.utils.clamp(0, S, step) / S) * (st.end - st.start);
    let settleT = 0, stable = 0, lockUntil = 0, wheelLive = false;
    const inRange = () => scrollY >= st.start - 6 && scrollY <= st.end + 6;
    const goStep = (step, duration = .8) => {
      step = gsap.utils.clamp(0, S, step); stable = step;
      lockUntil = performance.now() + duration * 1000 + 250;
      lenis.scrollTo(posOf(step), { duration, easing: t => 1 - Math.pow(1 - t, 4) });
    };
    const arm = ms => { clearTimeout(settleT); settleT = setTimeout(settle, ms); };
    const settle = () => {
      wheelLive = false;
      if (!lenis || !inRange()) return;
      const wait = lockUntil - performance.now();
      if (wait > 0) { arm(wait + 30); return; }
      const y = lenis.targetScroll != null ? lenis.targetScroll : scrollY;
      const raw = gsap.utils.clamp(0, S, ((y - st.start) / (st.end - st.start)) * S);
      const target = gsap.utils.clamp(0, S, Math.round(raw + Math.sign(raw - stable) * .4));
      if (Math.abs(posOf(target) - scrollY) > 2) goStep(target); else stable = target;
    };
    if (lenis) {
      lenis.on('scroll', () => { if (!wheelLive) arm(140); });
      addEventListener('wheel', () => { if (inRange()) { wheelLive = true; arm(130); } }, { passive: true });
    }

    // Buttons and arrow keys: one card at a time, forever, in either direction.
    const nudge = d => { extra += d; aim(); };
    prev.addEventListener('click', () => nudge(-1));
    next.addEventListener('click', () => nudge(1));
    addEventListener('keydown', e => {
      if (!st.isActive || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
    });

    // Drag or swipe sideways; click a side card to bring it forward.
    let dragging = false, startX = 0, base = 0, dx = 0;
    const unit = () => (houses[0].offsetWidth || 400) * .6;
    list.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; startX = e.clientX; base = extra; dx = 0;
    });
    list.addEventListener('pointermove', e => {
      if (!dragging) return;
      dx = e.clientX - startX;
      if (Math.abs(dx) > 6) { extra = base - dx / unit(); aim(); }
    });
    const endDrag = () => { if (!dragging) return; dragging = false; if (Math.abs(dx) > 6) { extra = Math.round(extra); aim(); } };
    list.addEventListener('pointerup', endDrag);
    list.addEventListener('pointercancel', endDrag);
    list.addEventListener('pointerleave', endDrag);
    cards.forEach((card, k) => card.addEventListener('click', () => {
      if (Math.abs(dx) > 6) return;
      const c = mod(Math.round(state.pos), M);
      const d = mod(k - c + M / 2, M) - M / 2;
      if (d) nudge(d);
    }));

    // Entrance: the heading rises as the section slides over the film.
    gsap.set(headWords, { yPercent: 112 });
    gsap.set('.homes__head p', { opacity: 0, y: 20 });
    gsap.set('#cards', { y: 90 });
    gsap.set('#deck', { yPercent: 80, opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: homes, start: 'top 72%', once: true } })
      .to(headWords, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: .07 }, 0)
      .to('.homes__head p', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, .35)
      .to('#cards', { y: 0, duration: 1.4, ease: 'expo.out' }, .1)
      .to('#deck', { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out' }, .5);
  }

  /* Layout changes (fonts, the loader closing) move every trigger, so measure again. */
  const refresh = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  addEventListener('load', refresh);
  new MutationObserver(() => { if (document.body.classList.contains('is-ready')) refresh(); })
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
