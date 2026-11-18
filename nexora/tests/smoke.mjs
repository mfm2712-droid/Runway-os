// End-to-end smoke test: boots the experience, scrolls every chapter, configures, buys, checks out.
// Usage: npm run build && npm run test:e2e   (serves dist/ via vite preview)
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.env.SHOTS ?? 'tests/shots';
mkdirSync(OUT, { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--port', '4317', '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes('4317') && r()));
const URL = 'http://localhost:4317/';
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); console.log('✓', m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = false;
try {
  for (const [name, ctxOpts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', devices['iPhone 13']]]) {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(URL);
    await page.waitForSelector('#boot.gone', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(2500);
    assert(await page.evaluate(() => window.__nexora.S.boot > 0.95), `${name}: universe booted`);
    await page.screenshot({ path: `${OUT}/${name}-0-hero.png` });
    for (const [id, frac] of [['transform', 0.5], ['bio', 0.5], ['rift', 0.55], ['rift', 0.95], ['spatial', 0.4], ['configure', 0.5], ['finale', 0.9]]) {
      await page.evaluate(([id, f]) => { const el = document.getElementById(id); scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) * f); }, [id, frac]);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${OUT}/${name}-${id}-${frac}.png` });
    }
    // Configurator flow
    await page.evaluate(() => { const el = document.getElementById('configure'); scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) * 0.5); });
    await page.waitForTimeout(800);
    await page.click('[data-finish="uv"]');
    await page.click('[data-size="46"]');
    await page.waitForFunction(() => document.querySelector('#cfg-price').textContent.includes('1,620'), null, { timeout: 5000 }).catch(() => {});
    assert((await page.textContent('#cfg-price')).includes('1,620'), `${name}: price reflects finish+size`);
    await page.click('#cfg-add');
    await page.click('.tab[data-product="iris"]');
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/${name}-configure-iris.png` });
    assert((await page.textContent('#cfg-name')) === 'NEXORA IRIS', `${name}: product switch`);
    await page.click('#cfg-add');
    assert((await page.textContent('#cart-count')) === '2', `${name}: cart count = 2`);
    await page.click('#cart-open');
    await page.waitForTimeout(600);
    assert((await page.textContent('#t-total')).includes('4,110'), `${name}: cart total 1620 + 2490`);
    await page.click('.qty[data-key="iris:cyan:std"] [data-d="1"]');
    assert((await page.textContent('#cart-count')) === '3', `${name}: qty increment`);
    await page.screenshot({ path: `${OUT}/${name}-cart.png` });
    await page.click('#checkout');
    await page.click('#checkout-form [type=submit]');
    assert((await page.textContent('#co-err')).length > 0, `${name}: checkout validates`);
    await page.fill('[name=name]', 'Test Pilot');
    await page.fill('[name=email]', 'pilot@example.com');
    await page.fill('[name=addr]', 'Ring 4, Lunar Habitat');
    await page.click('#checkout-form [type=submit]');
    assert(await page.isVisible('#co-done'), `${name}: order confirmation`);
    assert((await page.textContent('#cart-count')) === '0', `${name}: cart cleared`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('gone'), null, { timeout: 30000 });
    assert((await page.textContent('#cart-count')) === '0', `${name}: cart persisted (empty) across reload`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert(!overflow, `${name}: no horizontal overflow`);
    assert(errors.length === 0, `${name}: no console errors ${errors.join(' | ')}`);
    await ctx.close();
  }
} catch (e) { failed = true; console.error(e.message); }
await browser.close();
server.kill();
process.exitCode = failed ? 1 : 0;
