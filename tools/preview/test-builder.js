const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const DIR = process.argv[2];
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  PASS', msg); } else { fail++; console.log('  FAIL', msg); } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const calls = [];
  let cartItems = [];
  await ctx.route('http://test.local/**', async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/cart/add.js') { calls.push({ path: u.pathname, body: JSON.parse(route.request().postData()) }); await new Promise((r) => setTimeout(r, 300)); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"items":[]}' }); }
    if (u.pathname === '/cart.js') { calls.push({ path: u.pathname }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: cartItems }) }); }
    if (u.pathname === '/cart/update.js') { calls.push({ path: u.pathname, body: JSON.parse(route.request().postData()) }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    if (u.pathname === '/cart') return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>cart</h1>' });
    const f = path.join(DIR, u.pathname === '/' ? 'index.html' : u.pathname);
    if (fs.existsSync(f)) return route.fulfill({ status: 200, path: f });
    return route.fulfill({ status: 404, body: '' });
  });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  const go = async (q = '') => { await p.goto('http://test.local/index.html' + q); await p.waitForLoadState('networkidle'); };
  const progress = () => p.textContent('[data-bbb-progress]');
  const inc = (h) => p.click(`[data-bbb-flavor="${h}"] [data-bbb-inc]`);
  const count = (h) => p.textContent(`[data-bbb-flavor="${h}"] [data-bbb-count]`);
  const total = () => p.textContent('[data-bbb-total]');

  console.log('1. Initial state'); await go();
  ok((await progress()).trim() === '0 of 4 sleeves selected', 'progress starts at 0 of 4');
  ok(await p.isDisabled('[data-bbb-flavor="pumpernickel"] [data-bbb-inc]'), 'unavailable flavor cannot be added');
  ok((await p.getAttribute('.bbb-summary__add', 'aria-disabled')) === 'true', 'add button marked aria-disabled');
  ok((await total()).trim() === '$45.95', 'one-time price shown before choosing ($45.95)');
  ok(!(await p.isChecked('[data-bbb-option][value="subscription"]')) && !(await p.isChecked('[data-bbb-option][value="once"]')), 'no purchase option pre-selected');

  console.log('2. Validation: empty box'); await p.click('.bbb-summary__add', { force: true });
  ok((await p.textContent('[data-bbb-error]')).includes('Pick 4 more'), 'error asks for 4 more sleeves');
  ok(calls.filter((c) => c.path === '/cart/add.js').length === 0, 'nothing sent to cart');

  console.log('3. Fill 4 sleeves with a repeat'); await inc('everything'); await inc('everything'); await inc('plain'); await inc('sesame');
  ok((await progress()).trim() === '4 of 4 sleeves selected', 'progress 4 of 4');
  ok((await count('everything')).trim() === '2', 'Everything ×2');
  ok(await p.isDisabled('[data-bbb-flavor="poppy"] [data-bbb-inc]'), 'all + buttons disabled when full');
  const slotLabels = await p.$$eval('[data-bbb-slot-label]', (els) => els.map((e) => e.textContent));
  ok(JSON.stringify(slotLabels) === JSON.stringify(['Everything', 'Everything', 'Plain', 'Sesame']), 'slots show the 4 flavors');
  ok(new Set(slotLabels).size <= 4, 'max 4 flavors');

  console.log('4. Remove via slot, re-add'); await p.click('[data-bbb-slot="1"]');
  ok((await progress()).trim() === '3 of 4 sleeves selected', 'tapping a filled slot removes it');
  await inc('everything');

  console.log('5. Validation: no purchase option'); await p.click('.bbb-summary__add', { force: true });
  ok((await p.textContent('[data-bbb-error]')).includes('Choose one-time'), 'error asks to choose an option');

  console.log('6. Subscribe + add-on pricing'); await p.check('[data-bbb-option][value="subscription"]');
  ok((await total()).trim() === '$39.95', 'subscription total $39.95');
  await p.check('[data-bbb-addon="1001"]');
  ok((await total()).trim() === '$49.90', 'with mini bagels $49.90');
  ok(await p.isVisible('.bbb-addon__every'), '"every box" shown on add-ons when subscribing');
  const disc = await p.textContent('[data-bbb-disclosure]');
  ok(disc.includes('$49.90') && disc.includes('Renews automatically every 4 weeks'), 'renewal disclosure shows live price and frequency');
  ok(await p.isVisible('[data-bbb-disclosure]'), 'disclosure visible next to the button');
  ok((await p.textContent('.bbb-option__badge')).trim().toLowerCase() === '13% off', 'badge shows 13% off (45.95 → 39.95)');
  { const q = new URL(p.url()).searchParams; console.log('    url:', p.url().split('?')[1]);
    ok((q.get('s') || '').split(',').sort().join(',') === 'everything,everything,plain,sesame' && q.get('o') === '690001' && q.get('a') === '1001', 'state mirrored to URL (sleeves, plan, add-on)'); }

  console.log('7. Double-click sends exactly one add'); await Promise.all([p.click('.bbb-summary__add', { force: true }), p.click('.bbb-summary__add', { force: true }).catch(() => {})]);
  await p.waitForURL('**/cart');
  const adds = calls.filter((c) => c.path === '/cart/add.js');
  ok(adds.length === 1, 'exactly one /cart/add.js request');
  const items = adds[0].body.items;
  ok(items.length === 2, 'box + 1 add-on line');
  ok(items[0].id === 67907099787506 && items[0].selling_plan === 690001, 'box line has variant + selling plan');
  ok(['Sleeve 1', 'Sleeve 2', 'Sleeve 3', 'Sleeve 4'].map((k) => items[0].properties[k]).join('|') === 'Everything|Plain|Sesame|Everything' || ['Sleeve 1','Sleeve 2','Sleeve 3','Sleeve 4'].every((k) => items[0].properties[k]), 'box line has Sleeve 1–4 properties');
  ok(!!items[0].properties._box_id && items[1].properties._box_id === items[0].properties._box_id, 'add-on linked by the same _box_id');
  ok(items[1].id === 1001 && items[1].selling_plan === 690001, 'add-on subscribed on the same plan (recurs)');
  ok(Object.keys(items[0].properties).filter((k) => k.startsWith('Sleeve')).length === 4, 'exactly 4 sleeve properties');

  console.log('8. Refresh restores state');
  await go('?s=everything,everything,plain,sesame&o=690001&a=1001');
  ok((await progress()).trim() === '4 of 4 sleeves selected' && await p.isChecked('[data-bbb-option][value="subscription"]') && await p.isChecked('[data-bbb-addon="1001"]'), 'sleeves, plan and add-on restored from URL');

  console.log('9. Bad URL input is ignored');
  await go('?s=pumpernickel,fake,plain,plain,plain,plain,plain&o=99999');
  ok((await progress()).trim() === '4 of 4 sleeves selected' && (await count('pumpernickel')).trim() === '0', 'unavailable/unknown flavors dropped, capped at 4');
  ok(!(await p.isChecked('[data-bbb-option][value="subscription"]')), 'unknown plan id ignored');

  console.log('10. Edit from cart replaces old box');
  calls.length = 0;
  cartItems = [{ key: 'old-box:1', properties: { _box_id: 'abc123', 'Sleeve 1': 'Plain' } }, { key: 'old-addon:1', properties: { _box_id: 'abc123' } }, { key: 'other:1', properties: {} }];
  await go('?s=Everything,Everything,Plain,Sesame&o=once&a=1002&edit=abc123');
  ok((await count('everything')).trim() === '2', 'cart flavor names map back to flavors');
  ok(await p.isChecked('[data-bbb-option][value="once"]') && await p.isChecked('[data-bbb-addon="1002"]'), 'one-time and chips restored');
  await p.click('.bbb-summary__add', { force: true }); await p.waitForURL('**/cart');
  const upd = calls.find((c) => c.path === '/cart/update.js');
  ok(upd && upd.body.updates['old-box:1'] === 0 && upd.body.updates['old-addon:1'] === 0 && !('other:1' in upd.body.updates), 'old box and its add-on removed, other lines untouched');
  const add2 = calls.find((c) => c.path === '/cart/add.js');
  ok(add2 && !('selling_plan' in add2.body.items[0]) && !('selling_plan' in add2.body.items[1]), 'one-time order sends no selling plan');
  ok(calls.findIndex((c) => c.path === '/cart/update.js') < calls.findIndex((c) => c.path === '/cart/add.js'), 'removal happens before re-add');

  console.log('11. Keyboard');
  await go();
  await p.focus('[data-bbb-flavor="onion"] [data-bbb-inc]'); await p.keyboard.press('Enter'); await p.keyboard.press('Space');
  ok((await count('onion')).trim() === '2', 'Enter and Space increment via keyboard');
  const live = await p.getAttribute('[data-bbb-progress]', 'aria-live');
  ok(live === 'polite', 'progress announced politely to screen readers');
  const names = await p.$$eval('.bbb-stepper__btn', (els) => els.every((e) => (e.getAttribute('aria-label') || '').length > 5));
  ok(names, 'every stepper button has an accessible name');
  const tiny = await p.$$eval('.bbb-stepper__btn, .bbb-slot, .bbb-summary__add', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.width < 24 || r.height < 24); }).length);
  ok(tiny === 0, 'tap targets at least 24×24 px');

  console.log('11b. Add-on on its own same-named plan');
  calls.length = 0; cartItems = [];
  await go('?s=plain,plain,plain,plain&o=690001&a=1002');
  ok((await total()).trim() === '$49.90', 'chips priced from their own plan ($39.95 + $9.95)');
  await p.click('.bbb-summary__add', { force: true }); await p.waitForURL('**/cart');
  { const it = calls.find((c) => c.path === '/cart/add.js').body.items;
    ok(it[0].selling_plan === 690001 && it[1].id === 1002 && it[1].selling_plan === 690002, 'chips subscribed on their matching every-4-weeks plan'); }
  console.log('12. No plan on product');
  await p.goto('http://test.local/noplan.html'); await p.waitForLoadState('networkidle');
  ok(!(await p.$('[data-bbb-option][value="subscription"]')) && await p.isChecked('[data-bbb-option][value="once"]'), 'only one-time option, pre-selected');

  ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join('; ') : ''));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
