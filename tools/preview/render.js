// Static approximation of the homepage for visual QA only (not Shopify rendering).
const fs = require('fs'), path = require('path');
const { Liquid, Tag } = require('liquidjs');
const THEME = process.argv[2], OUT = process.argv[3], TEMPLATE = process.argv[4] || 'index';
const engine = new Liquid({ root: [path.join(THEME, 'sections'), path.join(THEME, 'snippets')], extname: '.liquid', jsTruthy: false });
class Skip extends Tag { constructor(t, r, l) { super(t, r, l); this.tpls = []; const s = r.shift(); while (r.length) { const x = r.shift(); if (x.name === 'end' + t.name) return; } } *render() { return ''; } }
engine.registerTag('schema', Skip);
const asset = (f) => 'file://' + path.join(THEME, 'assets', f);
engine.registerFilter('asset_url', asset);
engine.registerFilter('money', (c) => '$' + (Number(c) / 100).toFixed(2));
engine.registerFilter('image_url', (x) => String(x));
engine.registerFilter('image_tag', () => '');
engine.registerFilter('json', (x) => JSON.stringify(x));
engine.registerFilter('t', (x) => x);
engine.registerFilter('handleize', (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
engine.registerFilter('default_errors', () => '');
engine.registerFilter('payment_type_svg_tag', () => '');
const renderSection = async (type, ctx) => {
  let src = fs.readFileSync(path.join(THEME, 'sections', type + '.liquid'), 'utf8');
  src = src.replace(/{% schema %}[\s\S]*?{% endschema %}/, '')
           .replace(/{%-?\s*form [^%]*-?%}/g, '<form class="bbb-form">').replace(/{%-?\s*endform\s*-?%}/g, '</form>');
  return engine.parseAndRender(src, ctx);
};
const readSchema = (type) => { const s = fs.readFileSync(path.join(THEME, 'sections', type + '.liquid'), 'utf8'); const m = s.match(/{% schema %}([\s\S]*?){% endschema %}/); return JSON.parse(m[1]); };
const index = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', TEMPLATE + '.json'), 'utf8'));
const footerGroup = JSON.parse(fs.readFileSync(path.join(THEME, 'sections', 'footer-group.json'), 'utf8'));
const standin = { toString(){return 'file://'+__dirname+'/standin.jpg'}, width: 2400, height: 1350, presentation: { focal_point: '50% 50%' } };
const product = { title: 'The Dozen', url: '#', selected_or_first_available_variant: { price: 4495, selling_plan_allocations: [{ price: 3995, selling_plan: { name: 'Delivered every 4 weeks' } }] } };
(async () => {
  let html = '';
  const ctxFor = (id, settings, blocks) => ({ section: { id, settings, blocks }, request: { page_type: TEMPLATE === 'index' ? 'index' : 'page', design_mode: !!process.env.DESIGN }, routes: { all_products_collection_url: '/collections/all', root_url: '/' }, shop: { name: 'Bad Boy Bagel Co.', policies: [], enabled_payment_types: [] }, settings: { logo_width: 150 }, form: {} });
  const build = (sec) => {
    const schema = readSchema(sec.type); const settings = {};
    for (const s of schema.settings || []) if ('default' in s) settings[s.id] = s.default;
    Object.assign(settings, sec.settings || {});
    const blocks = (sec.block_order || []).map((b) => {
      const bl = sec.blocks[b]; const bs = (schema.blocks || []).find((x) => x.type === bl.type) || { settings: [] };
      const st = {}; for (const s of bs.settings) if ('default' in s) st[s.id] = s.default; Object.assign(st, bl.settings);
      return { ...bl, settings: st, shopify_attributes: '' };
    });
    blocks.size = blocks.length; return { settings, blocks, schema };
  };
  for (const id of index.order) {
    const sec = index.sections[id]; if (!sec.type.startsWith('bbb-')) continue;
    const schema = readSchema(sec.type); const settings = {};
    for (const s of schema.settings || []) if ('default' in s) settings[s.id] = s.default;
    Object.assign(settings, sec.settings || {});
    if (sec.type === 'bbb-hero' && process.env.STANDIN) settings.image = standin;
    if (schema.settings.some((s) => s.type === 'product')) { settings.price_product = product; settings.product = product; }
    const blocks = (sec.block_order || []).map((b) => ({ ...sec.blocks[b], shopify_attributes: '' }));
    blocks.size = blocks.length;
    html += await renderSection(sec.type, ctxFor(id, settings, blocks));
  }
  let footerHtml = '';
  for (const id of footerGroup.order) { const sec = footerGroup.sections[id]; const b = build(sec); footerHtml += await renderSection(sec.type, ctxFor(id, b.settings, b.blocks)); }
  // Dawn-like color scheme variables from settings_data
  const sd = JSON.parse(fs.readFileSync(path.join(THEME, 'config', 'settings_data.json'), 'utf8'));
  const preset = sd.presets[sd.current];
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
  let css = '';
  for (const [k, v] of Object.entries(preset.color_schemes)) {
    const s = v.settings;
    css += `.color-${k}{--color-background:${rgb(s.background)};--gradient-background:${s.background};--color-foreground:${rgb(s.text)};--color-button:${rgb(s.button)};--color-button-text:${rgb(s.button_label)};--color-secondary-button:${rgb(s.background)};--color-secondary-button-text:${rgb(s.secondary_button_label)};--color-shadow:${rgb(s.shadow)};--color-link:${rgb(s.text)};}\n`;
  }
  const root = `:root{--font-body-family:Assistant,system-ui,sans-serif;--font-heading-family:Assistant,system-ui,sans-serif;--font-body-weight:400;--font-heading-weight:700;--font-body-scale:1;--font-heading-scale:1.1;--page-width:120rem;--buttons-radius:6px;--buttons-radius-outset:8px;--buttons-border-width:2px;--buttons-border-opacity:1;--buttons-shadow-opacity:1;--buttons-shadow-horizontal-offset:4px;--buttons-shadow-vertical-offset:4px;--buttons-shadow-blur-radius:0px;--buttons-border-offset:0.3px;--inputs-radius:6px;--spacing-sections-desktop:0px;--spacing-sections-mobile:0px;} html{box-sizing:border-box;font-size:62.5%;height:100%} *,*::before,*::after{box-sizing:inherit} body{display:flex;flex-direction:column;min-height:100%;margin:0;font-size:1.5rem;letter-spacing:.06rem;line-height:1.8;font-family:var(--font-body-family)} @media(min-width:750px){body{font-size:1.6rem}} body,[class*=color-scheme]{color:rgba(var(--color-foreground),.75);background-color:rgb(var(--color-background))}`;
  const header = `<div class="color-scheme-4" style="background:#101010;color:#fff;text-align:center;padding:10px;font-size:13px">Build your dozen: 4 sleeves, up to 4 flavors</div>
  <header class="color-scheme-1 gradient" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #ddd"><span>☰</span><img src="${asset('bbb-logo-600.webp')}" width="150" height="108" alt="Bad Boy Bagel Co."><span>🛒</span></header>`;
  const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${root}\n${css}</style>
  <link rel="stylesheet" href="${asset('base.css')}"><link rel="stylesheet" href="${asset('bbb-tokens.css')}"><link rel="stylesheet" href="${asset('bbb-sections.css')}"></head>
  <body class="gradient">${header}<main>${html}</main>${footerHtml}</body></html>`;
  fs.writeFileSync(OUT, page);
  console.log('rendered', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
