# Bad Boy Bagel Co. — Shopify theme

Online Store 2.0 theme for Bad Boy Bagel Co., built on Shopify Dawn 16.0.0.
Store: `bagelboys.myshopify.com`. Docs: `docs/IMPLEMENTATION_PLAN.md`, `docs/DECISIONS.md`, `docs/QA_CHECKLIST.md`.

## Branches
- `dev` — connected to the store as an **unpublished** theme via Shopify's GitHub integration. Every push updates it.
- `main` — reviewed, releasable state. Nothing is published without owner approval.

## Preview
1. Shopify admin → Online Store → Themes → Add theme → **Connect from GitHub** → repo `brendanvictory/bagel`, branch `dev`.
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
