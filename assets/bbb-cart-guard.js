/* New York Bagel Express — keeps the $0 bagel lines in step with their box.
   The builder adds one hidden line per flavor ("_box_part", "_per_box" = bagels per box) next to the
   box line (same "_box_id") so ShipStation's pick list can total bagels by flavor. The cart hides
   those lines, so if a shopper removes the box or changes its quantity, this script removes the
   matching bagel lines or sets them to _per_box × box quantity. Runs on page load and after every
   cart change. */
(() => {
  const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  let running = false;
  let again = false;

  const sync = async () => {
    if (running) { again = true; return; }
    running = true;
    try {
      const cart = await (await fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } })).json();
      const boxes = new Map();
      cart.items.forEach((it) => {
        const p = it.properties || {};
        if (p._box_id && p['Sleeve 1'] && !p._box_part) boxes.set(p._box_id, (boxes.get(p._box_id) || 0) + it.quantity);
      });
      const updates = {};
      cart.items.forEach((it) => {
        const p = it.properties || {};
        if (!p._box_part) return;
        const boxQty = boxes.get(p._box_id) || 0;
        const want = boxQty * (Number(p._per_box) || 0);
        if (it.quantity !== want) updates[it.key] = want;
      });
      if (Object.keys(updates).length) {
        await fetch(`${root}cart/update.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ updates }),
        });
        if (/\/cart\/?$/.test(window.location.pathname)) window.location.reload();
      }
    } catch (e) {
      /* never block shopping on this */
    } finally {
      running = false;
      if (again) { again = false; sync(); }
    }
  };

  const start = () => {
    sync();
    // constants.js declares PUB_SUB_EVENTS with const (global scope, not a window property)
    const events = typeof PUB_SUB_EVENTS !== 'undefined' ? PUB_SUB_EVENTS : null; // eslint-disable-line no-undef
    if (typeof window.subscribe === 'function' && events && events.cartUpdate) {
      window.subscribe(events.cartUpdate, () => sync());
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
