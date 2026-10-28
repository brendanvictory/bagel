// Renders the packing slip with mock shipments (LiquidJS approximation of Shopify's packing slip renderer).
const fs = require('fs'); const { Liquid } = require('liquidjs');
const engine = new Liquid({ jsTruthy: false });
const tpl = fs.readFileSync(process.argv[2], 'utf8');
const base = { shop: { name: 'Bad Boy Bagel Co.', email: 'help@badboybagelco.com', domain: 'badboybagelco.com' }, customer: { name: 'Brendan Wright' },
  shipping_address: { name: 'Brendan Wright', address1: '33 Shelley Dr', city: 'Massapequa', province_code: 'NY', zip: '11758', phone: '5162538340' } };
const li = (title, sku, qty, props) => ({ title, sku, quantity: qty, shipping_quantity: qty, variant_title: '', properties: props });
const cases = {
  // Mirrors real test order #1001
  order1001: { order: { name: '#1001', created_at: '2026-10-28T15:52:02Z', note: '' }, includes_all_line_items_in_order: true, line_items_in_shipment: [
    li('Bagel Chips', 'BBB-CHIPS', 1, { _box_id: '22a62e0e-90e0' }),
    li('Build Your Dozen', 'BBB-DOZEN', 1, { _box_id: '22a62e0e-90e0', 'Sleeve 1': 'Plain', 'Sleeve 2': 'Everything', 'Sleeve 3': 'Cinnamon Raisin', 'Sleeve 4': 'Egg' })] },
  // Two boxes, repeats, gift note, add-on per box
  twoBoxes: { order: { name: '#1002', created_at: '2026-10-28T16:00:00Z', note: 'Happy birthday, Mom!' }, includes_all_line_items_in_order: true, line_items_in_shipment: [
    li('Build Your Dozen', 'BBB-DOZEN', 1, { _box_id: 'aaa', 'Sleeve 1': 'Everything', 'Sleeve 2': 'Everything', 'Sleeve 3': 'Plain', 'Sleeve 4': 'Sesame' }),
    li('Mini Bagels (6)', 'BBB-MINI-6', 1, { _box_id: 'aaa' }),
    li('Build Your Dozen', 'BBB-DOZEN', 1, { _box_id: 'bbb', 'Sleeve 1': 'Egg', 'Sleeve 2': 'Egg', 'Sleeve 3': 'Egg', 'Sleeve 4': 'Egg' }),
    li('Bagel Chips', 'BBB-CHIPS', 2, { _box_id: 'bbb' })] },
  // Renewal that lost its properties → must warn
  lostProps: { order: { name: '#1003', created_at: '2026-11-25T15:00:00Z', note: '' }, includes_all_line_items_in_order: true, line_items_in_shipment: [
    li('Build Your Dozen', 'BBB-DOZEN', 1, {}), li('Bagel Chips', 'BBB-CHIPS', 1, {})] },
};
(async () => { for (const [k, ctx] of Object.entries(cases)) {
  const html = await engine.parseAndRender(tpl, { ...base, ...ctx });
  fs.writeFileSync(`${process.argv[3]}/slip-${k}.html`, `<!doctype html><meta charset="utf-8">${html}`); console.log('rendered', k);
} })().catch((e) => { console.error(e.message); process.exit(1); });
