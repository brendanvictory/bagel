# Bad Boy Bagel Co. — Implementation Plan

Version 0.1 · 2026-10-27 · Status: Phase 0 (Discovery) in progress
Source of truth: `Bad_Boy_Bagel_Co_Claude_Shopify_Build_Scope.docx` v1.0. Decisions live in `docs/DECISIONS.md`; tests in `docs/QA_CHECKLIST.md`.

---

## 1. Discovery findings (2026-10-27)

### What exists
| Item | Status |
|---|---|
| Shopify store | **None.** From-scratch build. |
| Shopify Partner account / dev store | Unknown — needed for free testing (Q-ACC-1). |
| Theme repo | None. Local repo initialized here with `docs/` only. |
| Domain | Not chosen/approved. |
| Brand assets | One 1254×1254 RGB PNG logo, off-white background, no transparency, no vector. Blue samples ≈ #65BCFD vs scope target #7BAFD4. |
| Product photos, copy, menu, prices | None supplied. |
| Shipping / ops facts | None supplied. |

### Tooling verified in this workspace
- Node 22, npm 10, Git 2.43 available.
- Shopify CLI current on npm: `@shopify/cli` 5.0.0; Theme Check `@shopify/theme-check-node` 3.31.0.
- Not yet possible: `shopify theme dev` / `push` — needs a store and your login (CLI opens a browser auth; I never handle your password).

### Platform facts that shape the build (verified, see DECISIONS.md for sources)
- Native Shopify Bundles: no mix-and-match, and not compatible with subscriptions or the Shopify Subscriptions app → box builder needs a subscription app with its own box logic, or a simplified single-SKU model (ADR-002).
- Shopify plans (US, Oct 2026): Basic $39/mo ($29 annual), Grow $105 ($79), Advanced $399 ($299). Third-party-calculated carrier rates at checkout cost extra on Basic — relevant if we quote live UPS/FedEx overnight rates for a perishable product.
- Shopify Scripts sunset June 30, 2026 → any custom cart logic must be Shopify Functions.

### Top risks
1. **Subscription + mix-and-match composition on renewals** — highest technical risk. Mitigated by POC before coding (ADR-002).
2. **Perishable shipping economics** — overnight/2-day shipping cost can exceed product margin; free-shipping promises are dangerous until rates are known. Needs carrier quotes (Q-SHIP).
3. **Trademark clearance on "Bad Boy"** — "Bad Boy" is an existing mark used by other companies in several categories. Not a dev blocker, but worth a quick attorney search before printing packaging or buying ad volume. (Not legal advice.)
4. **Logo production files** — raster-only logo will look soft in the header at 2x/3x and can't be recolored to #7BAFD4. Need vector master.
5. **Claims/compliance** — no freshness windows, NYC-origin, "best," or guarantee claims without your sign-off; allergen info required for food (sesame is a major allergen in the US).
6. **Post-purchase upsell reach** — Shopify doesn't show the post-purchase page to Apple Pay, Google Pay, Klarna/Affirm or gift-card buyers, so a share of mobile buyers will never see it. Also only one app per store can run post-purchase offers (ADR-008).
7. **Auto-renewal compliance** — subscribe-and-save must use clear disclosure and affirmative consent under state auto-renewal laws (ADR-007). Counsel should approve the final terms.
8. **App cost creep** — subscription app fees (0% to ~1.5% + per-order fee) on top of Shopify Payments 2.9% + 30¢ (Basic).

---

## 2. Discovery questions (please answer — grouped by what they unblock)

**Access (blocks Phase 1)**
- Q-ACC-1: Do you have a Shopify Partner account? If yes, I'll have you create a free development store for the POC. If no, create one at partners.shopify.com (free).
- Q-ACC-2: Will the production store be a new paid store you create, and on which plan? (Recommend starting Basic; revisit Grow when carrier-calculated rates or staff accounts are needed.)
- Q-ACC-3: GitHub repo location — your account/org, private repo name?

**Catalog & box (blocks ADR-002 POC config + Phase 2)**
- Q-BOX-1: Box sizes — 6, 12, 18, 24? Is 12 the only launch size?
- Q-BOX-2: Launch flavor list (and any premium flavors with an upcharge)?
- ~~Q-BOX-3~~ **Answered:** sleeves of 3, one flavor per sleeve; dozen = 4 sleeves, max 4 flavors.
- ~~Q-BOX-3b~~ **Answered:** yes, same flavor allowed in multiple sleeves.
- Q-BOX-4: Add-ons beyond the upsells (cream cheese/spreads, merch)? (Spreads are more perishable — cold chain?)
- Q-BOX-5: Curated "house assortment" box in addition to build-your-own?
- ~~Q-BOX-6~~ **Answered:** $44.95 one-time / $39.95 per shipment every 4 weeks.

**Pricing & upsells (new)**
- Q-PRICE-1: **Partly answered** — included, or lower price + customer-selected speed (ADR-009). Needs carrier quotes to decide.
- ~~Q-PRICE-2~~ **Answered:** every 4 weeks.
- Q-PRICE-3: Dozen only at launch, or also a half dozen (2 sleeves)?
- ~~Q-UP-1~~ **Answered:** yes, existing products. Still need: unit cost and pack weight.
- ~~Q-UP-2~~ **Answered:** upsells recur on every shipment (ADR-008 design for R6).
- Q-UP-3: Paid upsell ideas too (e.g., extra sleeve at a discount, spreads), or free gifts only?

**Operations (blocks ADR-002 choice between A and C)**
- Q-OPS-1: Does the commissary bake to order, or hold flavor inventory that can run out?
- Q-OPS-2: What does the commissary use to pick/pack today — printed Shopify packing slips, a 3PL/WMS, ShipStation, other?
- Q-OPS-3: Packaging: box/sleeve format, max flavors per box, packed weight and dimensions?

**Store setup (blocks POC)** — owner creating a new Shopify store
- Q-ACC-4: Store's `.myshopify.com` URL once created.
- Q-ACC-5: Approval to install Appstle (free plan/trial) and Shopify Subscriptions (free) on it for the POC; payments in test mode only.

**Shipping (blocks Phase 3)**
- Q-SHIP-0: Carrier cost for 2-day and 3-day across zones 2–8 at the packed weight (needed for ADR-009).
- Q-SHIP-1: Ship-from ZIP, carrier, service (overnight / 2-day / ground)?
- Q-SHIP-2: Ship days and production cutoff (e.g., orders by 12pm ET Mon–Wed ship next morning)?
- Q-SHIP-3: Excluded destinations (AK, HI, PR, APO, PO boxes)?
- Q-SHIP-4: Flat rate, free-shipping threshold, or calculated rates?
- Q-SHIP-5: Holiday blackout dates; freeze/storage guidance the commissary stands behind?

**Subscriptions**
- ~~Q-SUB-1~~ **Answered:** every 4 weeks only.
- Q-SUB-2: Max monthly budget for a subscription app; OK with % transaction fees?
- Q-SUB-3: Policy on skips, pauses, cancellation deadlines before renewal.

**Marketing & legal**
- Q-MKT-1: Email platform preference (Shopify Email vs Klaviyo)? SMS at launch?
- Q-MKT-2: GA4 property, Google Ads account, Meta Business/Pixel — existing or create new? (Victory can own them; I'll document access.)
- Q-LEG-1: Who supplies policies (privacy, terms, refund, subscription terms) and allergen/ingredient statements?
- Q-BRAND-1: Is #7BAFD4 the final blue, or should we match the logo's brighter blue? Can a designer produce SVG/transparent PNG + a simplified header mark?
- Q-COPY-1: Our Story facts — what can we truthfully say about the commissary and origin?
- Q-DATE-1: Target launch date?

---

## 3. Phased plan

Timing ranges are from scope §11 and depend on answers/approvals above.

### Phase 0 — Discovery & POC (now → approval)
- [x] Scope review, reference-site review, platform/app research
- [x] DECISIONS.md, IMPLEMENTATION_PLAN.md, QA_CHECKLIST.md
- [ ] Owner answers to §2
- [ ] Dev store created (owner) → POC of ADR-002 options A and C
- [ ] Evidence write-up → **owner approves ADR-002**
**Exit gate:** ADR-001 and ADR-002 approved.

### Phase 1 — Theme foundation (4–6 days)
- `shopify theme init` from the reference theme; Git repo; `.gitignore` (no `.env`, no `config/settings_data.json` secrets — it has none, but app keys never go in theme)
- Design tokens in `assets/bbb-tokens.css` (palette, type scale, spacing, radii, focus ring)
- Typography: graffiti display face for headlines only (licensed web font — need your pick or approval), clean sans for UI
- Global: announcement bar, header (logo, nav, cart), footer, mobile menu
- Homepage sections (all Theme Editor-editable): hero + CTA, value props, how-it-works (3 steps), featured box, subscribe & save, testimonials (only real ones), FAQ accordion, newsletter, CTA band
- Generic templates: page, collection, product, cart, 404, search, blog
**Preview:** `shopify theme dev --store <dev-store>` → local URL + shareable preview link.

### Phase 2 — Catalog, box builder, cart (5–10 days)
- Products/variants/collections created in admin (or via CSV); metafields for ingredients, allergens, storage
- Sleeve products: one SKU per flavor ("Everything — Sleeve of 3"), plus Mini Bagels ×6 and Bagel Chips as upsell SKUs
- Box builder per approved ADR-002 option, with live "X of 4 sleeves" count, accessible steppers, validation, sold-out handling, edit-from-cart
- Cart shows flavor breakdown; packing slip template shows it too
**Exit gate:** POC test script passes on the real build.

### Phase 3 — Subscriptions + shipping + ops (4–8 days)
- Every-4-weeks selling plan at $39.95, billing day anchored if supported; one-time $44.95; auto-renewal disclosures per ADR-007; customer portal link; notifications
- Post-purchase upsell app per ADR-008: launch offers (6 free minis, free bagel chips), rules, $0-offer handling, owner training on adding new offers
- Shipping profiles, zones, rates, exclusions; cutoff messaging driven by settings (not hardcoded)
- Exception SOPs drafted for the commissary

### Phase 4 — Marketing & analytics (3–5 days)
- Customer Privacy/consent banner; GA4 + Google Ads + Meta via Shopify's Google & YouTube and Facebook & Instagram channels (server-side events, no duplicate purchase)
- Custom web-pixel events: `box_builder_start`, `box_builder_complete`, `subscription_selected`
- SEO: titles, descriptions, Product + FAQ schema, alt text
- Email flows per ADR-004; paid landing-page template

### Phase 5 — QA & launch (3–5 days)
- QA_CHECKLIST.md fully executed; Theme Check clean; Lighthouse/CWV with apps installed
- Owner UAT; live test order (you place it); rollback theme kept unpublished
- **Publishing the theme, domain changes, paid apps, real orders: only with your explicit go-ahead.**

---

## 4. Per-phase reporting template
Each phase ends with: (1) files changed, (2) preview instructions, (3) Theme Check + test results, (4) blockers stated plainly, (5) acceptance checklist.

## 5. Repository layout (planned)
```
/            Shopify theme root (assets, blocks, config, layout, locales, sections, snippets, templates)
/docs        IMPLEMENTATION_PLAN.md, DECISIONS.md, QA_CHECKLIST.md, poc/, sops/
/extensions  (only if a custom app/Function is approved under ADR-003 — separate app repo preferred)
```

## 6. Guardrails
- No API secrets, admin tokens or app keys in theme code or Git.
- No publishing the live theme, paid app selection, paid orders or domain changes without owner approval.
- No copied assets, copy, or code from bagelkings.com.
- No unverified claims (shipping speed, freshness, awards, guarantees, NYC origin).
