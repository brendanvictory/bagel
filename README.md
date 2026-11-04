# Bad Boy Bagel Co. — Shopify theme

Online Store 2.0 theme for Bad Boy Bagel Co., built on Shopify Dawn 16.0.0.
Store: `bagelboys.myshopify.com` (domain nybagelexpress.com). Docs: `docs/IMPLEMENTATION_PLAN.md`, `docs/DECISIONS.md`, `docs/QA_CHECKLIST.md`.

## Branches & release flow
- `dev` → theme **bagel/dev** = the **published (live)** theme at nybagelexpress.com.
- `staging` → theme **bagel/staging** = preview theme.
- Every change: push to `staging`, then merge `staging` → `dev` (goes live within a minute or two). No Publish click in Shopify (that would swap which theme is live).
- `main` — planning docs / release snapshots.
- Theme Editor saves are committed by Shopify to the branch of the theme that was edited ("Update from Shopify…"); fetch and merge both branches before every release. `config/settings_data.json` is per theme, so keep theme settings (logo, colors, social links) identical in both.

## Preview
1. Shopify admin → Online Store → Themes → **bagel/staging** → **⋯ → Preview** (preview link) or **Edit theme**.
2. Local alternative (on a machine that can reach Shopify): `npm i -g @shopify/cli` then `shopify theme dev --store bagelboys.myshopify.com`.

## Checks
- `shopify theme check` — runs offline; must show 0 errors.
- `tools/preview/` — static render + screenshots at 360/390/768/1024/1440 (approximation only).

## Conventions
- Custom files are prefixed `bbb-` (sections, snippets, assets) so Dawn upstream updates stay mergeable.
- No prices, product data or shipping facts in theme code — they come from Shopify.
- No API secrets, tokens or app keys in this repo.

## Third-party assets
- Dawn — Shopify, see `LICENSE-dawn.md`.
- Outfit font — SIL Open Font License 1.1, see `docs/licenses/`.
