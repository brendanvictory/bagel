# Bad Boy Bagel Co. — QA Checklist

Version 0.1 · 2026-10-27. Each item records: result (Pass/Fail/Blocked), tester, date, evidence link.
Test environment: unpublished development theme on a dev/staging store, Shopify Bogus Gateway or Shopify Payments test mode. **No live orders without owner approval.**

## 0. Automated checks (every phase)
- [ ] `shopify theme check` — 0 errors; warnings triaged in PR notes
- [ ] No secrets in repo (`git grep -iE "shpat_|shpss_|api[_-]?key|secret"` returns nothing)
- [ ] Lighthouse mobile on Home, Build Your Box, PDP, Cart (record scores before and after apps)

## 1. Brand & Theme Editor
- [ ] Logo, palette, type match approved assets (ADR-006)
- [ ] Every homepage section can be added/removed/reordered/edited in Theme Editor without code
- [ ] No prices, product names or shipping facts hardcoded in Liquid
- [ ] Graffiti art never clipped at 360 / 390 / 768 / 1024 / 1440 px

## 2. Box builder (P0) — mirrors ADR-002 POC script
- [ ] Choose size → step through flavors → "X of Y selected" updates and is announced to screen readers (`aria-live="polite"`)
- [ ] Add-to-cart disabled until count is exactly Y; clear error text explains why
- [ ] Per-flavor min/max enforced; sold-out flavors disabled and labeled
- [ ] Rapid taps / double-click on Add produce exactly one cart line
- [ ] Back button / refresh preserves or cleanly resets selection
- [ ] Edit box from cart restores prior selection (if supported by chosen option)
- [ ] Tampered request (11 or 13 items via `/cart/add.js`) rejected or corrected at cart/checkout
- [ ] Flavor breakdown visible in: cart drawer, cart page, checkout, order confirmation email, admin order, packing slip
- [ ] Price and currency formatting correct; discount code applies as configured

## 3. Subscriptions (P0/P1)
- [ ] One-time vs subscription choice is explicit; interval, recurring price/discount and terms link shown before cart and in cart
- [ ] First subscription order: correct composition
- [ ] 1st and 2nd renewal: correct composition and price
- [ ] Customer changes flavors in portal → next renewal reflects change
- [ ] Skip, pause, resume, cancel work; notifications sent
- [ ] Failed payment → dunning behavior documented
- [ ] Flavor out of stock at renewal → behavior documented + manual fallback SOP
- [ ] Subscription indicator visible on admin order / pick list

## 4. Cart & checkout
- [ ] Native Shopify checkout only; express wallets as eligible
- [ ] Taxes and discount stacking match Shopify settings
- [ ] Mixed cart (one-time + subscription) behaves as the chosen app documents

## 5. Shipping & ops (owner-supplied test cases)
- [ ] Rates per zone match approved table; excluded regions blocked with clear message
- [ ] Cutoff / ship-day copy matches settings and is not hardcoded
- [ ] Order notification, shipping confirmation, tracking links correct
- [ ] Packing slip shows per-box flavor counts, gift note, customer note, subscription flag
- [ ] Exception SOPs exist: missed cutoff, damage, wrong flavor, refund/reship, nondelivery, OOS, address change, renewal interruption

## 6. Accessibility (WCAG 2.2 AA target on essential flows)
- [ ] Full keyboard path: home → build box → cart → checkout start
- [ ] Visible focus on every control (≥ 3:1 against background)
- [ ] Text contrast ≥ 4.5:1 (note: #7BAFD4 on white fails for text — display only)
- [ ] Stepper buttons have accessible names ("Add one Everything bagel")
- [ ] Tap targets ≥ 24×24 px (aim 44×44)
- [ ] VoiceOver iOS + TalkBack Android pass on box builder
- [ ] Respects `prefers-reduced-motion`

## 7. Responsive & browsers
- [ ] 360, 390, 768, 1024, 1440 px — no horizontal scroll, sticky CTA doesn't cover content or chat widgets
- [ ] iOS Safari, Android Chrome, desktop Chrome/Safari/Firefox/Edge

## 8. Analytics & consent
- [ ] Consent banner blocks non-essential tracking until accepted (where required)
- [ ] GA4 / Google Ads / Meta receive exactly one `purchase` per order (check with test orders + platform debuggers)
- [ ] Custom events fire once with documented parameters
- [ ] UTMs persist from landing page to order attribution

## 9. SEO & content
- [ ] Unique titles/meta descriptions; canonical tags; sitemap.xml; robots
- [ ] Product schema valid (Rich Results Test); FAQ markup only where content is on-page
- [ ] All images have meaningful alt text
- [ ] No unverified claims anywhere (shipping speed, freshness, awards, guarantees)
- [ ] Policy pages present and owner-approved; allergens on every PDP

## 10. Launch gate (owner sign-off)
- [ ] All P0 items Pass
- [ ] Rollback: previous/blank theme retained unpublished; theme export saved
- [ ] Access & credentials doc handed over (no secrets in docs — stored in your password manager)
- [ ] Owner approves publish → owner places first live order
