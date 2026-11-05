/* New York Bagel Express — Build Your Box (ADR-002 Option C)
   Page 1: pick exactly N sleeves (3 of 4 bagels per the product settings), repeats allowed, no pricing shown.
   Lead step (optional): name, email, phone, ZIP → delivery check → Shopify customer tagged "lead".
   Page 2: add-ons, one-time vs subscription, pricing, checkout.
   Promo mode (landing pages): a free one-time item rides with the box; the discount code is applied
   on the way to checkout via /discount/<code>?redirect=….
   State: the URL changes only on step changes (?s=…&o=…&a=…&step=lead|2); picks in between live in
   sessionStorage so pixels don't log a PageView per tap. Refresh, Back and ?s= links still work.
   One box per order: adding a box first removes any box already in the cart (same-_box_id lines).
   Edit from cart: ?edit=<box_id> pre-fills the builder; saving replaces the box + its add-ons.
   Cart payload: box line (properties "Sleeve 1..N" + "_box_id") + add-on lines (same "_box_id",
   subscribed on a plan with the same delivery frequency). Shopify prices every line itself. */
(() => {
  const root = document.querySelector('[data-bbb-builder]');
  if (!root) return;
  const cfgEl = root.querySelector('[data-bbb-config]');
  if (!cfgEl) return;
  const cfg = JSON.parse(cfgEl.textContent);

  const $ = (sel, el = root) => el.querySelector(sel);
  const $$ = (sel, el = root) => Array.from(el.querySelectorAll(sel));

  const flavors = $$('[data-bbb-flavor]').map((el) => ({
    el,
    handle: el.dataset.bbbFlavor,
    name: el.dataset.name,
    img: el.dataset.img || '',
    available: !el.hasAttribute('data-unavailable'),
  }));
  const byHandle = Object.fromEntries(flavors.map((f) => [f.handle, f]));
  const byName = Object.fromEntries(flavors.map((f) => [f.name.toLowerCase(), f]));

  const state = { step: 1, sleeves: [], option: null, planId: null, addons: new Set(), editBoxId: null };

  // ---------- money ----------
  const formatMoney = (cents) => {
    const amount = (cents / 100).toFixed(2);
    const withComma = amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (cfg.moneyFormat || '${{amount}}')
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100).toString())
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amount.replace('.', ','))
      .replace(/\{\{\s*amount\s*\}\}/, withComma);
  };

  // ---------- derived ----------
  const norm = (x) => String(x || '').trim().toLowerCase();
  const plan = () => cfg.plans.find((p) => String(p.id) === String(state.planId)) || null;
  const isFull = () => state.sleeves.length === cfg.sleeves;
  const boxPrice = () => (state.option === 'subscription' && plan() ? plan().price : cfg.oncePrice);
  // Add-ons recur on the box's plan if they share it, otherwise on their own plan with the same
  // delivery frequency (or same name). No match = one-time add-on.
  const addonPlanId = (a) => {
    if (state.option !== 'subscription' || !state.planId) return null;
    if (a.plans[String(state.planId)] != null) return String(state.planId);
    const p = plan();
    if (!p) return null;
    const byKey = p.key && Object.entries(a.planKeys || {}).find(([, k]) => norm(k) === norm(p.key));
    const byNm = Object.entries(a.planNames || {}).find(([, n]) => norm(n) === norm(p.name));
    const match = byKey || byNm;
    return match ? match[0] : null;
  };
  const addonPrice = (a) => {
    const id = addonPlanId(a);
    return id && a.plans[id] != null ? a.plans[id] : a.price;
  };
  const chosenAddons = () => cfg.addons.filter((a) => state.addons.has(String(a.variantId)));
  const total = () => boxPrice() + chosenAddons().reduce((s, a) => s + addonPrice(a), 0);
  const freqText = () => {
    const p = plan();
    if (!p) return '';
    const t = (p.key || p.name).toLowerCase().split(',')[0].replace(/^(deliver(ed|y)?|ships?|renews?)\s+/, '').trim();
    return /^every\b/.test(t) ? t : `every ${t}`;
  };
  // Per-box shipping shown in the summary (display only; Shopify's shipping profile sets the real charge)
  const shipPerBox = () => (cfg.shipping && cfg.shipping.perBox ? Number(cfg.shipping.perBox) : 0);
  const promoOn = () => !!(cfg.promo && cfg.promo.variantId && cfg.promo.code);

  // ---------- lead step ----------
  const LEAD_KEY = 'bbb_lead_v1';
  const leadSaved = () => { try { return JSON.parse(window.localStorage.getItem(LEAD_KEY) || 'null'); } catch (e) { return null; } };
  // The delivery check is shown every time (pre-filled once completed). leadPass lets the shopper through to
  // page 2 for this trip only; going back to page 1 resets it.
  let leadPass = false;
  let leadDoneThisVisit = false;
  const needLead = () => !!(cfg.lead && cfg.lead.enabled && $('[data-bbb-view="lead"]')) && !state.editBoxId && !leadPass;
  const LEAD_PENDING = 'bbb:lead-pending';
  // Shopify saved the lead (we're back from its form post): tell the tracking bridge once per submission
  let leadLanded = null;
  const leadSavedEvent = (ok, zip, key) => document.dispatchEvent(new CustomEvent('bbb:lead', {
    detail: { saved: true, deliverable: !!ok, zip: zip || '', source: (cfg.lead && cfg.lead.source) || 'builder', key: `builder:${key || zip || Date.now()}` },
  }));
  // Lower 48 + DC only: reject AK, HI, PR/VI, Guam & Pacific territories, APO/FPO, unassigned 000–004.
  const zipDeliverable = (zip) => {
    const p = Number(zip.slice(0, 3));
    if (p <= 4) return false;
    if (p >= 6 && p <= 9) return false;     // PR, VI
    if (p >= 90 && p <= 99) return false;   // APO/FPO AE
    if (p === 340) return false;            // APO/FPO AA
    if (p >= 962 && p <= 969) return false; // APO/FPO AP, HI, Guam & Pacific
    if (p >= 995) return false;             // AK
    return true;
  };

  const counts = () => state.sleeves.reduce((m, h) => ((m[h] = (m[h] || 0) + 1), m), {});

  // ---------- render ----------
  const thumb = (f) => {
    if (!f || !f.img) return '';
    const i = document.createElement('img');
    i.src = f.img; i.alt = ''; i.width = 80; i.height = 80; i.loading = 'lazy';
    return i;
  };

  const renderPage1 = () => {
    const c = counts();
    flavors.forEach((f) => {
      const n = c[f.handle] || 0;
      $('[data-bbb-count]', f.el).textContent = n;
      $('[data-bbb-dec]', f.el).disabled = n === 0;
      $('[data-bbb-inc]', f.el).disabled = !f.available || isFull();
      f.el.classList.toggle('is-picked', n > 0);
      const badge = $('[data-bbb-badge]', f.el);
      badge.hidden = n === 0;
      badge.textContent = `×${n}`;
    });

    $$('[data-bbb-slot]').forEach((slot, i) => {
      const f = byHandle[state.sleeves[i]];
      // Display only: '4x Plain' makes it clear each sleeve is 4 bagels (product names are unchanged)
      $('[data-bbb-slot-label]', slot).textContent = f ? `${cfg.perSleeve}x ${f.name}` : (cfg.labels.emptySlot || 'Add flavor');
      const img = $('.bbb-slot__img', slot);
      img.innerHTML = '';
      const t = thumb(f);
      if (t) img.appendChild(t);
      slot.classList.toggle('is-filled', !!f);
      slot.setAttribute('aria-label', f ? `Sleeve ${i + 1}: ${f.name}. Remove` : `Sleeve ${i + 1}: empty. Choose a flavor`);
    });
    $$('[data-bbb-dot]').forEach((dot, i) => {
      const f = byHandle[state.sleeves[i]];
      dot.classList.toggle('is-filled', !!f);
      dot.innerHTML = '';
      const t = thumb(f);
      if (t) dot.appendChild(t);
    });

    const n = state.sleeves.length;
    $('[data-bbb-progress]').textContent = cfg.labels.progress.replace('[n]', n).replace('[total]', cfg.sleeves);
    root.style.setProperty('--bbb-fill', `${(n / cfg.sleeves) * 100}%`);
    const bc = $('[data-bbb-bar-count]');
    if (bc) bc.textContent = `${n} / ${cfg.sleeves}`;
    $$('[data-bbb-next]').forEach((b) => b.setAttribute('aria-disabled', String(!isFull())));
    root.classList.toggle('is-full', isFull());
  };

  const renderPage2 = () => {
    // Box summary with photos
    const sum = $('[data-bbb-boxsum]');
    if (sum) {
      sum.innerHTML = '';
      Object.entries(counts()).forEach(([h, c]) => {
        const f = byHandle[h];
        const li = document.createElement('li');
        li.className = 'bbb-boxsum__item';
        const media = document.createElement('span');
        media.className = 'bbb-boxsum__img';
        const t = thumb(f);
        if (t) media.appendChild(t);
        const txt = document.createElement('span');
        txt.className = 'bbb-boxsum__name';
        txt.textContent = f.name;
        const qty = document.createElement('span');
        qty.className = 'bbb-boxsum__qty';
        qty.textContent = `${c} sleeve${c > 1 ? 's' : ''} · ${c * cfg.perSleeve} bagels`;
        li.append(media, txt, qty);
        sum.appendChild(li);
      });
    }

    $$('[data-bbb-option]').forEach((r) => (r.checked = r.value === state.option));
    const subCard = $('[data-bbb-sub-card]');
    if (subCard) subCard.classList.toggle('is-selected', state.option === 'subscription');
    $$('[data-bbb-every]').forEach((e) => (e.hidden = state.option !== 'subscription'));

    // Totals
    const dl = $('[data-bbb-totals]');
    if (dl) {
      dl.innerHTML = '';
      const row = (label, value) => {
        const dt = document.createElement('dt'); dt.textContent = label;
        const dd = document.createElement('dd'); dd.textContent = value;
        dl.append(dt, dd);
      };
      const label = state.option === 'subscription' ? `${cfg.title} (${freqText()})` : cfg.title;
      row(label, state.option ? formatMoney(boxPrice()) : '—');
      chosenAddons().forEach((a) => row(a.title, formatMoney(addonPrice(a))));
      if (promoOn()) row(cfg.promo.title, 'Free');
      row('Shipping', shipPerBox() ? formatMoney(shipPerBox()) : 'Free');
    }
    // Display total = what checkout will charge for this one box (items + per-box shipping when set)
    const t = state.option ? formatMoney(total() + shipPerBox()) : '—';
    // Display only: how much the subscription saves versus buying the same items one-time.
    const savingEl = $('[data-bbb-saving]');
    if (savingEl) {
      const listTotal = cfg.oncePrice + chosenAddons().reduce((sum, a) => sum + a.price, 0);
      const saved = state.option === 'subscription' ? listTotal - total() : 0;
      savingEl.hidden = !(saved > 0);
      if (saved > 0) $('[data-bbb-saving-text]', savingEl).textContent = (cfg.labels.saving || '').replace('[amount]', formatMoney(saved));
    }
    const barSave = $('[data-bbb-bar-saving]');
    if (barSave) {
      const listTotal = cfg.oncePrice + chosenAddons().reduce((sum, a) => sum + a.price, 0);
      const saved = state.option === 'subscription' ? listTotal - total() : 0;
      barSave.hidden = !(saved > 0);
      if (saved > 0) $('[data-bbb-bar-saving-amt]', barSave).textContent = formatMoney(saved);
    }
    $('[data-bbb-total]').textContent = t;
    const bt = $('[data-bbb-bar-total]');
    if (bt) bt.textContent = state.option ? t : '';

    const disc = $('[data-bbb-disclosure]');
    if (disc) {
      const p = plan();
      disc.hidden = !(state.option === 'subscription' && p);
      if (p) {
        $$('[data-bbb-disc-price]', disc).forEach((e) => (e.textContent = formatMoney(total() + shipPerBox())));
        $$('[data-bbb-disc-freq]', disc).forEach((e) => (e.textContent = freqText()));
      }
    }
    $$('[data-bbb-add]').forEach((b) => b.setAttribute('aria-disabled', String(!(isFull() && state.option))));
    root.classList.toggle('is-addable', !!(isFull() && state.option)); // mobile bar on page 2 shows only when Checkout is active
  };

  // Picks are remembered per tab (sessionStorage), not in the URL: rewriting the URL on every
  // tap makes ad/analytics pixels log a new PageView each time. The URL only changes on step changes.
  const SESSION_KEY = `bbb:box:${cfg.variantId}`;
  const saveSession = () => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        s: state.sleeves, o: state.option, p: state.planId, a: Array.from(state.addons),
      }));
    } catch (err) { /* private mode */ }
  };
  const restoreSession = () => {
    let d = null;
    try { d = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (err) { d = null; }
    if (!d) return;
    (d.s || []).forEach((h) => { if (byHandle[h] && byHandle[h].available && state.sleeves.length < cfg.sleeves) state.sleeves.push(h); });
    if (d.o === 'once') state.option = 'once';
    else if (d.o === 'subscription' && cfg.plans.some((pl) => String(pl.id) === String(d.p))) { state.option = 'subscription'; state.planId = String(d.p); }
    (d.a || []).forEach((id) => { if (cfg.addons.some((x) => String(x.variantId) === String(id))) state.addons.add(String(id)); });
  };
  const hasSession = () => {
    try { const d = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null'); return !!(d && d.s && d.s.length); } catch (err) { return false; }
  };
  // On Back/Forward and refresh, step-1 URLs (no ?step=) defer to this tab's saved picks, so old
  // history entries (e.g. ?s=pumpernickel from earlier visits, or the page before checkout) can't
  // overwrite the box just built. A normal link click (edit-from-cart, ?s= links, menu links) uses
  // the URL as before.
  const preferSession = () => {
    const p = new URL(window.location.href).searchParams;
    return !p.get('step') && !p.get('edit') && hasSession();
  };
  const navType = (() => {
    try { const n = performance.getEntriesByType('navigation')[0]; return (n && n.type) || 'navigate'; } catch (err) { return 'navigate'; }
  })();
  const isReturnVisit = navType === 'back_forward' || navType === 'reload';
  // Same box as this tab's saved one: also restore plan/add-on choices made after the last step change
  const mergeSessionChoices = () => {
    try {
      const d = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null');
      if (d && (d.s || []).join(',') === state.sleeves.join(',')) {
        if (d.o === 'once') { state.option = 'once'; state.planId = null; }
        else if (d.o === 'subscription' && cfg.plans.some((pl) => String(pl.id) === String(d.p))) { state.option = 'subscription'; state.planId = String(d.p); }
        state.addons = new Set((d.a || []).map(String).filter((id) => cfg.addons.some((x) => String(x.variantId) === id)));
      }
    } catch (err) { /* ignore */ }
  };
  const render = () => { renderPage1(); renderPage2(); saveSession(); };

  // ---------- pages ----------
  const ORDER = ['1', 'lead', '2'];
  const instant = 'instant' in document.documentElement.style ? 'instant' : 'auto';
  const headerH = () => { const hdr = document.querySelector('.section-header'); return hdr ? hdr.offsetHeight : 0; };
  // Going back: the visible step progress sits right under the sticky header (nothing above it)
  const scrollToSteps = () => {
    const nav = $$('.bbb-stepnav').find((n) => n.offsetParent !== null);
    const anchor = nav || root;
    window.scrollTo({ top: Math.max(0, anchor.getBoundingClientRect().top + window.scrollY - 16 - headerH()), behavior: instant });
  };
  // Going forward: the top of the builder (the page top on the product page, so the photo hero with the step's copy shows)
  const scrollToBuilder = () => {
    const top = Math.max(0, root.getBoundingClientRect().top + window.scrollY - 12 - headerH());
    window.scrollTo({ top: top < 240 ? 0 : top, behavior: instant });
  };
  const embedded = root.classList.contains('bbb-builder--embedded');
  const isBackward = (from, to) => ORDER.indexOf(String(to)) < ORDER.indexOf(String(from));
  const showStep = (step, { push = true, focus = true, replace = false } = {}) => {
    const fromStep = state.step;
    if (step !== 1 && !isFull()) step = 1;
    if (step === 1) leadPass = false;
    if (step === 2 && needLead()) step = 'lead';
    if (step === 'lead' && !needLead()) step = isFull() ? 2 : 1;
    state.step = step;
    root.dataset.step = String(step);
    $$('[data-bbb-view]').forEach((v) => (v.hidden = v.dataset.bbbView !== String(step)));
    $$('[data-bbb-stepnav]').forEach((li) => {
      if (li.dataset.bbbStepnav === String(step)) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      li.classList.toggle('is-done', ORDER.indexOf(li.dataset.bbbStepnav) < ORDER.indexOf(String(step)));
    });
    hideErrors();
    syncUrl(push && !replace);
    if (focus) {
      // Landing pages (builder embedded below other sections, no photo hero): step progress on top both ways
      if (isBackward(fromStep, step) || embedded) scrollToSteps();
      else scrollToBuilder();
      const h = $(`[data-bbb-focus="${step}"]`);
      if (h) h.focus({ preventScroll: true });
    }
    const ev = step === 2 ? 'bbb:builder-complete' : step === 'lead' ? 'bbb:builder-lead' : 'bbb:builder-step1';
    document.dispatchEvent(new CustomEvent(ev, { detail: { sleeves: state.sleeves.slice() } }));
  };

  // ---------- URL state ----------
  const buildUrl = () => {
    const url = new URL(window.location.href);
    const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set('s', state.sleeves.join(','));
    set('o', state.option === 'subscription' ? String(state.planId || '') : state.option || '');
    set('a', Array.from(state.addons).join(','));
    set('edit', state.editBoxId);
    set('step', state.step === 2 ? '2' : state.step === 'lead' ? 'lead' : '');
    return url;
  };
  function syncUrl(push = false) {
    const url = buildUrl();
    if (url.href === window.location.href) return;
    if (push) window.history.pushState({ bbbStep: state.step }, '', url);
    else window.history.replaceState({ bbbStep: state.step }, '', url);
  }

  const readUrl = () => {
    const p = new URL(window.location.href).searchParams;
    state.sleeves = [];
    (p.get('s') || '').split(',').map((x) => x.trim()).filter(Boolean).forEach((token) => {
      const f = byHandle[token] || byName[decodeURIComponent(token).toLowerCase()];
      if (f && f.available && state.sleeves.length < cfg.sleeves) state.sleeves.push(f.handle);
    });
    const o = p.get('o');
    if (o === 'once') { state.option = 'once'; }
    else if (o && cfg.plans.some((pl) => String(pl.id) === o)) { state.option = 'subscription'; state.planId = o; }
    state.addons = new Set();
    (p.get('a') || '').split(',').filter(Boolean).forEach((id) => {
      if (cfg.addons.some((a) => String(a.variantId) === id)) state.addons.add(id);
    });
    state.editBoxId = p.get('edit') || null;
    const st = p.get('step');
    return st === '2' ? 2 : st === 'lead' ? 'lead' : 1;
  };

  window.addEventListener('popstate', () => {
    let step = readUrl();
    // Back to a step-1 URL: keep the picks saved for this tab
    if (!new URL(window.location.href).searchParams.has('s') || preferSession()) { state.sleeves = []; state.addons = new Set(); restoreSession(); step = 1; }
    else mergeSessionChoices();
    if (step === 2 && leadSaved()) leadPass = true; // browser Forward onto page 2 after the check
    $$('[data-bbb-addon]').forEach((cb) => (cb.checked = state.addons.has(cb.value)));
    renderPage1(); renderPage2();
    const fromStep = state.step;
    showStep(step, { push: false });
    // Browser Back: step progress on top (again after any browser scroll restore); Forward behaves like Next
    if (isBackward(fromStep, state.step)) window.requestAnimationFrame(scrollToSteps);
  });
  // We place the page ourselves on step changes, so the browser shouldn't restore old scroll positions
  try { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
  // Back/Forward into this page from another document (page restored from cache, or reloaded from history)
  window.addEventListener('pageshow', (e) => { if (e.persisted) window.requestAnimationFrame(scrollToSteps); });
  try {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'back_forward') window.addEventListener('load', () => window.requestAnimationFrame(scrollToSteps), { once: true });
  } catch (e) { /* ignore */ }

  // ---------- errors ----------
  const showError = (step, msg) => {
    const el = $(`[data-bbb-error="${step}"]`);
    if (el) { el.textContent = msg; el.hidden = false; }
  };
  function hideErrors() { $$('[data-bbb-error]').forEach((el) => { el.hidden = true; el.textContent = ''; }); }

  // ---------- navigation helpers (presentation) ----------
  function scrollToFlavors(moveFocus) {
    const hdr = document.querySelector('.section-header');
    let offset = (hdr ? hdr.getBoundingClientRect().height : 0) + 12;
    // Desktop: the sleeves tray sticks under the header in a compact size; land the flavor grid just
    // below that compact tray so it doesn't cover the first row of bagels.
    const tray = $('[data-nybe-tray]');
    const trayIsSticky = tray && getComputedStyle(tray).position === 'sticky';
    let target = $('.nybe-fhead') || $('.bbb-fgrid');
    if (!target) return;
    let targetY;
    if (trayIsSticky) {
      target = $('.bbb-fgrid') || target;
      // Measure with the tray already compact: it shrinks once stuck, which pulls the grid up.
      const was = tray.classList.contains('is-stuck');
      tray.classList.add('nybe-measure', 'is-stuck');
      const stuckH = tray.getBoundingClientRect().height;
      targetY = target.getBoundingClientRect().top + window.scrollY;
      if (!was) tray.classList.remove('is-stuck');
      void tray.offsetHeight;
      tray.classList.remove('nybe-measure');
      offset = (parseFloat(getComputedStyle(tray).top) || offset) + stuckH + 16;
    } else {
      targetY = target.getBoundingClientRect().top + window.scrollY;
    }
    const top = Math.max(0, targetY - offset);
    const smooth = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    if (moveFocus) {
      const firstAdd = $('[data-bbb-inc]:not([disabled])');
      if (firstAdd) firstAdd.focus({ preventScroll: true });
    }
  }

  // ---------- events ----------
  root.addEventListener('click', (e) => {
    const inc = e.target.closest('[data-bbb-inc]');
    const dec = e.target.closest('[data-bbb-dec]');
    const slot = e.target.closest('[data-bbb-slot]');
    const next = e.target.closest('[data-bbb-next]');
    const back = e.target.closest('[data-bbb-back]');
    if (inc || dec) {
      const f = byHandle[e.target.closest('[data-bbb-flavor]').dataset.bbbFlavor];
      if (inc && f.available && !isFull()) state.sleeves.push(f.handle);
      if (dec) {
        const i = state.sleeves.lastIndexOf(f.handle);
        if (i > -1) state.sleeves.splice(i, 1);
      }
      hideErrors();
      render();
      return;
    }
    const dot = e.target.closest('[data-bbb-dot]');
    if (slot) {
      const idx = Number(slot.dataset.bbbSlot);
      if (idx < state.sleeves.length) {
        // Filled sleeve: tap removes it (unchanged)
        state.sleeves.splice(idx, 1);
        render();
        const nextFocus = $('[data-bbb-slot].is-filled') || $('[data-bbb-inc]:not([disabled])');
        if (nextFocus) nextFocus.focus();
      } else {
        // Empty sleeve: take the shopper to the flavor list
        scrollToFlavors(true);
      }
      return;
    }
    if (dot && Number(dot.dataset.bbbDot) >= state.sleeves.length) {
      scrollToFlavors(false);
      return;
    }
    if (next) {
      if (!isFull()) {
        showError(1, cfg.labels.needMore.replace('[remaining]', cfg.sleeves - state.sleeves.length));
        const err = $('[data-bbb-error="1"]');
        if (err && err.scrollIntoView) err.scrollIntoView({ block: 'center' });
        return;
      }
      showStep(2);
      return;
    }
    if (back) {
      // "Edit flavors" always opens the flavor picker scrolled to its top. (Not history.back(): that lands on the
      // delivery check from page 2, and restores the old scroll position, i.e. down by the Next button.)
      showStep(1);
    }
  });

  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-bbb-option]')) {
      state.option = e.target.value;
      if (state.option === 'subscription' && !state.planId) {
        const sel = $('[data-bbb-plan]');
        state.planId = sel ? sel.value : null;
      }
      hideErrors();
    } else if (e.target.matches('select[data-bbb-plan]')) {
      state.planId = e.target.value;
      state.option = 'subscription';
    } else if (e.target.matches('[data-bbb-addon]')) {
      if (e.target.checked) state.addons.add(e.target.value);
      else state.addons.delete(e.target.value);
    }
    render();
  });

  // ---------- lead form ----------
  const leadForm = root.querySelector('#BbbLeadForm');
  if (leadForm) {
    // Input masks: ZIP = digits only (max 5); phone = digits only, shown as (516) 888-7633.
    // The caret stays after the same digit while typing or deleting in the middle.
    const keepCaret = (el, formatted, digitsBefore) => {
      el.value = formatted;
      if (document.activeElement !== el) return;
      let pos = 0, seen = 0;
      while (pos < formatted.length && seen < digitsBefore) { if (/\d/.test(formatted[pos])) seen++; pos++; }
      try { el.setSelectionRange(pos, pos); } catch (err) { /* type=tel supports it; ignore otherwise */ }
    };
    const fmtPhone = (d) => {
      if (!d) return '';
      if (d.length < 4) return `(${d}`;
      if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
    };
    const zipIn = leadForm.querySelector('[data-bbb-lead-zip]');
    if (zipIn) {
      zipIn.setAttribute('maxlength', '5');
      zipIn.setAttribute('pattern', '[0-9]{5}');
      zipIn.addEventListener('input', () => {
        const before = zipIn.value.slice(0, zipIn.selectionStart || 0).replace(/\D/g, '').length;
        keepCaret(zipIn, zipIn.value.replace(/\D/g, '').slice(0, 5), before);
      });
    }
    const phoneIn = leadForm.querySelector('[data-bbb-lead-phone]');
    if (phoneIn) {
      phoneIn.setAttribute('placeholder', phoneIn.getAttribute('placeholder') || '(555) 555-5555');
      phoneIn.addEventListener('input', (e) => {
        let d = phoneIn.value.replace(/\D/g, '');
        let before = phoneIn.value.slice(0, phoneIn.selectionStart || 0).replace(/\D/g, '').length;
        if (d.length === 11 && d[0] === '1') { d = d.slice(1); before = Math.max(0, before - 1); } // pasted +1 number
        d = d.slice(0, 10);
        // Backspace right after a ')' / '-' / space removes the digit before it instead of doing nothing
        if (e.inputType === 'deleteContentBackward' && fmtPhone(d) === phoneIn.dataset.nybeLast && before > 0) {
          d = d.slice(0, before - 1) + d.slice(before); before -= 1;
        }
        const out = fmtPhone(d);
        keepCaret(phoneIn, out, before);
        phoneIn.dataset.nybeLast = out;
      });
    }
    const f = (sel) => leadForm.querySelector(sel);
    const okBox = $('[data-bbb-lead-ok]');
    const fill = (tpl, zip) => String(tpl || '').replace('[zip]', zip);
    const fieldError = (input, msg) => {
      showError('lead', msg);
      if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
    };
    const goOn = () => { leadPass = true; showStep(2, { replace: true }); };
    // Pre-fill the delivery check with what this shopper entered last time
    (() => {
      const d = leadSaved();
      if (!d) return;
      const set = (sel, v) => { const el = f(sel); if (el && !el.value && v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
      set('[data-bbb-lead-zip]', d.zip); set('[data-bbb-lead-name]', d.name); set('[data-bbb-lead-email]', d.email); set('[data-bbb-lead-phone]', d.phone);
      const sms = f('[data-bbb-lead-sms]'); if (sms && d.sms) sms.checked = true;
    })();

    // Ticking "Text me" makes the phone number required (no number, no texts)
    const smsBox = f('[data-bbb-lead-sms]');
    const syncPhoneRequired = () => {
      const on = !!(smsBox && smsBox.checked);
      const ph = f('[data-bbb-lead-phone]'), opt = f('[data-bbb-lead-phone-opt]');
      if (ph) { ph.required = on; ph.setAttribute('aria-required', on ? 'true' : 'false'); if (!on) ph.removeAttribute('aria-invalid'); }
      if (opt) opt.textContent = on ? '(required for texts)' : '(optional)';
    };
    if (smsBox) { smsBox.addEventListener('change', syncPhoneRequired); syncPhoneRequired(); }

    // "Checking…" is only for the moment the form posts; undo it if the browser restores this page (Back/Forward)
    const leadBtn = f('[data-bbb-lead-submit]');
    const leadBtnLbl = leadBtn && leadBtn.querySelector('span');
    const leadBtnText = leadBtnLbl ? leadBtnLbl.textContent : '';
    const resetLeadBtn = () => {
      if (!leadBtn) return;
      leadBtn.removeAttribute('aria-busy');
      if (leadBtnLbl) leadBtnLbl.textContent = leadBtnText;
    };
    window.addEventListener('pageshow', resetLeadBtn);
    window.addEventListener('popstate', resetLeadBtn);

    // Shopify adds hCaptcha to customer forms and then submits them natively (full page load), so the lead is
    // sent with a normal form POST whose return_to brings the shopper back to page 2 with their box (or back to
    // this step with the out-of-area message). Validation runs first, in the capture phase, so Shopify's captcha
    // never fires on bad input.
    window.addEventListener('submit', (e) => {
      if (e.target !== leadForm) return;
      hideErrors();
      leadForm.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
      const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      const nameEl = f('[data-bbb-lead-name]');
      const emailEl = f('[data-bbb-lead-email]');
      const phoneEl = f('[data-bbb-lead-phone]');
      const zipEl = f('[data-bbb-lead-zip]');
      const smsEl = f('[data-bbb-lead-sms]');
      const name = nameEl.value.trim().replace(/\s+/g, ' ');
      const email = emailEl.value.trim();
      const zip = (zipEl.value.match(/^\s*(\d{5})(?:-?\d{4})?\s*$/) || [])[1];
      const digits = phoneEl ? phoneEl.value.replace(/\D/g, '') : '';
      let phone = '';
      if (digits.length === 10) phone = `+1${digits}`;
      else if (digits.length === 11 && digits[0] === '1') phone = `+${digits}`;

      if (!name) { stop(); return fieldError(nameEl, 'Please enter your name.'); }
      if (!zip) { stop(); return fieldError(zipEl, 'Please enter a 5-digit ZIP code.'); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { stop(); return fieldError(emailEl, 'Please enter a valid email address.'); }
      if (smsEl && smsEl.checked && !digits) { stop(); return fieldError(phoneEl, 'Please enter your phone number to get texts, or untick the text box.'); }
      if (digits && !phone) { stop(); return fieldError(phoneEl, smsEl && smsEl.checked ? 'Please enter a 10-digit US phone number.' : 'Please enter a 10-digit US phone number, or leave it blank.'); }

      const ok = zipDeliverable(zip);
      // Already checked with exactly these details: continue without re-submitting (no page reload)
      const saved = leadSaved();
      if (ok && saved && saved.zip === zip && (saved.email || '') === email && (saved.name || '') === name && (saved.phone || '') === digits) {
        stop(); goOn(); return;
      }
      const parts = name.split(' ');
      f('[data-bbb-lead-first]').value = parts.shift();
      f('[data-bbb-lead-last]').value = parts.join(' ');
      const tags = ['lead', `lead-${cfg.lead.source || 'builder'}`, `zip-${zip}`];
      if (smsEl && smsEl.checked && phone) tags.push('sms-optin');
      if (!ok) tags.push('out-of-area');
      f('[data-bbb-lead-tags]').value = tags.join(', ');
      const phoneField = f('[data-bbb-lead-phone-field]');
      if (phoneField) { phoneField.value = phone; phoneField.disabled = !phone; }

      // Where Shopify sends the shopper after saving the lead
      const back = buildUrl();
      back.searchParams.set('step', ok ? '2' : 'lead');
      back.searchParams.set('bbb_lead', ok ? 'ok' : 'out');
      back.searchParams.set('bbb_zip', zip);
      back.hash = '';
      f('[data-bbb-lead-return]').value = back.pathname + back.search;

      if (ok) {
        try { window.localStorage.setItem(LEAD_KEY, JSON.stringify({ zip, name, email, phone: digits, sms: !!(smsEl && smsEl.checked), at: Date.now() })); } catch (err) { /* private mode */ }
      }
      // Shopify reloads the page after saving (sometimes via its spam check); remember the box and the outcome
      // in this tab so the builder can pick up where the shopper was, whatever URL Shopify lands on.
      saveSession();
      try { window.sessionStorage.setItem(LEAD_PENDING, JSON.stringify({ ok, zip, at: Date.now() })); } catch (err) { /* private mode */ }
      document.dispatchEvent(new CustomEvent('bbb:lead', { detail: { deliverable: ok, source: cfg.lead.source } }));
      const btn = f('[data-bbb-lead-submit]');
      btn.setAttribute('aria-busy', 'true');
      const lbl = btn.querySelector('span');
      if (lbl) lbl.textContent = cfg.lead.checking || 'Checking…';
      // No preventDefault: Shopify (and its spam check) submits the form and redirects to return_to.
    }, true);

    // Back from Shopify after the lead was saved
    const landed = (() => {
      const q = new URL(window.location.href).searchParams;
      const status = q.get('bbb_lead');
      if (!status) return null;
      const out = { status, zip: (q.get('bbb_zip') || '').replace(/\D/g, '').slice(0, 5) };
      const clean = new URL(window.location.href);
      ['bbb_lead', 'bbb_zip', 'customer_posted', 'contact_posted', 'form_type'].forEach((k) => clean.searchParams.delete(k));
      clean.hash = '';
      window.history.replaceState(window.history.state, '', clean);
      return out;
    })();
    leadLanded = landed;
    if (landed && landed.status === 'ok') {
      leadDoneThisVisit = true;
      leadPass = true;
      if (!leadSaved()) { try { window.localStorage.setItem(LEAD_KEY, JSON.stringify({ zip: landed.zip, at: Date.now() })); } catch (err) { /* private mode */ } }
      window.setTimeout(() => {
        const note = $('[data-bbb-lead-landed]');
        if (note) {
          $('[data-bbb-lead-landed-text]', note).textContent = fill(cfg.lead.okText, landed.zip);
          note.hidden = false;
        }
        const nav = $('[data-bbb-nav-lead]');
        if (nav) nav.classList.add('is-done');
      }, 0);
    } else if (landed && landed.status === 'out') {
      window.setTimeout(() => {
        showError('lead', fill(cfg.lead.outText, landed.zip));
        const zipEl = f('[data-bbb-lead-zip]');
        if (zipEl) { zipEl.value = landed.zip; zipEl.setAttribute('aria-invalid', 'true'); }
      }, 0);
    }
    root.addEventListener('click', (e) => { if (e.target.closest('[data-bbb-lead-continue]')) goOn(); });
  }

  // ---------- add to cart → checkout ----------
  const newBoxId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 13);
  let busy = false;

  // One box per order: adding a box replaces any box already in the cart (its sleeves line,
  // add-ons and free offer item all share a _box_id), so going back and re-building never
  // leaves two dozens in the cart. Other products in the cart are kept.
  const removeOldBox = async () => {
    const cart = await (await fetch(cfg.cartJsUrl, { headers: { Accept: 'application/json' } })).json();
    const updates = {};
    cart.items.forEach((it) => {
      const isBoxLine = (it.properties && it.properties._box_id) || String(it.variant_id) === String(cfg.variantId);
      if (isBoxLine) updates[it.key] = 0;
    });
    if (Object.keys(updates).length) {
      await fetch(cfg.cartUpdateUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ updates }) });
    }
  };

  const add = async () => {
    if (busy) return;
    if (!isFull() || state.sleeves.some((h) => !byHandle[h] || !byHandle[h].available)) { showStep(1); showError(1, cfg.labels.needMore.replace('[remaining]', cfg.sleeves - state.sleeves.length)); return; }
    if (!state.option) {
      showError(2, cfg.labels.chooseOption);
      const firstOpt = $('[data-bbb-option]');
      if (firstOpt) firstOpt.focus();
      return;
    }

    busy = true;
    const buttons = $$('[data-bbb-add]');
    buttons.forEach((b) => { b.setAttribute('aria-busy', 'true'); b.disabled = true; });
    const label = $('[data-bbb-add-label]');
    const oldLabel = label ? label.textContent : '';
    if (label) label.textContent = cfg.labels.adding;

    const boxId = newBoxId();
    const properties = { _box_id: boxId };
    state.sleeves.forEach((h, i) => (properties[`Sleeve ${i + 1}`] = byHandle[h].name));
    const sp = state.option === 'subscription' && state.planId ? Number(state.planId) : undefined;
    const items = [{ id: cfg.variantId, quantity: 1, properties, ...(sp ? { selling_plan: sp } : {}) }];
    chosenAddons().forEach((a) => {
      const ap = addonPlanId(a);
      items.push({ id: a.variantId, quantity: 1, properties: { _box_id: boxId }, ...(ap ? { selling_plan: Number(ap) } : {}) });
    });
    // Free offer item: always one-time (never on a plan), so it ships once with the first box.
    if (promoOn()) items.push({ id: cfg.promo.variantId, quantity: 1, properties: { _box_id: boxId, _offer: cfg.promo.code } });

    try {
      await removeOldBox();
      const res = await fetch(cfg.cartAddUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.description || body.message || cfg.labels.failed);
      }
      document.dispatchEvent(new CustomEvent('bbb:box-added', { detail: { boxId, sleeves: state.sleeves.slice(), option: state.option } }));
      const dest = cfg.after === 'cart' ? cfg.cartUrl : '/checkout';
      window.location.href = promoOn() ? `/discount/${encodeURIComponent(cfg.promo.code)}?redirect=${encodeURIComponent(dest)}` : dest;
    } catch (err) {
      showError(2, err.message || cfg.labels.failed);
      buttons.forEach((b) => { b.removeAttribute('aria-busy'); b.disabled = false; });
      if (label) label.textContent = oldLabel;
      busy = false;
    }
  };
  $$('[data-bbb-add]').forEach((b) => b.addEventListener('click', add));

  // Back from checkout (page restored from the browser cache): undo "Adding…" and re-enable the button
  const addLabelEl = $('[data-bbb-add-label]');
  const addLabelText = addLabelEl ? addLabelEl.textContent : '';
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      busy = false;
      $$('[data-bbb-add]').forEach((b) => { b.removeAttribute('aria-busy'); b.disabled = false; });
      if (addLabelEl && addLabelEl.textContent === cfg.labels.adding) addLabelEl.textContent = addLabelText;
    }
  });

  // Embedded on a landing page: only show the mobile bottom bar while the builder is on screen.
  if (root.classList.contains('bbb-builder--embedded') && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => root.classList.toggle('is-onscreen', entry.isIntersecting)).observe(root);
  }

  // ---------- init ----------
  const checked = $('[data-bbb-option]:checked');
  if (checked) state.option = checked.value;
  let startStep = readUrl();
  // No box in the URL (e.g. a refresh on step 1): pick up this tab's saved picks instead
  if (isReturnVisit && (!new URL(window.location.href).searchParams.has('s') || preferSession())) { state.sleeves = []; state.addons = new Set(); restoreSession(); startStep = 1; }
  else if (isReturnVisit) mergeSessionChoices();
  // Coming back from Shopify after the delivery check was submitted: restore the box and continue
  let leadPending = null;
  try { leadPending = JSON.parse(window.sessionStorage.getItem(LEAD_PENDING) || 'null'); window.sessionStorage.removeItem(LEAD_PENDING); } catch (err) { leadPending = null; }
  if (leadPending && Date.now() - (leadPending.at || 0) < 30 * 60 * 1000) leadSavedEvent(leadPending.ok, leadPending.zip, leadPending.at);
  else if (leadLanded) leadSavedEvent(leadLanded.status === 'ok', leadLanded.zip, leadLanded.zip);
  if (leadPending && Date.now() - (leadPending.at || 0) < 30 * 60 * 1000) {
    if (!state.sleeves.length || state.sleeves.length < cfg.sleeves) { state.sleeves = []; state.addons = new Set(); restoreSession(); mergeSessionChoices(); }
    if (leadPending.ok) { leadPass = true; startStep = 2; }
    else {
      startStep = 'lead';
      window.setTimeout(() => showError('lead', String((cfg.lead && cfg.lead.outText) || '').replace('[zip]', leadPending.zip || '')), 0);
    }
  } else if (startStep === 2 && leadSaved()) {
    leadPass = true; // refresh on page 2 after the check
  }
  if (!state.option && checked) state.option = checked.value;
  if (state.option === 'subscription' && !state.planId) { const sel = $('[data-bbb-plan]'); state.planId = sel ? sel.value : null; }
  $$('[data-bbb-addon]').forEach((cb) => (cb.checked = state.addons.has(cb.value)));
  renderPage1(); renderPage2();
  showStep(startStep, { push: false, focus: false });
  // Landing pages: after the delivery check, Shopify reloads the page at its very top (the landing hero), so bring the
  // step progress back into place. (On the product page the top is the builder's own photo hero, which is what we want.)
  if (embedded && ((leadPending && Date.now() - (leadPending.at || 0) < 30 * 60 * 1000) || leadLanded)) {
    window.requestAnimationFrame(scrollToSteps);
    window.addEventListener('load', scrollToSteps, { once: true }); // again once images/fonts have settled the layout
  }
  document.dispatchEvent(new CustomEvent('bbb:builder-start'));
})();
