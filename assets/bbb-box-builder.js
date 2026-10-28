/* Bad Boy Bagel Co. — Build Your Box (ADR-002 Option C)
   - Sleeve picker: exactly N sleeves (default 4), repeats allowed, unavailable flavors blocked.
   - State mirrors to the URL (?s=handle,handle,…&o=once|<planId>&a=<variantIds>) so refresh/back keep it.
   - Edit from cart: ?edit=<box_id> pre-fills and replaces the old box + its add-ons.
   - Add to cart: one box line (properties "Sleeve 1..N" + "_box_id") + add-on lines (same "_box_id", same plan).
   No secrets, no prices computed for checkout — Shopify prices every line itself. */
(() => {
  const root = document.querySelector('[data-bbb-builder]');
  if (!root) return;
  const cfgEl = root.querySelector('[data-bbb-config]');
  if (!cfgEl) return;
  const cfg = JSON.parse(cfgEl.textContent);

  const $ = (sel, el = root) => el.querySelector(sel);
  const $$ = (sel, el = root) => Array.from(el.querySelectorAll(sel));

  const flavorEls = $$('[data-bbb-flavor]');
  const flavors = flavorEls.map((el) => ({
    el,
    handle: el.dataset.bbbFlavor,
    name: el.dataset.name,
    available: !el.hasAttribute('data-unavailable'),
  }));
  const byHandle = Object.fromEntries(flavors.map((f) => [f.handle, f]));
  const byName = Object.fromEntries(flavors.map((f) => [f.name.toLowerCase(), f]));

  const state = { sleeves: [], option: null, planId: null, addons: new Set(), editBoxId: null };

  // ---------- money ----------
  const formatMoney = (cents) => {
    const amount = (cents / 100).toFixed(2);
    const noDec = Math.round(cents / 100).toString();
    const withComma = amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (cfg.moneyFormat || '${{amount}}')
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, noDec)
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amount.replace('.', ','))
      .replace(/\{\{\s*amount\s*\}\}/, withComma);
  };

  // ---------- derived ----------
  const plan = () => cfg.plans.find((p) => String(p.id) === String(state.planId)) || null;
  const boxPrice = () => (state.option === 'subscription' && plan() ? plan().price : cfg.oncePrice);
  // Add-ons recur on the box's plan if they share it; otherwise on their own plan with the same name
  // (e.g., a separate "Delivered every 4 weeks" plan with no discount). No match = one-time add-on.
  const addonPlanId = (a) => {
    if (state.option !== 'subscription' || !state.planId) return null;
    if (a.plans[String(state.planId)] != null) return String(state.planId);
    const p = plan();
    if (!p) return null;
    const norm = (x) => String(x || '').trim().toLowerCase();
    // 1) same delivery frequency option (e.g., "Deliver every 4 weeks"), 2) same plan name.
    const byKey = p.key && Object.entries(a.planKeys || {}).find(([, k]) => norm(k) === norm(p.key));
    const byName = Object.entries(a.planNames || {}).find(([, n]) => norm(n) === norm(p.name));
    const match = byKey || byName;
    return match ? match[0] : null;
  };
  const addonPrice = (a) => {
    const id = addonPlanId(a);
    return id && a.plans[id] != null ? a.plans[id] : a.price;
  };
  const total = () => boxPrice() + cfg.addons.filter((a) => state.addons.has(String(a.variantId))).reduce((s, a) => s + addonPrice(a), 0);
  const isFull = () => state.sleeves.length === cfg.sleeves;

  // ---------- render ----------
  const render = () => {
    const counts = {};
    state.sleeves.forEach((h) => (counts[h] = (counts[h] || 0) + 1));

    flavors.forEach((f) => {
      const n = counts[f.handle] || 0;
      $('[data-bbb-count]', f.el).textContent = n;
      $('[data-bbb-dec]', f.el).disabled = n === 0;
      $('[data-bbb-inc]', f.el).disabled = !f.available || isFull();
      f.el.classList.toggle('is-picked', n > 0);
    });

    $$('[data-bbb-slot]').forEach((slot, i) => {
      const h = state.sleeves[i];
      const label = $('[data-bbb-slot-label]', slot);
      label.textContent = h ? byHandle[h].name : 'Empty';
      slot.disabled = !h;
      slot.classList.toggle('is-filled', !!h);
      slot.setAttribute('aria-label', h ? `Sleeve ${i + 1}: ${byHandle[h].name}. Remove` : `Sleeve ${i + 1}: empty`);
    });

    const n = state.sleeves.length;
    $('[data-bbb-progress]').textContent = cfg.labels.progress.replace('[n]', n).replace('[total]', cfg.sleeves);
    root.style.setProperty('--bbb-fill', `${(n / cfg.sleeves) * 100}%`);

    // summary
    const list = $('[data-bbb-summary-list]');
    list.innerHTML = '';
    if (!n) {
      const li = document.createElement('li');
      li.className = 'bbb-summary__empty';
      li.textContent = `Pick ${cfg.sleeves} sleeves to fill your box.`;
      list.appendChild(li);
    } else {
      Object.entries(counts).forEach(([h, c]) => {
        const li = document.createElement('li');
        li.textContent = `${byHandle[h].name} × ${c} sleeve${c > 1 ? 's' : ''}`;
        list.appendChild(li);
      });
    }
    cfg.addons.filter((a) => state.addons.has(String(a.variantId))).forEach((a) => {
      const li = document.createElement('li');
      li.className = 'bbb-summary__addon';
      li.textContent = `+ ${a.title}`;
      list.appendChild(li);
    });

    const t = formatMoney(total());
    $('[data-bbb-total]').textContent = t;
    const barTotal = $('[data-bbb-bar-total]');
    if (barTotal) barTotal.textContent = t;
    const barCount = $('[data-bbb-bar-count]');
    if (barCount) barCount.textContent = `${n} / ${cfg.sleeves} sleeves`;

    // options
    $$('[data-bbb-option]').forEach((r) => (r.checked = r.value === state.option));
    const subCard = $('[data-bbb-sub-card]');
    if (subCard) subCard.classList.toggle('is-selected', state.option === 'subscription');
    $$('[data-bbb-every]').forEach((e) => (e.hidden = state.option !== 'subscription'));

    const disc = $('[data-bbb-disclosure]');
    if (disc) {
      const p = plan();
      disc.hidden = !(state.option === 'subscription' && p);
      if (p) {
        $$('[data-bbb-disc-price]', disc).forEach((e) => (e.textContent = formatMoney(total())));
        const freq = (p.key || p.name).toLowerCase().split(',')[0].replace(/^(deliver(ed|y)?|ships?|renews?)\s+/, '').trim();
        $$('[data-bbb-disc-freq]', disc).forEach((e) => (e.textContent = freq));
      }
    }

    $$('[data-bbb-add]').forEach((b) => b.setAttribute('aria-disabled', String(!(isFull() && state.option))));
    syncUrl();
  };

  // ---------- URL state ----------
  const syncUrl = () => {
    const url = new URL(window.location.href);
    const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set('s', state.sleeves.join(','));
    set('o', state.option === 'subscription' ? String(state.planId || '') : state.option || '');
    set('a', Array.from(state.addons).join(','));
    if (state.editBoxId) set('edit', state.editBoxId);
    window.history.replaceState(window.history.state, '', url);
  };

  const readUrl = () => {
    const p = new URL(window.location.href).searchParams;
    const s = (p.get('s') || '').split(',').map((x) => x.trim()).filter(Boolean);
    s.forEach((token) => {
      const f = byHandle[token] || byName[decodeURIComponent(token).toLowerCase()];
      if (f && f.available && state.sleeves.length < cfg.sleeves) state.sleeves.push(f.handle);
    });
    const o = p.get('o');
    if (o === 'once') state.option = 'once';
    else if (o && cfg.plans.some((pl) => String(pl.id) === o)) { state.option = 'subscription'; state.planId = o; }
    (p.get('a') || '').split(',').filter(Boolean).forEach((id) => {
      if (cfg.addons.some((a) => String(a.variantId) === id)) state.addons.add(id);
    });
    state.editBoxId = p.get('edit') || null;
  };

  // ---------- events ----------
  root.addEventListener('click', (e) => {
    const inc = e.target.closest('[data-bbb-inc]');
    const dec = e.target.closest('[data-bbb-dec]');
    const slot = e.target.closest('[data-bbb-slot]');
    if (inc || dec) {
      const f = byHandle[e.target.closest('[data-bbb-flavor]').dataset.bbbFlavor];
      if (inc && f.available && !isFull()) state.sleeves.push(f.handle);
      if (dec) {
        const i = state.sleeves.lastIndexOf(f.handle);
        if (i > -1) state.sleeves.splice(i, 1);
      }
      hideError();
      render();
      return;
    }
    if (slot && !slot.disabled) {
      state.sleeves.splice(Number(slot.dataset.bbbSlot), 1);
      render();
      const next = $$('[data-bbb-slot]').find((s) => !s.disabled) || $('[data-bbb-inc]:not([disabled])');
      if (next) next.focus();
    }
  });

  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-bbb-option]')) {
      state.option = e.target.value;
      if (state.option === 'subscription' && !state.planId) {
        const sel = $('[data-bbb-plan]');
        state.planId = sel ? sel.value : null;
      }
      hideError();
    } else if (e.target.matches('select[data-bbb-plan]')) {
      state.planId = e.target.value;
      state.option = 'subscription';
    } else if (e.target.matches('[data-bbb-addon]')) {
      e.target.checked ? state.addons.add(e.target.value) : state.addons.delete(e.target.value);
    }
    render();
  });

  // ---------- add to cart ----------
  const errEl = $('[data-bbb-error]');
  const showError = (msg) => { errEl.textContent = msg; errEl.hidden = false; };
  function hideError() { errEl.hidden = true; errEl.textContent = ''; }

  const newBoxId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 13);
  let busy = false;

  const removeOldBox = async (boxId) => {
    const cart = await (await fetch(cfg.cartJsUrl, { headers: { Accept: 'application/json' } })).json();
    const updates = {};
    cart.items.forEach((it) => { if (it.properties && it.properties._box_id === boxId) updates[it.key] = 0; });
    if (Object.keys(updates).length) {
      await fetch(cfg.cartUpdateUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ updates }) });
    }
  };

  const add = async () => {
    if (busy) return;
    if (!isFull()) {
      const remaining = cfg.sleeves - state.sleeves.length;
      showError(cfg.labels.needMore.replace('[remaining]', remaining));
      const firstAdd = $('[data-bbb-inc]:not([disabled])');
      if (firstAdd) firstAdd.focus();
      return;
    }
    if (!state.option) {
      showError(cfg.labels.chooseOption);
      const firstOpt = $('[data-bbb-option]');
      if (firstOpt) firstOpt.focus();
      return;
    }
    // Re-validate against the rendered flavor list right before sending.
    if (state.sleeves.length !== cfg.sleeves || state.sleeves.some((h) => !byHandle[h] || !byHandle[h].available)) {
      showError(cfg.labels.needMore.replace('[remaining]', cfg.sleeves));
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
    cfg.addons.filter((a) => state.addons.has(String(a.variantId))).forEach((a) => {
      const ap = addonPlanId(a);
      const addonPlan = ap ? Number(ap) : undefined;
      items.push({ id: a.variantId, quantity: 1, properties: { _box_id: boxId }, ...(addonPlan ? { selling_plan: addonPlan } : {}) });
    });

    try {
      if (state.editBoxId) await removeOldBox(state.editBoxId);
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
      window.location.href = cfg.cartUrl;
    } catch (err) {
      showError(err.message || cfg.labels.failed);
      buttons.forEach((b) => { b.removeAttribute('aria-busy'); b.disabled = false; });
      if (label) label.textContent = oldLabel;
      busy = false;
    }
  };
  $$('[data-bbb-add]').forEach((b) => b.addEventListener('click', add));

  // Restore when the page comes back from the bfcache (e.g., back button from cart).
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      busy = false;
      $$('[data-bbb-add]').forEach((b) => { b.removeAttribute('aria-busy'); b.disabled = false; });
    }
  });

  // ---------- init ----------
  const checked = $('[data-bbb-option]:checked');
  if (checked) state.option = checked.value;
  if (state.option === 'subscription') { const sel = $('[data-bbb-plan]'); state.planId = sel ? sel.value : null; }
  readUrl();
  if (state.option === 'subscription' && !state.planId) { const sel = $('[data-bbb-plan]'); state.planId = sel ? sel.value : null; }
  $$('[data-bbb-addon]').forEach((cb) => (cb.checked = state.addons.has(cb.value)));
  render();
  document.dispatchEvent(new CustomEvent('bbb:builder-start'));
})();
