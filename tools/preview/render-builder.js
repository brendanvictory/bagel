// Renders bbb-box-builder with mock Shopify data for behavior tests (approximation, not Shopify).
const fs = require('fs'), path = require('path');
const { Liquid, Tag } = require('liquidjs');
const THEME = process.argv[2], OUT = process.argv[3], WITH_PLAN = process.argv[4] !== 'noplan';
const engine = new Liquid({ jsTruthy: false });
class Skip extends Tag { constructor(t, r, l) { super(t, r, l); while (r.length) { const x = r.shift(); if (x.name === 'end' + t.name) return; } } *render() { return ''; } }
engine.registerTag('schema', Skip);
// {% form 'customer', id: 'X', class: 'y' %}…{% endform %} → <form action="/contact#X"> with Shopify's hidden inputs
engine.registerTag('form', class extends Tag {
  constructor(t, r, l) { super(t, r, l); this.args = t.args; this.tpl = []; const st = l.parser.parseStream(r).on('tag:endform', () => st.stop()).on('template', (x) => this.tpl.push(x)).on('end', () => { throw new Error('form not closed'); }); st.start(); }
  *render(ctx, emitter) {
    const id = (this.args.match(/id:\s*'([^']+)'/) || [])[1] || '';
    const cls = (this.args.match(/class:\s*'([^']+)'/) || [])[1] || '';
    const type = (this.args.match(/^'([^']+)'/) || [])[1] || '';
    emitter.write(`<form method="post" action="/contact#${id}" id="${id}" class="${cls}" accept-charset="UTF-8" novalidate><input type="hidden" name="form_type" value="${type}"><input type="hidden" name="utf8" value="✓">`);
    yield this.liquid.renderer.renderTemplates(this.tpl, ctx, emitter);
    emitter.write('</form>');
  }
});
engine.registerFilter('asset_url', (f) => '/assets/' + f);
engine.registerFilter('stylesheet_tag', (u) => `<link rel="stylesheet" href="${u}">`);
engine.registerFilter('money', (c) => '$' + (Number(c) / 100).toFixed(2));
engine.registerFilter('json', (x) => JSON.stringify(x));
engine.registerFilter('image_url', (img) => (img && img.src) || String(img || ''));
engine.registerFilter('image_tag', (url, ...args) => { const o = {}; for (let i = 0; i < args.length; i++) { const a = args[i]; if (Array.isArray(a)) o[a[0]] = a[1]; } return `<img src="${url}" alt="${o.alt || ''}" class="${o.class || ''}" loading="lazy">`; });
engine.registerFilter('money_without_trailing_zeros', (c) => { const v = (Number(c) / 100).toFixed(2); return '$' + v.replace(/\.00$/, ''); });
engine.registerFilter('map', (arr, key) => (arr || []).map((x) => x[key]));
engine.registerFilter('structured_data', () => '{}');
const names = ['Plain','Everything','Sesame','Poppy','Onion','Garlic','Cinnamon Raisin','Egg','Whole Wheat','Pumpernickel'];
const NOIMG = process.env.NOIMG === '1';
const flavors = names.map((n) => { const h = n.toLowerCase().replace(/ /g, '-'); return { system: { handle: h }, name: { value: n }, available: { value: n !== 'Pumpernickel' }, description: { value: '' }, allergens: { value: n === 'Sesame' ? 'Contains sesame' : '' }, image: { value: NOIMG ? '' : { src: '/img/' + h + '.png', alt: n } } }; });
const plan = { id: 690001, name: 'Deliver every 4 weeks, $6.00 off', options: [{ name: 'Delivery frequency', value: 'Deliver every 4 weeks' }] };
const addonPlan = { id: 690002, name: 'Deliver every 4 weeks', options: [{ name: 'Delivery frequency', value: 'Deliver every 4 weeks' }] };
const addon = (id, t, pl) => ({ title: t, selected_or_first_available_variant: { id, price: 995, available: true, selling_plan_allocations: WITH_PLAN ? [{ price: 995, selling_plan: pl || plan }] : [] } });
const product = { id: 1, url: '/products/build-your-box', title: 'Build Your Dozen',
  selected_or_first_available_variant: { id: 67907099787506, price: 4595, selling_plan_allocations: WITH_PLAN ? [{ price: 3995, selling_plan: plan }] : [] },
  metafields: { custom: { flavors: { value: flavors }, addons: { value: [addon(1001, 'Mini Bagels (6)', addonPlan), addon(1002, 'Bagel Chips', addonPlan)] }, sleeves_per_box: { value: 4 }, bagels_per_sleeve: { value: 3 } } } };
(async () => {
  let src = fs.readFileSync(path.join(THEME, 'sections', 'bbb-box-builder.liquid'), 'utf8');
  const schema = JSON.parse(src.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
  const settings = {}; for (const s of schema.settings) if ('default' in s) settings[s.id] = s.default;
  if (process.env.PROMO === '1') {
    Object.assign(settings, { product, heading_tag: 'h2', lead_source: 'free-minis', promo_product: product.metafields.custom.addons.value[0], promo_code: 'FREEMINIS' });
    product.metafields.custom.addons.value[0].id = 501; product.metafields.custom.addons.value[1].id = 502;
    product.metafields.custom.addons.value[0].featured_image = { src: '/img/minis.png' };
  }
  const html = await engine.parseAndRender(src, { section: { id: 'b1', settings }, product, shop: { money_format: '${{amount}}' }, request: { design_mode: false }, template: { name: process.env.PROMO === '1' ? 'page' : 'product' },
    routes: { cart_add_url: '/cart/add', cart_url: '/cart', cart_update_url: '/cart/update' }, product_title: 'x' });
  const sd = JSON.parse(fs.readFileSync(path.join(THEME, 'config', 'settings_data.json'), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, ''));
  const preset = sd.presets[sd.current] || Object.values(sd.presets)[0];
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
  let css = 'html{font-size:62.5%;box-sizing:border-box}*,*::before,*::after{box-sizing:inherit}body{margin:0;font-size:1.6rem;line-height:1.6;font-family:Outfit,sans-serif;letter-spacing:.04rem}';
  for (const [k, v] of Object.entries(preset.color_schemes)) { const s = v.settings; css += `.color-${k}{--color-background:${rgb(s.background)};--color-foreground:${rgb(s.text)};--color-button:${rgb(s.button)};--color-button-text:${rgb(s.button_label)};--color-secondary-button-text:${rgb(s.secondary_button_label)};--color-shadow:${rgb(s.shadow)};color:rgba(var(--color-foreground),.85);background:rgb(var(--color-background))}`; }
  fs.writeFileSync(OUT, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><link rel="stylesheet" href="/assets/base.css"><link rel="stylesheet" href="/assets/bbb-tokens.css"><link rel="stylesheet" href="/assets/bbb-sections.css"></head><body><main>${html}</main></body></html>`);
  console.log('rendered', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
