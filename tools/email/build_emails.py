#!/usr/bin/env python3
"""Generate the six New York Bagel Express remarketing emails (Shopify Messaging, 'Code your own').
Run: python3 tools/email/build_emails.py  ->  docs/marketing/emails/*.liquid
Only Shopify Messaging-supported Liquid is used: customer.first_name, customer.tags, shop.*,
abandoned_checkout.*, abandoned_visit.*, unsubscribe_url, open_tracking."""
import json, os, urllib.parse
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'docs', 'marketing', 'emails')
SITE = 'https://nybagelexpress.com'
CDN = 'https://cdn.shopify.com/s/files/1/0864/7989/6818/files/'
LOGO = CDN + 'email-nybe-logo-reverse.png?v=1793807149'
HERO = CDN + 'email-nybe-hero.jpg?v=1793807150&width=1200'
FLAVORS = [  # handle, name, file
  ('everything', 'Everything', 'download_08c27631-4922-4167-91cf-856614a4e0d5.png?v=1793200172'),
  ('sesame', 'Sesame', 'download_c9a03436-29c0-46c3-b3bb-78887342726a.png?v=1793200172'),
  ('cinnamon-raisin', 'Cinnamon Raisin', 'download_01e79ffc-65c9-4945-b9a5-56ef752658e4.png?v=1793200172'),
  ('plain', 'Plain', 'download_9c6488a9-4d81-4787-8b9f-42c120b62950.png?v=1793200172'),
  ('poppy', 'Poppy', 'download_1b9942dc-2b06-40e0-92df-1294945ea507.png?v=1793200172'),
  ('egg', 'Egg', 'download_0fe2ab6b-4c6b-4a0d-b46e-fc42caa2250f.png?v=1793200172'),
]
NAVY, CREAM, ORANGE, ORANGE_TXT, CTA, MUTED = '#082D5C', '#FFF4E2', '#F47B20', '#B9520A', '#C9420C', '#4A5A70'
FONT = "Helvetica,Arial,sans-serif"

# ---------- Liquid: lead source -> page + offer ----------
LEAD_SOURCE = """{%- assign src = 'builder' -%}
{%- if customer.tags contains 'lead-dozen-deal' -%}{%- assign src = 'dozen' -%}{%- elsif customer.tags contains 'lead-free-minis' -%}{%- assign src = 'minis' -%}{%- endif -%}
{%- assign base = '""" + SITE + """/products/build-your-box' -%}{%- assign tail = '' -%}
{%- if src == 'dozen' -%}{%- assign base = '""" + SITE + """/pages/dozen-deal' -%}{%- assign tail = '#build' -%}{%- endif -%}
{%- if src == 'minis' -%}{%- assign base = '""" + SITE + """/pages/free-minis' -%}{%- assign tail = '#build' -%}{%- endif -%}
"""
CART_SOURCE = """{%- assign recovery_url = '""" + SITE + """/products/build-your-box' -%}
{%- if abandoned_checkout.url != blank -%}{%- assign recovery_url = abandoned_checkout.url -%}{%- elsif abandoned_visit.url != blank -%}{%- assign recovery_url = abandoned_visit.url -%}{%- endif -%}
"""

def head(preview):
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>New York Bagel Express</title>
<style>@media only screen and (max-width:620px){{.shell{{width:100%!important}}.pad{{padding:24px 20px!important}}.h1{{font-size:34px!important;line-height:1.05!important}}.fl td{{padding:0 4px!important}}.fl img{{width:88px!important;height:88px!important}}}}a{{color:{NAVY}}}</style></head>
<body style="margin:0;padding:0;background:{CREAM};color:{NAVY};font-family:{FONT};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{preview}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{CREAM};"><tr><td align="center" style="padding:20px 8px;">
<table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#FFFFFF;border-radius:18px;overflow:hidden;">
<tr><td align="center" style="background:{NAVY};padding:22px 24px;"><a href="{SITE}"><img src="{LOGO}" width="180" alt="New York Bagel Express" style="display:block;width:180px;max-width:100%;height:auto;border:0;"></a></td></tr>
<tr><td style="background:{ORANGE};height:5px;line-height:5px;font-size:0;">&nbsp;</td></tr>
"""

def headline(eyebrow, h1):
    return f"""<tr><td class="pad" style="padding:34px 40px 22px;"><p style="margin:0 0 12px;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:{ORANGE_TXT};">{eyebrow}</p><h1 class="h1" style="margin:0;font-size:42px;line-height:1.02;letter-spacing:-1px;font-weight:900;text-transform:uppercase;color:{NAVY};">{h1}</h1></td></tr>
<tr><td><img src="{HERO}" width="600" alt="Fresh New York bagels in front of the Manhattan skyline" style="display:block;width:100%;height:auto;border:0;"></td></tr>
"""

def button(href, label):
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto;"><tr><td align="center" bgcolor="{CTA}" style="border-radius:999px;background:{CTA};">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{href}" style="height:54px;v-text-anchor:middle;width:300px;" arcsize="50%" fillcolor="{CTA}" stroke="f"><center style="color:#ffffff;font-family:Arial;font-size:16px;font-weight:bold;">{label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="{href}" style="display:inline-block;padding:18px 40px;font-size:16px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#FFFFFF;text-decoration:none;border-radius:999px;">{label} &rarr;</a><!--<![endif]--></td></tr></table>
"""

def offer_box(title, sub):
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;"><tr><td align="center" style="background:{CREAM};border-radius:14px;padding:18px 20px;border-left:5px solid {ORANGE};">
<div style="font-size:18px;font-weight:900;letter-spacing:.5px;text-transform:uppercase;color:{NAVY};">{title}</div><div style="font-size:13px;line-height:1.5;color:{MUTED};margin-top:4px;">{sub}</div></td></tr></table>
"""

LEAD_OFFER = ("{%- if src == 'dozen' -%}" + offer_box('A dozen for $19.95', 'With Subscribe &amp; Save, or $24.95 one-time. Shipping is $14.95 per box.')
  + "{%- elsif src == 'minis' -%}" + offer_box('6 free mini bagels', 'Added free to your first box when you order from our offer page. One per customer.')
  + "{%- else -%}" + offer_box('Free shipping, always', 'Shipping is included in every box.') + "{%- endif -%}\n")
VALUE_STRIP = offer_box('Hand-rolled in New York', 'Your dozen, your way: 3 sleeves of 4, up to 3 flavors.')

def flavor_row():
    cells = []
    for i, (h, n, f) in enumerate(FLAVORS):
        href = "{{ base }}?s=" + h + "{{ tail }}"
        cells.append(f"""<td align="center" width="33%" style="padding:0 8px 16px;vertical-align:top;"><a href="{href}" style="text-decoration:none;color:{NAVY};"><img src="{CDN}{f}&width=240&height=240&crop=center" width="120" height="120" alt="{n} bagel" style="display:block;width:120px;height:120px;border:0;border-radius:14px;background:{CREAM};margin:0 auto;"><span style="display:block;font-size:14px;font-weight:bold;margin-top:8px;">{n}</span></a></td>""")
    rows = "<tr>" + "".join(cells[:3]) + "</tr><tr>" + "".join(cells[3:]) + "</tr>"
    return f"""<p style="margin:24px 0 14px;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;text-align:center;color:{ORANGE_TXT};">Tap a flavor to start your box</p>
<table role="presentation" class="fl" width="100%" cellpadding="0" cellspacing="0">{rows}</table>
"""

def code_box(code, line):
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center" style="background:{NAVY};border-radius:16px;padding:24px 18px;color:#FFFFFF;">
<div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:{ORANGE};font-weight:bold;">Take 10% off today</div>
<div style="font-size:36px;font-weight:900;letter-spacing:5px;margin:8px 0;">{code}</div><div style="font-size:14px;">{line}</div></td></tr></table>
"""

ITEMS = """{%- if abandoned_checkout.line_items != blank -%}
<h2 style="margin:28px 0 8px;font-size:20px;font-weight:900;text-transform:uppercase;color:""" + NAVY + """;">Your box</h2>
{%- for item in abandoned_checkout.line_items -%}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ECDCC4;"><tr>
{%- if item.image_url != blank -%}<td width="96" style="padding:14px 14px 14px 0;"><img src="{{ item.image_url | escape }}" alt="{{ item.product_title | escape }}" width="80" style="display:block;width:80px;height:auto;border-radius:12px;"></td>{%- endif -%}
<td style="padding:14px 0;font-size:16px;color:""" + NAVY + """;"><strong>{{ item.product_title | escape }}</strong>{% if item.variant_title != blank and item.variant_title != 'Default Title' %}<br>{{ item.variant_title | escape }}{% endif %}<br><span style="font-size:14px;color:""" + MUTED + """;">Quantity: {{ item.quantity }}</span></td></tr></table>
{%- endfor -%}
{%- if abandoned_checkout.remaining_products_count > 0 -%}<p style="font-size:14px;">Plus {{ abandoned_checkout.remaining_products_count }} more item(s) in your checkout.</p>{%- endif -%}
{%- elsif abandoned_visit.products_added_to_cart != blank -%}
<h2 style="margin:28px 0 8px;font-size:20px;font-weight:900;text-transform:uppercase;color:""" + NAVY + """;">Your box</h2>
{%- for item in abandoned_visit.products_added_to_cart -%}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ECDCC4;"><tr>
{%- if item.image_url != blank -%}<td width="96" style="padding:14px 14px 14px 0;"><img src="{{ item.image_url | escape }}" alt="{{ item.title | escape }}" width="80" style="display:block;width:80px;height:auto;border-radius:12px;"></td>{%- endif -%}
<td style="padding:14px 0;font-size:16px;color:""" + NAVY + """;"><strong>{{ item.title | escape }}</strong>{% if item.variant_title != blank and item.variant_title != 'Default Title' %}<br>{{ item.variant_title | escape }}{% endif %}<br><span style="font-size:14px;color:""" + MUTED + """;">Quantity: {{ item.quantity }}</span></td></tr></table>
{%- endfor -%}
{%- if abandoned_visit.remaining_cart_products_count > 0 -%}<p style="font-size:14px;">Plus {{ abandoned_visit.remaining_cart_products_count }} more item(s) in your cart.</p>{%- endif -%}
{%- endif -%}
"""

def body_open():
    return f"""<tr><td class="pad" style="padding:30px 40px 8px;font-size:16px;line-height:1.6;color:{NAVY};">
<p style="margin-top:0;">Hey {{{{ customer.first_name | default: 'there' | escape }}}},</p>"""

def foot(signoff, fine=''):
    fine_html = f'<p style="font-size:12px;line-height:1.5;color:{MUTED};margin:0 0 8px;">{fine}</p>' if fine else ''
    return f"""<p style="font-size:15px;margin:8px 0 4px;">{signoff}</p><p style="font-size:15px;margin:0 0 22px;">&mdash; The New York Bagel Express Team</p>{fine_html}</td></tr>
<tr><td style="background:{NAVY};padding:22px 40px;font-size:13px;line-height:1.6;color:#FFFFFF;"><strong style="letter-spacing:1px;">FROM NEW YORK TO YOUR DOOR.</strong><br>We ship Monday&ndash;Wednesday from our commissary on Long Island, NY. Orders placed Wednesday&ndash;Sunday ship the following Monday.<br><a href="{SITE}/pages/contact" style="color:{ORANGE};font-weight:bold;">Questions? We&rsquo;re here to help.</a></td></tr>
</table>
<table role="presentation" width="600" class="shell" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;"><tr><td align="center" style="padding:20px 24px;font-size:11px;line-height:1.7;color:{MUTED};">{{{{ shop.name | escape }}}} &middot; {{{{ shop.address.address1 | escape }}}}{{% if shop.address.address2 != blank %}} {{{{ shop.address.address2 | escape }}}}{{% endif %}}, {{{{ shop.address.city | escape }}}}, {{{{ shop.address.province | escape }}}} {{{{ shop.address.zip | escape }}}}<br><a href="{{{{ unsubscribe_url }}}}" style="color:{MUTED};">Unsubscribe</a>{{{{ open_tracking }}}}</td></tr></table>
</td></tr></table></body></html>
"""

EMAILS = {}
# ---------------- LEAD FLOW ----------------
EMAILS['lead-01'] = dict(subject="A little New York. A much better breakfast.", preview="Real New York bagels, delivered to your door.", timing="30 minutes after lead signup",
  html=LEAD_SOURCE + head("Real New York bagels, delivered to your door.") + headline("Your New York breakfast starts here", "Good mornings.<br>Delivered.") + body_open()
  + "<p>You came for New York bagels. Let&rsquo;s get a box headed your way.</p><p>Pick 3 sleeves of 4 &mdash; up to 3 flavors &mdash; and bring a little New York to your kitchen. Breakfast with the family, a weekend spread, or your everyday go-to: it starts with a great bagel.</p>"
  + button("{{ base }}{{ tail }}", "Build your box") + LEAD_OFFER + flavor_row() + foot("Pick your favorites. We&rsquo;ll handle the trip."))
EMAILS['lead-02'] = dict(subject="A dozen bagels. Plenty of good mornings.", preview="Enjoy some now. Slice and freeze the rest.", timing="24 hours after lead signup",
  html=LEAD_SOURCE + head("Enjoy some now. Slice and freeze the rest.") + headline("One box. More breakfasts.", "Your freezer&rsquo;s<br>new favorite.") + body_open()
  + "<p>Wondering what you&rsquo;ll do with a whole dozen? You don&rsquo;t have to eat them all today.</p>"
  + f"<h2 style=\"margin:22px 0 8px;font-size:20px;font-weight:900;text-transform:uppercase;color:{NAVY};\">Can&rsquo;t eat them all today?</h2><p>We don&rsquo;t use preservatives, so enjoy your bagels within 24 hours and freeze the rest. When you&rsquo;re ready, microwave for 30 seconds, toast, and enjoy &mdash; a real New York bagel, any morning.</p>"
  + button("{{ base }}{{ tail }}", "Pick your bagels") + LEAD_OFFER + flavor_row() + foot("A breakfast worth making room for."))
LEAD3_LINK = ("{%- if src == 'dozen' -%}{%- assign final_url = '" + SITE + "/discount/FINAL10?redirect=%2Fpages%2Fdozen-deal' -%}"
  "{%- else -%}{%- assign final_url = '" + SITE + "/discount/FINAL10?redirect=%2Fproducts%2Fbuild-your-box' -%}{%- endif -%}\n")
EMAILS['lead-03'] = dict(subject="One last nudge: take 10% off today", preview="Use FINAL10 and make your next breakfast a New York one.", timing="Day 4, 9 AM",
  html=LEAD_SOURCE + LEAD3_LINK + head("Use FINAL10 and make your next breakfast a New York one.") + headline("Your final follow-up", "Make today<br>a bagel day.") + body_open()
  + "<p>Here&rsquo;s one last reason to give us a try: take 10% off your first box with code FINAL10.</p><p>You&rsquo;ve had a look. Now it&rsquo;s time for the good part &mdash; pick your favorites and bring a New York breakfast home.</p>"
  + code_box("FINAL10", "Applied automatically with the button below.") + button("{{ final_url }}", "Order today &amp; save 10%")
  + "{%- if src == 'minis' -%}<p style=\"font-size:14px;color:" + MUTED + ";\">Heads up: FINAL10 can&rsquo;t be combined with the free mini bagels offer &mdash; use whichever you like better.</p>{%- endif -%}"
  + foot("This is our last reminder in this series. Your next move: breakfast.", "10% off one order with FINAL10; on subscriptions it applies to the first box. One use per customer. Can&rsquo;t be combined with other discount codes.")) 
# ---------------- CART / CHECKOUT FLOW ----------------
EMAILS['cart-01'] = dict(subject="Your next New York breakfast is waiting", preview="Pick up where you left off and finish your bagel order.", timing="1 hour after abandonment",
  html=CART_SOURCE + head("Pick up where you left off and finish your bagel order.") + headline("You have great taste", "Let&rsquo;s finish<br>that box.") + body_open()
  + "<p>Looks like you were putting together a pretty good breakfast.</p><p>Your box is saved. Pick up where you left off and complete your order when you&rsquo;re ready.</p>"
  + ITEMS + button("{{ recovery_url | escape }}", "Complete your order") + VALUE_STRIP + foot("A few clicks closer to a New York morning."))
EMAILS['cart-02'] = dict(subject="Still thinking about those bagels?", preview="Enjoy some now, freeze the rest. Here’s how.", timing="24 hours after abandonment",
  html=CART_SOURCE + head("Enjoy some now, freeze the rest. Here&rsquo;s how.") + headline("Good bagels. Simple plan.", "Enjoy now.<br>Freeze for later.") + body_open()
  + "<p>A whole dozen doesn&rsquo;t have to mean a whole dozen today.</p>" + ITEMS
  + f"<h2 style=\"margin:24px 0 8px;font-size:20px;font-weight:900;text-transform:uppercase;color:{NAVY};\">Can&rsquo;t eat them all today?</h2><p>We don&rsquo;t use preservatives, so enjoy your bagels within 24 hours and freeze the rest. When you&rsquo;re ready, microwave for 30 seconds, toast, and enjoy.</p>"
  + button("{{ recovery_url | escape }}", "Return to your box") + VALUE_STRIP + foot("Questions before you order? Just reply or visit our contact page."))
EMAILS['cart-03'] = dict(subject="Final reminder: your bagels + 10% off", preview="Finish your order today with code FINAL10.", timing="Day 4, 9 AM",
  html=CART_SOURCE + head("Finish your order today with code FINAL10.") + headline("Your final cart reminder", "Your bagels.<br>A sweeter deal.") + body_open()
  + "<p>One last follow-up about your box: use FINAL10 for 10% off your order today.</p><p>Return to checkout and enter FINAL10 in the discount code box before you pay.</p>"
  + code_box("FINAL10", "Enter this code at checkout.") + ITEMS + button("{{ recovery_url | escape }}", "Finish your order") + VALUE_STRIP
  + foot("This is our last cart reminder in this series.", "10% off one order with FINAL10; on subscriptions it applies to the first box. One use per customer. Can&rsquo;t be combined with other discount codes."))

os.makedirs(OUT, exist_ok=True)
meta = []
for k, v in EMAILS.items():
    with open(os.path.join(OUT, k + '.liquid'), 'w') as fh: fh.write(v['html'])
    meta.append({'id': k, 'timing': v['timing'], 'subject': v['subject'], 'preview_text': v['preview'], 'file': k + '.liquid', 'bytes': len(v['html'].encode())})
with open(os.path.join(OUT, 'email-settings.json'), 'w') as fh: json.dump(meta, fh, indent=2, ensure_ascii=False)
print(json.dumps(meta, indent=1, ensure_ascii=False))
