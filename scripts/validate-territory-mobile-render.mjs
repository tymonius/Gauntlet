import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, webkit, devices } from 'playwright';
import { CSS_PIXELS_PER_INCH, surfaceCssPixels } from '../card-design/production-surface.mjs';

const BASE = process.env.TERRITORY_TEST_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT = 'card-design/generated/leaders';
const ID = 'territory-difficult-terrain';
const { width: WIDTH, height: HEIGHT } = surfaceCssPixels('landscape');
const ART_FLOOR = 0.78 * CSS_PIXELS_PER_INCH;
const CROSS_ENGINE_ART_TOLERANCE = 2.25;

async function ready(frame) {
  await frame.waitForFunction(
    () => document.body?.dataset.renderReady === 'true' && Boolean(document.querySelector('.territory-card')),
    null,
    { timeout: 30000 },
  );
  await frame.evaluate(async () => document.fonts?.ready);
}

async function metrics(frame) {
  return frame.locator('.territory-card').evaluate(card => {
    const cardRect = card.getBoundingClientRect();
    const artRect = card.querySelector('.territory-art')?.getBoundingClientRect();
    const effect = card.querySelector('.territory-effect p');
    const style = effect ? getComputedStyle(effect) : null;
    return {
      width: cardRect.width,
      height: cardRect.height,
      artWidth: artRect?.width || 0,
      artHeight: artRect?.height || 0,
      fontSize: style ? Number.parseFloat(style.fontSize) : 0,
      lineHeight: style ? Number.parseFloat(style.lineHeight) : 0,
      scale: Number.parseFloat(card.dataset.effectScale || 'NaN'),
      fitWarning: card.classList.contains('fit-warning'),
      titleFit: card.dataset.titleFit,
      parchmentLoaded: card.dataset.parchmentLoaded,
    };
  });
}

async function standalone(browser, options, screenshotPath) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/card-design/face-render.html?id=${encodeURIComponent(`territory:${ID}`)}`, { waitUntil: 'load' });
    await ready(page);
    await page.waitForTimeout(150);
    const result = await metrics(page);
    if (screenshotPath) {
      await page.locator('.territory-card').screenshot({ path: screenshotPath, omitBackground: true });
    }
    return result;
  } finally {
    await context.close();
  }
}

async function inspection(browser, options, screenshotPath) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/card-design/?type=territory#territories`, { waitUntil: 'load' });
    const sourceSelector = `iframe.territory-review-frame[src*="face-render.html"][src*="${ID}"]`;
    const source = page.locator(sourceSelector);
    await source.waitFor({ state: 'attached', timeout: 30000 });

    // Territory review iframes are intentionally lazy-loaded. Difficult Terrain is
    // far enough down the catalog that a mobile viewport leaves its iframe on
    // about:blank until it is scrolled near the viewport. Force the real browser
    // lifecycle here before asking the embedded card to open its inspection view.
    await source.scrollIntoViewIfNeeded();
    const sourceCard = page
      .frameLocator(sourceSelector)
      .locator('body[data-render-ready="true"] .territory-card');
    await sourceCard.waitFor({ state: 'attached', timeout: 30000 });
    await sourceCard.evaluate(card => card.click());

    const inspectionSelector = 'iframe.territory-inspection-frame';
    const inspectionElement = page.locator(inspectionSelector);
    await inspectionElement.waitFor({ state: 'attached', timeout: 10000 });
    const inspectionCard = page
      .frameLocator(inspectionSelector)
      .locator('body[data-render-ready="true"] .territory-card');
    await inspectionCard.waitFor({ state: 'attached', timeout: 30000 });

    const iframe = await inspectionElement.elementHandle();
    const frame = await iframe?.contentFrame();
    if (!frame) throw new Error('Missing rendered Territory inspection frame');
    await frame.evaluate(async () => document.fonts?.ready);

    const settled = await metrics(frame);
    await page.waitForTimeout(500);
    const delayed = await metrics(frame);
    if (screenshotPath) await page.locator('.territory-inspection-dialog').screenshot({ path: screenshotPath });
    return { settled, delayed };
  } finally {
    await context.close();
  }
}

function assertClose(label, a, b, tolerance = 0.5) {
  if (Math.abs(a - b) > tolerance) throw new Error(`${label}: ${a} vs ${b}`);
}

function validate(label, value) {
  if (Math.abs(value.width - WIDTH) > 0.25 || Math.abs(value.height - HEIGHT) > 0.25) {
    throw new Error(`${label} geometry: ${JSON.stringify(value)}`);
  }
  if (value.fitWarning || value.titleFit !== 'true' || value.parchmentLoaded !== 'true') {
    throw new Error(`${label} fit/load: ${JSON.stringify(value)}`);
  }
  if (!value.artWidth || value.artHeight <= ART_FLOOR + 1) {
    throw new Error(`${label} artwork collapsed: ${JSON.stringify(value)}`);
  }
  if (Math.abs(value.scale - 1) > 0.001) {
    throw new Error(`${label} typography reduced: ${JSON.stringify(value)}`);
  }
}

function validateInspection(label, life, desktop) {
  validate(`${label} settled`, life.settled);
  validate(`${label} delayed`, life.delayed);
  assertClose(`${label} art stability`, life.settled.artHeight, life.delayed.artHeight, 0.25);
  assertClose(`${label} type stability`, life.settled.fontSize, life.delayed.fontSize, 0.05);
  assertClose(`${label} art vs desktop`, desktop.artHeight, life.delayed.artHeight, CROSS_ENGINE_ART_TOLERANCE);
  assertClose(`${label} scale stability`, life.settled.scale, life.delayed.scale, 0.001);
}

await mkdir(OUTPUT, { recursive: true });
const chromiumBrowser = await chromium.launch({ headless: true });
const webkitBrowser = await webkit.launch({ headless: true });

try {
  const desktop = await standalone(chromiumBrowser, {
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  const chromeMobile = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  };
  const mobileChromium = await standalone(
    chromiumBrowser,
    chromeMobile,
    join(OUTPUT, 'territory-mobile-chromium-render-smoke.png'),
  );
  const mobileWebKit = await standalone(
    webkitBrowser,
    devices['iPhone 13'],
    join(OUTPUT, 'territory-mobile-webkit-render-smoke.png'),
  );

  for (const [label, value] of [
    ['desktop', desktop],
    ['mobile Chromium', mobileChromium],
    ['mobile WebKit', mobileWebKit],
  ]) validate(label, value);

  for (const [label, value] of [
    ['mobile Chromium', mobileChromium],
    ['mobile WebKit', mobileWebKit],
  ]) {
    assertClose(`${label} art height`, desktop.artHeight, value.artHeight, CROSS_ENGINE_ART_TOLERANCE);
    assertClose(`${label} art width`, desktop.artWidth, value.artWidth, 1);
    assertClose(`${label} font`, desktop.fontSize, value.fontSize, 0.1);
    assertClose(`${label} line height`, desktop.lineHeight, value.lineHeight, 0.1);
    assertClose(`${label} scale`, desktop.scale, value.scale, 0.001);
  }

  const inspectionChromium = await inspection(
    chromiumBrowser,
    chromeMobile,
    join(OUTPUT, 'territory-mobile-chromium-inspection.png'),
  );
  const inspectionWebKit = await inspection(
    webkitBrowser,
    devices['iPhone 13'],
    join(OUTPUT, 'territory-mobile-webkit-inspection.png'),
  );

  validateInspection('mobile Chromium inspection', inspectionChromium, desktop);
  validateInspection('mobile WebKit inspection', inspectionWebKit, desktop);

  await writeFile(
    join(OUTPUT, 'territory-mobile-render-metrics.json'),
    `${JSON.stringify({ desktop, mobileChromium, mobileWebKit, inspectionChromium, inspectionWebKit }, null, 2)}\n`,
  );
} finally {
  await chromiumBrowser.close();
  await webkitBrowser.close();
}
