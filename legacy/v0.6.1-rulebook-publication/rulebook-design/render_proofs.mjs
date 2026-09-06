import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8000/rulebook-design';
const OUT = '/tmp/rulebook-design-proofs';
const browser = await chromium.launch({ headless: true });

async function openProof(path, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  const response = await page.goto(`${BASE}/${path}`, {
    waitUntil: 'load',
    timeout: 60000,
  });
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

  await page.waitForFunction(() => [...document.images].every(image =>
    image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
  ), { timeout: 60000 });

  if (errors.length) throw new Error(`${path} page errors:\n${errors.join('\n')}`);
  return page;
}

function assertImages(images, context) {
  for (const image of images) {
    if (!image.complete || image.width < 1 || image.height < 1) {
      throw new Error(`${context} image failed to load: ${JSON.stringify(image)}`);
    }
  }
}

async function inspectHalfLetter(page) {
  return page.evaluate(() => {
    const pages = [...document.querySelectorAll('.page')];
    return {
      interLoaded: document.fonts.check('12px Inter'),
      runningFamily: getComputedStyle(document.querySelector('.running-head')).fontFamily,
      titleFamily: getComputedStyle(document.querySelector('.page-title')).fontFamily,
      flavorSize: getComputedStyle(document.querySelector('.flavor-overline')).fontSize,
      coverImageFit: getComputedStyle(document.querySelector('.cover-art img')).objectFit,
      accent: getComputedStyle(document.querySelector('.faction-rule')).backgroundColor,
      backCoverBackground: getComputedStyle(document.querySelector('.back-cover')).backgroundColor,
      pages: pages.map((item, index) => {
        const rect = item.getBoundingClientRect();
        return {
          index: index + 1,
          width: rect.width,
          height: rect.height,
          scrollWidth: item.scrollWidth,
          clientWidth: item.clientWidth,
          scrollHeight: item.scrollHeight,
          clientHeight: item.clientHeight,
          classes: item.className,
        };
      }),
      images: [...document.images].map(image => ({
        src: image.getAttribute('src'),
        complete: image.complete,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })),
    };
  });
}

function assertHalfLetter(result, context) {
  if (!result.interLoaded || !result.runningFamily.includes('Inter')) {
    throw new Error(`${context}: Inter did not load for utility typography: ${JSON.stringify(result)}`);
  }
  if (!result.titleFamily.includes('Georgia')) {
    throw new Error(`${context}: Georgia is not the principal title face: ${JSON.stringify(result)}`);
  }
  if (result.pages.length !== 12) {
    throw new Error(`${context}: expected 12 print pages; found ${result.pages.length}`);
  }
  if (result.coverImageFit !== 'contain') {
    throw new Error(`${context}: front-cover artwork must use object-fit contain: ${JSON.stringify(result)}`);
  }
  if (Number.parseFloat(result.flavorSize) < 18) {
    throw new Error(`${context}: Declaration Pro display text is still too small: ${JSON.stringify(result)}`);
  }
  for (const item of result.pages) {
    if (Math.abs(item.width - 528) > 2 || Math.abs(item.height - 816) > 2) {
      throw new Error(`${context}: page ${item.index} is ${item.width}×${item.height}px instead of half-letter.`);
    }
    if (item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1) {
      throw new Error(`${context}: page ${item.index} overflows: ${JSON.stringify(item)}`);
    }
  }
  assertImages(result.images, context);
}

const printPage = await openProof('print-proof.html', { width: 1400, height: 1100 });
const printResult = await inspectHalfLetter(printPage);
assertHalfLetter(printResult, 'Grayscale print proof');
await printPage.screenshot({ path: `${OUT}/print-proof-browser.png`, fullPage: true });
await printPage.emulateMedia({ media: 'print' });
await printPage.pdf({
  path: `${OUT}/Gauntlet_v0.6.1_Rulebook_Design_Proofs_v2.pdf`,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await printPage.close();

const colorPage = await openProof('print-proof.html', { width: 1400, height: 1100 });
await colorPage.evaluate(() => document.body.classList.add('color-edition'));
const colorResult = await inspectHalfLetter(colorPage);
assertHalfLetter(colorResult, 'Player-facing color proof');
if (colorResult.accent !== 'rgb(143, 31, 37)') {
  throw new Error(`Player-facing proof did not restore the crimson accent: ${JSON.stringify(colorResult)}`);
}
await colorPage.screenshot({ path: `${OUT}/player-color-proof-browser.png`, fullPage: true });
await colorPage.emulateMedia({ media: 'print' });
await colorPage.pdf({
  path: `${OUT}/Gauntlet_v0.6.1_Player_Rulebook_Color_Design_Proof.pdf`,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await colorPage.close();

async function renderSheets(html, selector, expectedCount, stem) {
  const page = await openProof(html, { width: 1200, height: 900 });
  const result = await page.evaluate(({ selector }) => ({
    sheets: [...document.querySelectorAll(selector)].map((sheet, index) => {
      const rect = sheet.getBoundingClientRect();
      return {
        index: index + 1,
        width: rect.width,
        height: rect.height,
        scrollWidth: sheet.scrollWidth,
        clientWidth: sheet.clientWidth,
        scrollHeight: sheet.scrollHeight,
        clientHeight: sheet.clientHeight,
      };
    }),
    images: [...document.images].map(image => ({
      complete: image.complete,
      width: image.naturalWidth,
      height: image.naturalHeight,
      src: image.getAttribute('src'),
    })),
  }), { selector });

  if (result.sheets.length !== expectedCount) {
    throw new Error(`${html}: expected ${expectedCount} sheets; found ${result.sheets.length}`);
  }
  for (const sheet of result.sheets) {
    if (Math.abs(sheet.width - 1056) > 2 || Math.abs(sheet.height - 816) > 2) {
      throw new Error(`${html} sheet ${sheet.index} is ${sheet.width}×${sheet.height}px instead of Letter landscape.`);
    }
    if (sheet.scrollWidth > sheet.clientWidth + 1 || sheet.scrollHeight > sheet.clientHeight + 1) {
      throw new Error(`${html} sheet ${sheet.index} overflows: ${JSON.stringify(sheet)}`);
    }
  }
  assertImages(result.images, html);
  await page.screenshot({ path: `${OUT}/${stem}.png`, fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: `${OUT}/${stem}.pdf`,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await page.close();
}

await renderSheets(
  'reader-spreads.html',
  '.reader-cover, .spread-sheet',
  7,
  'Gauntlet_v0.6.1_Half_Letter_Reader_Mockup',
);
await renderSheets(
  'imposition-proof.html',
  '.spread-sheet',
  6,
  'Gauntlet_v0.6.1_Half_Letter_Booklet_Imposition',
);

const toner = await openProof('toner-cover-proof.html', { width: 700, height: 900 });
const tonerBox = await toner.locator('.page').evaluate(item => {
  const rect = item.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    scrollWidth: item.scrollWidth,
    clientWidth: item.clientWidth,
    scrollHeight: item.scrollHeight,
    clientHeight: item.clientHeight,
  };
});
if (Math.abs(tonerBox.width - 528) > 2 || Math.abs(tonerBox.height - 816) > 2 ||
    tonerBox.scrollWidth > tonerBox.clientWidth + 1 || tonerBox.scrollHeight > tonerBox.clientHeight + 1) {
  throw new Error(`Toner-saver cover has invalid geometry: ${JSON.stringify(tonerBox)}`);
}
await toner.screenshot({ path: `${OUT}/Gauntlet_v0.6.1_Toner_Saver_Back_Cover.png`, fullPage: true });
await toner.emulateMedia({ media: 'print' });
await toner.pdf({
  path: `${OUT}/Gauntlet_v0.6.1_Toner_Saver_Back_Cover.pdf`,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await toner.close();

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 1200 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const page = await openProof('browser-proof.html', viewport);
  const result = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    interLoaded: document.fonts.check('12px Inter'),
    bodyFamily: getComputedStyle(document.querySelector('.browser-proof')).fontFamily,
    titleFamily: getComputedStyle(document.querySelector('.browser-hero h1')).fontFamily,
    flavorSize: getComputedStyle(document.querySelector('.browser-hero .flavor-overline')).fontSize,
    images: [...document.images].map(image => ({
      complete: image.complete,
      width: image.naturalWidth,
      height: image.naturalHeight,
    })),
  }));
  if (result.horizontalOverflow > 1) {
    throw new Error(`${name} browser proof has ${result.horizontalOverflow}px horizontal overflow`);
  }
  if (!result.interLoaded || !result.bodyFamily.includes('Inter')) {
    throw new Error(`${name} browser proof did not load Inter: ${JSON.stringify(result)}`);
  }
  if (!result.titleFamily.includes('Georgia')) {
    throw new Error(`${name} browser proof did not use Georgia for its principal title: ${JSON.stringify(result)}`);
  }
  if (Number.parseFloat(result.flavorSize) < 20) {
    throw new Error(`${name} browser proof still renders Declaration Pro too small: ${JSON.stringify(result)}`);
  }
  assertImages(result.images, `${name} browser proof`);
  await page.screenshot({ path: `${OUT}/browser-proof-${name}.png`, fullPage: true });
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ grayscale: printResult, color: colorResult }, null, 2));
