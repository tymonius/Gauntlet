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
    await page.goto(`${BASE_URL}/rulebook/?rules=candidate#card-anatomy`, { waitUntil: 'networkidle' });
    const anatomy = page.locator('[data-card-anatomy].markers-positioned');
    await anatomy.waitFor({ state: 'visible', timeout: 20000 });
    const figure = anatomy.locator('.card-anatomy-figure');
    await figure.waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts?.ready);

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
