/* New York Bagel Express dashboard: Pick list
   Upload the pick list PDF that ShipStation prints; this page turns it into the commissary's bake
   sheet: logo, ship date at the top, then bagels by flavor and minis (and chips, if any), ready to
   print. Everything happens in the browser: the PDF is read here and never uploaded anywhere.

   Install: upload this file next to index.html and add, just before </body> in index.html:
     <script src="picklist.js"></script>
   It adds an "Operations → Pick list" item to the sidebar on its own. */
(() => {
  const PDFJS = window.NYBE_PDFJS_BASE || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const FLAVORS = {
    'BAGEL-PLAIN': 'Plain', 'BAGEL-EVERYTHING': 'Everything', 'BAGEL-SESAME': 'Sesame', 'BAGEL-POPPY': 'Poppy',
    'BAGEL-ONION': 'Onion', 'BAGEL-GARLIC': 'Garlic', 'BAGEL-CINNAMON-RAISIN': 'Cinnamon Raisin', 'BAGEL-EGG': 'Egg',
    'BAGEL-WHOLE-WHEAT': 'Whole Wheat', 'BAGEL-PUMPERNICKEL': 'Pumpernickel',
  };
  const PER_SLEEVE = 3;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  const flavorName = (sku) => FLAVORS[sku] || titleCase(sku.replace(/^BAGEL-/, '').replace(/-/g, ' '));

  // ---------- default ship date: today on Mon–Wed, otherwise next Monday (boxes ship Mon–Wed) ----------
  const nyToday = () => {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return new Date(p + 'T12:00:00');
  };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const defaultShipDate = () => {
    const d = nyToday(); const w = d.getDay(); // 0 Sun … 6 Sat
    if (w >= 1 && w <= 3) return iso(d);
    d.setDate(d.getDate() + ((8 - w) % 7 || 7)); return iso(d);
  };
  const longDate = (v) => new Date(v + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // ---------- load pdf.js on first use ----------
  let pdfjsReady = null;
  const loadPdfjs = () => pdfjsReady || (pdfjsReady = new Promise((res, rej) => {
    if (window.pdfjsLib) return res(window.pdfjsLib);
    const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => { pdfjsReady = null; rej(new Error('Could not load the PDF reader. Check your connection and try again.')); };
    document.head.appendChild(s);
  }));

  // ---------- read the ShipStation pick list ----------
  // Layout: columns Item # | Description | Warehouse Location | # Required. Each item starts with its SKU in the
  // Item # column (long SKUs wrap onto a second line ending in "-"), its quantity sits in # Required on the
  // same line, and an "Orders: 1003, 1004" line closes the item. Box items carry "Sleeve 1: Plain, …".
  async function parsePickList(buf) {
    const pdfjsLib = await loadPdfjs();
    const doc = await pdfjsLib.getDocument({ data: buf }).promise;
    let cols = null; let printed = '';
    const items = []; const orders = new Set();
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const tc = await page.getTextContent();
      const words = tc.items.filter((i) => i.str && i.str.trim()).map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5], w: i.width }));
      if (!printed) { const t = words.map((w) => w.s).join(' ').match(/(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,\s+\w+\s+\d{1,2},\s+\d{4}(\s+\d{1,2}:\d{2}\s*[AP]M)?/); if (t) printed = t[0]; }
      const desc = words.find((w) => /^Description$/.test(w.s));
      const itemH = words.find((w) => /^Item/.test(w.s));
      const req = words.find((w) => /Required$/.test(w.s) && !/Total/.test(w.s));
      if (desc && req) cols = { sku: itemH ? itemH.x : 0, desc: desc.x - 4, req: Math.min(req.x, (words.find((w) => w.s === '#' && Math.abs(w.y - req.y) < 3 && w.x < req.x) || req).x) - 8 };
      const c = cols || { sku: 0, desc: page.view[2] * 0.25, req: page.view[2] * 0.8 };
      // SKUs sit at the left edge of the Item # column; option text ("box id: …, Sleeve 1: …") is indented
      const skuX = Math.min(...words.filter((w) => w.x < c.desc && /[A-Z]/.test(w.s) && /^[A-Z0-9][A-Z0-9-]*$/.test(w.s)).map((w) => w.x).concat([c.desc]));
      const skuWords = words.filter((w) => w.x < skuX + 6 && /[A-Z]/.test(w.s) && /^[A-Z0-9][A-Z0-9-]*$/.test(w.s) && w.s !== 'Item').sort((a, b) => b.y - a.y);
      const qtyWords = words.filter((w) => w.x >= c.req && /^\d+$/.test(w.s));
      const orderLines = words.filter((w) => /^Orders:/.test(w.s)).sort((a, b) => b.y - a.y);
      // join wrapped SKUs
      const starts = [];
      skuWords.forEach((w) => {
        const prev = starts[starts.length - 1];
        if (prev && prev.sku.endsWith('-') && prev.y - w.y < 18) prev.sku += w.s; else starts.push({ sku: w.s, y: w.y });
      });
      starts.forEach((st, i) => {
        const q = qtyWords.find((w) => Math.abs(w.y - st.y) < 9);
        const end = orderLines.find((o) => o.y < st.y + 2);
        const endY = end ? end.y : (starts[i + 1] ? starts[i + 1].y : -1);
        // text of this item (description + options), used for sleeves and orders
        const text = words.filter((w) => w.y <= st.y + 3 && w.y > endY + 2 && w.x > skuX + 20 && !(w.x >= c.req && /^\d+$/.test(w.s))).sort((a, b) => (b.y - a.y) || (a.x - b.x)).map((w) => w.s).join(' ');
        const ordWords = end ? words.filter((w) => Math.abs(w.y - end.y) < 3).sort((a, b) => a.x - b.x).map((w) => w.s).join(' ') : '';
        (ordWords.match(/\d{3,}/g) || []).forEach((o) => orders.add(o));
        items.push({ sku: st.sku, qty: q ? Number(q.s) : 0, text, orders: ordWords.replace(/^Orders:\s*/, '') });
      });
    }
    return { items, orders: [...orders], printed };
  }

  function summarize(parsed) {
    const flavors = new Map(); const fromSleeves = new Map(); const other = new Map();
    let minis = 0; let chips = 0; let boxes = 0; let sleeveBoxes = 0; let missingQty = 0;
    parsed.items.forEach((it) => {
      if (!it.qty) missingQty++;
      if (it.sku.startsWith('BAGEL-')) { const f = flavorName(it.sku); flavors.set(f, (flavors.get(f) || 0) + it.qty); return; }
      const mini = it.sku.match(/MINI-(\d+)/); if (mini) { minis += it.qty * Number(mini[1]); return; }
      if (/CHIPS/.test(it.sku)) { chips += it.qty; return; }
      if (/^BBB-DOZEN/.test(it.sku)) {
        boxes += it.qty;
        const sl = [...it.text.matchAll(/Sleeve\s*\d+\s*:\s*([A-Za-z][A-Za-z ]*?)\s*(?=,|Sleeve\s*\d|$)/g)].map((m) => titleCase(m[1].trim()));
        if (sl.length) { sleeveBoxes += it.qty; sl.forEach((f) => fromSleeves.set(f, (fromSleeves.get(f) || 0) + PER_SLEEVE * it.qty)); }
        return;
      }
      const name = it.sku; other.set(name, (other.get(name) || 0) + it.qty);
    });
    // Cross-check: the box's sleeve choices against the per-flavor lines
    let mismatch = [];
    if (sleeveBoxes && sleeveBoxes === boxes) {
      const all = new Set([...flavors.keys(), ...fromSleeves.keys()]);
      all.forEach((f) => { if ((flavors.get(f) || 0) !== (fromSleeves.get(f) || 0)) mismatch.push(`${f}: lines ${flavors.get(f) || 0}, sleeves ${fromSleeves.get(f) || 0}`); });
    }
    // If there are no flavor lines at all (old orders), fall back to the sleeves
    const useSleeves = !flavors.size && fromSleeves.size;
    const rows = [...(useSleeves ? fromSleeves : flavors).entries()].filter(([, q]) => q > 0).sort((a, b) => a[0].localeCompare(b[0]));
    return { rows, minis, chips, boxes, other: [...other.entries()], mismatch, useSleeves, missingQty };
  }

  // ---------- the printable sheet ----------
  const SHEET_CSS = `
    .pl-sheet { font-family: Arial, Helvetica, sans-serif; color: #082D5C; background: #fff; max-width: 7in; margin: 0 auto; padding: 28px 0 10px; }
    .pl-sheet .pl-logo { display: block; margin: 0 auto 10px; width: 260px; max-width: 70%; height: auto; }
    .pl-sheet h1 { text-align: center; font-size: 34px; margin: 4px 0 4px; font-weight: 800; color: #082D5C; letter-spacing: 0; }
    .pl-sheet .pl-ship { text-align: center; font-size: 18px; font-weight: 700; margin: 0 0 22px; color: #082D5C; }
    .pl-sheet .pl-ship span { color: #C9420C; }
    .pl-sheet table { width: 100%; border-collapse: collapse; font-size: 20px; }
    .pl-sheet th { background: #082D5C; color: #fff; text-align: left; padding: 14px 22px; font-size: 16px; }
    .pl-sheet th:last-child, .pl-sheet td:last-child { text-align: right; }
    .pl-sheet td { padding: 14px 22px; color: #082D5C; }
    .pl-sheet tbody tr:nth-child(odd) td { background: #F3F5F9; }
    .pl-sheet tr.pl-extra td { background: #FFF2E1 !important; font-weight: 800; }
    .pl-sheet .pl-foot { margin-top: 18px; font-size: 12px; color: #5f6b7a; text-align: center; }
    .pl-sheet .pl-warn { margin-top: 14px; padding: 10px 14px; border: 2px solid #b3362d; color: #b3362d; font-size: 13px; font-weight: 700; }
  `;
  function sheetHtml(sum, meta) {
    const logo = ($('img.brandlogo') || {}).src || '';
    const rows = sum.rows.map(([f, q]) => `<tr><td>${esc(f)}</td><td>${q}</td></tr>`).join('');
    const extra = [sum.minis ? `<tr class="pl-extra"><td>Minis</td><td>${sum.minis}</td></tr>` : '',
      sum.chips ? `<tr class="pl-extra"><td>Bagel chips (bags)</td><td>${sum.chips}</td></tr>` : '',
      ...sum.other.map(([n, q]) => `<tr class="pl-extra"><td>${esc(n)}</td><td>${q}</td></tr>`)].join('');
    const total = sum.rows.reduce((a, [, q]) => a + q, 0);
    const foot = [`${total} bagels`, `${sum.boxes} box${sum.boxes === 1 ? '' : 'es'}`, `${meta.orders} order${meta.orders === 1 ? '' : 's'}`,
      meta.printed ? `ShipStation list printed ${esc(meta.printed)}` : ''].filter(Boolean).join(' · ');
    const warn = sum.mismatch.length ? `<div class="pl-warn">Check before baking: the boxes' sleeve choices don't match the flavor lines (${esc(sum.mismatch.join('; '))}).</div>` : '';
    return `<div class="pl-sheet">${logo ? `<img class="pl-logo" src="${logo}" alt="New York Bagel Express">` : ''}
      <h1>Pick List</h1><p class="pl-ship">Ship date: <span>${esc(longDate(meta.shipDate))}</span></p>
      <table><thead><tr><th>Bagel flavor</th><th>Count</th></tr></thead><tbody>${rows || '<tr><td colspan="2">No bagels found on this pick list.</td></tr>'}${extra}</tbody></table>
      ${warn}<p class="pl-foot">${foot}</p></div>`;
  }

  // ---------- the dashboard section ----------
  const UI_CSS = `
    .pl-controls { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; }
    .pl-controls label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--muted); }
    .pl-controls input[type=date] { font: inherit; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); }
    .pl-drop { flex: 1 1 260px; border: 2px dashed var(--line); border-radius: 12px; padding: 18px; text-align: center; cursor: pointer; color: var(--muted); }
    .pl-drop.on { border-color: var(--accent); background: var(--side-on); }
    .pl-drop b { color: var(--ink); }
    .pl-msg { margin: 12px 0 0; font-size: 14px; }
    .pl-msg.err { color: var(--bad); font-weight: 600; }
    .pl-preview { margin-top: 16px; border: 1px solid var(--line); border-radius: 12px; background: #fff; overflow: auto; padding: 0 16px; }
    .pl-actions { display: flex; gap: 10px; margin-top: 14px; }
    @media (max-width: 600px) { .pl-sheet table { font-size: 17px; } .pl-sheet th, .pl-sheet td { padding: 11px 14px; } }
  ` + SHEET_CSS;

  function install() {
    const nav = $('#tabs'); const wrap = $('main .wrap');
    if (!nav || !wrap || $('#tabs button[data-tab="picklist"]')) return;
    const style = document.createElement('style'); style.textContent = UI_CSS; document.head.appendChild(style);
    const label = document.createElement('div'); label.className = 'navlabel'; label.textContent = 'Operations';
    const btn = document.createElement('button'); btn.dataset.tab = 'picklist'; btn.dataset.title = 'Pick list';
    btn.dataset.sub = 'Turn the ShipStation pick list into the bake sheet';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>\n        Pick list';
    const settings = [...nav.querySelectorAll('.navlabel')].find((l) => /settings/i.test(l.textContent));
    nav.insertBefore(label, settings || null); nav.insertBefore(btn, settings || null);

    const sec = document.createElement('section'); sec.dataset.view = 'picklist'; sec.hidden = true;
    sec.innerHTML = `<div class="card">
        <div class="pl-controls">
          <label>Ship date<input type="date" id="plDate"></label>
          <div class="pl-drop" id="plDrop" tabindex="0" role="button"><b>Upload the ShipStation pick list (PDF)</b><br>Drop it here or click to choose. It stays on this computer.</div>
          <input type="file" id="plFile" accept="application/pdf,.pdf" hidden>
        </div>
        <p class="pl-msg" id="plMsg"></p>
        <div class="pl-preview" id="plPreview" hidden></div>
        <div class="pl-actions" id="plActions" hidden><button class="btn" id="plPrint">Print pick list</button></div>
      </div>`;
    wrap.appendChild(sec);

    const date = $('#plDate'); date.value = defaultShipDate();
    let last = null;
    const render = () => { if (!last) return; $('#plPreview').innerHTML = sheetHtml(last.sum, { ...last.meta, shipDate: date.value || defaultShipDate() }); };
    date.addEventListener('change', render);
    const msg = (t, err) => { const m = $('#plMsg'); m.textContent = t; m.classList.toggle('err', !!err); };
    async function handle(file) {
      if (!file) return;
      if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) return msg('That isn\'t a PDF. In ShipStation, print the pick list and save it as a PDF.', true);
      msg('Reading ' + file.name + '…');
      try {
        const parsed = await parsePickList(await file.arrayBuffer());
        if (!parsed.items.length) { last = null; $('#plPreview').hidden = true; $('#plActions').hidden = true; return msg('No items found. Is this the ShipStation pick list (Print → Pick List)?', true); }
        const sum = summarize(parsed);
        last = { sum, meta: { orders: parsed.orders.length, printed: parsed.printed } };
        render(); $('#plPreview').hidden = false; $('#plActions').hidden = false;
        msg(`${file.name}: ${parsed.items.length} line${parsed.items.length === 1 ? '' : 's'} read` + (sum.useSleeves ? ' (bagel counts taken from the box sleeves)' : '') + (sum.missingQty ? `, ${sum.missingQty} without a quantity` : '') + '.', !!sum.missingQty);
      } catch (e) { msg('Couldn\'t read that PDF: ' + (e && e.message ? e.message : e), true); }
    }
    const drop = $('#plDrop'); const input = $('#plFile');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { handle(input.files[0]); input.value = ''; });
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('on'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('on'); }));
    drop.addEventListener('drop', (e) => handle(e.dataTransfer.files[0]));

    $('#plPrint').addEventListener('click', () => {
      if (!last) return;
      const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      document.body.appendChild(f);
      const d = f.contentDocument;
      d.open(); d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pick List ${esc(date.value)}</title><style>@page{size:letter;margin:0.5in}body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}${SHEET_CSS}</style></head><body>${sheetHtml(last.sum, { ...last.meta, shipDate: date.value || defaultShipDate() })}</body></html>`); d.close();
      const go = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 1000); };
      const img = d.querySelector('img'); if (img && !img.complete) { img.onload = go; img.onerror = go; } else setTimeout(go, 50);
    });
  }
  window.NYBE_PICKLIST = { parsePickList, summarize, sheetHtml }; // for testing
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
