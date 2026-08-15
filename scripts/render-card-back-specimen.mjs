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
      const patternWindow = element.querySelector('.gauntlet-card-back__pattern-window');
      const patternWindowRect = patternWindow.getBoundingClientRect();
      const patternWindowStyle = getComputedStyle(patternWindow);
      const pattern = element.querySelector('.gauntlet-card-back__pattern');
      const patternStyle = getComputedStyle(pattern);
      const firstRow = element.querySelector('.gauntlet-card-back__pattern-row');
      const firstRowStyle = firstRow ? getComputedStyle(firstRow) : null;
      const symbols = [...element.querySelectorAll('.gauntlet-card-back__symbol')];
      const firstSymbolStyle = symbols[0] ? getComputedStyle(symbols[0]) : null;
      const firstColumnTrack = firstRowStyle
        ? Number.parseFloat(firstRowStyle.gridTemplateColumns.split(' ')[0])
        : Number.NaN;
      const symbolWidth = firstSymbolStyle ? Number.parseFloat(firstSymbolStyle.width) : Number.NaN;
      return {
        width: rect.width,
        height: rect.height,
        frameInset: frameRect.left - rect.left,
        frameRadius: getComputedStyle(frame).borderRadius,
        patternWindowInset: patternWindowRect.left - rect.left,
        patternWindowOverflow: patternWindowStyle.overflow,
        symbolCount: symbols.length,
        symbolsMasked: symbols.every(symbol => {
          const style = getComputedStyle(symbol);
          return (style.maskImage || style.webkitMaskImage) !== 'none';
        }),
        symbolBackground: firstSymbolStyle?.backgroundColor || '',
        symbolCellGap: firstColumnTrack - symbolWidth,
        patternTransform: patternStyle.transform,
        wordmarkWidth: wordmarkRect.width,
        wordmarkHeight: wordmarkRect.height,
        wordmarkFrameClearance: (frameRect.height - wordmarkRect.height) / 2,
        wordmarkMask: wordmarkStyle.maskImage || wordmarkStyle.webkitMaskImage,
        background: getComputedStyle(element).backgroundColor,
        fieldBackground: getComputedStyle(element, '::after').backgroundColor,
      };
    });

    if (Math.abs(metrics.width - 240) > 0.25 || Math.abs(metrics.height - 336) > 0.25) {
      throw new Error(`Unexpected card-back geometry: ${metrics.width} × ${metrics.height}.`);
    }
    if (Math.abs(metrics.frameInset - 24) > 0.25) {
      throw new Error(`Card-back frame inset is ${metrics.frameInset}px; expected 24px (1/4in).`);
    }
    if (metrics.frameRadius !== '12px') {
      throw new Error(`Card-back gold frame does not match the 1/8in card corner radius: ${JSON.stringify(metrics)}.`);
    }
    if (Math.abs(metrics.patternWindowInset - 7.2) > 0.25 || metrics.patternWindowOverflow !== 'hidden' || metrics.background !== 'rgb(40, 40, 39)') {
      throw new Error(`Card-back faction-color border is not opaque around the tiled field: ${JSON.stringify(metrics)}.`);
    }
    if (metrics.symbolCount !== 667 || !metrics.symbolsMasked || metrics.wordmarkMask === 'none') {
      throw new Error(`Card-back assets failed to render: ${JSON.stringify(metrics)}.`);
    }
    if (metrics.patternTransform === 'none') {
      throw new Error(`Card-back tiling field is not rotated as a single background: ${JSON.stringify(metrics)}.`);
    }
    if (!Number.isFinite(metrics.symbolCellGap) || metrics.symbolCellGap > 3) {
      throw new Error(`Card-back faction symbols are not packed tightly enough: ${JSON.stringify(metrics)}.`);
    }
    if (metrics.symbolBackground !== 'rgba(0, 0, 0, 0.42)' || metrics.fieldBackground !== 'rgb(32, 33, 36)') {
      throw new Error(`Card-back pattern contrast is not dark-on-charcoal: ${JSON.stringify(metrics)}.`);
    }
    if (metrics.wordmarkHeight < 230 || metrics.wordmarkWidth > 66 || metrics.wordmarkHeight <= metrics.wordmarkWidth || metrics.wordmarkFrameClearance < 12) {
      throw new Error(`Card-back wordmark did not render as the large rotated treatment with frame breathing room: ${JSON.stringify(metrics)}.`);
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
