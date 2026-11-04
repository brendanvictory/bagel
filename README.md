# Bad Boy Bagel Co. — Shopify theme

Online Store 2.0 theme for Bad Boy Bagel Co., built on Shopify Dawn 16.0.0.
Store: `bagelboys.myshopify.com` (domain nybagelexpress.com). Docs: `docs/IMPLEMENTATION_PLAN.md`, `docs/DECISIONS.md`, `docs/QA_CHECKLIST.md`.

## Branches & release flow
- `staging` → theme **bagel/staging**. All changes are released here. The owner previews bagel/staging and clicks **Publish** in Shopify to put it live.
- `dev` → theme **bagel/dev**. As of 2026-11-04 bagel/dev is the **published** theme, so do not push to `dev`; collaborator work that lands there is merged into `staging` with each release so publishing bagel/staging never drops it.
- `main` — planning docs / release snapshots.
- Theme Editor saves are committed by Shopify to the branch of the theme that was edited ("Update from Shopify…"); fetch and merge both branches before every release. `config/settings_data.json` is per theme, so theme settings (logo, colors, social links) must be set in the theme that will be published.

## Preview
1. Shopify admin → Online Store → Themes → **bagel/staging** → **⋯ → Preview** for a shareable preview link, or **Edit theme** for the Theme Editor.
2. When it looks right: **Publish** on bagel/staging.
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
