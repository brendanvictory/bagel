/*
 * Same-page anchor links (e.g. "See our flavors" → /#flavors): glide down instead of jumping, and stop the
 * section's top right under the sticky header so its own top padding shows (same as the offer pages' buttons).
 * The box builder handles links to itself (bbb-box-builder.js); skip links and the mobile menu keep the default.
 */
(() => {
  const headerH = () => { const hdr = document.querySelector('.section-header'); return hdr ? hdr.offsetHeight : 0; };
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
    if (a.target && a.target !== '_self') return;
    if (a.classList.contains('skip-to-content-link') || a.closest('menu-drawer, .menu-drawer')) return;
    let url;
    try { url = new URL(a.href, window.location.href); } catch (err) { return; }
    if (!url.hash || url.hash === '#' || url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch (err) { return; }
    if (!target || target.classList.contains('bbb-builder')) return;
    e.preventDefault();
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerH());
    const smooth = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    try { window.history.pushState(window.history.state, '', window.location.pathname + window.location.search + url.hash); } catch (err) { /* ignore */ }
  });
})();
