const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const DIR = process.argv[2], OUT = process.argv[3];
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[360, 800], [390, 844], [768, 1024], [1440, 1000]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.route('http://test.local/**', async (route) => {
      const u = new URL(route.request().url()); const f = path.join(DIR, u.pathname);
      return fs.existsSync(f) ? route.fulfill({ status: 200, path: f }) : route.fulfill({ status: 404, body: '' });
    });
    const p = await ctx.newPage();
    await p.goto('http://test.local/index.html?s=everything,everything,plain,sesame&o=690001&a=1001'); await p.waitForTimeout(500);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(w, 'overflow', over);
    await p.screenshot({ path: `${OUT}/b-${w}.png`, fullPage: true });
    if (w === 390) { await p.goto('http://test.local/index.html'); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/b-390-empty.png` }); }
    await ctx.close();
  }
  await b.close();
})();
