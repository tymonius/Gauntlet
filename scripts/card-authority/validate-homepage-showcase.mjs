#!/usr/bin/env node
import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { ROOT } from '../current-game-authority.mjs';

const OUTPUT = resolve(ROOT, 'artifacts/card-authority');
const SCREENSHOT = join(OUTPUT, 'homepage-card-showcase.png');

function contentType(path) {
  const extension = extname(path).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
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
      response.writeHead(200, {
        'Content-Type': contentType(file),
        'Cache-Control': 'no-store',
      });
      response.end(await readFile(file));
    } catch (error) {
      response.writeHead(error?.code === 'ENOENT' ? 404 : 500).end(error?.message || String(error));
    }
  });

  await new Promise(resolveDone => server.listen(0, '127.0.0.1', resolveDone));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required for homepage physical-face consumer validation.');
  }

  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1056 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error?.message || String(error)));

  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'load', timeout: 30000 });
    const stage = page.locator('[data-card-showcase-stage]');
    await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-card-showcase-stage]')?.dataset.ready === 'true');

    const frames = page.locator('.card-showcase-frame');
    const count = await frames.count();
    if (count !== 7) throw new Error(`Homepage card showcase expected 7 canonical card frames; found ${count}.`);

    const results = [];
    for (let index = 0; index < count; index += 1) {
      const iframe = frames.nth(index);
      await iframe.scrollIntoViewIfNeeded();
      const src = await iframe.getAttribute('src');
      const url = new URL(src || '', baseUrl);
      const parameters = [...url.searchParams.keys()];
      if (url.pathname !== '/card-design/face-render.html') {
        throw new Error(`Homepage card ${index + 1} still uses non-canonical renderer ${url.pathname}.`);
      }
      if (parameters.length !== 1 || parameters[0] !== 'id') {
        throw new Error(`Homepage card ${index + 1} supplies renderer behavior instead of canonical identity only: ${url.search}.`);
      }
      const faceId = url.searchParams.get('id') || '';
      if (!faceId.startsWith('card:')) throw new Error(`Homepage card ${index + 1} has invalid canonical face id ${faceId || '(missing)'}.`);

      const handle = await iframe.elementHandle();
      const frame = await handle?.contentFrame();
      if (!frame) throw new Error(`Homepage card ${index + 1} did not create a render frame.`);
      await frame.waitForFunction(() => {
        const state = document.body?.dataset.renderReady;
        return state === 'true' || state === 'error';
      }, null, { timeout: 30000 });

      const metric = await frame.evaluate(() => ({
        state: document.body.dataset.renderReady || '',
        error: document.body.dataset.renderErrorMessage || '',
        faceId: document.body.dataset.faceId || '',
        template: document.body.dataset.faceTemplate || '',
        cardCount: document.querySelectorAll('#renderTarget > .gauntlet-card').length,
        artworkLoaded: document.querySelector('#renderTarget > .gauntlet-card')?.dataset.artworkLoaded || '',
      }));

      if (metric.state !== 'true') throw new Error(`Homepage ${faceId} failed to render: ${metric.error || 'unknown error'}.`);
      if (metric.faceId !== faceId) throw new Error(`Homepage requested ${faceId} but renderer reported ${metric.faceId || '(missing)'}.`);
      if (metric.template !== 'playable') throw new Error(`Homepage ${faceId} resolved to unexpected template ${metric.template || '(missing)'}.`);
      if (metric.cardCount !== 1) throw new Error(`Homepage ${faceId} mounted ${metric.cardCount} playable-card roots.`);
      if (metric.artworkLoaded !== 'true') throw new Error(`Homepage ${faceId} did not load canonical artwork.`);

      results.push({ faceId, src: url.pathname + url.search, ...metric });
    }

    if (pageErrors.length) throw new Error(`Homepage showcase page errors:\n${pageErrors.join('\n')}`);

    await page.locator('#cards').screenshot({ path: SCREENSHOT });
    await writeFile(join(OUTPUT, 'homepage-showcase-report.json'), `${JSON.stringify({ count, results }, null, 2)}\n`);
    console.log(JSON.stringify({ homepageShowcaseFaces: count, faceIds: results.map(result => result.faceId) }, null, 2));
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    await new Promise(resolveDone => server.close(resolveDone));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
