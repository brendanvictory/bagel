# Remarketing flows (Shopify Messaging)

Source: `NYBE_Shopify_Remarketing_Kit.zip`, rebranded. Regenerate the emails with
`python3 tools/email/build_emails.py` (writes `docs/marketing/emails/*.liquid` and `email-settings.json`).
Each file is pasted into Messaging → email → **Code your own** (limit 500KB; ours are about 8–11KB).

## Lead flow (emails only for now)
Trigger: customer tagged `lead` (set by the builder's ZIP check). Exit when the customer places an order.
Offer and links follow the source tag: `lead-builder` → /products/build-your-box (free shipping),
`lead-free-minis` → /pages/free-minis#build (6 free minis), `lead-dozen-deal` → /pages/dozen-deal#build ($19.95 Subscribe & Save, $24.95 one-time, $14.95 shipping per box).

| Email | Send | Subject |
|---|---|---|
| lead-01 | 30 min | A little New York. A much better breakfast. |
| lead-02 | 24 hr | A dozen bagels. Plenty of good mornings. |
| lead-03 | Day 4, 9 AM | One last nudge: take 10% off today |

## Abandoned cart / checkout flow (3 emails + 3 SMS)
Live in Shopify Flow as "NYBE - Abandoned checkout recovery (3 emails + 3 SMS)". SMS only goes to customers with SMS marketing consent and uses the Messaging "Abandoned checkout" SMS template's Recovery URL. Every step after the first email sits behind a "checkout not completed" condition.

| Step | Send | Content |
|---|---|---|
| cart-01 email | 1 hr | Your next New York breakfast is waiting |
| SMS 1 ("Cart SMS 1 (4 hr)") | 4 hr | Still thinking about those bagels? Finish your order: [Recovery URL] |
| cart-02 email | 24 hr | Still thinking about those bagels? |
| SMS 2 ("Cart SMS 2 (48 hr)") | 48 hr | Your bagels are waiting. Enjoy now, freeze the rest: [Recovery URL] |
| cart-03 email | Day 4 | Final reminder: your bagels + 10% off |
| SMS 3 ("Cart SMS 3 (Day 4)") | Day 4 + 7 hr | Final reminder! Use FINAL10 at checkout for 10% off: [Recovery URL] |

Shopify adds the "New York Bagel Express:" prefix and its own STOP/opt-out link to every SMS; don't add a second "Reply STOP". Copy is kept short so each message stays 1 SMS segment.

## Rules
- FINAL10: 10% off, one use per customer, first cycle only on subscriptions, no combining with other codes.
- Turn off Shopify's default abandoned-checkout email so customers don't get two.
- No delivery-speed claims: we ship Monday–Wednesday from Long Island; Wednesday–Sunday orders ship the following Monday. Lower 48 + DC only.
