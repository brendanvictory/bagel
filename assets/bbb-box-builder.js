/* Bad Boy Bagel Co. — Build Your Box (ADR-002 Option C), two pages
   Page 1: pick exactly N sleeves (default 4), repeats allowed, no pricing shown.
   Page 2: add-ons, one-time vs subscription, pricing, checkout.
   State mirrors to the URL (?s=…&o=once|<planId>&a=…&step=2) so refresh and Back work.
   Edit from cart: ?edit=<box_id> pre-fills and replaces the old box + its add-ons.
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
      $('[data-bbb-slot-label]', slot).textContent = f ? f.name : 'Empty';
      const img = $('.bbb-slot__img', slot);
      img.innerHTML = '';
      const t = thumb(f);
      if (t) img.appendChild(t);
      slot.disabled = !f;
      slot.classList.toggle('is-filled', !!f);
      slot.setAttribute('aria-label', f ? `Sleeve ${i + 1}: ${f.name}. Remove` : `Sleeve ${i + 1}: empty`);
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
      row('Shipping', 'Free');
    }
    const t = state.option ? formatMoney(total()) : '—';
    $('[data-bbb-total]').textContent = t;
    const bt = $('[data-bbb-bar-total]');
    if (bt) bt.textContent = state.option ? t : '';

    const disc = $('[data-bbb-disclosure]');
    if (disc) {
      const p = plan();
      disc.hidden = !(state.option === 'subscription' && p);
      if (p) {
        $$('[data-bbb-disc-price]', disc).forEach((e) => (e.textContent = formatMoney(total())));
        $$('[data-bbb-disc-freq]', disc).forEach((e) => (e.textContent = freqText()));
      }
    }
    $$('[data-bbb-add]').forEach((b) => b.setAttribute('aria-disabled', String(!(isFull() && state.option))));
  };

  const render = () => { renderPage1(); renderPage2(); syncUrl(); };

  // ---------- pages ----------
  const showStep = (step, { push = true, focus = true } = {}) => {
    if (step === 2 && !isFull()) step = 1;
    state.step = step;
    root.dataset.step = String(step);
    $$('[data-bbb-view]').forEach((v) => (v.hidden = v.dataset.bbbView !== String(step)));
    $$('[data-bbb-stepnav]').forEach((li) => {
      if (li.dataset.bbbStepnav === String(step)) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      li.classList.toggle('is-done', Number(li.dataset.bbbStepnav) < step);
    });
    hideErrors();
    syncUrl(push);
    if (focus) {
      window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
      const h = $(`[data-bbb-focus="${step}"]`);
      if (h) h.focus({ preventScroll: true });
    }
    document.dispatchEvent(new CustomEvent(step === 2 ? 'bbb:builder-complete' : 'bbb:builder-step1', { detail: { sleeves: state.sleeves.slice() } }));
  };

  // ---------- URL state ----------
  const buildUrl = () => {
    const url = new URL(window.location.href);
    const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set('s', state.sleeves.join(','));
    set('o', state.option === 'subscription' ? String(state.planId || '') : state.option || '');
    set('a', Array.from(state.addons).join(','));
    set('edit', state.editBoxId);
    set('step', state.step === 2 ? '2' : '');
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
    return p.get('step') === '2' ? 2 : 1;
  };

  window.addEventListener('popstate', () => {
    const step = readUrl();
    $$('[data-bbb-addon]').forEach((cb) => (cb.checked = state.addons.has(cb.value)));
    renderPage1(); renderPage2();
    showStep(step, { push: false });
  });

  // ---------- errors ----------
  const showError = (step, msg) => {
    const el = $(`[data-bbb-error="${step}"]`);
    if (el) { el.textContent = msg; el.hidden = false; }
  };
  function hideErrors() { $$('[data-bbb-error]').forEach((el) => { el.hidden = true; el.textContent = ''; }); }

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
    if (slot && !slot.disabled) {
      state.sleeves.splice(Number(slot.dataset.bbbSlot), 1);
      render();
      const nextFocus = $$('[data-bbb-slot]').find((s) => !s.disabled) || $('[data-bbb-inc]:not([disabled])');
      if (nextFocus) nextFocus.focus();
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
      if (window.history.state && window.history.state.bbbStep === 2) window.history.back();
      else showStep(1);
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

  // ---------- add to cart → checkout ----------
  const newBoxId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 13);
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
      window.location.href = cfg.after === 'cart' ? cfg.cartUrl : '/checkout';
    } catch (err) {
      showError(2, err.message || cfg.labels.failed);
      buttons.forEach((b) => { b.removeAttribute('aria-busy'); b.disabled = false; });
      if (label) label.textContent = oldLabel;
      busy = false;
    }
  };
  $$('[data-bbb-add]').forEach((b) => b.addEventListener('click', add));

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      busy = false;
      $$('[data-bbb-add]').forEach((b) => { b.removeAttribute('aria-busy'); b.disabled = false; });
    }
  });

  // ---------- init ----------
  const checked = $('[data-bbb-option]:checked');
  if (checked) state.option = checked.value;
  const startStep = readUrl();
  if (!state.option && checked) state.option = checked.value;
  if (state.option === 'subscription' && !state.planId) { const sel = $('[data-bbb-plan]'); state.planId = sel ? sel.value : null; }
  $$('[data-bbb-addon]').forEach((cb) => (cb.checked = state.addons.has(cb.value)));
  renderPage1(); renderPage2();
  showStep(startStep, { push: false, focus: false });
  document.dispatchEvent(new CustomEvent('bbb:builder-start'));
})();
