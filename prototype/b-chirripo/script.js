/* Direction B — progressive enhancement only. Prototype code. */
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

  /* ---------- Reveals ---------- */
  const targets = document.querySelectorAll('[data-reveal]');
  if (reduced) {
    targets.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => entry.target.classList.add('is-in'), Math.min(i * 70, 280));
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    targets.forEach(el => io.observe(el));
  }

  /* ---------- Catalogue filters ----------
     The catalogue is several tables, one per experience category, and the
     filter cuts across all of them — that is the point of a single grading
     scale. Rows are hidden rather than removed so each table keeps its
     identity, and a whole category collapses only when nothing in it matches.
     A live region announces the count, because a filter that silently empties
     the page is indistinguishable from a broken one. */
  const bar = document.querySelector('[data-filters]');
  const tables = [...document.querySelectorAll('[data-matrix]')];

  if (bar && tables.length) {
    const groups = tables.map((table) => ({
      table,
      section: table.closest('.cat'),
      rows: [...table.querySelectorAll('tbody tr')]
    }));
    const total = groups.reduce((n, g) => n + g.rows.length, 0);

    const status = document.createElement('p');
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    bar.after(status);

    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      const want = btn.dataset.filter;
      bar.querySelectorAll('button').forEach(b =>
        b.setAttribute('aria-pressed', String(b === btn)));

      let shown = 0;
      for (const { section, rows } of groups) {
        let visible = 0;
        for (const row of rows) {
          const match = want === 'all'
            || row.dataset.grade === want
            || row.dataset.len === want
            || row.dataset.status === want;
          row.hidden = !match;
          if (match) visible++;
        }
        shown += visible;
        // Collapse the whole group when it contributes nothing to the filter.
        if (section) section.hidden = visible === 0;
      }
      status.textContent = `Showing ${shown} of ${total} products.`;
    });
  }

  /* ---------- Free-guide capture ----------
     Nothing is sent anywhere; the form swaps itself for its own confirmation so
     the interaction reads as finished instead of reloading the page. */
  document.querySelectorAll('[data-capture]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const done = document.createElement('p');
      done.className = 'capture__done';
      done.setAttribute('role', 'status');
      done.textContent = 'On its way — prototype only, no email is sent.';
      form.replaceWith(done);
    });
  });
})();
