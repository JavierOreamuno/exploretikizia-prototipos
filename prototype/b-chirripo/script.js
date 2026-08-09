/* Direction B — progressive enhancement only. Prototype code. */
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
  const targets = document.querySelectorAll('[data-reveal], [data-reveal-x]');
  if (reduced) {
    targets.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => entry.target.classList.add('is-in'), Math.min(i * 80, 320));
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    targets.forEach(el => io.observe(el));
  }

  /* Hero parallax — cheap, transform-only, disabled for reduced motion */
  const heroImg = document.querySelector('.hero__bg img');
  if (heroImg && !reduced) {
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(scrollY, innerHeight) * 0.16;
        heroImg.style.transform = `translate3d(0, ${y}px, 0) scale(1.06)`;
        ticking = false;
      });
    }, { passive: true });
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

  /* Keyboard scrolling for the horizontal route rail */
  const rail = document.querySelector('.routes__rail');
  if (rail) {
    rail.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const card = rail.querySelector('.route');
      const step = card ? card.getBoundingClientRect().width + 1 : 320;
      rail.scrollBy({ left: e.key === 'ArrowRight' ? step : -step, behavior: reduced ? 'auto' : 'smooth' });
    });
  }
})();
