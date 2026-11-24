/* New York Bagel Express — keeps the $0 bagel lines in step with the box.
   The builder adds one $0 line per flavor (SKU BAGEL-<FLAVOR>, quantity = bagels of that flavor)
   next to the box so ShipStation's pick list can total bagels by flavor. Those lines carry no
   properties (so ShipStation adds them up across orders), and the cart hides them. This script
   works out how many of each flavor the boxes in the cart need (box quantity x sleeves of that
   flavor x 3) and sets the bagel lines to match, removing them when the box is gone.
   Runs on page load and after every cart change. */
(() => {
  const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  const PER_SLEEVE = 3; // docs/DECISIONS.md R1: sleeves of 3
  // "Red & Green Swirl" → BAGEL-RED-AND-GREEN-SWIRL (no & in SKUs)
  const skuFor = (flavor) => 'BAGEL-' + String(flavor).trim().toUpperCase().replace(/\s*&\s*/g, ' AND ').replace(/\s+/g, '-');
  const isBagelLine = (it) => String(it.sku || '').toUpperCase().startsWith('BAGEL-') || !!(it.properties && it.properties._box_part);
  let running = false;
  let again = false;

  const sync = async () => {
    if (running) { again = true; return; }
    running = true;
    try {
      const cart = await (await fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } })).json();
      const want = new Map(); // SKU -> bagels needed
      cart.items.forEach((it) => {
        const p = it.properties || {};
        if (isBagelLine(it) || !p['Sleeve 1']) return;
        Object.keys(p).forEach((k) => {
          if (!/^Sleeve \d+$/.test(k) || !p[k]) return;
          const sku = skuFor(p[k]);
          want.set(sku, (want.get(sku) || 0) + it.quantity * PER_SLEEVE);
        });
      });
      const updates = {};
      cart.items.filter(isBagelLine).forEach((it) => {
        const sku = String(it.sku || '').toUpperCase();
        const left = want.get(sku) || 0; // first line of a SKU takes what's needed, any extra lines go to 0
        if (it.quantity !== left) updates[it.key] = left;
        want.set(sku, 0);
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
