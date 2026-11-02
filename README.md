# Bad Boy Bagel Co. — Shopify theme

Online Store 2.0 theme for Bad Boy Bagel Co., built on Shopify Dawn 16.0.0.
Store: `bagelboys.myshopify.com` (domain nybagelexpress.com). Docs: `docs/IMPLEMENTATION_PLAN.md`, `docs/DECISIONS.md`, `docs/QA_CHECKLIST.md`.

## Branches
- `staging` — connected to the **LIVE** theme **bagel/staging** (published 2026-11-02). Every push here changes the storefront at nybagelexpress.com. Only push after owner approval.
- `dev` — connected to the unpublished theme **bagel/dev**. Use it for previews: push work here, review via the bagel/dev preview link, then merge `dev` → `staging` on approval.
- `main` — planning docs / release snapshots.
- Theme Editor edits on the live theme are committed by Shopify to `staging` ("Update from Shopify…"); fetch and merge before pushing. `config/settings_data.json` is not reliably pulled into a published theme from Git, so theme-wide setting changes (colors, logo) need a Theme Editor change or a theme publish.

## Preview
1. Shopify admin → Online Store → Themes → **bagel/dev** (unpublished, connected to branch `dev`). Live theme is **bagel/staging**.
2. On the new theme: **⋯ → Preview** for a shareable preview link, or **Customize** for the Theme Editor.
3. Local alternative (on a machine that can reach Shopify): `npm i -g @shopify/cli` then `shopify theme dev --store bagelboys.myshopify.com`.

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
