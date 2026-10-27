# Bad Boy Bagel Co. — Architecture Decision Records

Status key: **PROPOSED** (awaiting owner approval) · **APPROVED** · **SUPERSEDED**
Last updated: 2026-10-27 (rev 2: sleeve model, pricing, post-purchase upsells) · Author: Claude (dev/PM) · Owner/approver: Brendan

## Owner-confirmed requirements (2026-10-27)

- **R1 — Sleeves of 3.** Bagels are packed in sleeves of 3, one flavor per sleeve. A dozen = 4 sleeves, so a dozen can hold at most 4 flavors.
- **R2 — Post-purchase one-click upsells.** After checkout, offer one-click add-ons (examples: 6 free mini bagels, free bagel chips). The owner must be able to add new offer variations without code.
- **R3 — Subscribe & save pricing.** Dozen: **$44.95 one-time**, **$39.95 per monthly shipment** ($5.00 / ~11.1% off).

---

## ADR-001 — Theme foundation

**Status:** PROPOSED (low risk; recommended to approve with Phase 1)

**Decision:** Build an Online Store 2.0 Liquid theme starting from Shopify's maintained free reference theme (Dawn, or Horizon if it is the current recommended starter when we scaffold), heavily re-skinned. No Hydrogen/headless.

**Why:** Scope §4 calls for a maintained base, JSON templates and Theme Editor-editable sections. Starting from Shopify's own theme keeps checkout, accessibility, app blocks and future platform changes compatible. A from-zero theme adds weeks with no customer-visible benefit.

**Consequences:** We inherit Shopify's upstream structure; custom sections live under clear `bbb-` prefixes so upstream merges stay manageable. Paid themes are out unless you approve one.

---

## ADR-002 — Mix-and-match box + subscription architecture (P0 GATE)

**Status:** PROPOSED — **no box-builder code until you pick an option.**

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
- **One interval (monthly)** cuts subscription test scope roughly in half.
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
11. Post-purchase upsell (ADR-008): after a subscription checkout, accept a $0 "6 free minis" offer → confirm it lands on the same order, ships with the box, and does **not** recur on the next renewal (unless we decide it should).

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

**Pricing (owner-confirmed):** Dozen = $44.95 one-time · $39.95 per monthly shipment.

**Implementation:** Prices live in Shopify, never in theme code.
- One-time: product/variant price = $44.95.
- Subscription: one selling plan, "Delivered monthly," with a fixed-amount discount of $5.00 (or a fixed $39.95 price — whichever the chosen app supports). If you later change $44.95, the subscription price must still land on $39.95 — confirm which the app keeps fixed.

**Presentation on the product/builder page:**
- Two clearly labeled options, with **"Subscribe & save $5 — $39.95/month"** shown first and visually featured, plus "One-time purchase — $44.95."
- **Recommendation: the customer actively picks one.** Don't silently pre-check subscription. Several state auto-renewal laws require express affirmative consent and clear terms before billing info is collected — California, for example, requires express affirmative consent. New York's amended law (effective Nov 5, 2025) requires point-of-sale disclosures before billing information is requested. Featuring subscribe-and-save is fine; a buried pre-selection is the risk.
- Next to the add-to-cart button for subscriptions: "Renews monthly at $39.95 + shipping until you cancel. Skip, pause or cancel anytime in your account." Link to subscription terms.
- The federal FTC "click-to-cancel" rule was vacated by the Eighth Circuit in July 2025, so state laws are what currently bind. *Not legal advice — have counsel approve the final disclosure text and subscription terms.*

**Open questions:** Q-PRICE-1 shipping included or extra? Q-PRICE-2 "monthly" = calendar month or every 4 weeks? Q-PRICE-3 any other sizes (half dozen = 2 sleeves)?

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
- If the order already contains a subscription, post-purchase offers can only be **one-time** products — you can't add a second subscription or convert to one there (per UpsellPlus docs). That fits "6 free minis this shipment," but "add chips to every monthly box" would have to happen in the subscription portal instead.

### "Free" offers
A $0 offer (free minis/chips) is an engagement/retention gift, not AOV. Shopify's docs don't say how a $0 offer is processed — **must be tested in the POC** (some apps implement it as a 100% discount). Free items also add pack weight and cost; confirm with the commissary they can be added late.

### Options

| | **8A. Upsell feature of the chosen subscription app** | **8B. Dedicated post-purchase upsell app** (e.g., AfterSell, ReConvert, Zipify OneClickUpsell) | **8C. Custom post-purchase extension** |
|---|---|---|---|
| Fit | Simplest data flow; one vendor | Most mature offer builder: A/B tests, rules by cart contents, funnels | Full control |
| Owner adds new offers without code | Depends on app — verify | Yes | Only if we build an admin |
| Cost | Included or tier-gated — verify | Monthly fee, usually by order volume — **verify on live listings before approval** | Dev time + must request live access from Shopify; ongoing maintenance on an unversioned API |
| Recommendation | Check in POC; use if it covers R2 | **Default recommendation** if 8A can't do $0 offers and rule targeting | Not recommended |

**Next step:** during the ADR-002 POC, test 8A on Appstle. If it falls short, shortlist two 8B apps with verified current pricing for your approval.

**Offer catalog model:** each upsell item (Mini bagels ×6, Bagel chips) is a normal Shopify product with its own SKU, so it shows on the pick list. Offer rules (who sees what, price $0 or discounted) live in the app, editable by you.
