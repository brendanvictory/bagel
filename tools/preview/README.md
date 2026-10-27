# Static section preview (visual QA only)

Renders the `bbb-*` homepage sections with LiquidJS and mock data, then screenshots
them at 360/390/768/1024/1440 px and reports horizontal overflow.
**This is an approximation, not Shopify rendering.** The source of truth is the
unpublished theme in the store (Theme Editor / preview link).

```
npm install liquidjs
node render.js <theme-root> /tmp/home.html
node shoot.js /tmp/home.html /tmp   # requires Playwright + Chromium
```
