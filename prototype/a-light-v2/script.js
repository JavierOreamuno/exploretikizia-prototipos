/* Direction A — progressive enhancement only. Prototype code.

   The one interaction that carries the reference's character is the heading
   fill: words go from muted to white as the section crosses the viewport, so
   the type reads as being written rather than fading in as a block. */
(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sticky nav hairline ---------- */
  const nav = document.querySelector('[data-nav]');
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px';
  document.body.prepend(sentinel);
  new IntersectionObserver(
    ([e]) => nav && nav.setAttribute('data-stuck', String(!e.isIntersecting)),
    { threshold: 0 }
  ).observe(sentinel);

  /* ---------- Block reveals ---------- */
  const revealTargets = document.querySelectorAll('[data-reveal]');
  if (reduced) {
    revealTargets.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => entry.target.classList.add('is-in'), Math.min(i * 70, 260));
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealTargets.forEach(el => io.observe(el));
  }

  /* ---------- Scroll-linked heading fill ----------
     Each word is wrapped in a span and lit once the heading has travelled far
     enough up the viewport. Scroll-linked rather than a one-shot transition, so
     scrubbing back up un-writes it the way the reference does.

     Wrapping happens here rather than in the markup so the HTML stays readable
     and the headings are plain text for anything that does not run scripts. */
  const fills = [...document.querySelectorAll('[data-fill]')];

  if (fills.length && !reduced) {
    for (const el of fills) {
      const words = el.textContent.trim().split(/\s+/);
      el.replaceChildren(...words.flatMap((word, i) => {
        const span = document.createElement('span');
        span.className = 'w';
        span.textContent = word;
        span.dataset.lit = '0';
        // A real space between words, so the heading still wraps naturally and
        // copies out of the page as ordinary text.
        return i < words.length - 1 ? [span, document.createTextNode(' ')] : [span];
      }));
    }

    let ticking = false;

    const paint = () => {
      ticking = false;
      const vh = window.innerHeight;
      for (const el of fills) {
        const box = el.getBoundingClientRect();
        // Progress runs from the heading entering the lower third to it passing
        // the upper third — enough travel to read as writing, not a flicker.
        const start = vh * 0.85;
        const end = vh * 0.35;
        const p = (start - box.top) / (start - end);
        const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
        const words = el.querySelectorAll('.w');
        const lit = Math.round(clamped * words.length);
        words.forEach((w, i) => {
          const on = i < lit ? '1' : '0';
          if (w.dataset.lit !== on) w.dataset.lit = on;
        });
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    };

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    paint();
  }

  /* ---------- C-01 · Mobile menu ----------
     The audit found the links hidden below 64rem with nothing in their place.
     The panel's top is read from the nav's own rect rather than hard-coded, so
     it lands under the bar whether or not the ribbon is still on screen. */
  const menuBtn = document.querySelector('[data-menu-btn]');
  const menu = document.querySelector('[data-menu]');

  if (menuBtn && menu) {
    const place = () => {
      menu.style.top = Math.max(0, nav.getBoundingClientRect().bottom) + 'px';
    };
    const setOpen = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      document.body.classList.toggle('is-locked', open);
      if (open) { place(); menu.querySelector('a')?.focus(); }
    };

    menuBtn.addEventListener('click', () =>
      setOpen(menuBtn.getAttribute('aria-expanded') !== 'true'));

    // Any destination closes the panel; an in-page jump would otherwise land
    // behind it.
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); menuBtn.focus(); } });
    addEventListener('resize', () => {
      if (innerWidth >= 1024) setOpen(false); else if (!menu.hidden) place();
    }, { passive: true });
    addEventListener('scroll', () => { if (!menu.hidden) place(); }, { passive: true });
  }

  /* ---------- A-05 · Catalogue filters ----------
     OR inside a facet, AND across facets. Two things make the bar legible
     without experimenting: every option carries the number of tours it will
     leave, recomputed against the other facets; and the categories that have
     not opened say which phase they belong to instead of pretending to be
     unavailable, so choosing one leads somewhere. */
  const filters = document.querySelector('.filters');

  if (filters) {
    const cards = [...document.querySelectorAll('.tcard')];
    const opts = [...filters.querySelectorAll('[data-f]')];
    const panel = filters.querySelector('[data-filters-panel]');
    const toggle = filters.querySelector('[data-filters-toggle]');
    const badge = filters.querySelector('[data-badge]');
    const countEl = filters.querySelector('[data-count]');
    const chipsEl = filters.querySelector('[data-chips]');
    const clearBtns = [...document.querySelectorAll('[data-clear]')];
    const empty = document.querySelector('[data-empty]');

    const on = (b) => b.getAttribute('aria-pressed') === 'true';
    const label = (b) => b.childNodes[0].textContent.trim();

    // Selections grouped by facet. An absent facet means "all of it".
    const picked = () => {
      const out = {};
      for (const b of opts) if (on(b)) (out[b.dataset.f] ||= []).push(...b.dataset.v.split(','));
      return out;
    };
    const matches = (card, sel) =>
      Object.entries(sel).every(([f, vals]) => vals.includes(card.dataset[f]));

    function paint() {
      const sel = picked();
      const shown = cards.filter(card => {
        const hit = matches(card, sel);
        card.hidden = !hit;
        return hit;
      }).length;

      // Each option's count ignores its own facet, so the number describes what
      // that click would leave rather than the size of the whole catalogue.
      for (const b of opts) {
        const rest = { ...sel };
        delete rest[b.dataset.f];
        const vals = b.dataset.v.split(',');
        const n = cards.filter(c => matches(c, rest) && vals.includes(c.dataset[b.dataset.f])).length;
        const slot = b.querySelector('[data-c]');
        if (slot) slot.textContent = String(n);
        b.dataset.emptyResult = String(n === 0);
      }

      const active = opts.filter(on);
      countEl.textContent = shown === cards.length ? `${cards.length} tours` : `${shown} of ${cards.length} tours`;
      badge.textContent = String(active.length);
      badge.hidden = active.length === 0;
      clearBtns.forEach(b => { b.hidden = active.length === 0; });

      // The active choices are echoed back as chips, so state stays visible
      // whether the panel is open or shut.
      chipsEl.replaceChildren(...active.map(b => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.innerHTML = `${label(b)} <i aria-hidden="true">&times;</i>`;
        chip.setAttribute('aria-label', `Remove filter ${label(b)}`);
        chip.addEventListener('click', () => { b.setAttribute('aria-pressed', 'false'); paint(); b.focus(); });
        return chip;
      }));

      if (empty) {
        empty.hidden = shown !== 0;
        const soon = active.find(b => b.dataset.phase);
        if (shown === 0) {
          empty.querySelector('[data-empty-tag]').textContent = soon ? 'Opening later' : 'No match';
          empty.querySelector('[data-empty-h]').textContent = soon
            ? `${label(soon)} opens in ${soon.dataset.phase}.`
            : 'Nothing matches those filters yet.';
          empty.querySelector('[data-empty-p]').textContent = soon
            ? 'Every category goes live only once we have run each tour in it ourselves. Leave an address and you will hear the day it opens — nothing else.'
            : 'Try removing one of the filters above. Only Hiking & Trekking in La Fortuna is open today.';
        }
      }
    }

    for (const b of opts) {
      b.addEventListener('click', () => { b.setAttribute('aria-pressed', String(!on(b))); paint(); });
    }
    clearBtns.forEach(btn => btn.addEventListener('click', () => {
      opts.forEach(b => b.setAttribute('aria-pressed', 'false'));
      paint();
      filters.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    }));

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      if (open) panel.querySelector('button')?.focus();
    });
    // Esc closes the panel from anywhere inside it and hands the reader back to
    // the control that opened it.
    panel.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      toggle.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
      toggle.focus();
    });

    paint();
  }

  /* ---------- Free-guide capture ----------
     Nothing is sent anywhere. The form swaps itself for its own confirmation so
     the interaction reads as finished instead of reloading the page, which is
     what an un-wired form would do. */
  document.querySelectorAll('[data-capture]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const done = document.createElement('p');
      done.className = 'capture__done';
      done.setAttribute('role', 'status');
      done.textContent = 'On its way. Prototype only — no email is actually sent.';
      form.replaceWith(done);
    });
  });
})();
