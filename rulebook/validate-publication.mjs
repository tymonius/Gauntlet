import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE_URL = process.env.RULEBOOK_BASE_URL || 'http://127.0.0.1:8000';
const OUT = process.env.RULEBOOK_REVIEW_DIR || '/tmp/rulebook-browser-publication';
const CURRENT_SOURCE = 'releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Historical v0.6.1 publication jobs intentionally use a sparse checkout that
// does not contain the current v0.6.3 browser source. Those jobs still validate
// their immutable PDFs and geometry, but the current browser surface is owned by
// the current-release browser checks rather than by the historical publisher.
if (!existsSync(CURRENT_SOURCE)) {
  console.log(`Skipping current browser Rulebook validation because ${CURRENT_SOURCE} is not present in this historical sparse checkout.`);
  process.exit(0);
}

async function inspect(page, label) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${BASE_URL}/rulebook/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const status = document.querySelector('[data-rulebook-status]');
    return status?.textContent?.startsWith('Canonical v0.6.3');
  });
  await page.waitForFunction(() => document.querySelectorAll('[data-rulebook-content] img.leader-portrait').length === 12);

  const result = await page.evaluate(() => {
    const html = document.documentElement;
    const heroImage = document.querySelector('.hero-art img');
    const links = [...document.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    return {
      title: document.title,
      chapterHeadings: document.querySelectorAll('.chapter-heading').length,
      partHeadings: document.querySelectorAll('.part-heading').length,
      leaderPortraits: document.querySelectorAll('[data-rulebook-content] img.leader-portrait').length,
      leaderGalleries: document.querySelectorAll('[data-leader-portrait-gallery]').length,
      readerLink: links.includes('../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.pdf'),
      bookletLink: links.includes('../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook_Booklet.pdf'),
      horizontalOverflow: html.scrollWidth - window.innerWidth,
      heroLoaded: Boolean(heroImage?.complete && heroImage.naturalWidth > 0),
      status: document.querySelector('[data-rulebook-status]')?.textContent || '',
    };
  });

  assert(errors.length === 0, `${label}: browser errors:\n${errors.join('\n')}`);
  assert(result.title.includes('v0.6.3 Browser Rulebook'), `${label}: unexpected title ${result.title}`);
  assert(result.chapterHeadings >= 24, `${label}: expected the complete v0.6.3 chapter set; found ${result.chapterHeadings} chapter headings`);
  assert(result.partHeadings === 4, `${label}: expected 4 Part headings; found ${result.partHeadings}`);
  assert(result.leaderPortraits === 12, `${label}: expected 12 Leader portraits; found ${result.leaderPortraits}`);
  assert(result.leaderGalleries === 6, `${label}: expected 6 faction Leader galleries; found ${result.leaderGalleries}`);
  assert(result.readerLink, `${label}: v0.6.3 reader PDF link is missing`);
  assert(result.bookletLink, `${label}: v0.6.3 booklet PDF link is missing`);
  assert(result.horizontalOverflow <= 1, `${label}: horizontal overflow is ${result.horizontalOverflow}px`);
  assert(result.heroLoaded, `${label}: hero sketch did not load`);

  await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: true });
  return result;
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const desktopResult = await inspect(desktop, 'desktop');
  await desktop.close();

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const mobileResult = await inspect(mobile, 'mobile');
  await mobile.locator('[data-toc-toggle]').click();
  await mobile.locator('[data-rulebook-sidebar].is-open').waitFor({ state: 'visible' });
  assert(await mobile.locator('#rulebook-search-input').isVisible(), 'mobile: search is not visible after opening contents');
  await mobile.screenshot({ path: `${OUT}/mobile-contents-open.png`, fullPage: true });
  await mobile.close();

  console.log(JSON.stringify({ desktop: desktopResult, mobile: mobileResult }, null, 2));
} finally {
  await browser.close();
}
