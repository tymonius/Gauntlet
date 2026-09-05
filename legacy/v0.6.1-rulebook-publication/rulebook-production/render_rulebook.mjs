import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PUBLICATION_PATH = (process.env.GAUNTLET_PUBLICATION_PATH || '').replace(/^\/+|\/+$/g, '');
const BASE = `http://127.0.0.1:8000/${PUBLICATION_PATH ? `${PUBLICATION_PATH}/` : ''}rulebook-production/full-rulebook.html`;
const OUT = '/tmp/rulebook-production';
const REQUIRED_ANCHORS = [
  'Part I — Learn to Play',
  'Part II — Complete Shared Rules',
  'Part III — Factions',
  'Part IV — Reference',
  '1. Components',
  '2. Cards, Zones, and the Play Area',
  '3. Setup',
  '4. Your Turn',
  '5. Actions and Assets',
  '6. Movement and Position',
  '7. Battles',
  '8. Territory Control and Capture',
  '9. Running the Gauntlet',
  '10. Constructing a Deck',
  '11. Detailed Card and Timing Rules',
  '12. Overlays and Other Shared Card Rules',
  '13. Military',
  '14. Diplomats',
  '15. Financiers',
  '16. Intelligence',
  '17. Mystics',
  '18. Inquisition',
  'General',
  'Commandant',
  'Ambassador',
  'Senator',
  'Banker',
  'Executive',
  'Ranger',
  'Spymaster',
  'Alchemist',
  'Spirit Walker',
  'Grand Inquisitor',
  'Witch Hunter',
  'Quick Turn Reference',
  'Quick Battle Reference',
  'Glossary',
  'Copyright and Playtest Use',
];

await mkdir(OUT, { recursive: true });
for (const directory of [
  'reader-pages',
  'reader-spreads',
  'booklet-color',
  'booklet-grayscale',
]) {
  await mkdir(join(OUT, directory), { recursive: true });
}

const browser = await chromium.launch({ headless: true });

function pad(value, width = 3) {
  return String(value).padStart(width, '0');
}

async function openRulebook(mode = 'reader') {
  const viewport = mode === 'booklet'
    ? { width: 1200, height: 900 }
    : { width: 1400, height: 1100 };
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const response = await page.goto(`${BASE}?mode=${mode}`, {
    waitUntil: 'load',
    timeout: 60000,
  });
  if (!response?.ok()) throw new Error(`${mode} Rulebook returned HTTP ${response?.status()}`);

  await page.waitForFunction(
    () => document.documentElement.dataset.paginationReady === 'true',
    null,
    { timeout: 120000 },
  );
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await Promise.all([...document.images].map(image => {
      if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
        return image.decode?.().catch(() => undefined);
      }
      return new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener(
          'error',
          () => reject(new Error(`Image failed: ${image.currentSrc || image.src}`)),
          { once: true },
        );
      });
    }));
  });
  if (errors.length) throw new Error(`${mode} Rulebook browser errors:\n${errors.join('\n')}`);
  return page;
}

async function inspectReader(page) {
  return page.evaluate(() => {
    const pages = [...document.querySelectorAll('#reader-root > .page')];
    const report = window.__rulebookReport;
    const geometry = pages.map((item, index) => {
      const rect = item.getBoundingClientRect();
      const flow = item.querySelector('.production-flow');
      return {
        index: index + 1,
        pageNumber: Number(item.dataset.page),
        anchor: item.dataset.anchor || null,
        classes: item.className,
        faction: item.dataset.faction || null,
        width: rect.width,
        height: rect.height,
        scrollWidth: item.scrollWidth,
        clientWidth: item.clientWidth,
        scrollHeight: item.scrollHeight,
        clientHeight: item.clientHeight,
        flowScrollHeight: flow?.scrollHeight ?? null,
        flowClientHeight: flow?.clientHeight ?? null,
      };
    });

    const isolatedHeadings = [];
    for (const [pageIndex, item] of pages.entries()) {
      const flow = item.querySelector('.production-flow');
      if (!flow) continue;
      const flowRect = flow.getBoundingClientRect();
      for (const heading of flow.querySelectorAll(':scope > h2, :scope > h3, :scope > h4, :scope > h5')) {
        if (heading.closest('.keep-group')) continue;
        const next = heading.nextElementSibling;
        const headingRect = heading.getBoundingClientRect();
        const nearBottom = headingRect.bottom > flowRect.bottom - 34;
        const lacksFollowingContent = !next || next.classList.contains('source-divider');
        if (nearBottom || lacksFollowingContent) {
          isolatedHeadings.push({
            page: pageIndex + 1,
            text: heading.textContent.trim(),
            nearBottom,
            lacksFollowingContent,
          });
        }
      }
    }

    const images = [...document.images].map(image => ({
      src: image.getAttribute('src'),
      alt: image.alt,
      complete: image.complete,
      width: image.naturalWidth,
      height: image.naturalHeight,
    }));
    const leaderImages = [...document.querySelectorAll('#reader-root .leader-page .leader-portrait img')]
      .map(image => ({ src: image.getAttribute('src'), alt: image.alt, width: image.naturalWidth, height: image.naturalHeight }));

    return {
      report,
      geometry,
      isolatedHeadings,
      images,
      leaderImages,
      titleFamily: getComputedStyle(document.querySelector('.page-title, .chapter-title-row h2, .front-cover h1')).fontFamily,
      bodyFamily: getComputedStyle(document.querySelector('.production-flow p, .body-copy')).fontFamily,
      utilityFamily: getComputedStyle(document.querySelector('.running-head')).fontFamily,
    };
  });
}

function assertReader(result) {
  const { report, geometry, isolatedHeadings, images, leaderImages } = result;
  if (!report) throw new Error('Rulebook did not expose a production report.');
  if (report.missing?.length) {
    throw new Error(`Canonical source tokens were omitted:\n${JSON.stringify(report.missing, null, 2)}`);
  }
  if (report.pageCount !== geometry.length) {
    throw new Error(`Report/page mismatch: ${report.pageCount} versus ${geometry.length}.`);
  }
  if (geometry.length % 4 !== 0) {
    throw new Error(`Reader page count ${geometry.length} is not divisible by four.`);
  }
  if (report.sheetSides !== geometry.length / 2) {
    throw new Error(`Expected ${geometry.length / 2} imposed sides; report has ${report.sheetSides}.`);
  }
  for (const anchor of REQUIRED_ANCHORS) {
    if (!report.anchors?.[anchor]) throw new Error(`Required Rulebook anchor is missing: ${anchor}`);
  }
  if (leaderImages.length !== 12) {
    throw new Error(`Expected 12 dedicated Leader portraits; found ${leaderImages.length}.`);
  }
  for (const [index, item] of geometry.entries()) {
    if (item.pageNumber !== index + 1) {
      throw new Error(`Page numbering is discontinuous at ${index + 1}: ${JSON.stringify(item)}`);
    }
    if (Math.abs(item.width - 528) > 2 || Math.abs(item.height - 816) > 2) {
      throw new Error(`Reader page ${index + 1} is ${item.width}×${item.height}px instead of half-letter.`);
    }
    if (item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1) {
      throw new Error(`Reader page ${index + 1} overflows: ${JSON.stringify(item)}`);
    }
    if (item.flowScrollHeight !== null && item.flowScrollHeight > item.flowClientHeight + 1) {
      throw new Error(`Reader page ${index + 1} content flow overflows: ${JSON.stringify(item)}`);
    }
  }
  if (isolatedHeadings.length) {
    throw new Error(`Isolated or bottom-stranded headings detected:\n${JSON.stringify(isolatedHeadings, null, 2)}`);
  }
  for (const image of images) {
    if (!image.complete || image.width < 1 || image.height < 1) {
      throw new Error(`Rulebook image failed to load: ${JSON.stringify(image)}`);
    }
  }
  if (!result.titleFamily.includes('Georgia')) {
    throw new Error(`Approved title typography was not retained: ${result.titleFamily}`);
  }
  if (!result.utilityFamily.includes('Inter')) {
    throw new Error(`Approved utility typography was not retained: ${result.utilityFamily}`);
  }
}

async function renderReaderPages(page, count) {
  const locators = page.locator('#reader-root > .page');
  for (let index = 0; index < count; index += 1) {
    await locators.nth(index).screenshot({ path: join(OUT, 'reader-pages', `page-${pad(index + 1)}.png`) });
  }
}

async function renderReaderSpreads(page, count) {
  await page.evaluate(() => {
    document.querySelector('#reader-spread-review')?.remove();
    const review = document.createElement('div');
    review.id = 'reader-spread-review';
    review.style.cssText = 'position:absolute;left:-20000px;top:0;width:11in;';
    document.body.append(review);
  });

  const pairs = [];
  pairs.push([1]);
  for (let left = 2; left < count; left += 2) pairs.push([left, left + 1]);
  pairs.push([count]);

  for (const [spreadIndex, pair] of pairs.entries()) {
    await page.evaluate(pageNumbers => {
      const review = document.querySelector('#reader-spread-review');
      review.replaceChildren();
      const sheet = document.createElement('section');
      sheet.className = pageNumbers.length === 1 ? 'reader-cover' : 'spread-sheet';
      const sourcePages = [...document.querySelectorAll('#reader-root > .page')];
      for (const pageNumber of pageNumbers) sheet.append(sourcePages[pageNumber - 1].cloneNode(true));
      review.append(sheet);
    }, pair);
    await page.locator('#reader-spread-review > *').screenshot({
      path: join(OUT, 'reader-spreads', `spread-${pad(spreadIndex + 1)}-pages-${pair.join('-')}.png`),
    });
  }
  await page.evaluate(() => document.querySelector('#reader-spread-review')?.remove());
}

async function inspectBooklet(page, pageCount) {
  return page.evaluate(expectedPageCount => {
    const spreads = [...document.querySelectorAll('#booklet-root > .spread-sheet')];
    const geometry = spreads.map((spread, index) => {
      const rect = spread.getBoundingClientRect();
      return {
        index: index + 1,
        sheet: Number(spread.dataset.sheet),
        side: spread.dataset.side,
        pages: [...spread.querySelectorAll(':scope > .page')].map(item => Number(item.dataset.page)),
        width: rect.width,
        height: rect.height,
        scrollWidth: spread.scrollWidth,
        clientWidth: spread.clientWidth,
        scrollHeight: spread.scrollHeight,
        clientHeight: spread.clientHeight,
      };
    });
    const expected = [];
    for (let sheet = 0; sheet < expectedPageCount / 4; sheet += 1) {
      expected.push([expectedPageCount - sheet * 2, 1 + sheet * 2]);
      expected.push([2 + sheet * 2, expectedPageCount - 1 - sheet * 2]);
    }
    return { geometry, expected };
  }, pageCount);
}

function assertBooklet(result, pageCount) {
  if (result.geometry.length !== pageCount / 2) {
    throw new Error(`Expected ${pageCount / 2} booklet sides; found ${result.geometry.length}.`);
  }
  for (const [index, item] of result.geometry.entries()) {
    if (Math.abs(item.width - 1056) > 2 || Math.abs(item.height - 816) > 2) {
      throw new Error(`Booklet side ${index + 1} is ${item.width}×${item.height}px instead of Letter landscape.`);
    }
    if (item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1) {
      throw new Error(`Booklet side ${index + 1} overflows: ${JSON.stringify(item)}`);
    }
    if (JSON.stringify(item.pages) !== JSON.stringify(result.expected[index])) {
      throw new Error(`Invalid imposition on side ${index + 1}: expected ${result.expected[index]}, found ${item.pages}.`);
    }
  }
}

async function renderBookletSheets(page, directory) {
  const spreads = page.locator('#booklet-root > .spread-sheet');
  const count = await spreads.count();
  for (let index = 0; index < count; index += 1) {
    const item = spreads.nth(index);
    const metadata = await item.evaluate(node => ({ sheet: node.dataset.sheet, side: node.dataset.side }));
    await item.screenshot({
      path: join(OUT, directory, `sheet-${pad(metadata.sheet, 2)}-${metadata.side}.png`),
    });
  }
}

try {
  const reader = await openRulebook('reader');
  const readerResult = await inspectReader(reader);
  assertReader(readerResult);
  await renderReaderPages(reader, readerResult.geometry.length);
  await renderReaderSpreads(reader, readerResult.geometry.length);
  await reader.emulateMedia({ media: 'print' });
  await reader.pdf({
    path: join(OUT, 'Gauntlet_v0.6.1_Rulebook.pdf'),
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await reader.close();

  const booklet = await openRulebook('booklet');
  const bookletResult = await inspectBooklet(booklet, readerResult.geometry.length);
  assertBooklet(bookletResult, readerResult.geometry.length);
  await renderBookletSheets(booklet, 'booklet-color');
  await booklet.evaluate(() => document.body.classList.add('grayscale-preflight'));
  await renderBookletSheets(booklet, 'booklet-grayscale');
  await booklet.evaluate(() => document.body.classList.remove('grayscale-preflight'));
  await booklet.emulateMedia({ media: 'print' });
  await booklet.pdf({
    path: join(OUT, 'Gauntlet_v0.6.1_Rulebook_Booklet.pdf'),
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await booklet.close();

  const report = {
    reader: readerResult,
    booklet: bookletResult,
    outputs: {
      readerPdf: 'Gauntlet_v0.6.1_Rulebook.pdf',
      bookletPdf: 'Gauntlet_v0.6.1_Rulebook_Booklet.pdf',
      readerPages: readerResult.geometry.length,
      readerSpreads: readerResult.geometry.length / 2 + 1,
      bookletSides: bookletResult.geometry.length,
      physicalSheets: readerResult.geometry.length / 4,
      grayscalePreflightSides: bookletResult.geometry.length,
    },
  };
  await writeFile(join(OUT, 'production-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    pageCount: readerResult.geometry.length,
    physicalSheets: readerResult.geometry.length / 4,
    bookletSides: bookletResult.geometry.length,
    missingSourceTokens: readerResult.report.missing.length,
    isolatedHeadings: readerResult.isolatedHeadings.length,
    leaderPortraits: readerResult.leaderImages.length,
    intentionalBlanks: readerResult.report.intentionalBlanks,
  }, null, 2));
} finally {
  await browser.close();
}
