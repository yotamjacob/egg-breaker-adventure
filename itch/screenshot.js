// itch build screenshots — desktop (framed) + mobile (untouched).
// Usage: node itch/screenshot.js   (serve dist-itch on :8799 first)
const { chromium } = require('playwright');

const URL = process.env.ITCH_URL || 'http://localhost:8799/index.html';

(async () => {
  const browser = await chromium.launch();
  const shots = [
    { name: '/tmp/itch-desktop.png', w: 1440, h: 900 },
    { name: '/tmp/itch-mobile.png',  w: 390,  h: 844 },
  ];
  for (const s of shots) {
    const ctx = await browser.newContext({
      viewport: { width: s.w, height: s.h },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    // Let the splash fade and the play tab render.
    await page.waitForTimeout(7000);
    await page.screenshot({ path: s.name });
    console.log('saved', s.name, `(${s.w}x${s.h})`);
    await ctx.close();
  }
  await browser.close();
})();
