/* Bad Boy Bagel Co. — testimonial marquee pause/play (WCAG 2.2.2) */
(() => {
  document.querySelectorAll('[data-bbb-marquee-toggle]').forEach((btn) => {
    const section = btn.closest('section');
    const marquee = section && section.querySelector('[data-bbb-marquee]');
    if (!marquee) return;
    btn.addEventListener('click', () => {
      const paused = marquee.classList.toggle('is-paused');
      btn.classList.toggle('is-paused', paused);
    });
  });
})();
