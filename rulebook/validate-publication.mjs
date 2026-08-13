import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE_URL = process.env.RULEBOOK_BASE_URL || 'http://127.0.0.1:8000';
const OUT = process.env.RULEBOOK_REVIEW_DIR || '/tmp/rulebook-browser-publication';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspect(page, label) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${BASE_URL}/rulebook/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const status = document.querySelector('[data-rulebook-status]');
    return status?.textContent?.startsWith('Canonical v0.6.1');
  });

  const result = await page.evaluate(() => {
    const html = document.documentElement;
    const heroImage = document.querySelector('.hero-art img');
    const links = [...document.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    return {
      title: document.title,
      chapterHeadings: document.querySelectorAll('.chapter-heading').length,
      partHeadings: document.querySelectorAll('.part-heading').length,
      leaderHeadings: document.querySelectorAll('.leader-heading').length,
      howBlocks: document.querySelectorAll('.how-it-works-block').length,
      readerLink: links.includes('../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf'),
      bookletLink: links.includes('../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook_Booklet.pdf'),
      horizontalOverflow: html.scrollWidth - window.innerWidth,
      heroLoaded: Boolean(heroImage?.complete && heroImage.naturalWidth > 0),
      status: document.querySelector('[data-rulebook-status]')?.textContent || '',
    };
  });

  assert(errors.length === 0, `${label}: browser errors:\n${errors.join('\n')}`);
  assert(result.title.includes('Browser Rulebook'), `${label}: unexpected title ${result.title}`);
  assert(result.chapterHeadings === 18, `${label}: expected 18 chapter headings; found ${result.chapterHeadings}`);
  assert(result.partHeadings === 4, `${label}: expected 4 Part headings; found ${result.partHeadings}`);
  assert(result.leaderHeadings === 12, `${label}: expected 12 Leader headings; found ${result.leaderHeadings}`);
  assert(result.howBlocks >= 18, `${label}: expected at least 18 How it works blocks; found ${result.howBlocks}`);
  assert(result.readerLink, `${label}: reader PDF link is missing`);
  assert(result.bookletLink, `${label}: booklet PDF link is missing`);
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
