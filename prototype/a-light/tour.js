/* Direction A — tour detail. Prototype code.

   The booking rail is a single live surface: date, party and extras all write
   into one state object, and every number on the page is derived from it. The
   rail total, the CTA total, the mobile bar and the checkout recap can never
   disagree because none of them holds its own copy.

   The CTA stays disabled until a date is chosen. That is deliberate: an OTA
   that lets you reach a payment screen without a date has only moved the
   failure one click later. */
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

  /* Reveals. The stylesheet only hides `[data-reveal]` once `.js` is on the
     document — and this script sets `.js` itself, so the observer has to ship
     here or the marked sections stay at opacity 0 forever. */
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

  /* ---------- Section tabs ----------
     Scroll-position driven rather than IntersectionObserver: with four sections
     of very different heights several are on screen at once, and an observer
     has to invent a tie-break. Reading "the last section whose top has passed
     the header" is deterministic, and the bottom-of-page case is handled
     explicitly so the final tab lights up when the page can scroll no further. */
  const tabsWrap = document.querySelector('[data-tabs]');
  if (tabsWrap) {
    const bar = tabsWrap.querySelector('[data-tabs-bar]');
    const links = [...tabsWrap.querySelectorAll('a')];
    const sections = links
      .map(a => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);

    const moveBar = (link) => {
      bar.style.width = `${link.offsetWidth}px`;
      bar.style.transform = `translateX(${link.offsetLeft}px)`;
    };

    let current = null;
    const setActive = (i) => {
      if (i === current) return;
      current = i;
      links.forEach((a, n) => a.setAttribute('aria-current', String(n === i)));
      moveBar(links[i]);
      // Keep the active tab in view when the bar itself has to scroll.
      links[i].scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    };

    let ticking = false;
    const spy = () => {
      ticking = false;
      const nav = document.querySelector('.nav');
      const line = (nav ? nav.offsetHeight : 72) + tabsWrap.offsetHeight + 24;
      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
      let index = 0;
      if (atBottom) {
        index = sections.length - 1;
      } else {
        sections.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= line) index = i; });
      }
      setActive(index);
    };

    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    addEventListener('resize', () => moveBar(links[current ?? 0]), { passive: true });
    // Fonts land after first paint and change tab widths, so re-measure once.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveBar(links[current ?? 0]));
    spy();
    moveBar(links[0]);
  }

  const rail = document.querySelector('[data-booking]');
  if (!rail) return;

  /* ================= STATE ================= */
  const ADULT = 66;
  const CHILD = 45;
  const MAX_PARTY = 10;

  const state = { date: null, adults: 2, children: 0, extras: new Map() };

  const money = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  });

  const heads = () => state.adults + state.children;
  const extrasTotal = () => {
    let sum = 0;
    for (const { amount, per } of state.extras.values()) sum += per === 'person' ? amount * heads() : amount;
    return sum;
  };
  const total = () => state.adults * ADULT + state.children * CHILD + extrasTotal();

  /* ================= CALENDAR ================= */
  const grid = document.querySelector('[data-cal-grid]');
  const calTitle = document.querySelector('[data-cal-title]');
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
     calendar renders a solid week of "few left". Mixing breaks that. */
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
    if (d.getDay() === 1) return 'closed';          // the team's day off
    const s = mix(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) % 100;
    if (s < 12) return 'out';
    if (s < 28) return 'few';
    return 'open';
  };

  const LONG = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const SHORT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

  function renderCalendar() {
    calTitle.textContent = MONTH.format(cursor);
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
        `<button type="button" data-s="${s}" data-date="${key}"${disabled ? ' disabled' : ''}` +
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
    sync();
  });

  prevBtn.addEventListener('click', () => { cursor.setMonth(cursor.getMonth() - 1); renderCalendar(); });
  nextBtn.addEventListener('click', () => { cursor.setMonth(cursor.getMonth() + 1); renderCalendar(); });

  /* ================= PARTY & EXTRAS ================= */
  rail.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-inc], [data-dec]');
    if (!hit) return;
    const key = hit.dataset.inc || hit.dataset.dec;
    if (hit.dataset.inc && heads() < MAX_PARTY) state[key]++;
    if (hit.dataset.dec) state[key] = Math.max(key === 'adults' ? 1 : 0, state[key] - 1);
    sync();
  });

  rail.querySelectorAll('[data-extra]').forEach((box) => {
    box.addEventListener('change', () => {
      if (box.checked) state.extras.set(box.dataset.extra, { amount: Number(box.dataset.amount), per: box.dataset.per || 'booking' });
      else state.extras.delete(box.dataset.extra);
      sync();
    });
  });

  /* ================= SYNC =================
     One writer for every number on the page. */
  const $ = (sel) => document.querySelector(sel);
  const dateObj = () => {
    if (!state.date) return null;
    const [y, m, d] = state.date.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const partyText = () =>
    `${state.adults} adult${state.adults > 1 ? 's' : ''}` +
    (state.children ? `, ${state.children} child${state.children > 1 ? 'ren' : ''}` : '');

  function sync() {
    $('[data-out="adults"]').textContent = state.adults;
    $('[data-out="children"]').textContent = state.children;

    // The ceiling is on the total party, so both increments stop together.
    rail.querySelectorAll('[data-inc]').forEach(b => { b.disabled = heads() >= MAX_PARTY; });
    rail.querySelector('[data-dec="adults"]').disabled = state.adults <= 1;
    rail.querySelector('[data-dec="children"]').disabled = state.children <= 0;

    const chosen = dateObj();
    calStatus.innerHTML = chosen
      ? `<b>${SHORT.format(chosen)}</b> · 08:00 departure`
      : 'Pick a date to see your total.';

    $('[data-sum-adults-n]').textContent = `× ${state.adults}`;
    $('[data-sum-adults]').textContent = money.format(state.adults * ADULT);
    $('[data-sum-children-row]').hidden = state.children === 0;
    $('[data-sum-children-n]').textContent = `× ${state.children}`;
    $('[data-sum-children]').textContent = money.format(state.children * CHILD);

    const ex = extrasTotal();
    $('[data-sum-extras-row]').hidden = ex === 0;
    $('[data-sum-extras]').textContent = money.format(ex);

    const grand = money.format(total());
    for (const sel of ['[data-sum-total]', '[data-bar-total]', '[data-pay-total]', '[data-co-total]']) {
      const el = $(sel);
      if (el) el.textContent = grand;
    }

    // No date, no payment screen — letting someone reach checkout without one
    // just moves the dead end a click further in. The label says which field is
    // blocking rather than leaving a dimmed button to be interpreted.
    const cta = $('[data-open-checkout]');
    cta.disabled = !state.date;
    $('[data-cta-label]').textContent = state.date
      ? `Book & pay ${grand}`
      : 'Select a date to continue';
  }

  /* ================= CHECKOUT ================= */
  const dialog = document.querySelector('[data-checkout]');
  const coForm = document.querySelector('[data-checkout-form]');
  const coDone = document.querySelector('[data-done]');

  document.querySelector('[data-open-checkout]').addEventListener('click', () => {
    if (!state.date) return;
    const chosen = dateObj();
    $('[data-co-date]').textContent = `${SHORT.format(chosen)} · 08:00`;
    $('[data-co-party]').textContent = partyText();
    const ex = extrasTotal();
    $('[data-co-extras-row]').hidden = ex === 0;
    $('[data-co-extras]').textContent = money.format(ex);
    coForm.hidden = false;
    coDone.hidden = true;
    dialog.showModal();
  });

  document.querySelectorAll('[data-close-checkout]').forEach(btn =>
    btn.addEventListener('click', () => dialog.close()));

  document.querySelector('[data-pay]').addEventListener('click', () => {
    const name = $('#co-name');
    const email = $('#co-email');
    // Only the two fields a confirmation actually needs are enforced. The card
    // fields are decorative, and validating them would imply they do something.
    if (!name.value.trim()) { name.focus(); return; }
    if (!email.checkValidity()) { email.focus(); email.reportValidity(); return; }

    const chosen = dateObj();
    $('[data-done-line]').textContent =
      `${SHORT.format(chosen)} · ${partyText()} · ${money.format(total())}`;
    $('[data-done-ref]').textContent = 'ET-' + String(Math.abs(Date.now() % 9000) + 1000);
    coForm.hidden = true;
    coDone.hidden = false;
    coDone.querySelector('h2').setAttribute('tabindex', '-1');
    coDone.querySelector('h2').focus({ preventScroll: true });
  });

  /* ---------- Mobile booking bar ----------
     Hidden while the rail itself is on screen: two live totals competing for
     the same tap is one too many. */
  const bar = document.querySelector('[data-bookbar]');
  const railEl = document.querySelector('.rail');
  if (bar && railEl) {
    new IntersectionObserver(([e]) => {
      bar.setAttribute('data-show', String(!e.isIntersecting && window.scrollY > 300));
    }, { threshold: 0 }).observe(railEl);
  }

  renderCalendar();
  sync();
})();
