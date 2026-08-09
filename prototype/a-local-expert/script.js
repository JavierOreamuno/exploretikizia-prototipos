/* Direction A — progressive enhancement only. Prototype code. */
(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Sticky nav border once scrolled past the top */
  const nav = document.querySelector('[data-nav]');
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px';
  document.body.prepend(sentinel);
  new IntersectionObserver(
    ([e]) => nav && nav.setAttribute('data-stuck', String(!e.isIntersecting)),
    { threshold: 0 }
  ).observe(sentinel);

  /* Reveal on scroll */
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

  /* Mobile dock: appears after the hero, hides over the final CTA */
  const dock = document.querySelector('[data-dock]');
  const hero = document.querySelector('.hero');
  const final = document.querySelector('.final');
  if (dock && hero) {
    let pastHero = false, atFinal = false;
    const sync = () => dock.setAttribute('data-show', String(pastHero && !atFinal));
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
    if (final) {
      new IntersectionObserver(([e]) => { atFinal = e.isIntersecting; sync(); }, { threshold: 0.15 }).observe(final);
    }
  }
})();
