/* Direction C — destination hub and attraction page. Progressive enhancement only.
   Same behaviours as script.js minus the intake demo, which only exists on the
   homepage. Prototype code. */
(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Sticky nav hairline */
  const nav = document.querySelector('[data-nav]');
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px';
  document.body.prepend(sentinel);
  new IntersectionObserver(
    ([e]) => nav && nav.setAttribute('data-stuck', String(!e.isIntersecting)),
    { threshold: 0 }
  ).observe(sentinel);

  /* Reveals */
  const targets = document.querySelectorAll('[data-reveal]');
  if (reduced) {
    targets.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => entry.target.classList.add('is-in'), Math.min(i * 60, 240));
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    targets.forEach(el => io.observe(el));
  }

  /* ---------- Tour filters ----------
     On the hub the destination is already fixed, so these buttons narrow by
     category only — the second axis of the destination × category taxonomy. */
  const filterBar = document.querySelector('.filters');
  const grid = document.querySelector('[data-tour-grid]');
  if (filterBar && grid) {
    const cards = [...grid.querySelectorAll('.tour')];
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      const want = btn.dataset.filter;
      filterBar.querySelectorAll('button').forEach(b =>
        b.setAttribute('aria-pressed', String(b === btn)));
      cards.forEach(c => {
        c.hidden = !(want === 'all' || c.dataset.cat === want);
        // Reveals already fired for cards that were hidden; keep re-shown ones visible.
        if (!c.hidden) c.classList.add('is-in');
      });
      grid.setAttribute('aria-live', 'polite');
    });
  }

  /* Mobile dock — anchored to whichever hero this page uses. */
  const dock = document.querySelector('[data-dock]');
  const hero = document.querySelector('.phero, .ahero');
  if (dock && hero) {
    new IntersectionObserver(
      ([e]) => dock.setAttribute('data-show', String(!e.isIntersecting)),
      { threshold: 0 }
    ).observe(hero);
  }

  /* Free-guide capture. Nothing is sent anywhere — the form swaps itself for its
     own confirmation so the interaction reads as finished rather than reloading
     the page, which is what an un-wired form would do. */
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
