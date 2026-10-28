# Bad Boy Bagel Co. — Architecture Decision Records

Status key: **PROPOSED** (awaiting owner approval) · **APPROVED** · **SUPERSEDED**
Last updated: 2026-10-27 (rev 2: sleeve model, pricing, post-purchase upsells) · Author: Claude (dev/PM) · Owner/approver: Brendan

## Owner-confirmed requirements (2026-10-27)

- **R1 — Sleeves of 3.** Bagels are packed in sleeves of 3, one flavor per sleeve. A dozen = 4 sleeves, so a dozen can hold at most 4 flavors.
- **R2 — Post-purchase one-click upsells.** After checkout, offer one-click add-ons (examples: 6 free mini bagels, free bagel chips). The owner must be able to add new offer variations without code.
- **R3 — Subscribe & save pricing (revised 2026-10-27).** Dozen: **$45.95 one-time**, **$39.95 per shipment every 4 weeks** ($6.00 / ~13% off). **Shipping included** in both (ADR-009 Option A).
- **R8 — Add-on prices.** Mini Bagels (6) **$9.95**, Bagel Chips **$9.95**; they recur on every subscription shipment once added.
- **R4 — Cadence is every 4 weeks** (13 shipments/year, not 12). Customer-facing copy says "every 4 weeks," never "monthly."
- **R5 — The same flavor may fill more than one sleeve** (e.g., 4 × Everything is valid).
- **R6 — Upsell items recur.** Mini bagels and bagel chips are existing commissary products. Once accepted, an upsell item is added to **every future shipment** of that subscription.
- **R7 — Ship-day windows.** 3-day service ships Mon–Tue only; 2-day service ships Mon–Wed only.

---

## ADR-001 — Theme foundation

**Status:** PROPOSED (low risk; recommended to approve with Phase 1)

**Decision:** Build an Online Store 2.0 Liquid theme starting from Shopify's maintained free reference theme (Dawn, or Horizon if it is the current recommended starter when we scaffold), heavily re-skinned. No Hydrogen/headless.

**Why:** Scope §4 calls for a maintained base, JSON templates and Theme Editor-editable sections. Starting from Shopify's own theme keeps checkout, accessibility, app blocks and future platform changes compatible. A from-zero theme adds weeks with no customer-visible benefit.

**Consequences:** We inherit Shopify's upstream structure; custom sections live under clear `bbb-` prefixes so upstream merges stay manageable. Paid themes are out unless you approve one.

---

## ADR-002 — Mix-and-match box + subscription architecture (P0 GATE)

**Status:** **APPROVED 2026-10-27 — Option C** (custom theme builder + Shopify Subscriptions app). Owner inputs: commissary bakes to order (no per-flavor inventory); 10 launch flavors (Plain, Everything, Sesame, Poppy, Onion, Garlic, Cinnamon Raisin, Egg, Whole Wheat, Pumpernickel). **Exit condition:** if the renewal test shows the Shopify Subscriptions app does not carry the 4 sleeve selections onto renewal orders, fall back to Option A (Appstle).

**Implementation of C:**
- Box product "Build Your Dozen" ($44.95), template `product.build-your-box`. Flavors are `bagel_flavor` metaobjects referenced from the product metafield `custom.flavors`; add-ons from `custom.addons`.
- Cart line = 1 box with line-item properties `Sleeve 1`…`Sleeve 4` (one flavor each, repeats allowed) plus hidden `_box_id`. Add-ons are separate lines tagged with the same `_box_id` and the same selling plan, so they recur with the subscription (R6).
- Selling plan is created **inside the Shopify Subscriptions app** (not via API) so that app owns and renews the contracts.
- Server-side validation: not in theme. Price is fixed per box regardless of flavors, so a tampered request can only produce an odd flavor list, not a wrong price. Follow-up: Cart and Checkout Validation Function in a small custom app (plan eligibility to verify).

**Original status:** PROPOSED — no box-builder code until you pick an option.

### The constraint (verified 2026-10-27)

- Shopify's help center states bundles are not compatible with purchase options (subscriptions, pre-orders) and **are not compatible with the Shopify Subscriptions app**. The free Shopify Bundles app only does fixed bundles and multipacks — no mix-and-match.
- Shopify's developer docs repeat that bundles can't be sold with selling plans.
- Shopify's new `SubscriptionContractCalculation` API (Admin API 2026-10) is the first to support bundle products inside subscription contracts. It was only in early access/release candidate; Shopify's own changelog says not to build production integrations until 2026-10 is stable. **Third-party apps have not had time to adopt it. We will not rely on it for launch.** (Revisit in ~6 months — see ADR-002-F.)

So "native Shopify Bundles + subscriptions" is ruled out. Every viable path uses a subscription app that owns its own box logic, or a deliberate simplification.

### Options

| | **A. Appstle Subscriptions (Build-a-Box)** | **B. Skio Build-a-Box** (or Recharge Plus bundles) | **C. Single "Dozen" product + Shopify Subscriptions app + flavor properties** |
|---|---|---|---|
| Monthly cost | Free tier, paid tiers up to ~$100/mo (third-party reviews, Aug 2026) | Skio: $599/mo month-to-month or $499/mo annual. Recharge Plus: $499/mo, 12-month term | $0 app fee (Shopify Subscriptions is free) |
| Transaction fee | Reported **0%** on all plans | Skio: 1% + 20¢ per order containing a subscription. Recharge Plus: 1.34% + 19¢ (applies to shipping/tax and to refunded orders) | 0% |
| Mix-and-match subscriptions | Yes (Build-a-Box) — **must verify flavor-level line items on renewals in POC** | Yes, documented: Skio renewals pass each product in the box as its own line item at $0, with the box price on the parent line | Not a real bundle. One SKU ("Build Your Dozen") with selling plans; flavor counts stored as line-item properties |
| Inventory | Per-flavor product deduction (to verify) | Per-flavor via $0 component lines | Only the parent SKU decrements; no per-flavor stock |
| Packer view | Component lines on order (to verify) | Component lines on order | Properties shown on order / packing slip (needs a packing-slip template edit) |
| Customer changes flavors on renewal | Via Appstle portal (to verify) | Via Skio portal | **Unknown/likely manual** — must test whether properties persist on renewal with Shopify Subscriptions |
| Theme control | App widget/page, styled by us; less layout control | Skio-hosted builder page (`/a/account/...`) + theme snippet; Recharge uses its own widget/template | Full control — our own Liquid + light JS builder |
| Lock-in / exit | Low–medium | High (Recharge Plus 12-month term; Recharge acquired Skio Apr 2026 — pricing direction uncertain) | Lowest |
| Fit for launch volume | Good | Overkill until subscription revenue is meaningful | OK if the commissary bakes to order and never needs flavor stock tracking |

Sources: Shopify Help Center (bundles eligibility), shopify.dev (bundles; subscription contracts with bundles; SubscriptionContractCalculation changelog), Skio help center (Static Build-a-Box; Shopify Bundles compatibility), Shopify App Store listings, swell.is Recharge/Skio pricing teardowns (Sep 2026), fudge.ai subscription app roundup (Aug 2026). **All pricing must be re-checked on the live App Store listing before you approve any paid plan.**

### How R1 and R3 change the options

- **The unit of selection is a sleeve, not a bagel.** The builder asks for 4 sleeves ("Pick 4 sleeves — 3 bagels each"), not 12 individual bagels. That's fewer taps on mobile, and the "max 4 flavors" rule enforces itself.
- **Each flavor becomes a sleeve SKU** (e.g., "Everything — Sleeve of 3"). The pick list then reads "Everything × 2 sleeves, Plain × 1, Sesame × 1," which matches how packers work.
- **The box price is fixed** regardless of flavor mix. Fixed-price boxes are the simplest case for every option: Appstle's fixed-price build-a-box, Skio's Static Build-a-Box, or Option C's single product with two prices.
- **One interval (every 4 weeks)** cuts subscription test scope roughly in half.
- **R6 (recurring upsells) pulls the other way.** The accepted item has to be written into the subscription contract, not just the first order. Upsell-app docs (AfterSell) only confirm "modify an existing subscription" when connected to **Recharge, Skio, Loop or Stay AI** — Appstle and Shopify's own Subscriptions app aren't confirmed. If we take R6 to mean post-purchase acceptance, that favors Option B (or Loop as a new Option D to price out). See ADR-008 for a design that avoids this.
- Net effect: **Option C gets more attractive** (one product, one selling plan, four sleeve picks stored on the line). Option A is still the safer bet for per-flavor inventory and customer self-serve flavor changes.

### Recommendation

**Run a 2-day proof of concept of Option A and Option C side by side on a free Shopify development store**, then pick based on evidence.

- **Primary candidate: A (Appstle).** Lowest cost of the real-bundle options, no transaction fee, documented build-a-box. Risk: its storefront builder is less customizable than our own, and renewal composition must be proven, not assumed.
- **Fallback/lean option: C.** Viable *only if* answers to Q-OPS-1/2 below say the commissary bakes to order (so per-flavor inventory doesn't matter) and the POC proves flavor properties survive renewals. If they don't survive, C cannot meet scope §7 and is rejected.
- **Premium fallback: B (Skio).** Best-documented renewal composition. Justified later if subscriptions become a large share of revenue. Not recommended at launch on cost.

### POC test script (evidence required before approval is final)

Each run on the dev store with Shopify's Bogus Gateway (no real money):

1. Build a dozen from 4 sleeves: 2 × Everything, 1 × Plain, 1 × Sesame. Also test 4 different flavors, and 4 × the same flavor. Confirm a 5th sleeve can't be added.
2. Check out one-time → screenshot cart, order admin, packing slip.
3. Check out subscription (every 2 weeks) → same screenshots + subscription contract record.
4. Trigger first renewal (app's "process now"/billing attempt) → confirm the renewal order contains the same four flavors and counts.
5. Change flavor mix in the customer portal → trigger second renewal → confirm new composition.
6. Mark one flavor sold out → trigger renewal → record behavior (substitution? skip? fail?).
7. Skip, pause, cancel; failed-payment (Bogus Gateway decline) → record notifications.
8. Apply a discount code to one-time and to subscription → confirm pricing.
9. Tamper test: post a 3-sleeve or 5-sleeve box via `/cart/add.js` → confirm it is blocked or corrected server-side (cart validation Function or app logic).
10. Price check: one-time box charges $44.95; subscription box charges $39.95 on the first order **and** on each renewal.
11. Recurring add-on (R6, ADR-008): add "6 free minis" in the builder step → confirm it is on the first order **and** on renewals 1 and 2, and that the customer can remove it in the portal.
12. Post-purchase offer on a subscription order: accept "free bagel chips" → record whether the app can add it to the subscription contract (recurring) or only to this one order.
13. Renewal timing (R4, ADR-009): first order on a Monday → renewals bill on Mondays (28 days); first order on a Thursday → record when renewals bill and how the ship-day window is applied.
14. Shipping on renewals: confirm the delivery method and price chosen at first checkout carry onto renewal orders, and how a customer changes it.

Output: `docs/poc/ADR-002-evidence.md` with screenshots per step, pass/fail table.

### Decision needed from you

1. Approve the POC on a free development store (A + C)? Installing Appstle on a dev store is not a paid commitment, but you said no app selection without approval — so I'm asking.
2. Any hard monthly ceiling for the subscription app?

### ADR-002-F (future)

When at least one subscription app ships support for Shopify-native bundle contracts (2026-10 API), re-evaluate moving to native Shopify bundles for cleaner inventory and Shop/POS compatibility.

---

## ADR-003 — Server-side box validation

**Status:** PROPOSED (detail depends on ADR-002)

Client-side counting is for UX only. Invalid boxes must be rejected where the customer can't tamper: the chosen app's own validation (A/B), or a **Cart and Checkout Validation Function** (C). If we need a custom Function, that requires a small custom app deployed with Shopify CLI — no secrets in theme code. Note: whether a custom app containing a Function can be deployed depends on the store's plan and app type, and Shopify has changed this over time — **unverified; confirm against current docs and the store's plan during the POC** before Option C is approved.

---

## ADR-004 — Email platform

**Status:** OPEN — decide in Phase 4.
Shopify Email (included with 10,000 free emails/mo) vs Klaviyo. Default recommendation: Klaviyo if subscriptions launch (better subscription-event flows and integrations with Appstle/Skio/Recharge); Shopify Email if launching one-time only.

---

## ADR-005 — Reference site usage

**Status:** APPROVED by scope §1

bagelkings.com is used for **funnel inspiration only**: single long-scroll home, one dominant "choose your box" CTA repeated per section, numbered 3-step how-it-works, FAQ accordion, and a stepped chooser (choose box type → customize → frequency → checkout). We will **not** copy its copy, images, layout code, badges or claims ("free 2-day shipping," "voted best," "money-back guarantee") — and we won't make equivalent claims for Bad Boy unless you verify them.

Observed detail worth copying *as an operational question*: they ship 12-counts in two 6-bagel sleeves and limit an order to two flavors. If the commissary has a similar packing constraint, the box builder must enforce it (see Q-OPS-3).

---

## ADR-006 — Brand assets and color

**Status:** OPEN — needs owner input

Sampled from the supplied logo PNG: the blue renders around **#65BCFD**, which is noticeably brighter and more saturated than the scope's #7BAFD4 Carolina blue. The file is a 1254×1254 RGB raster on an off-white background (no transparency, no vector).

Proposed: design tokens use **#7BAFD4** as `--color-brand` per scope; the logo stays as supplied until a vector master is produced, then re-exported in #7BAFD4. Also: #7BAFD4 on white is ~2.3:1 contrast — fine for display/decoration, **not** for body text or button labels. Buttons will use #101010 text on Carolina blue (≈ 8:1) or white-on-black.

---

## ADR-007 — Subscribe & save pricing and checkout presentation

**Status:** PROPOSED (prices APPROVED by owner; presentation needs approval)

**Pricing (owner-confirmed):** Dozen = $44.95 one-time · $39.95 per shipment, every 4 weeks (R4). If ADR-009 picks customer-selected shipping, these prices drop and are re-approved.

**Implementation:** Prices live in Shopify, never in theme code.
- One-time: product/variant price = $44.95.
- Subscription: one selling plan, "Delivered every 4 weeks," with a fixed-amount discount of $5.00 (or a fixed $39.95 price — whichever the chosen app supports). If you later change $44.95, the subscription price must still land on $39.95 — confirm which the app keeps fixed.

**Presentation on the product/builder page:**
- Two clearly labeled options, with **"Subscribe & save $5 — $39.95 every 4 weeks"** shown first and visually featured, plus "One-time purchase — $44.95."
- **Recommendation: the customer actively picks one.** Don't silently pre-check subscription. Several state auto-renewal laws require express affirmative consent and clear terms before billing info is collected — California, for example, requires express affirmative consent. New York's amended law (effective Nov 5, 2025) requires point-of-sale disclosures before billing information is requested. Featuring subscribe-and-save is fine; a buried pre-selection is the risk.
- Next to the add-to-cart button for subscriptions: "Renews every 4 weeks at $39.95 [+ shipping, if ADR-009 B] until you cancel. Skip, pause or cancel anytime in your account." Link to subscription terms.
- The federal FTC "click-to-cancel" rule was vacated by the Eighth Circuit in July 2025, so state laws are what currently bind. *Not legal advice — have counsel approve the final disclosure text and subscription terms.*

**Answered:** every 4 weeks (R4). **Open:** shipping model (ADR-009); Q-PRICE-3 any other sizes (half dozen = 2 sleeves)?

**Every-4-weeks side effect worth using:** 28 days is exactly 4 weeks, so renewals always fall on the **same weekday** as the first order. If the subscription app lets us anchor the billing day (verify in POC), we can bill renewals on Sunday/Monday so they land inside every ship window.

---

## ADR-008 — Post-purchase one-click upsells (R2)

**Status:** PROPOSED — requires choosing an app (paid-app approval needed)

### Platform facts (verified 2026-10-27, shopify.dev post-purchase docs)
- Post-purchase offers run on Shopify's post-purchase checkout extension. It is still labeled **beta**: usable freely on dev stores, but a live store must request access — established upsell apps already have it, which is the main reason to use an app rather than build our own.
- **Only one app per store** can provide post-purchase offers (chosen in checkout settings). This rules out stacking e.g. Appstle's upsells plus a separate upsell app.
- **The offer page does not appear for Apple Pay, Google Pay, Klarna, Affirm, gift cards or other non-card payments.** The customer's card must be vaulted. On mobile paid traffic, a large share of buyers use wallets — **a meaningful share of customers will never see the upsell.** We'll measure this rather than guess.
- Unsupported gateways that keep CVV (Braintree, Payflow Pro, PayPal Payments Pro, Eway). Shopify Payments is fine.
- Max **3 accepted offers per checkout**; order must be ≥ $0.50; Online Store channel only.
- Orders are placed on a short **fulfillment hold** (released when the customer reaches the order status page, or after 1 hour). Commissary cutoffs must account for this.
- Analytics pixels only see the **initial** purchase; upsell revenue must be read from Shopify reports or the app.
- If the order already contains a subscription, post-purchase offers can only be **one-time** products — you can't add a second subscription or convert to one there (per UpsellPlus docs). That conflicts with R6 (upsells recur) — see "Design for R6" below.

### "Free" offers
A $0 offer (free minis/chips) is an engagement/retention gift, not AOV. Shopify's docs don't say how a $0 offer is processed — **must be tested in the POC** (some apps implement it as a 100% discount). Free items also add pack weight and cost; confirm with the commissary they can be added late.

### Options

| | **8A. Upsell feature of the chosen subscription app** | **8B. Dedicated post-purchase upsell app** (e.g., AfterSell, ReConvert, Zipify OneClickUpsell) | **8C. Custom post-purchase extension** |
|---|---|---|---|
| Fit | Simplest data flow; one vendor | Most mature offer builder: A/B tests, rules by cart contents, funnels | Full control |
| Owner adds new offers without code | Depends on app — verify | Yes | Only if we build an admin |
| Cost | Included or tier-gated — verify | Monthly fee, usually by order volume — **verify on live listings before approval** | Dev time + must request live access from Shopify; ongoing maintenance on an unversioned API |
| Recommendation | Check in POC; use if it covers R2 | **Default recommendation** if 8A can't do $0 offers and rule targeting | Not recommended |

### Design for R6 (recurring upsells) — RECOMMENDED

Split upsells into two places instead of forcing everything through the post-purchase page:

1. **Recurring add-ons go in the builder, before checkout** — a final "Add to every box" step after the 4 sleeves: "+ 6 mini bagels — FREE every shipment," "+ Bagel chips — FREE every shipment." Because they're in the cart with the subscription, they become part of the subscription contract natively and recur on every renewal with every subscription option (A, B or C). They also reach **Apple Pay / Google Pay buyers**, who never see a post-purchase page. Offers are managed as theme settings (pick product, label, on/off) — editable without code.
2. **Post-purchase page is for one-time "this box only" extras**, or recurring adds **only if** the chosen apps can write to the existing subscription. Per AfterSell's docs that's confirmed only with Recharge, Skio, Loop or Stay AI connected; UpsellPlus's Appstle integration describes upgrading a subscription, not adding an item to it. **Unverified for Appstle and Shopify Subscriptions.**

**Business check:** a free item on every renewal is a permanent cost on every 4-week shipment. Confirm minis/chips cost + pack weight fits the $39.95 margin, or make them paid add-ons (e.g., "+$4.95 every box").

**Free $0 lines in subscriptions:** confirm in POC that the subscription app renews a $0 line (some apps skip or reject $0 contract lines). Fallback: small price with an equal automatic discount.

**Next step:** during the ADR-002 POC, test 8A on Appstle. If it falls short, shortlist two 8B apps with verified current pricing for your approval.

**Offer catalog model:** each upsell item (Mini bagels ×6, Bagel chips) is a normal Shopify product with its own SKU, so it shows on the pick list. Offer rules (who sees what, price $0 or discounted) live in the app, editable by you.


---

## ADR-009 — Shipping model and ship-day rules

**Status:** **DECIDED 2026-10-27 — Option A, shipping included** in $45.95 / $39.95. Store needs a $0 shipping rate for these products (Settings → Shipping and delivery). Margin risk on far zones remains with the business — carrier quotes still recommended.

**Implemented 2026-10-28 (owner approved):** delivery profile **"Bagel boxes — shipping included"** holds Build Your Dozen, Mini Bagels (6) and Bagel Chips. Ships from 111 Broadway, Amityville. Zone **"Lower 48 + DC"**, single rate **"Free shipping" $0.00** ("Included in your box price. Ships Monday–Wednesday."). **Not served (no rate → checkout blocks):** Alaska, Hawaii, US territories, APO/FPO/DPO — default chosen by Claude, owner can add them. General profile left as-is (Standard $8 / Express $15) for any future non-box products. Test order #1001 (before the fix) charged $15; its subscription contract still carries $8 renewal shipping — edit or cancel that test contract.

**Owner input:** either shipping is included in $44.95 / $39.95, **or** prices drop significantly and the customer picks a shipping speed. Ship-day rules: **3-day ships Mon–Tue only; 2-day ships Mon–Wed only** (keeps bagels out of carrier weekends).

| | **A. Shipping included** | **B. Lower price + customer selects speed** | **C. Hybrid (recommended to evaluate)** |
|---|---|---|---|
| Customer sees | One clean price, "free shipping" | Lower headline price; shipping added at checkout | Price includes 3-day; 2-day is a paid upgrade |
| Margin risk | High on far zones/2-day — you eat the worst case | Lowest — customer pays real speed cost | Medium — you eat 3-day, they pay for speed |
| Paid-ads fit | Strongest ("free shipping" offer) | Weakest (surprise cost at checkout lowers conversion) | Strong |
| Build effort | Lowest | Medium | Medium |

**How ship-day rules work on Shopify:** Shopify shipping rates set the **price** of each method, not which weekday it ships. So the rule is enforced in two places:
1. **Fulfillment:** orders are batched — a 3-day order placed Wed–Sun ships the next Monday; a 2-day order placed Thu–Sun ships the next Monday. Written into the commissary SOP and, if their ship software supports it, a ship-date rule.
2. **Customer messaging:** method names/descriptions and an on-page notice computed from cutoff settings ("Order by Tue 11:59pm ET for 3-day — ships Tue"; otherwise "ships next Monday"). Cutoff times live in theme settings, not hardcoded. No promised delivery date until carrier transit times are verified.

**Renewals:** combined with every-4-weeks billing on a fixed weekday (ADR-007), anchoring renewals to Sunday/Monday means subscription boxes always ship at the start of a window.

**Needed to decide:** ship-from ZIP, carrier, packed weight/dimensions, and carrier cost for 2-day and 3-day across zones 2–8. With that, I'll build a margin table for A/B/C.


## Owner-confirmed claims (for copy)
- 2026-10-28: bagels are **hand-rolled**; About Us line "built by people who've spent their working lives behind a bagel counter" confirmed accurate.
- Earlier: 30+ years in NY bagel business; 28 retail locations; Long Island commissary (111 Broadway, Amityville); baked and shipped same day; ships Mon–Wed; no preservatives; kosher facility with peanut-free process.

## ADR-010 — Lead capture before Subscribe & Save (owner request 2026-10-28)
**Status 2026-10-28 (13:41 ET): turned OFF by owner** — `lead_enabled` is false in `product.build-your-box` and `page.free-minis` and the default is off. Code stays in the builder; tick “Ask for name, email, phone and ZIP before page 2” in the Theme Editor to bring it back.
**Decision:** a "Delivery check" step between page 1 (sleeves) and page 2 (add-ons, plan, price).
- Fields: name, ZIP (required), email (required), phone (optional), unticked text-message opt-in.
- The ZIP check is real: lower 48 + DC pass; AK, HI, PR/VI, Guam/Pacific territories and APO/FPO get an honest "we can't ship there yet" message and don't continue.
- Saved with Shopify's built-in customer form (no app, $0): creates or updates a customer **subscribed to email marketing**, tagged `lead`, `lead-<source>` (`lead-builder`, `lead-free-minis`), `zip-<ZIP>`, `sms-optin` (box ticked and phone given), `out-of-area`. The disclosure under the button says so.
- Text messages: the `sms-optin` tag records the opt-in only. Shopify's customer form can't set SMS consent; texting needs an SMS tool (e.g. Shopify Messaging or Klaviyo) that imports these opt-ins. Counsel should review the SMS wording before any texts go out.
- After success: green check, then auto-continue to page 2 (Back from page 2 returns to page 1). Shown once per device (localStorage) and skipped for signed-in customers and cart edits. If saving fails (network, spam challenge) the shopper continues anyway — a sale is never blocked by lead capture.
- Remarketing audience: Customers → segment `customer_tags CONTAINS 'lead' AND number_of_orders = 0` (in Shopify Email, or exported to Meta/Google). Not done: putting the email into the checkout URL for Shopify's abandoned-checkout emails, because that puts personal data in URLs that analytics pixels can read.
- Events for analytics later: `bbb:builder-lead`, `bbb:lead` (no personal data in the event detail).

## ADR-011 — "Buy a dozen, get 6 mini bagels free" landing page (owner request 2026-10-28)
- Page `/pages/free-minis` (template `page.free-minis`): hero, deal steps, box builder in promo mode, about, offer FAQ, CTA. Only ad traffic to this page gets the offer (owner choice).
- Discount code **FREEMINIS** (Buy X Get Y; created 2026-10-28, `DiscountCodeNode/1544605925618`): buy 1 Build Your Dozen (one-time or subscription) → 1 Mini Bagels (6) at 100% off; one use per order and per customer; combines with shipping discounts only.
- The builder adds the free minis as a **one-time** line (`_offer: FREEMINIS`, same `_box_id`), so they ship with the first box only (owner choice), then sends the shopper through `/discount/FREEMINIS?redirect=/checkout`. Minis are not offered again as a paid add-on on this page. Shopify doesn't let BXGY codes be limited to one-time lines, so if someone adds a subscribed minis pack from elsewhere, check which line the code discounted.
- Known limit: "Edit box" from the cart goes to the regular builder, so editing drops the free pack (the cart shows "Free with your dozen" on that line).
