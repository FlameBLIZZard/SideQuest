// Smoke test: open the launcher and every app from file:// and fail on any page error.
// Run: npm test   (uses the Playwright that ships with your environment, or `npx playwright install chromium`)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }
import { readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv[2];
const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });

const pages = ['index.html', ...readdirSync(resolve(root, 'apps')).map((a) => `apps/${a}/index.html`)]
  .filter((p) => !only || p.includes(only));

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
let failed = 0;
for (const p of pages) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(pathToFileURL(resolve(root, p)).href);
  await page.waitForTimeout(900);
  // Click every enabled button that is not a download/file/confirm trigger, to shake out handler errors.
  page.on('dialog', (d) => d.dismiss());
  const ids = await page.$$eval('button[data-smoke]', (bs) => bs.map((b) => b.id));
  for (const id of ids) { await page.click('#' + id).catch(() => {}); await page.waitForTimeout(150); }
  if (shots) await page.screenshot({ path: `${shots}/${p.replace(/\//g, '_')}.png` });
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${p}${errors.length ? '\n     ' + errors.join('\n     ') : ''}`);
  if (errors.length) failed++;
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
