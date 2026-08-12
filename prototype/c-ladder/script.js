/* Direction C — progressive enhancement + the multi-step intake demo. Prototype code. */
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

  /* ---------- Multi-step intake demo ---------- */
  const form = document.querySelector('[data-form]');
  if (form) {
    const steps = [...form.querySelectorAll('[data-step]')];
    const questionSteps = steps.filter(s => !s.hasAttribute('data-done'));
    const total = questionSteps.length;
    const fill = form.querySelector('[data-fill]');
    const count = form.querySelector('[data-count]');
    const back = form.querySelector('[data-back]');
    const next = form.querySelector('[data-next]');
    const restart = form.querySelector('[data-restart]');
    let i = 0;

    const render = () => {
      steps.forEach((s, n) => s.setAttribute('data-active', String(n === i)));
      const done = i >= total;
      fill.style.width = `${Math.round(((done ? total : i + 1) / total) * 100)}%`;
      count.textContent = done ? 'Complete' : `Step ${i + 1} of ${total}`;
      back.disabled = i === 0 || done;
      next.hidden = done;
      back.hidden = done;
      if (restart) restart.hidden = !done;
      next.innerHTML = i === total - 1
        ? 'Send my request <span class="btn__arrow" aria-hidden="true">→</span>'
        : 'Continue <span class="btn__arrow" aria-hidden="true">→</span>';
      // Move focus to the new step heading so keyboard and screen-reader users follow along
      const heading = steps[i].querySelector('h3');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    };

    next.addEventListener('click', () => { if (i < total) { i++; render(); } });
    back.addEventListener('click', () => { if (i > 0) { i--; render(); } });
    if (restart) restart.addEventListener('click', () => { i = 0; render(); });

    /* Cap the interests step at three selections — the point of the demo */
    const interests = [...form.querySelectorAll('input[name="int"]')];
    interests.forEach(box => box.addEventListener('change', () => {
      const picked = interests.filter(b => b.checked);
      if (picked.length > 3) box.checked = false;
    }));

    render();
  }

  /* ---------- Tour catalogue filters ---------- */
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
      let shown = 0;
      cards.forEach(c => {
        const match = want === 'all' || c.dataset.cat === want;
        c.hidden = !match;
        if (match) shown++;
      });
      // Reveals already fired for hidden cards; make sure re-shown ones stay visible
      cards.forEach(c => { if (!c.hidden) c.classList.add('is-in'); });
      grid.setAttribute('aria-live', 'polite');
    });
  }

  /* Mobile dock */
  const dock = document.querySelector('[data-dock]');
  const hero = document.querySelector('.hero');
  const final = document.querySelector('.final');
  if (dock && hero) {
    let pastHero = false, atFinal = false;
    const sync = () => dock.setAttribute('data-show', String(pastHero && !atFinal));
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
    if (final) new IntersectionObserver(([e]) => { atFinal = e.isIntersecting; sync(); }, { threshold: 0.15 }).observe(final);
  }

  /* Free-guide capture. Nothing is sent anywhere — the form swaps itself for its
     own confirmation so the lead-magnet interaction reads as finished rather than
     reloading the page, which is what an un-wired form would do. */
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
