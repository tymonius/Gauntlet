import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const PORT = Number(process.env.GAUNTLET_ANATOMY_PORT || 8123);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT = path.join(ROOT, 'images', 'rulebook', 'card-anatomy.png');
const CHECK = process.argv.includes('--check');

async function waitForServer(url) {
  let lastError;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Card Anatomy server did not become ready: ${lastError?.message || 'unknown error'}`);
}

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: ROOT,
  stdio: ['ignore', 'ignore', 'inherit'],
});

try {
  await waitForServer(`${BASE_URL}/rulebook/?rules=candidate`);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on('console', message => console.log(`[browser:${message.type()}] ${message.text()}`));
    page.on('pageerror', error => console.error(`[browser:pageerror] ${error.message}`));

    await page.goto(`${BASE_URL}/rulebook/?rules=candidate#card-anatomy`, { waitUntil: 'load' });
    await page.waitForSelector('#card-anatomy', { timeout: 20000 });

    // The Rulebook and Card Anatomy enhancement are separate modules. Replaying
    // the render event here makes the publication renderer deterministic even
    // if the browser delivered the first event before the enhancement module
    // had registered its listener.
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('gauntlet:rulebook-rendered', {
        detail: { mode: 'candidate' },
      }));
    });

    const anatomy = page.locator('[data-card-anatomy]');
    await anatomy.waitFor({ state: 'visible', timeout: 20000 });

    await page.waitForFunction(() => {
      const frame = document.querySelector('.card-anatomy-card');
      const status = frame?.contentDocument?.body?.dataset.renderReady;
      return status === 'true' || status === 'error';
    }, undefined, { timeout: 30000 });

    const renderState = await page.evaluate(() => {
      const frame = document.querySelector('.card-anatomy-card');
      const body = frame?.contentDocument?.body;
      return {
        status: body?.dataset.renderReady || '',
        message: body?.textContent?.trim() || '',
      };
    });
    if (renderState.status !== 'true') {
      throw new Error(`Production card renderer failed: ${renderState.message || 'unknown renderer error'}`);
    }

    // Marker positions are derived from live card DOM geometry. Trigger one
    // final positioning pass only after the production iframe reports ready.
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForFunction(() => document.querySelector('[data-card-anatomy]')?.classList.contains('markers-positioned'), undefined, {
      timeout: 10000,
    });

    const figure = anatomy.locator('.card-anatomy-figure');
    await figure.waitFor({ state: 'visible' });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    const bytes = await figure.screenshot({ type: 'png' });
    if (CHECK) {
      if (!fs.existsSync(OUTPUT)) throw new Error(`Missing generated Card Anatomy figure: ${path.relative(ROOT, OUTPUT)}`);
      const existing = fs.readFileSync(OUTPUT);
      if (!existing.equals(bytes)) throw new Error('Committed Card Anatomy figure is stale; run node scripts/render-current-card-anatomy.mjs.');
      console.log('Card Anatomy figure is current.');
    } else {
      fs.writeFileSync(OUTPUT, bytes);
      console.log(`Rendered ${path.relative(ROOT, OUTPUT)} from the live production card renderer.`);
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}
