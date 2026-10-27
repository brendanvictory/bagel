const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 390, 768, 1024, 1440]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    await p.goto('file://' + process.argv[2]); await p.waitForTimeout(400);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await p.screenshot({ path: `${process.argv[3]}/home-${w}.png`, fullPage: true });
    console.log(w, 'horizontal overflow px:', overflow, 'height:', await p.evaluate(() => document.body.scrollHeight));
    await p.close();
  }
  await b.close();
})();
