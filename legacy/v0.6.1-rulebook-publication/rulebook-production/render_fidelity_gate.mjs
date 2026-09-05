import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'http://127.0.0.1:8000';
const PUBLICATION_PATH = (process.env.GAUNTLET_PUBLICATION_PATH || '').replace(/^\/+|\/+$/g, '');
const publicationUrl = relative => PUBLICATION_PATH ? `${PUBLICATION_PATH}/${relative}` : relative;
const OUT = '/tmp/rulebook-production-fidelity';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function open(path) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(`${BASE}/${path}`, { waitUntil: 'load', timeout: 60000 });
  if (!response?.ok()) throw new Error(`${path} returned ${response?.status()}`);
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await Promise.all([...document.images].map(image => {
      if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
        return image.decode?.().catch(() => undefined);
      }
      return new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', () => reject(new Error(`Image failed: ${image.currentSrc || image.src}`)), { once: true });
      });
    }));
  });
  if (errors.length) throw new Error(`${path} page errors:\n${errors.join('\n')}`);
  return page;
}

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

try {
  const approved = await open(publicationUrl('rulebook-design/print-proof.html'));
  await approved.evaluate(() => document.body.classList.add('color-edition'));
  const candidate = await open(publicationUrl('rulebook-production/fidelity-gate.html'));

  const approvedPages = approved.locator('.page');
  const candidatePages = candidate.locator('.page');
  if (await approvedPages.count() !== 12) throw new Error('Approved proof no longer contains 12 pages.');
  if (await candidatePages.count() !== 8) throw new Error('Fidelity gate must contain exactly 8 pages.');

  const geometry = await candidate.locator('.page').evaluateAll(nodes => nodes.map((node, index) => {
    const rect = node.getBoundingClientRect();
    return {
      index: index + 1,
      pageNumber: node.getAttribute('data-page'),
      width: rect.width,
      height: rect.height,
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
      scrollHeight: node.scrollHeight,
      clientHeight: node.clientHeight,
    };
  }));
  for (const item of geometry) {
    if (Math.abs(item.width - 528) > 2 || Math.abs(item.height - 816) > 2) {
      throw new Error(`Candidate page ${item.index} has invalid half-letter geometry: ${JSON.stringify(item)}`);
    }
    if (item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1) {
      throw new Error(`Candidate page ${item.index} overflows: ${JSON.stringify(item)}`);
    }
  }

  // Candidate pages 1-4 and 6-8 are the approved pages 1-4 and 6-8,
  // reused without modification. Their raster output must remain identical.
  const mappings = [
    [0, 0], [1, 1], [2, 2], [3, 3], [5, 5], [6, 6], [7, 7],
  ];
  const comparisons = [];
  for (const [approvedIndex, candidateIndex] of mappings) {
    const approvedBuffer = await approvedPages.nth(approvedIndex).screenshot();
    const candidateBuffer = await candidatePages.nth(candidateIndex).screenshot();
    const approvedHash = digest(approvedBuffer);
    const candidateHash = digest(candidateBuffer);
    comparisons.push({ approvedPage: approvedIndex + 1, candidatePage: candidateIndex + 1, approvedHash, candidateHash });
    if (approvedHash !== candidateHash) {
      throw new Error(`Visual fidelity failure: approved page ${approvedIndex + 1} differs from candidate page ${candidateIndex + 1}.`);
    }
  }

  const style = await candidate.locator('.page').nth(4).evaluate(page => ({
    titleFamily: getComputedStyle(page.querySelector('.chapter-title-row h2')).fontFamily,
    bodyFamily: getComputedStyle(page.querySelector('.body-copy')).fontFamily,
    utilityFamily: getComputedStyle(page.querySelector('.running-head')).fontFamily,
    accent: getComputedStyle(page.querySelector('.chapter-number')).color,
    background: getComputedStyle(page).backgroundColor,
  }));
  if (!style.titleFamily.includes('Georgia')) throw new Error(`Setup page lost approved title typography: ${JSON.stringify(style)}`);
  if (!style.utilityFamily.includes('Inter')) throw new Error(`Setup page lost approved utility typography: ${JSON.stringify(style)}`);

  await candidate.screenshot({ path: `${OUT}/fidelity-gate-browser.png`, fullPage: true });
  await candidatePages.nth(4).screenshot({ path: `${OUT}/new-setup-page.png` });
  await candidate.emulateMedia({ media: 'print' });
  await candidate.pdf({
    path: `${OUT}/Gauntlet_v0.6.1_Production_Fidelity_Gate.pdf`,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await writeFile(`${OUT}/fidelity-report.json`, JSON.stringify({ geometry, comparisons, setupStyle: style }, null, 2));

  await approved.close();
  await candidate.close();
  console.log(JSON.stringify({ pages: geometry.length, pixelIdenticalApprovedPages: comparisons.length, setupStyle: style }, null, 2));
} finally {
  await browser.close();
}
