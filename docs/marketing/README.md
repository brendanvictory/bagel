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
SMS only goes to customers with SMS marketing consent. Use the automation's own recovery-link field in SMS.

| Step | Send | Content |
|---|---|---|
| cart-01 email | 1 hr | Your next New York breakfast is waiting |
| SMS 1 | 4 hr | NY Bagel Express: Still thinking about those bagels? Pick up where you left off and finish your order here: [RECOVERY LINK] |
| cart-02 email | 24 hr | Still thinking about those bagels? |
| SMS 2 | 48 hr | NY Bagel Express: Your bagel picks are waiting. Enjoy some now, freeze the rest for another morning. Return to your order: [RECOVERY LINK] |
| cart-03 email | Day 4, 9 AM | Final reminder: your bagels + 10% off |
| SMS 3 | Day 4, 4 PM | NY Bagel Express: Final cart reminder! Finish your order today and enter FINAL10 at checkout for 10% off: [RECOVERY LINK] |

Shopify appends its own opt-out text to SMS; don't add a second "Reply STOP".

## Rules
- FINAL10: 10% off, one use per customer, first cycle only on subscriptions, no combining with other codes.
- Turn off Shopify's default abandoned-checkout email so customers don't get two.
- No delivery-speed claims: we ship Monday–Wednesday from Long Island; Wednesday–Sunday orders ship the following Monday. Lower 48 + DC only.
