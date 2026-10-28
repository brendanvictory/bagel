# Phase 2 — Build Your Box: report

Date: 2026-10-27 · Architecture: ADR-002 **Option C** (custom theme builder + Shopify Subscriptions app)

## 1. Files changed
**New**
- `sections/bbb-box-builder.liquid` — 3-step builder (sleeves → add-ons → order options), summary, mobile sticky bar, JSON config, product structured data
- `assets/bbb-box-builder.js` — state, validation, URL state, edit-from-cart, add to cart (~260 lines, no dependencies)
- `assets/bbb-box-builder.css`
- `templates/product.build-your-box.json` — builder + short FAQ
- `snippets/bbb-cart-edit-box.liquid` — "Edit box" link on box lines, "In your box" on add-on lines
- `tools/preview/render-builder.js`, `test-builder.js`, `shoot-builder.js` — mock render, behavior tests, screenshots

**Modified**
- `sections/main-cart-items.liquid`, `snippets/cart-drawer.liquid` — render the edit snippet
- `templates/index.json`, `sections/footer-group.json` — "Build your box" buttons → `/products/build-your-box`; hero and Subscribe & save read prices from the box product (edited around Shopify's Theme Editor changes)
- `docs/DECISIONS.md` — ADR-002 approved; R3 prices $45.95 / $39.95; R8 add-ons $9.95; ADR-009 shipping included

**Store data created (via Shopify connector, all DRAFT)**
- Metaobject definition `bagel_flavor` (name, description, allergen note, available; storefront readable) + 10 flavors
- Product metafield definitions `custom.flavors`, `custom.addons`, `custom.sleeves_per_box`, `custom.bagels_per_sleeve`
- **Build Your Dozen** `/products/build-your-box` — $45.95, SKU BBB-DOZEN, inventory not tracked, template `build-your-box`, 10 flavors, 2 add-ons, 4 sleeves × 3
- **Mini Bagels (6)** — $9.95, SKU BBB-MINI-6 · **Bagel Chips** — $9.95, SKU BBB-CHIPS

## 2. How it works
- Customer picks exactly 4 sleeves (repeats allowed; max 4 flavors follows automatically). Unavailable flavors (uncheck "Available" on the flavor) can't be added.
- Order options: One-time $45.95 or Subscribe and Save $39.95 with a live "% off" badge; frequency from the plan; "*Cancel, pause and adjust anytime."
- Nothing is pre-selected by default (setting "Pre-selected purchase option" can change it — see ADR-007).
- Cart receives: 1 box line with properties `Sleeve 1`–`Sleeve 4` and hidden `_box_id`; add-on lines with the same `_box_id`, subscribed on the box's plan or on their own plan with the same name.
- State is in the URL, so refresh/back keep the box. "Edit box" in the cart reopens the builder pre-filled and replaces the old box and its add-ons.

## 3. Checks
- Theme Check: 0 errors; 9 warnings identical to stock Dawn.
- **44/44 browser tests pass** (mock data, `tools/preview/test-builder.js`): limits, unavailable flavors, validation messages, live totals and badge, disclosure text, URL restore, junk URL input rejected, double-click sends one request, exact cart payload, add-on plan matching, edit-from-cart removal order, keyboard, accessible names, tap targets, no JS errors.
- No horizontal scroll at 360 / 390 / 768 / 1440.
- **Not yet verified on real Shopify** — see blockers.

## 4. Owner setup steps (needed before the builder works in preview)
1. **Install Shopify Subscriptions** (free, by Shopify) from the App Store.
2. In the app, **create a plan for Build Your Dozen**: delivery every **4 weeks**, discount **fixed amount $6.00** (→ $39.95). Name it e.g. "Delivered every 4 weeks".
3. **Create a second plan for the add-ons** (Mini Bagels, Bagel Chips): every **4 weeks**, **no discount**, with **exactly the same name**. (A plan's discount applies to every product in it, so add-ons can't share the $6-off plan without dropping to $3.95.)
4. **Set the three products to Active.** The store is password-protected, so this doesn't make them public. Confirm they're on the Online Store sales channel.
5. **Shipping:** in Settings → Shipping and delivery, give these products a **$0 rate** (shipping is included in the price).
6. **Payments:** test mode / Bogus Gateway on.

### Update 2026-10-27 (evening)
- Owner set products Active and created Shopify Subscriptions plans: box "Deliver every 4 weeks, $6.00 off" (fixed $6 → $39.95); add-ons "Deliver every 4 weeks" (no discount). Verified via Admin API: both 4-week billing and delivery.
- Products were not on the Online Store channel (storefront 404) — published all three.
- Builder now matches add-ons to the box's plan by **delivery frequency option** ("Deliver every 4 weeks"), not by plan name, so add-ons recur even though the plan names differ. Frequency text shows the option value. 46/46 tests pass.

## 5. Blockers / open risks (honest status)
1. **Renewal composition is unproven.** Whether Shopify Subscriptions copies the `Sleeve 1–4` properties onto renewal orders must be tested with a real test checkout + renewal (ADR-002 POC steps 3–6). If it doesn't, ADR-002 says fall back to Appstle.
2. **Two plans → one or two renewal orders?** If box and add-ons sit on different plans, Shopify may create two subscription contracts (two renewal orders, two shipments). Must check in the same test. Fallbacks: one shared plan with a %-discount and adjusted add-on prices, or Appstle.
3. **Customer flavor changes on renewal** — Shopify Subscriptions' customer portal may not let customers edit line properties; likely needs a manual process or a later portal customization.
4. **Server-side validation** not in place (theme can't do it). Price can't be tampered (Shopify prices the line), only the flavor text. Follow-up: Cart and Checkout Validation Function.
5. Packing slip doesn't yet group add-ons under their box — Phase 3 (shipping/ops).
6. Allergen notes and flavor descriptions are empty in admin — owner to fill.

## 6. Acceptance checklist (owner)
- [ ] Setup steps 1–6 done
- [ ] `/products/build-your-box` preview: can't add an incomplete box; 4 sleeves + option → cart shows Sleeve 1–4
- [ ] Prices: one-time $45.95, subscription $39.95, add-ons +$9.95 "every box"
- [ ] Edit box from cart restores selections and replaces the old box
- [ ] Test checkout (test mode): order admin shows Sleeve 1–4 on the box line
- [ ] Renewal test: renewal order keeps Sleeve 1–4 and the add-ons, in one order
