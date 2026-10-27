# Phase 1 — Theme foundation: report

Date: 2026-10-27 · Status: **code complete locally; not yet on the store** (see Blockers)

## 1. Files changed

**New**
- `sections/bbb-hero.liquid` — H1 headline + accent, subcopy, live price line from a chosen product (one-time and lowest subscription price), two CTAs, trust chips (blocks), image or logo-art fallback, optional mobile sticky CTA
- `sections/bbb-how-it-works.liquid` — numbered steps (blocks)
- `sections/bbb-value-props.liquid` — value cards (blocks)
- `sections/bbb-subscribe-save.liquid` — subscribe & save vs one-time cards, prices read live from product + selling plan; auto-renewal disclosure shown only when a plan exists
- `sections/bbb-testimonials.liquid` — renders nothing until a real quote is added
- `sections/bbb-faq.liquid` — native `<details>` accordion (no JS) + optional FAQPage schema
- `sections/bbb-cta-band.liquid` — closing CTA
- `snippets/bbb-logo-fallback.liquid` — header logo when none is uploaded in Theme settings
- `assets/bbb-tokens.css` — palette, display type, spacing, focus ring, spray texture
- `assets/bbb-sections.css` — mobile-first section styles
- `assets/bbb-sticky-cta.js` — ~30 lines, IntersectionObserver; hides near footer
- `assets/bbb-logo-600.webp`, `bbb-logo-1200.webp`, `bbb-favicon.png` (crown) — from the supplied logo, background removed
- `assets/bbb-permanent-marker.woff2` — self-hosted display font (Apache 2.0)
- `docs/brand/bbb-logo-transparent-master.png`, `docs/licenses/`, `tools/preview/`, `README.md`

**Modified Dawn files**
- `layout/theme.liquid` — loads BBB CSS, font preload, theme-color, favicon fallback
- `sections/header.liquid` — logo fallback; header no longer uses H1 (hero headline is the page H1)
- `config/settings_data.json` — 5 brand color schemes, sticker-style buttons, page width, logo width
- `config/settings_schema.json` — theme name
- `sections/header-group.json` — black announcement bar, sticky header, selectors off
- `templates/index.json` — homepage composition

### Change 2026-10-27 (owner request): hero photo background
- `sections/bbb-hero.liquid` — new **Layout: Photo background** (default) for a bagel-assortment photo; optional separate mobile crop delivered via one `<picture>` (phones download only the mobile image); honors the focal point set in Content → Files; **Overlay darkness** slider (default 55%) plus a gradient behind the copy; **Height** small/medium/large. Old side-by-side layout kept as "Copy beside image."
- `assets/bbb-sections.css` — photo-background styles.
- Tested with a deliberately busy, bright stand-in image: white text stays readable at 390 and 1440 px; no horizontal scroll at any breakpoint; Theme Check 0 errors.
- **Needs from owner:** a rights-cleared photo of *your* bagel assortment, ideally ≥ 2400 px wide, landscape, with space on the left for text; optionally a 4:5 crop for phones.

### Change 2026-10-27 (owner request): content round 1
- Hero eyebrow "New York bagels, shipped."; trust chips removed; the two buttons are equal-width (stacked on phones, side by side from tablet).
- How it works: Pick your bagels / We bake & ship / Delivered to your door (owner copy).
- **Why Bad Boy Bagel Co. — "We know bagels."** with owner-stated facts (28 retail locations, 30+ years in NY) and 4 cards.
- New sections: **About us** (story + stats + photo), **Our process** (4-stage timeline), **Testimonials** (auto-scrolling, Pause button, reduced-motion fallback; hidden on the live store until real quotes are added, sample cards in Theme Editor only).
- FAQ answers for shipping, storage and allergens from owner copy.
- **Contact page** (`page.contact`): email help@badboybagelco.com, 111 Broadway Amityville NY 11701 with Google map + directions link, form (name, phone, email, reason, message) on Shopify's built-in contact form.
- **Footer** (`bbb-footer`): Shop / Learn / Help / Contact columns linking to every section and the contact page, policy links from Settings → Policies, payment icons. Links are editable blocks (no store menu needed).
- Claims now on the site, all owner-stated: 28 retail locations; 30+ years; commissary on Long Island; baked and shipped same day; ships Mon–Wed; no preservatives; kosher facility; peanut-free process.

## 2. Preview instructions
Blocked until GitHub is linked (see below). Once pushed: Admin → Online Store → Themes → Add theme → Connect from GitHub → `brendanvictory/bagel`, branch `dev` → Preview. Then in Theme Editor, set **BBB Hero → Show price from product** and **BBB Subscribe & save → Box product** once the box product exists.

## 3. Checks run
- **Theme Check:** 0 errors. 9 warnings, all identical to stock Dawn 16.0.0 (none from BBB code).
- **Static render at 360/390/768/1024/1440:** no horizontal scroll at any width. Mobile hero CTA above the fold at 390×900. Logo art hidden on mobile (header already shows the logo).
- **Not yet verified on real Shopify:** live product/selling-plan prices, Theme Editor behavior, Dawn header/footer with BBB styles, real-device Safari/Android.

## 4. Blockers
1. **GitHub not linked to Claude** — can't push. Fix: claude.ai Settings → Connectors → GitHub.
2. **Shopify CLI can't log in from this workspace** (network blocks `accounts.shopify.com`) — solved by the GitHub path.
3. **Logo is raster-only**; vector master still needed for crisp header and true #7BAFD4 recolor.
4. Display font is a stand-in (Permanent Marker) — swap if a designer specifies a licensed graffiti face.
5. FAQ answers for shipping, storage and allergens are marked **[OWNER TO CONFIRM]** — must be replaced before launch.

## 5. Acceptance checklist (owner)
- [ ] Theme appears in the store as unpublished and previews without errors
- [ ] Homepage order: announcement → header → hero → how it works → value props → subscribe & save → (testimonials when added) → FAQ → newsletter → CTA band → footer
- [ ] Every section's text, links, colors and padding editable in Theme Editor
- [ ] Prices in hero and subscribe & save match the product in admin ($44.95 / $39.95) — after the box product and plan exist
- [ ] Mobile: headline + Build your box visible without scrolling; sticky button appears after scrolling past hero and never covers the footer
- [ ] Logo, colors and type feel on-brand
