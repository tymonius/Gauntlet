import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'leaders');

function contentType(path) {
  const extension = extname(path).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }[extension] || 'application/octet-stream';
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
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function main() {
  const { chromium } = await import('playwright');
  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 800 }, deviceScaleFactor: 2 });

  try {
    await page.goto(`${baseUrl}/card-design/#card-back`, { waitUntil: 'load' });
    const back = page.locator('[data-gauntlet-card-back]');
    await back.waitFor();
    await page.waitForFunction(() => document.querySelector('[data-gauntlet-card-back]')?.classList.contains('gauntlet-card-back'));
    await page.waitForTimeout(100);

    const metrics = await back.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const frame = element.querySelector('.gauntlet-card-back__frame');
      const frameRect = frame.getBoundingClientRect();
      const wordmark = element.querySelector('.gauntlet-card-back__wordmark');
      const wordmarkRect = wordmark.getBoundingClientRect();
      const wordmarkStyle = getComputedStyle(wordmark);
      const symbols = [...element.querySelectorAll('.gauntlet-card-back__symbol')];
      return {
        width: rect.width,
        height: rect.height,
        frameInset: frameRect.left - rect.left,
        symbolCount: symbols.length,
        symbolsMasked: symbols.every(symbol => {
          const style = getComputedStyle(symbol);
          return (style.maskImage || style.webkitMaskImage) !== 'none';
        }),
        wordmarkWidth: wordmarkRect.width,
        wordmarkHeight: wordmarkRect.height,
        wordmarkMask: wordmarkStyle.maskImage || wordmarkStyle.webkitMaskImage,
        background: getComputedStyle(element).backgroundColor,
      };
    });

    if (Math.abs(metrics.width - 240) > 0.25 || Math.abs(metrics.height - 336) > 0.25) {
      throw new Error(`Unexpected card-back geometry: ${metrics.width} × ${metrics.height}.`);
    }
    if (Math.abs(metrics.frameInset - 36) > 0.25) {
      throw new Error(`Card-back frame inset is ${metrics.frameInset}px; expected 36px (3/8in).`);
    }
    if (metrics.symbolCount !== 266 || !metrics.symbolsMasked || metrics.wordmarkMask === 'none') {
      throw new Error(`Card-back assets failed to render: ${JSON.stringify(metrics)}.`);
    }
    if (metrics.wordmarkHeight < 260 || metrics.wordmarkWidth > 72) {
      throw new Error(`Card-back wordmark did not render as the large rotated treatment: ${JSON.stringify(metrics)}.`);
    }

    await back.screenshot({ path: join(OUTPUT, 'universal-card-back.png'), omitBackground: true });
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
