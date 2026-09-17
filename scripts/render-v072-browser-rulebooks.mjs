import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT = path.resolve(process.env.GAUNTLET_BROWSER_RULEBOOK_REVIEW || '/tmp/v072-browser-rulebook-review');
const SITE = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-browser-rulebook-'));

const DOCUMENTS = [
  { id: 'player-guide', label: 'Player Guide' },
  { id: 'military', label: 'Military Guide', faction: true },
  { id: 'diplomats', label: 'Diplomats Guide', faction: true },
  { id: 'financiers', label: 'Financiers Guide', faction: true },
  { id: 'intelligence', label: 'Intelligence Guide', faction: true },
  { id: 'mystics', label: 'Mystics Guide', faction: true },
  { id: 'inquisition', label: 'Inquisition Guide', faction: true },
  { id: 'complete-rules', label: 'Complete Rules' },
];

const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 1000 },
  { id: 'mobile', width: 412, height: 915 },
];

function contentType(file) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.xml': 'application/xml; charset=utf-8',
  })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

async function startServer(root) {
  const server = http.createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const candidate = path.resolve(root, `.${pathname}`);
      const rootPrefix = `${path.resolve(root)}${path.sep}`;
      if (candidate !== path.resolve(root) && !candidate.startsWith(rootPrefix)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, {
        'Content-Type': contentType(candidate),
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(candidate).pipe(response);
    } catch (error) {
      response.writeHead(500).end(error.message);
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Review server did not expose a TCP port.');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

async function waitForCandidate(page, document) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.waitForFunction(
    id => document.body.dataset.rulesetMode === 'candidate'
      && document.body.dataset.candidateDocument === id
      && document.querySelector('.rulebook-content.candidate-publication'),
    document.id,
    { timeout: 60000 },
  );

  await page.evaluate(async () => {
    await document.fonts?.ready;
    const images = [...document.images];
    await Promise.all(images.map(image => image.complete
      ? Promise.resolve()
      : new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        })));
  });

  if (document.faction) {
    await page.waitForFunction(
      () => {
        const profiles = [...document.querySelectorAll('.candidate-leader-profile')];
        return profiles.length === 2
          && profiles.every(profile => profile.querySelector('.candidate-leader-figure')?.dataset.leaderArtworkFitted === 'true');
      },
      null,
      { timeout: 30000 },
    );
  }

  const anatomy = await page.$('.card-anatomy-guide');
  if (anatomy) {
    await page.waitForFunction(
      () => !document.querySelector('.card-anatomy-guide')
        || document.querySelector('.card-anatomy-guide')?.classList.contains('markers-positioned'),
      null,
      { timeout: 30000 },
    );
  }

  if (errors.length) throw new Error(`${document.label} browser errors: ${errors.join(' | ')}`);

  const diagnostics = await page.evaluate(() => {
    const article = document.querySelector('.rulebook-content.candidate-publication');
    const rect = article.getBoundingClientRect();
    const overflow = article.scrollWidth > article.clientWidth + 2;
    return {
      overflow,
      articleWidth: rect.width,
      scrollWidth: article.scrollWidth,
      leaderProfiles: document.querySelectorAll('.candidate-leader-profile').length,
    };
  });
  if (diagnostics.overflow) {
    throw new Error(`${document.label} has horizontal publication overflow: ${JSON.stringify(diagnostics)}`);
  }
  return diagnostics;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
execFileSync(process.execPath, ['scripts/stage-pages-publication.mjs', SITE], {
  cwd: ROOT,
  stdio: 'inherit',
});

const server = await startServer(SITE);
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of VIEWPORTS) {
    const directory = path.join(OUT, viewport.id);
    fs.mkdirSync(directory, { recursive: true });

    for (const document of DOCUMENTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      try {
        await page.goto(
          `${server.baseUrl}/rulebook/?rules=candidate&doc=${encodeURIComponent(document.id)}`,
          { waitUntil: 'domcontentloaded', timeout: 60000 },
        );
        await page.addStyleTag({ content: '.analytics-consent { display:none !important; }' });
        const diagnostics = await waitForCandidate(page, document);
        await page.screenshot({
          path: path.join(directory, `${document.id}-full.png`),
          fullPage: true,
        });

        if (document.faction) {
          const leaders = page.locator('.candidate-leader-profile');
          await leaders.screenshot({
            path: path.join(directory, `${document.id}-leaders.png`),
          });
        }

        const masthead = page.locator('.candidate-masthead');
        await masthead.screenshot({
          path: path.join(directory, `${document.id}-masthead.png`),
        });

        report.push({
          document: document.id,
          viewport: viewport.id,
          width: viewport.width,
          height: viewport.height,
          ...diagnostics,
        });
      } finally {
        await page.close();
      }
    }
  }

  fs.writeFileSync(path.join(OUT, 'review-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Rendered ${report.length} Browser Rulebook review surfaces to ${OUT}.`);
} finally {
  await browser.close();
  await server.close();
  fs.rmSync(SITE, { recursive: true, force: true });
}
