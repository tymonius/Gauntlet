import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'military-symbols');

function contentType(path) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  }[extname(path).toLowerCase()] || 'application/octet-stream';
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const requestPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const requested = resolve(ROOT, requestPath || 'index.html');
      if (!requested.startsWith(`${ROOT}${sep}`) && requested !== join(ROOT, 'index.html')) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const file = (await stat(requested)).isDirectory() ? join(requested, 'index.html') : requested;
      response.writeHead(200, { 'Content-Type': contentType(file) });
      response.end(await readFile(file));
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.message);
    }
  });
  await new Promise(resolvePromise => server.listen(0, '127.0.0.1', resolvePromise));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required. Run npm install, then npx playwright install chromium.');
  }

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });

  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/card-design/military-symbols.html`, { waitUntil: 'load' });
    await page.waitForSelector('.candidate .leader-card');
    await page.waitForFunction(() => {
      const cards = [...document.querySelectorAll('.candidate .leader-card')];
      return cards.length === 4
        && cards.every(card => card.dataset.parchmentLoaded === 'true')
        && cards.every(card => card.dataset.titleFit === 'true')
        && cards.every(card => card.querySelector('.card-interior')?.style.getPropertyValue('--art-height'));
    });
    await page.evaluate(async () => document.fonts?.ready);
    await page.waitForTimeout(150);

    const metrics = await page.locator('.candidate').evaluateAll(candidates => candidates.map(candidate => {
      const card = candidate.querySelector('.leader-card');
      const emblem = candidate.querySelector('.leader-faction-emblem');
      const rect = card?.getBoundingClientRect();
      const emblemRect = emblem?.getBoundingClientRect();
      return {
        name: candidate.querySelector('.candidate-label strong')?.textContent?.trim(),
        width: rect?.width,
        height: rect?.height,
        emblemWidth: emblemRect?.width,
        emblemHeight: emblemRect?.height,
        fitWarning: card?.classList.contains('fit-warning'),
        titleFit: card?.dataset.titleFit,
        parchmentLoaded: card?.dataset.parchmentLoaded,
      };
    }));

    for (const metric of metrics) {
      if (Math.abs(metric.width - 240) > 0.25 || Math.abs(metric.height - 336) > 0.25) {
        throw new Error(`Unexpected Leader-card dimensions: ${JSON.stringify(metric)}.`);
      }
      if (metric.fitWarning || metric.titleFit !== 'true' || metric.parchmentLoaded !== 'true') {
        throw new Error(`Military symbol specimen did not fit: ${JSON.stringify(metric)}.`);
      }
      if (metric.emblemWidth < 14 || metric.emblemHeight < 14) {
        throw new Error(`Military symbol rendered below the approved header size: ${JSON.stringify(metric)}.`);
      }
    }

    await page.screenshot({ path: join(OUTPUT, 'military-symbol-review.png'), fullPage: true });
    const slugs = ['current', 'arming-swords', 'heraldic-swords', 'command-swords'];
    for (let index = 0; index < slugs.length; index += 1) {
      await page.locator('.candidate').nth(index).screenshot({
        path: join(OUTPUT, `${slugs[index]}.png`),
        omitBackground: false,
      });
    }
  } finally {
    await browser.close();
    await new Promise(resolvePromise => server.close(resolvePromise));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
