/* Direction C — tour detail page. Self-contained: does not depend on
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

  /* ---- reveal on scroll ------------------------------------------------ */
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

  /* ---- booking calculator: adult + child pricing, live total ---------- */
  const form = document.querySelector('[data-booking]');
  const ADULT_PRICE = 66;
  const CHILD_PRICE = 45;
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

  /* ---- date: no past dates, without replacing the native picker ------- */
  const dateField = document.getElementById('date');
  if (dateField) {
    const min = new Date();
    min.setDate(min.getDate() + 1);
    dateField.min = min.toISOString().slice(0, 10);
  }

  /* ---- submit guard: branches on instant vs on-request ----------------
     This is the business rule the whole prototype is built around: a
     partner-operator tour cannot claim "paid" the moment the form is
     sent, because the seat is not confirmed yet. See funnel-booking-flow
     -analisis.md §6.3.2 for the underlying WooCommerce Bookings flow. */
  const outcome = document.querySelector('[data-outcome]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!outcome) return;
    const isRequest = form.dataset.mode === 'request';
    outcome.textContent = isRequest
      ? 'Prototype — no request is sent. In production this would hold your dates as "pending confirmation" and email you once the operator confirms — payment happens only after that.'
      : 'Prototype — no charge is made. In production this step goes straight to the payment gateway and confirms on the spot.';
    outcome.style.color = 'var(--forest)';
    outcome.style.fontWeight = '600';
  });

  /* ---- mobile dock: appears after the hero copy, hides once the real
     booking card is on screen — one call to action at a time, never two
     competing for attention. ------------------------------------------- */
  const dock = document.querySelector('[data-dock]');
  const heroCopy = document.querySelector('.thero__copy');
  if (dock && heroCopy && form) {
    let pastHero = false, panelVisible = false;
    const sync = () => dock.setAttribute('data-show', String(pastHero && !panelVisible));
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }, { threshold: 0 }).observe(heroCopy);
    new IntersectionObserver(([e]) => { panelVisible = e.isIntersecting; sync(); }, { threshold: 0.2 }).observe(form);
  }

  /* Free-guide capture — confirm in place, never navigate away from a tour
     the visitor is still reading. */
  document.querySelectorAll('[data-capture]').forEach((f) => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      const done = document.createElement('p');
      done.className = 'capture__done';
      done.setAttribute('role', 'status');
      done.textContent = 'On its way. Prototype only — no email is actually sent.';
      f.replaceWith(done);
    });
  });
})();
