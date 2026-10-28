// Behavior tests for Build Your Box (mock data; not Shopify). Usage: node test-builder.js <dir>
// <dir> needs index.html, noplan.html and promo.html (PROMO=1 render) plus assets/.
// Sections 1–12 run as a returning visitor who already passed the delivery check; 13–14 cover the
// lead step and the free-item offer with a fresh browser.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const DIR = process.argv[2];
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  PASS', msg); } else { fail++; console.log('  FAIL', msg); } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('bbb_lead_v1', '{"zip":"11701"}'); } catch (e) {} });
  const calls = [];
  let cartItems = [];
  let leadMode = 'ok';
  const handler = async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/contact' && route.request().method() === 'POST') {
      calls.push({ path: '/contact', body: route.request().postData() });
      if (leadMode === 'fail') return route.abort();
      return route.fulfill({ status: 302, headers: { location: 'http://test.local/index.html?customer_posted=true' } });
    }
    if (u.pathname.startsWith('/discount/')) { calls.push({ path: u.pathname, redirect: u.searchParams.get('redirect') }); return route.fulfill({ status: 200, contentType: 'text/html', body: `<script>location.replace(${JSON.stringify(u.searchParams.get('redirect'))})</script>` }); }
    if (u.pathname === '/cart/add.js') { calls.push({ path: u.pathname, body: JSON.parse(route.request().postData()) }); await new Promise((r) => setTimeout(r, 300)); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"items":[]}' }); }
    if (u.pathname === '/cart.js') { calls.push({ path: u.pathname }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: cartItems }) }); }
    if (u.pathname === '/cart/update.js') { calls.push({ path: u.pathname, body: JSON.parse(route.request().postData()) }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    if (u.pathname === '/checkout' || u.pathname === '/cart') return route.fulfill({ status: 200, contentType: 'text/html', body: `<h1>${u.pathname}</h1>` });
    const f = path.join(DIR, u.pathname === '/' ? 'index.html' : u.pathname);
    if (fs.existsSync(f)) return route.fulfill({ status: 200, path: f });
    return route.fulfill({ status: 404, body: '' });
  };
  await ctx.route('http://test.local/**', handler);
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  const go = async (q = '') => { await p.goto('http://test.local/index.html' + q); await p.waitForLoadState('networkidle'); };
  const progress = async () => (await p.textContent('[data-bbb-progress]')).trim();
  const inc = (h) => p.click(`[data-bbb-flavor="${h}"] [data-bbb-inc]`);
  const count = async (h) => (await p.textContent(`[data-bbb-flavor="${h}"] [data-bbb-count]`)).trim();
  const step = () => p.getAttribute('[data-bbb-builder]', 'data-step');
  const visible1 = () => p.isVisible('[data-bbb-view="1"]');
  const visible2 = () => p.isVisible('[data-bbb-view="2"]');
  const total = async () => (await p.textContent('[data-bbb-total]')).trim();
  const barNext = '.bbb-bar [data-bbb-next]';
  const barCheckout = '.bbb-bar [data-bbb-add]';

  console.log('1. Page 1 — no pricing');
  await go();
  ok((await step()) === '1' && await visible1() && !(await visible2()), 'opens on page 1');
  const p1text = await p.evaluate(() => document.querySelector('[data-bbb-view="1"]').innerText + ' ' + document.querySelector('.bbb-bar__p1').innerText);
  ok(!/\$\s?\d/.test(p1text), 'no prices anywhere on page 1 (incl. mobile bar)');
  ok(!(await p.isVisible('.bbb-bar__p2')), 'mobile bar shows no total on page 1');
  ok((await p.$$('.bbb-fcard__img')).length === 10, 'every flavor card has a photo');
  ok((await p.getAttribute('[data-bbb-flavor="plain"] .bbb-fcard__img', 'alt')) === 'Plain', 'flavor photo alt = flavor name');
  ok(await p.isDisabled('[data-bbb-flavor="pumpernickel"] [data-bbb-inc]'), 'unavailable flavor cannot be added');
  ok((await p.getAttribute(barNext, 'aria-disabled')) === 'true', 'Next marked disabled while box not full');

  console.log('2. Next blocked until full');
  await p.click(barNext, { force: true });
  ok((await step()) === '1' && (await p.textContent('[data-bbb-error="1"]')).includes('Pick 4 more'), 'Next on empty box stays on page 1 with message');

  console.log('3. Fill 4 sleeves (repeat allowed)');
  await inc('everything'); await inc('everything'); await inc('plain'); await inc('sesame');
  ok((await progress()) === '4 of 4 sleeves selected', 'progress 4 of 4');
  ok((await count('everything')) === '2', 'Everything ×2');
  ok((await p.textContent('[data-bbb-flavor="everything"] [data-bbb-badge]')).trim() === '×2' && await p.isVisible('[data-bbb-flavor="everything"] [data-bbb-badge]'), 'photo badge shows ×2');
  ok(await p.isDisabled('[data-bbb-flavor="poppy"] [data-bbb-inc]'), 'all + disabled when full');
  ok((await p.$$('.bbb-slot.is-filled .bbb-slot__img img')).length === 4, 'all 4 sleeve slots show the flavor photo');
  ok((await p.$$('.bbb-bar__dot.is-filled img')).length === 4, 'mobile bar shows 4 filled photo dots');
  await p.click('[data-bbb-slot="1"]');
  ok((await progress()) === '3 of 4 sleeves selected', 'tapping a sleeve removes it');
  await inc('everything');

  console.log('4. Go to page 2');
  await p.click(barNext);
  ok((await step()) === '2' && await visible2() && !(await visible1()), 'Next shows page 2');
  ok(new URL(p.url()).searchParams.get('step') === '2', 'URL has step=2');
  const sumItems = await p.$$eval('.bbb-boxsum__item', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
  ok(sumItems.length === 3 && sumItems.some((t) => t.includes('Everything') && t.includes('2 sleeves · 6 bagels')), 'box summary groups flavors with sleeve + bagel counts');
  ok((await p.$$('.bbb-boxsum__img img')).length === 3, 'box summary shows flavor photos');
  ok((await total()) === '—', 'no total until an option is chosen');

  console.log('5. Pricing on page 2');
  await p.click('[data-bbb-option][value="subscription"]', { force: true });
  ok((await total()) === '$39.95', 'Subscribe and Save total $39.95');
  ok((await p.textContent('.bbb-option__badge')).trim() === 'Save $6', 'badge reads Save $6');
  ok((await p.textContent('.bbb-option__was')).trim() === '$45.95', 'one-time price shown struck through');
  await p.check('[data-bbb-addon="1001"]', { force: true });
  ok((await total()) === '$49.90', 'with Mini Bagels $49.90');
  ok(await p.isVisible('[data-bbb-addon="1001"] ~ .bbb-addon__text .bbb-addon__every') || await p.isVisible('.bbb-addon__every'), '"every box" shown on add-ons when subscribing');
  const totalsText = await p.textContent('[data-bbb-totals]');
  ok(totalsText.includes('Shipping') && totalsText.includes('Free') && totalsText.includes('(every 4 weeks)') && !totalsText.includes('every every'), 'summary lists box (every 4 weeks), add-on, free shipping');
  const disc = await p.textContent('[data-bbb-disclosure]');
  ok(await p.isVisible('[data-bbb-disclosure]') && disc.includes('Renews automatically every 4 weeks at $49.90'), 'renewal disclosure with live price');
  await p.click('[data-bbb-option][value="once"]', { force: true });
  ok((await total()) === '$55.90' && !(await p.isVisible('[data-bbb-disclosure]')), 'one-time $45.95 + $9.95 = $55.90, no renewal note');
  ok((await p.textContent('.bbb-bar__total')).trim() === '$55.90', 'mobile bar shows total on page 2');

  console.log('6. Back button returns to page 1, forward to page 2');
  await p.goBack(); await p.waitForTimeout(200);
  ok((await step()) === '1' && (await progress()) === '4 of 4 sleeves selected', 'browser Back → page 1 with box intact');
  await p.goForward(); await p.waitForTimeout(200);
  ok((await step()) === '2' && await p.isChecked('[data-bbb-addon="1001"]'), 'browser Forward → page 2 with add-on intact');
  await p.click('[data-bbb-view="2"] .bbb-back');
  await p.waitForTimeout(200);
  ok((await step()) === '1', '"Edit flavors" returns to page 1');
  await p.click(barNext);

  console.log('7. Refresh keeps state; step=2 without a full box falls back to page 1');
  await go('?s=everything,everything,plain,sesame&o=690001&a=1001&step=2');
  ok((await step()) === '2' && await p.isChecked('[data-bbb-option][value="subscription"]') && await p.isChecked('[data-bbb-addon="1001"]'), 'refresh on page 2 restores everything');
  await go('?s=plain,plain&step=2');
  ok((await step()) === '1' && (await progress()) === '2 of 4 sleeves selected', 'incomplete box cannot open page 2');
  await go('?s=pumpernickel,fake,plain,plain,plain,plain,plain&o=99999');
  ok((await progress()) === '4 of 4 sleeves selected' && (await count('pumpernickel')) === '0', 'junk/unavailable flavors dropped, capped at 4');

  console.log('8. Checkout: one request, exact payload, then /checkout');
  calls.length = 0;
  await go('?s=everything,everything,plain,sesame&o=690001&a=1001,1002&step=2');
  await Promise.all([p.click(barCheckout, { force: true }), p.click(barCheckout, { force: true, noWaitAfter: true }).catch(() => {})]);
  await p.waitForURL('**/checkout');
  const adds = calls.filter((c) => c.path === '/cart/add.js');
  ok(adds.length === 1, 'exactly one add-to-cart request (double tap safe)');
  const items = adds[0].body.items;
  ok(items.length === 3, 'box + 2 add-on lines');
  ok(items[0].id === 67907099787506 && items[0].selling_plan === 690001, 'box line: variant + $6-off plan');
  ok(['Sleeve 1', 'Sleeve 2', 'Sleeve 3', 'Sleeve 4'].map((k) => items[0].properties[k]).join('|') === 'Everything|Everything|Plain|Sesame', 'box line: Sleeve 1–4 in order');
  ok(items.slice(1).every((i) => i.properties._box_id === items[0].properties._box_id), 'add-ons linked by _box_id');
  ok(items[1].selling_plan === 690002 && items[2].selling_plan === 690002, 'add-ons on the 4-week no-discount plan (recur)');
  ok(new URL(p.url()).pathname === '/checkout', 'lands on Shopify checkout');

  console.log('9. Option required');
  await go('?s=plain,plain,plain,plain&step=2');
  await p.click(barCheckout, { force: true });
  ok((await p.textContent('[data-bbb-error="2"]')).includes('Choose Subscribe and Save'), 'checkout without an option asks to choose');

  console.log('10. Edit from cart replaces old box');
  calls.length = 0;
  cartItems = [{ key: 'old-box:1', properties: { _box_id: 'abc123', 'Sleeve 1': 'Plain' } }, { key: 'old-addon:1', properties: { _box_id: 'abc123' } }, { key: 'other:1', properties: {} }];
  await go('?s=Everything,Everything,Plain,Sesame&o=once&a=1002&edit=abc123');
  ok((await step()) === '1' && (await count('everything')) === '2', 'cart flavor names map back; opens on page 1 to edit');
  await p.click(barNext);
  ok(await p.isChecked('[data-bbb-option][value="once"]') && await p.isChecked('[data-bbb-addon="1002"]'), 'option and add-on restored on page 2');
  await p.click(barCheckout); await p.waitForURL('**/checkout');
  const upd = calls.find((c) => c.path === '/cart/update.js');
  ok(upd && upd.body.updates['old-box:1'] === 0 && upd.body.updates['old-addon:1'] === 0 && !('other:1' in upd.body.updates), 'old box + its add-on removed, other lines untouched');
  const add2 = calls.find((c) => c.path === '/cart/add.js');
  ok(add2 && !('selling_plan' in add2.body.items[0]) && !('selling_plan' in add2.body.items[1]), 'one-time order sends no selling plan');

  console.log('11. Keyboard & a11y');
  await go();
  await p.focus('[data-bbb-flavor="onion"] [data-bbb-inc]'); await p.keyboard.press('Enter'); await p.keyboard.press('Space');
  ok((await count('onion')) === '2', 'Enter and Space add sleeves');
  ok((await p.getAttribute('[data-bbb-progress]', 'aria-live')) === 'polite', 'progress announced politely');
  ok(await p.$$eval('.bbb-stepper__btn', (els) => els.every((e) => (e.getAttribute('aria-label') || '').length > 5)), 'stepper buttons have accessible names');
  await go('?s=plain,plain,plain,plain'); await p.click(barNext);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.matches('[data-bbb-focus="2"]')), 'focus moves to page 2 heading');
  ok((await p.$$eval('.bbb-stepper__btn, .bbb-slot, .bbb-bar .button, .bbb-back, .bbb-option, .bbb-addon', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.width < 24 || r.height < 24); }).length)) === 0, 'tap targets ≥ 24×24');
  ok(await p.evaluate(() => document.querySelector('[data-bbb-stepnav="2"]').getAttribute('aria-current') === 'step'), 'step nav marks current step');

  console.log('12. No subscription plan');
  await p.goto('http://test.local/noplan.html?s=plain,plain,plain,plain&step=2'); await p.waitForLoadState('networkidle');
  ok(!(await p.$('[data-bbb-option][value="subscription"]')) && await p.isChecked('[data-bbb-option][value="once"]') && (await total()) === '$45.95', 'only one-time, pre-selected, $45.95');
  ok(!(await p.$('[data-bbb-view="lead"]')) && !(await p.$('[data-bbb-stepnav="lead"]')), 'delivery check off: no lead view or step');
  await p.evaluate(() => localStorage.clear());
  await p.goto('http://test.local/noplan.html?s=plain,plain,plain,plain'); await p.waitForLoadState('networkidle');
  await p.click(barNext);
  ok((await step()) === '2', 'delivery check off: Next goes straight to page 2');

  console.log('13. Delivery check (lead step)');
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx2.route('http://test.local/**', handler);
  const q = await ctx2.newPage(); q.on('pageerror', (e) => errors.push(e.message));
  const qstep = () => q.getAttribute('[data-bbb-builder]', 'data-step');
  await q.goto('http://test.local/index.html?s=plain,plain,egg,egg'); await q.waitForLoadState('networkidle');
  await q.click(barNext);
  ok((await qstep()) === 'lead' && await q.isVisible('[data-bbb-view="lead"]'), 'Next goes to the delivery check first');
  ok(new URL(q.url()).searchParams.get('step') === 'lead', 'URL has step=lead');
  ok(!(await q.isVisible('.bbb-bar')), 'mobile bar hidden on the delivery check');
  ok(!/\$\s?\d/.test(await q.textContent('[data-bbb-view="lead"]')), 'no prices on the delivery check');
  ok(await q.evaluate(() => document.querySelector('[data-bbb-stepnav="1"]').classList.contains('is-done') && document.querySelector('[data-bbb-stepnav="lead"]').getAttribute('aria-current') === 'step'), 'step nav: 1 done, delivery check current');
  await q.goto('http://test.local/index.html?s=plain,plain,egg,egg&o=690001&step=2'); await q.waitForLoadState('networkidle');
  ok((await qstep()) === 'lead', 'deep link to step=2 still requires the delivery check');
  await q.goto('http://test.local/index.html?s=plain,plain,egg,egg&o=690001'); await q.waitForLoadState('networkidle');
  await q.click(barNext);
  calls.length = 0;
  await q.click('[data-bbb-lead-submit]');
  ok((await q.textContent('[data-bbb-error="lead"]')).includes('name') && calls.length === 0, 'empty form: asks for name, nothing sent');
  await q.fill('[data-bbb-lead-name]', 'Pat  Q  Bagel'); await q.fill('[data-bbb-lead-zip]', '99501'); await q.fill('[data-bbb-lead-email]', 'pat@example.com');
  await q.click('[data-bbb-lead-submit]'); await q.waitForTimeout(300);
  ok((await q.textContent('[data-bbb-error="lead"]')).includes("can't ship to 99501") && (await qstep()) === 'lead', 'Alaska ZIP: out-of-area message, stays put');
  ok(calls.some((c) => c.path === '/contact' && decodeURIComponent(c.body).includes('out-of-area')), 'out-of-area lead still saved with out-of-area tag');
  await q.fill('[data-bbb-lead-phone]', '555-12');
  await q.fill('[data-bbb-lead-zip]', '11701');
  await q.click('[data-bbb-lead-submit]');
  ok((await q.textContent('[data-bbb-error="lead"]')).includes('10-digit'), 'bad phone number rejected');
  calls.length = 0;
  await q.fill('[data-bbb-lead-phone]', '(631) 555-0199');
  await q.check('[data-bbb-lead-sms]');
  await q.click('[data-bbb-lead-submit]');
  await q.waitForSelector('[data-bbb-lead-ok]:not([hidden])');
  ok((await q.textContent('[data-bbb-lead-ok-text]')).includes('we deliver to 11701'), 'green check: "we deliver to 11701"');
  const post = new URLSearchParams(calls.find((c) => c.path === '/contact').body);
  ok(post.get('form_type') === 'customer' && post.get('contact[email]') === 'pat@example.com', 'posts Shopify customer form with email');
  ok(post.get('contact[first_name]') === 'Pat' && post.get('contact[last_name]') === 'Q Bagel' && post.get('contact[phone]') === '+16315550199', 'name split, phone in E.164');
  ok(post.get('contact[tags]') === 'lead, lead-builder, zip-11701, sms-optin', 'tags: lead, source, zip, sms-optin');
  await q.waitForFunction(() => document.querySelector('[data-bbb-builder]').dataset.step === '2', null, { timeout: 4000 });
  ok(await q.isVisible('[data-bbb-view="2"]') && await q.isChecked('[data-bbb-option][value="subscription"]'), 'auto-continues to Subscribe & Save with choices kept');
  await q.goBack(); await q.waitForTimeout(200);
  ok((await qstep()) === '1', 'Back from page 2 skips the finished delivery check');
  await q.click(barNext);
  ok((await qstep()) === '2', 'returning visitor goes straight to page 2');
  leadMode = 'fail';
  const ctx3 = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx3.route('http://test.local/**', handler);
  const q2 = await ctx3.newPage(); q2.on('pageerror', (e) => errors.push(e.message));
  await q2.goto('http://test.local/index.html?s=plain,plain,egg,egg'); await q2.waitForLoadState('networkidle');
  await q2.click(barNext);
  await q2.fill('[data-bbb-lead-name]', 'Sam'); await q2.fill('[data-bbb-lead-zip]', '10001'); await q2.fill('[data-bbb-lead-email]', 'sam@example.com');
  await q2.click('[data-bbb-lead-submit]');
  await q2.waitForFunction(() => document.querySelector('[data-bbb-builder]').dataset.step === '2', null, { timeout: 4000 });
  ok(true, 'if saving the lead fails, the shopper still continues');
  leadMode = 'ok';

  console.log('14. Free-minis landing (promo mode)');
  const r = await ctx.newPage(); r.on('pageerror', (e) => errors.push(e.message));
  calls.length = 0;
  await r.goto('http://test.local/promo.html?s=plain,everything,egg,onion&o=690001&a=1002&step=2'); await r.waitForLoadState('networkidle');
  ok(await r.isVisible('.bbb-promo--card') && /Free/.test(await r.textContent('.bbb-promo--card')), 'page 2 shows the free minis card');
  ok(!(await r.$('[data-bbb-addon="1001"]')), 'minis not offered again as a paid add-on');
  ok((await r.textContent('[data-bbb-totals]')).includes('Mini Bagels (6)Free'), 'order summary lists minis as Free');
  ok((await r.textContent('[data-bbb-total]')).trim() === '$49.90', 'total = $39.95 box + $9.95 chips (minis free)');
  ok(await r.evaluate(() => !document.querySelector('h1')), 'builder heading is not an H1 on the landing page');
  await r.click(barCheckout); await r.waitForURL('**/checkout');
  const padd = calls.find((c) => c.path === '/cart/add.js').body.items;
  const free = padd.find((i) => i.id === 1001);
  ok(free && !('selling_plan' in free) && free.properties._offer === 'FREEMINIS' && free.properties._box_id === padd[0].properties._box_id, 'free minis line: one-time, tagged _offer, in the box');
  ok(calls.some((c) => c.path === '/discount/FREEMINIS' && c.redirect === '/checkout'), 'code applied via /discount/FREEMINIS → /checkout');

  ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join('; ') : ''));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
