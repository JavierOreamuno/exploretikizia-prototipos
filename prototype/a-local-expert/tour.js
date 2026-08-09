/* Direction A — tour detail page. Self-contained: does not depend on
   script.js, so its dock/reveal logic never races with the home page's.
   Prototype code — no framework, no analytics, no network calls. */
(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- sticky nav hairline ------------------------------------------- */
  const nav = document.querySelector('[data-nav]');
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px';
  document.body.prepend(sentinel);
  new IntersectionObserver(
    ([e]) => nav && nav.setAttribute('data-stuck', String(!e.isIntersecting)),
    { threshold: 0 }
  ).observe(sentinel);

  /* ---- reveal on scroll (same pattern as index.html's script.js) ----- */
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
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    targets.forEach(el => io.observe(el));
  }

  /* ---- booking calculator: adult + child pricing, live total ---------- */
  const form = document.querySelector('[data-booking]');
  const ADULT_PRICE = 395;
  const CHILD_PRICE = 310;
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const adultsField = document.querySelector('[data-adults]');
  const childrenField = document.querySelector('[data-children]');
  const grandOut = document.querySelector('[data-grand]');
  const dockTotal = document.querySelector('[data-dock-total]');

  function updateTotal() {
    const adults = Math.max(1, Number(adultsField?.value) || 1);
    const children = Math.max(0, Number(childrenField?.value) || 0);
    const total = adults * ADULT_PRICE + children * CHILD_PRICE;
    const label = `${money.format(total)} USD`;
    if (grandOut) grandOut.textContent = label;
    if (dockTotal) dockTotal.textContent = label;
  }
  [adultsField, childrenField].forEach(f => {
    f?.addEventListener('input', updateTotal);
    f?.addEventListener('change', updateTotal);
  });
  updateTotal();

  /* ---- date: no past dates ---------------------------------------------- */
  const dateField = document.getElementById('date');
  if (dateField) {
    const min = new Date();
    min.setDate(min.getDate() + 1);
    dateField.min = min.toISOString().slice(0, 10);
  }

  /* ---- submit guard: branches on instant vs on-request ------------------
     This tour is always on-request (SINAC permit confirmation), so the
     "instant" branch never fires here — but the guard is written the same
     way as directions B and C so the pattern stays identical everywhere a
     booking form appears. See funnel-booking-flow-analisis.md §6.3.2 for
     the underlying WooCommerce Bookings "Requires Confirmation" flow. */
  const outcome = document.querySelector('[data-outcome]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!outcome) return;
    const isRequest = form.dataset.mode === 'request';
    outcome.textContent = isRequest
      ? 'Prototype — no request is sent. In production this holds your dates as "pending confirmation" and emails you once we secure the permit — payment happens only after that.'
      : 'Prototype — no charge is made. In production this step goes straight to the payment gateway and confirms on the spot.';
    outcome.style.color = 'var(--ink)';
    outcome.style.fontWeight = '600';
  });

  /* ---- mobile dock: shows after the hero, hides once the booking rail is
     on screen. -------------------------------------------------------- */
  const dock = document.querySelector('[data-dock]');
  const hero = document.querySelector('.thero');
  if (dock && hero && form) {
    let pastHero = false, panelVisible = false;
    const sync = () => dock.setAttribute('data-show', String(pastHero && !panelVisible));
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
    new IntersectionObserver(([e]) => { panelVisible = e.isIntersecting; sync(); }, { threshold: 0.2 }).observe(form);
  }
})();
