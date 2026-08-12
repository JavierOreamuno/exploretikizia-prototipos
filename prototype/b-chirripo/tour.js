/* Direction B — trail detail + click-to-pay booking funnel. Prototype code.

   Deliberately the same state machine as direction A: the two prototypes are
   testing which visual language the client wants, not which booking logic, so
   holding the behaviour constant is what makes the comparison meaningful.

   The funnel is a state machine over one form: nothing navigates, nothing
   posts, and every price shown is derived from the same state object that the
   summary rail reads. Keeping one source of truth is the whole point — the
   number on the pay button can never disagree with the number in the rail. */
(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Shared chrome ---------- */
  const nav = document.querySelector('[data-nav]');
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px';
  document.body.prepend(sentinel);
  new IntersectionObserver(
    ([e]) => nav && nav.setAttribute('data-stuck', String(!e.isIntersecting)),
    { threshold: 0 }
  ).observe(sentinel);

  const heroMedia = document.querySelector('[data-hero-media]');
  if (heroMedia) {
    if (reduced) heroMedia.classList.add('is-in');
    else requestAnimationFrame(() => heroMedia.classList.add('is-in'));
  }

  /* Reveals. The stylesheet only hides `[data-reveal]` once `.js` is on the
     document — but this script sets `.js` itself, so omitting the observer here
     defeats that fail-safe and leaves the marked sections at opacity 0 forever.
     It has to ship on every page that sets the class. */
  const revealTargets = document.querySelectorAll('[data-reveal]');
  if (reduced) {
    revealTargets.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => entry.target.classList.add('is-in'), Math.min(i * 70, 280));
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealTargets.forEach(el => io.observe(el));
  }

  const funnel = document.querySelector('[data-funnel]');
  if (!funnel) return;

  /* ================= PRICING ================= */
  const ADULT = 66;
  const CHILD = 45;
  const MAX_PARTY = 10;

  const state = {
    step: 0,
    date: null,
    adults: 2,
    children: 0,
    extras: new Map()   // key -> { amount, per }
  };

  const money = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  });

  const heads = () => state.adults + state.children;

  const extrasTotal = () => {
    let sum = 0;
    for (const { amount, per } of state.extras.values()) {
      sum += per === 'person' ? amount * heads() : amount;
    }
    return sum;
  };

  const total = () => state.adults * ADULT + state.children * CHILD + extrasTotal();

  /* ================= CALENDAR =================
     Availability is generated from the date itself rather than stored, so the
     same month always renders the same way — a demo that reshuffles on every
     reload is impossible to talk through with a client. */
  const grid = document.querySelector('[data-cal-grid]');
  const monthLabel = document.querySelector('[data-cal-month]');
  const calStatus = document.querySelector('[data-cal-status]');
  const prevBtn = document.querySelector('[data-cal-prev]');
  const nextBtn = document.querySelector('[data-cal-next]');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let cursor = new Date(firstMonth);

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  /* A real bit-mixing hash, not `date * constant % n`. Multiplying by a constant
     and taking a modulus is affine: consecutive days step by a fixed amount, so
     once the value lands on a multiple of the divisor it stays there and the
     calendar renders a solid week of "few places left". Mixing breaks that. */
  const mix = (n) => {
    n = (n ^ 61) ^ (n >>> 16);
    n = (n + (n << 3)) >>> 0;
    n ^= n >>> 4;
    n = Math.imul(n, 0x27d4eb2d) >>> 0;
    n ^= n >>> 15;
    return n >>> 0;
  };

  const availability = (d) => {
    if (d < today) return 'closed';
    if (d.getDay() === 1) return 'closed';        // the trail team's day off
    const s = mix(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) % 100;
    if (s < 12) return 'out';
    if (s < 28) return 'few';
    return 'open';
  };

  const LONG = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

  function renderCalendar() {
    monthLabel.textContent = MONTH.format(cursor);
    prevBtn.disabled = cursor <= firstMonth;

    const year = cursor.getFullYear(), month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // getDay() is Sunday-first; the grid is Monday-first.
    const lead = (new Date(year, month, 1).getDay() + 6) % 7;

    const cells = [];
    for (let i = 0; i < lead; i++) {
      cells.push('<button type="button" data-s="empty" tabindex="-1" aria-hidden="true"></button>');
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const s = availability(d);
      const key = iso(d);
      const disabled = s === 'out' || s === 'closed';
      const label = `${LONG.format(d)} — ${
        s === 'open' ? 'available' : s === 'few' ? 'few places left' : s === 'out' ? 'sold out' : 'closed'
      }`;
      cells.push(
        `<button type="button" data-s="${s}" data-date="${key}"` +
        `${disabled ? ' disabled' : ''}` +
        ` aria-pressed="${state.date === key}" aria-label="${label}">${day}</button>`
      );
    }
    grid.innerHTML = cells.join('');
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-date]');
    if (!btn || btn.disabled) return;
    state.date = btn.dataset.date;
    grid.querySelectorAll('button[data-date]').forEach(b =>
      b.setAttribute('aria-pressed', String(b === btn)));
    const [y, m, d] = state.date.split('-').map(Number);
    const chosen = new Date(y, m - 1, d);
    calStatus.textContent = `${LONG.format(chosen)} selected.` +
      (btn.dataset.s === 'few' ? ' Only a few places left on this date.' : '');
    funnel.querySelector('[data-step] [data-next]').disabled = false;
    sync();
  });

  prevBtn.addEventListener('click', () => { cursor.setMonth(cursor.getMonth() - 1); renderCalendar(); });
  nextBtn.addEventListener('click', () => { cursor.setMonth(cursor.getMonth() + 1); renderCalendar(); });

  /* ================= PARTY ================= */
  funnel.addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    if (!inc && !dec) return;
    const key = (inc || dec).dataset.inc || (inc || dec).dataset.dec;
    if (inc && heads() < MAX_PARTY) state[key]++;
    if (dec) state[key] = Math.max(key === 'adults' ? 1 : 0, state[key] - 1);
    sync();
  });

  /* ================= EXTRAS ================= */
  funnel.querySelectorAll('[data-extra]').forEach((box) => {
    box.addEventListener('change', () => {
      const key = box.dataset.extra;
      if (box.checked) {
        state.extras.set(key, { amount: Number(box.dataset.amount), per: box.dataset.per || 'booking' });
      } else {
        state.extras.delete(key);
      }
      sync();
    });
  });

  /* ================= STEP MACHINE ================= */
  const steps = [...funnel.querySelectorAll('[data-step]')];
  const rail = document.querySelector('[data-steps]');
  const railItems = [...rail.querySelectorAll('li')];
  const LAST_INPUT = 3;              // index of the payment step
  const CONFIRM = 4;                 // index of the confirmation screen

  function show(i) {
    state.step = i;
    steps.forEach((s, n) => s.dataset.active = String(n === i));
    railItems.forEach((li, n) => {
      li.dataset.state = n === i ? 'active' : n < i ? 'done' : 'todo';
      // Only completed steps are navigable; jumping ahead would skip validation.
      li.querySelector('button').disabled = n > i;
    });
    rail.hidden = i === CONFIRM;

    // Move focus to the new step's heading so keyboard and screen-reader users
    // are told what changed instead of being left at the old button.
    const h = steps[i].querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    const top = document.querySelector('#book');
    if (top) top.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  funnel.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) {
      if (state.step === 0 && !state.date) return;
      show(Math.min(state.step + 1, LAST_INPUT));
    }
    if (e.target.closest('[data-back]')) show(Math.max(state.step - 1, 0));
    if (e.target.closest('[data-restart]')) {
      state.date = null; state.adults = 2; state.children = 0; state.extras.clear();
      funnel.querySelectorAll('[data-extra]').forEach(b => { b.checked = false; });
      funnel.querySelector('[data-step] [data-next]').disabled = true;
      calStatus.textContent = 'Pick a date to continue.';
      cursor = new Date(firstMonth);
      renderCalendar();
      sync();
      show(0);
    }
    if (e.target.closest('[data-pay]')) {
      const name = funnel.querySelector('#p-name');
      const email = funnel.querySelector('#p-email');
      // Only the two fields a confirmation actually needs are enforced; the card
      // fields are decorative and validating them would imply they do something.
      if (!name.value.trim()) { name.focus(); return; }
      if (!email.checkValidity()) { email.focus(); email.reportValidity(); return; }

      const [y, m, d] = state.date.split('-').map(Number);
      document.querySelector('[data-done-line]').textContent =
        `Arenal Volcano Park Expedition · ${LONG.format(new Date(y, m - 1, d))} · ` +
        `${state.adults} adult${state.adults > 1 ? 's' : ''}` +
        `${state.children ? `, ${state.children} child${state.children > 1 ? 'ren' : ''}` : ''} · ${money.format(total())}`;
      document.querySelector('[data-done-ref]').textContent =
        'ET-' + String(Math.abs(Date.now() % 9000) + 1000);
      show(CONFIRM);
    }
  });

  rail.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-goto]');
    if (!btn || btn.disabled) return;
    show(Number(btn.dataset.goto));
  });

  /* ================= SYNC =================
     One writer for every number on the page. */
  const $ = (sel) => document.querySelector(sel);

  function sync() {
    $('[data-out="adults"]').textContent = state.adults;
    $('[data-out="children"]').textContent = state.children;

    // Party ceiling is on the total, so disable both increments at the cap.
    funnel.querySelectorAll('[data-inc]').forEach(b => { b.disabled = heads() >= MAX_PARTY; });
    funnel.querySelector('[data-dec="adults"]').disabled = state.adults <= 1;
    funnel.querySelector('[data-dec="children"]').disabled = state.children <= 0;

    const dateCell = $('[data-sum-date]');
    if (state.date) {
      const [y, m, d] = state.date.split('-').map(Number);
      dateCell.textContent = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(y, m - 1, d));
      dateCell.classList.remove('muted');
    } else {
      dateCell.textContent = 'Not chosen';
      dateCell.classList.add('muted');
    }

    $('[data-sum-adults-n]').textContent = `× ${state.adults}`;
    $('[data-sum-adults]').textContent = money.format(state.adults * ADULT);
    $('[data-sum-children-n]').textContent = `× ${state.children}`;
    const kids = $('[data-sum-children]');
    kids.textContent = state.children ? money.format(state.children * CHILD) : '—';
    kids.classList.toggle('muted', state.children === 0);

    const ex = extrasTotal();
    $('[data-sum-extras-row]').hidden = ex === 0;
    $('[data-sum-extras]').textContent = money.format(ex);

    const grand = money.format(total());
    $('[data-sum-total]').textContent = grand;
    $('[data-pay-total]').textContent = grand;
    const dock = $('[data-dock-total]');
    if (dock) dock.textContent = grand;
  }

  /* ---------- Mobile dock ---------- */
  const dock = document.querySelector('[data-dock]');
  const bookSection = document.querySelector('#book');
  if (dock && bookSection) {
    new IntersectionObserver(([e]) => {
      // Hide the dock while the real funnel is on screen: two competing
      // call-to-actions for the same booking is one too many.
      dock.setAttribute('data-show', String(!e.isIntersecting && window.scrollY > 400));
    }, { threshold: 0 }).observe(bookSection);
  }

  renderCalendar();
  sync();
})();
