/* New York Bagel Express — mobile sticky CTA
   Shows the bar only after the hero's primary button scrolls out of view, and hides it while a
   box builder is on screen (the builder has its own bottom bar). It stays visible over the
   footer; its height is published as --bbb-sticky-h so the footer can reserve room for it.
   Hidden while the mobile menu drawer is open (CSS, see nybe-theme.css). */
(() => {
  const bars = document.querySelectorAll('[data-bbb-sticky]');
  if (!bars.length || !('IntersectionObserver' in window)) return;

  bars.forEach((bar) => {
    const id = bar.getAttribute('data-bbb-sticky');
    const heroCta = document.getElementById(`bbb-hero-cta-${id}`);
    if (!heroCta) return;

    let heroVisible = true;
    let builderVisible = false;
    const update = () => {
      const show = !heroVisible && !builderVisible;
      bar.hidden = !show;
      document.body.classList.toggle('bbb-has-sticky-cta', show);
      document.documentElement.style.setProperty('--bbb-sticky-h', show ? bar.offsetHeight + 'px' : '0px');
    };

    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting || entry.boundingClientRect.top > 0;
      update();
    }).observe(heroCta);

    const builder = document.querySelector('[data-bbb-builder]');
    if (builder) {
      new IntersectionObserver(([entry]) => {
        builderVisible = entry.isIntersecting;
        update();
      }).observe(builder);
    }

    window.addEventListener('resize', update, { passive: true });
  });
})();
