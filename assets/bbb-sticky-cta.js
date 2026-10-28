/* Bad Boy Bagel Co. — mobile sticky CTA
   Shows the bar only after the hero's primary button scrolls out of view,
   and hides it again near the footer so it never covers footer links, and while a box builder
   is on screen (the builder has its own bottom bar). */
(() => {
  const bars = document.querySelectorAll('[data-bbb-sticky]');
  if (!bars.length || !('IntersectionObserver' in window)) return;

  bars.forEach((bar) => {
    const id = bar.getAttribute('data-bbb-sticky');
    const heroCta = document.getElementById(`bbb-hero-cta-${id}`);
    const footer = document.querySelector('.footer, footer');
    if (!heroCta) return;

    let heroVisible = true;
    let footerVisible = false;
    let builderVisible = false;
    const update = () => {
      const show = !heroVisible && !footerVisible && !builderVisible;
      bar.hidden = !show;
      document.body.classList.toggle('bbb-has-sticky-cta', show);
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

    if (footer) {
      new IntersectionObserver(([entry]) => {
        footerVisible = entry.isIntersecting;
        update();
      }).observe(footer);
    }
  });
})();
