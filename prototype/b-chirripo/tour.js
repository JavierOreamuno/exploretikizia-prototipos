/* Direction B — tour detail page. Self-contained: does not depend on
   script.js, so its dock logic never races with the home page's.
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

  /* ---- booking calculator: adult + child pricing, live total ---------- */
  const form = document.querySelector('[data-booking]');
  const ADULT_PRICE = 95;
  const CHILD_PRICE = 70;
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

  /* ---- submit guard: branches on instant vs on-request ------------------ */
  const outcome = document.querySelector('[data-outcome]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!outcome) return;
    const isRequest = form.dataset.mode === 'request';
    outcome.textContent = isRequest
      ? 'Prototype — no request is sent. In production this holds your dates as "pending confirmation" and emails you once the operator confirms — payment happens only after that.'
      : 'Prototype — no charge is made. In production this step goes straight to the payment gateway and confirms on the spot.';
    outcome.style.color = 'var(--bone)';
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

  /* ---- reveal-ready fallback: this page has no [data-reveal] elements,
     the .js class alone is enough for the rest of styles.css. ---------- */
  void reduced;
})();
