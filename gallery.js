/* Haviella Homes: gallery + contact (GSAP).
   The six houses ride a cover-flow: a pinned stage, scrubbed by scroll, where each
   card glides in from the right, swings to face you, then leaves to the left.
   The per-card motion follows Jhey Tompkins' "Infinite Cover Flow w/ GSAP"
   (codepen.io/jh3y/pen/WNRvqJP), made finite so the page can carry on to the contact section. */
(() => {
  'use strict';
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return;                       // no GSAP: the static grid stays as the fallback
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const $ = s => document.querySelector(s);
  const hhm = window.HHM || {};
  const lenis = hhm.lenis;
  if (lenis) lenis.on('scroll', ScrollTrigger.update);

  const homes = $('#homes'), flow = $('#flow'), stage = $('.stage');
  const cards = gsap.utils.toArray('#cards .card');
  const N = cards.length;
  const titles = cards.map(c => c.dataset.title);
  const numEl = $('#capNum'), titleEl = $('#capTitle'), fill = $('#deckFill');
  const prev = $('#prev'), next = $('#next');

  const STAGGER = .1, STEP_VH = .78;                          // spacing between cards on the path; scroll per card
  const T0 = .5, T1 = T0 + (N - 1) * STAGGER;                 // playhead when the first / last card is centred

  /* word-mask reveal, same look as the film chapters */
  const split = h => {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    h.querySelectorAll('.ln').forEach(ln => {
      ln.innerHTML = ln.textContent.trim().split(/\s+/).map(t => `<span class="w" aria-hidden="true"><i>${t}</i></span>`).join('');
    });
    return h.querySelectorAll('.w i');
  };
  const headWords = split($('#homes-h')), contactWords = split($('#contact-h'));

  const mm = gsap.matchMedia();

  /* ------------------------------------------------ animated: pinned cover-flow */
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    homes.classList.add('is-flow');

    // The film recedes as the gallery slides up over it.
    gsap.set(stage, { transformOrigin: '50% 30%' });
    gsap.to(stage, { scale: .93, ease: 'none',
      scrollTrigger: { trigger: homes, start: 'top bottom', end: 'top top', scrub: true } });
    gsap.to('#dim', { opacity: .6, ease: 'none',
      scrollTrigger: { trigger: homes, start: 'top bottom', end: 'top top', scrub: true } });

    // One timeline per card, offset by STAGGER: pan, swing, lift to the front, fade at the ends.
    gsap.set(cards, { yPercent: -50 });
    const master = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    cards.forEach((card, i) => {
      const shade = card.querySelector('.shade');
      const tl = gsap.timeline()
        .set(card, { xPercent: 250, rotateY: -50, opacity: 0, scale: .5 })
        .set(shade, { opacity: 1 })
        .to(card, { opacity: 1, scale: 1, duration: .1 }, 0)
        .to(card, { opacity: 0, scale: .5, duration: .1 }, .9)
        .fromTo(card, { xPercent: 250 }, { xPercent: -350, duration: 1, immediateRender: false, ease: 'power1.inOut' }, 0)
        .fromTo(card, { rotateY: -50 }, { rotateY: 50, duration: 1, immediateRender: false, ease: 'power4.inOut' }, 0)
        .to(card, { z: 100, scale: 1.25, duration: .1, repeat: 1, yoyo: true }, .4)
        .fromTo(card, { zIndex: 1 }, { zIndex: N, repeat: 1, yoyo: true, duration: .5, immediateRender: false }, 0)
        .fromTo(shade, { opacity: 1 }, { opacity: 0, repeat: 1, yoyo: true, duration: .5, ease: 'power2.inOut', immediateRender: false }, 0);
      master.add(tl, i * STAGGER);
    });
    master.time(T0);

    // The pin. Progress 0 = first house centred, progress 1 = last house centred.
    let cur = -1;
    const setIdx = i => {
      if (i === cur) return;
      const first = cur === -1; cur = i;
      numEl.textContent = String(i + 1).padStart(2, '0');
      cards.forEach((c, k) => c.classList.toggle('is-active', k === i));
      if (first) { titleEl.textContent = titles[i]; return; }
      gsap.killTweensOf(titleEl);
      gsap.timeline()
        .to(titleEl, { yPercent: -115, duration: .22, ease: 'power2.in' })
        .add(() => { titleEl.textContent = titles[i]; })
        .fromTo(titleEl, { yPercent: 115 }, { yPercent: 0, duration: .6, ease: 'expo.out' });
    };
    setIdx(0);

    const driver = gsap.fromTo(master, { time: T0 }, { time: T1, ease: 'none', duration: T1 - T0,
      scrollTrigger: {
        trigger: flow, start: 'top top', end: () => '+=' + Math.round((N - 1) * innerHeight * STEP_VH),
        pin: true, scrub: .5, anticipatePin: 1, invalidateOnRefresh: true,
        // With Lenis driving the scroll we snap ourselves (below); ScrollTrigger's own snap fights Lenis.
        snap: lenis ? undefined : { snapTo: 1 / (N - 1), duration: { min: .25, max: .8 }, delay: .06, ease: 'power2.inOut' },
        onUpdate: self => { setIdx(Math.round(self.progress * (N - 1))); fill.style.transform = `scaleX(${self.progress.toFixed(4)})`; }
      } });
    const st = driver.scrollTrigger;

    // Move to a card: by buttons, arrow keys, clicking a card, or the snap below.
    const posOf = i => st.start + (gsap.utils.clamp(0, N - 1, i) / (N - 1)) * (st.end - st.start);
    let settleT = 0, stable = 0, lockUntil = 0;
    const goTo = (i, duration = 1.1) => {
      i = gsap.utils.clamp(0, N - 1, i); stable = i;
      lockUntil = performance.now() + duration * 1000 + 250;        // ignore the scroll events we cause ourselves
      const y = posOf(i);
      if (lenis) lenis.scrollTo(y, { duration, easing: t => 1 - Math.pow(1 - t, 4) });
      else scrollTo({ top: y, behavior: 'smooth' });
    };

    // Snap to the nearest card once the input stops. A push of a tenth of a step is enough to advance.
    // Mouse wheel: settle 130ms after the last tick (not after Lenis' long glide ends). Touch: after native scroll ends.
    const inRange = () => scrollY >= st.start - 6 && scrollY <= st.end + 6;
    let wheelLive = false;
    const arm = ms => { clearTimeout(settleT); settleT = setTimeout(settle, ms); };
    const settle = () => {
      wheelLive = false;
      if (!lenis || !inRange()) return;
      const wait = lockUntil - performance.now();
      if (wait > 0) { arm(wait + 30); return; }
      const y = lenis.targetScroll != null ? lenis.targetScroll : scrollY;       // where the scroll is heading
      const raw = gsap.utils.clamp(0, N - 1, ((y - st.start) / (st.end - st.start)) * (N - 1));
      const target = gsap.utils.clamp(0, N - 1, Math.round(raw + Math.sign(raw - stable) * .4));
      if (Math.abs(posOf(target) - scrollY) > 2) goTo(target, .85); else stable = target;
    };
    const onWheel = () => { if (inRange()) { wheelLive = true; arm(130); } };
    const onScroll = () => { if (!wheelLive) arm(140); };
    if (lenis) { lenis.on('scroll', onScroll); addEventListener('wheel', onWheel, { passive: true }); }

    // Buttons, arrow keys and card clicks.
    const onPrev = () => goTo(cur - 1), onNext = () => goTo(cur + 1);
    prev.addEventListener('click', onPrev); next.addEventListener('click', onNext);
    const onKey = e => {
      if (!st.isActive || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
    };
    addEventListener('keydown', onKey);
    const clicks = cards.map((c, i) => { const f = () => { if (i !== cur) goTo(i); }; c.addEventListener('click', f); return [c, f]; });

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

    return () => {                                            // matchMedia cleanup if the setting flips
      homes.classList.remove('is-flow');
      prev.removeEventListener('click', onPrev); next.removeEventListener('click', onNext);
      removeEventListener('keydown', onKey);
      if (lenis) { lenis.off('scroll', onScroll); removeEventListener('wheel', onWheel); }
      clearTimeout(settleT);
      clicks.forEach(([c, f]) => c.removeEventListener('click', f));
      gsap.set([stage, '#dim', '#cards', '#deck', '.homes__head p', headWords, ...cards, ...cards.map(c => c.querySelector('.shade'))], { clearProps: 'all' });
    };
  });

  /* ------------------------------------------------ contact: shared by both modes */
  const contactMotion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (contactMotion) {
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

  /* Layout changes (fonts, the loader closing) move every trigger, so measure again. */
  const refresh = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  addEventListener('load', refresh);
  new MutationObserver(() => { if (document.body.classList.contains('is-ready')) { refresh(); } })
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
