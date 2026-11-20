// New York Bagel Express — rebrands Shopify's default customer-notification templates in place.
// Applied in the admin code editor to Shopify's own default template, so all of Shopify's logic
// (split carts, pending payments, bundles, gift cards, RTL) stays intact. It only:
//   1. appends brand CSS, 2. swaps the header logo, 3. adds a brand line to the footer,
//   4. hides the $0 per-flavor pick-list lines (_box_part), 5. shows the box's sleeves on
//   shipping emails, 6. rewrites the plain-text title/body for each template.
// Usage (in the template's edit page): window.nybeTransform(docString, templateKey) -> new string.
window.nybeTransform = (src, key) => {
  const LOGO = 'https://cdn.shopify.com/s/files/1/0864/7989/6818/files/email-nybe-logo-reverse.png?v=1793807149';
  const NAVY = '#082D5C', CREAM = '#FFF4E2', CTA = '#C9420C', LINK = '#B9520A', MUTED = '#4A5A70';
  let d = src;
  const marker = '/* nybe-brand */';
  if (d.includes(marker)) return d; // already applied
  const once = (re, rep, label) => { if (!re.test(d)) throw new Error('pattern missing: ' + label); d = d.replace(re, rep); };

  // 1. Brand CSS (after Shopify's own <style> rules, so it wins)
  const css = `${marker}
    body, .body { background: ${CREAM} !important; }
    body, td, p, span, a, h1, h2, h3 { font-family: Helvetica, Arial, sans-serif !important; }
    .header { background: ${NAVY} !important; }
    .header__cell { padding: 26px 0 22px !important; }
    .order-number__text, .po-number__text { color: ${CREAM} !important; font-size: 13px !important; font-weight: 700 !important; letter-spacing: .12em !important; text-transform: uppercase !important; }
    h2 { color: ${NAVY} !important; font-size: 28px !important; line-height: 1.1 !important; font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: -.01em !important; }
    h3 { color: ${NAVY} !important; font-size: 14px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: .08em !important; }
    p { color: ${MUTED}; }
    .content__cell, .section__cell { border-color: #EADBC4 !important; }
    .button__cell, .actions-buttons .button__cell--primary { background: ${CTA} !important; border-radius: 999px !important; }
    .button__cell--shop-app { background: #5A31F4 !important; }
    .button__text { color: #FFFFFF !important; font-weight: 800 !important; letter-spacing: .04em !important; }
    a, a:hover, a:active, a:visited { color: ${LINK}; }
    .order-list__item-title { color: ${NAVY} !important; font-weight: 700 !important; }
    .order-list__item-variant { color: ${MUTED} !important; }
    .footer { background: ${NAVY} !important; }
    .footer__cell { padding: 28px 0 !important; }
    .disclaimer__subtext, .disclaimer__subtext a { color: ${CREAM} !important; }
    .nybe-tag { margin: 0 0 10px; font-size: 18px; line-height: 1.2; font-weight: 900; letter-spacing: .02em; text-transform: uppercase; color: ${CREAM} !important; }
  `;
  once(/<\/style>/, css + '\n  </style>', 'style');

  // 2. Header logo (white logo on the navy band)
  once(/\{%- if shop\.email_logo_url %\}[\s\S]*?\{%- endif %\}/,
    `<a href="{{ shop.url }}" style="text-decoration:none;"><img src="${LOGO}" alt="{{ shop.name }}" width="170" style="display:block;width:170px;max-width:170px;height:auto;border:0;"></a>`, 'logo');

  // 3. Footer brand line
  once(/<p class="disclaimer__subtext">/,
    `<p class="nybe-tag">Real New York bagels. Shipped 2-day.</p>\n              <p class="disclaimer__subtext">`, 'footer');

  // 4. Hide the $0 per-flavor lines that exist only for the ShipStation pick list
  const guard = (v) => `{% if ${v}.properties['_box_part'] != blank %}{% continue %}{% endif %}`;
  let hits = 0;
  d = d.replace(/(\{%-?\s*for\s+line\s+in\s+(?:subtotal_line_items|delivery_agreement\.non_parent_line_items)\s*-?%\})/g, (m) => { hits++; return m + guard('line'); });
  d = d.replace(/(\{%-?\s*for\s+line\s+in\s+fulfillment\.fulfillment_line_items\s*-?%\})/g, (m) => { hits++; return m + guard('line.line_item'); });
  if (!hits) throw new Error('no line loops found');

  // 5. Shipping emails: list the box's sleeves under its title (order confirmation already shows them)
  if (d.includes('fulfillment.fulfillment_line_items')) {
    const sleeves = `\n          {% for p in line.line_item.properties %}{% assign pf = p.first | slice: 0 %}{% if p.last != blank and pf != '_' %}<span class="order-list__item-variant">{{ p.first }}: {{ p.last }}</span><br/>{% endif %}{% endfor %}`;
    once(/(\{\{ line_display \}\}\{% if buyer_email_rtl == true %\}<\/span>&lrm;&rlm;\{% endif %\}<\/span><br\/>)/, '$1' + sleeves, 'title span');
  }

  // 6. Copy (only plain-text captures are replaced; conditional ones are left to Shopify)
  const COPY = {
    order_confirmation: { title: "Thanks, your order's in!" },
    shipping_confirmation: { title: 'Your bagels are on the way', body: 'Your box just left our Long Island commissary by 2-day shipping. Track it below to see when it will be at your door.' },
    shipping_update: {},
    shipment_out_for_delivery: { title: 'Your bagels arrive today', body: 'Your box is out for delivery. Keep an eye out for it, then toast, schmear and enjoy.' },
    shipment_delivered: { title: 'Your bagels have arrived', body: 'Your box was delivered. Enjoy your bagels, and thanks for ordering from New York Bagel Express.' },
  }[key] || {};
  const setCapture = (name, text) => {
    const re = new RegExp(`(\\{%-?\\s*capture ${name}\\s*-?%\\})([\\s\\S]*?)(\\{%-?\\s*endcapture\\s*-?%\\})`);
    const m = d.match(re);
    if (m && !m[2].includes('{%')) d = d.replace(re, `$1\n  ${text}\n$3`);
  };
  if (COPY.title) setCapture('email_title', COPY.title);
  if (COPY.body) setCapture('email_body', COPY.body);
  if (key === 'order_confirmation') {
    const ship = "We're getting your order ready to be shipped. We will notify you when it has been sent.";
    const mine = "{% if customer.first_name != blank %}Hi {{ customer.first_name }}, we{% else %}We{% endif %}'ve got your order. Your bagels are baked and shipped the same day from our Long Island commissary, and boxes go out Monday–Wednesday by 2-day shipping. We'll email your tracking as soon as your box is on the way.";
    d = d.split(ship).join(mine);
  }
  return d;
};
'ok';
