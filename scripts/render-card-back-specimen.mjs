import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'leaders');

const FACTIONS = Object.freeze({
  military: {
    border: 'rgb(158, 38, 44)',
    outline: 'rgb(95, 20, 24)',
    rule: 'rgba(255, 244, 226, 0.38)',
    field: 'rgb(123, 30, 34)',
  },
  diplomats: {
    border: 'rgb(38, 79, 145)',
    outline: 'rgb(23, 52, 95)',
    rule: 'rgba(244, 248, 255, 0.38)',
    field: 'rgb(30, 62, 113)',
  },
  financiers: {
    border: 'rgb(34, 112, 68)',
    outline: 'rgb(18, 68, 41)',
    rule: 'rgba(242, 255, 246, 0.38)',
    field: 'rgb(27, 87, 53)',
  },
  intelligence: {
    border: 'rgb(40, 40, 39)',
    outline: 'rgb(17, 17, 17)',
    rule: 'rgba(255, 255, 250, 0.34)',
    field: 'rgb(32, 33, 36)',
  },
  mystics: {
    border: 'rgb(93, 52, 126)',
    outline: 'rgb(56, 32, 78)',
    rule: 'rgba(251, 244, 255, 0.38)',
    field: 'rgb(73, 41, 98)',
  },
  inquisition: {
    border: 'rgb(166, 122, 39)',
    outline: 'rgb(102, 71, 14)',
    rule: 'rgba(255, 249, 225, 0.42)',
    field: 'rgb(129, 95, 30)',
  },
});

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

async function cardMetrics(back) {
  return back.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const elementStyle = getComputedStyle(element);
    const outerRuleStyle = getComputedStyle(element, '::before');
    const fieldStyle = getComputedStyle(element, '::after');
    const frame = element.querySelector('.gauntlet-card-back__frame');
    const frameRect = frame.getBoundingClientRect();
    const frameStyle = getComputedStyle(frame);
    const wordmark = element.querySelector('.gauntlet-card-back__wordmark');
    const wordmarkRect = wordmark.getBoundingClientRect();
    const wordmarkStyle = getComputedStyle(wordmark);
    const patternWindow = element.querySelector('.gauntlet-card-back__pattern-window');
    const patternWindowRect = patternWindow.getBoundingClientRect();
    const patternWindowStyle = getComputedStyle(patternWindow);
    const surfaceStyle = getComputedStyle(patternWindow, '::after');
    const pattern = element.querySelector('.gauntlet-card-back__pattern');
    const patternStyle = getComputedStyle(pattern);
    const rows = [...element.querySelectorAll('.gauntlet-card-back__pattern-row')];
    const firstRowStyle = rows[0] ? getComputedStyle(rows[0]) : null;
    const symbols = [...element.querySelectorAll('.gauntlet-card-back__symbol')];
    const firstSymbolStyle = symbols[0] ? getComputedStyle(symbols[0]) : null;
    const firstColumnTrack = firstRowStyle
      ? Number.parseFloat(firstRowStyle.gridTemplateColumns.split(' ')[0])
      : Number.NaN;
    const symbolWidth = firstSymbolStyle ? Number.parseFloat(firstSymbolStyle.width) : Number.NaN;

    return {
      width: rect.width,
      height: rect.height,
      borderBackground: elementStyle.backgroundColor,
      borderOutline: elementStyle.borderTopColor,
      borderRule: outerRuleStyle.borderTopColor,
      fieldBackground: fieldStyle.backgroundColor,
      frameInset: frameRect.left - rect.left,
      frameRadius: frameStyle.borderRadius,
      frameBorderWidth: frameStyle.borderLeftWidth,
      frameBorderColor: frameStyle.borderLeftColor,
      patternWindowInset: patternWindowRect.left - rect.left,
      patternWindowWidth: patternWindowRect.width,
      patternWindowHeight: patternWindowRect.height,
      patternWindowOverflow: patternWindowStyle.overflow,
      surfaceBackground: surfaceStyle.backgroundImage,
      surfaceOpacity: surfaceStyle.opacity,
      surfaceBlendMode: surfaceStyle.mixBlendMode,
      patternWidth: Number.parseFloat(patternStyle.width),
      patternHeight: Number.parseFloat(patternStyle.height),
      patternRowTransforms: rows.slice(0, 4).map(row => getComputedStyle(row).transform),
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
      wordmarkBackground: wordmarkStyle.backgroundColor,
      wordmarkFrameClearance: (frameRect.height - wordmarkRect.height) / 2,
      wordmarkMask: wordmarkStyle.maskImage || wordmarkStyle.webkitMaskImage,
    };
  });
}

function validateCardMetrics(faction, metrics) {
  const expected = FACTIONS[faction];
  if (Math.abs(metrics.width - 240) > 0.25 || Math.abs(metrics.height - 336) > 0.25) {
    throw new Error(`${faction} card-back geometry changed: ${metrics.width} × ${metrics.height}.`);
  }
  if (metrics.borderBackground !== expected.border || metrics.borderOutline !== expected.outline || metrics.borderRule !== expected.rule) {
    throw new Error(`${faction} card-back border does not match the production faction-front palette: ${JSON.stringify(metrics)}.`);
  }
  if (metrics.fieldBackground !== expected.field) {
    throw new Error(`${faction} card-back field is not the intended darker faction color: ${JSON.stringify(metrics)}.`);
  }
  if (Math.abs(metrics.frameInset - 24) > 0.25 || metrics.frameRadius !== '12px' || metrics.frameBorderWidth !== '1px' || metrics.frameBorderColor !== 'rgb(215, 183, 131)') {
    throw new Error(`${faction} card-back gold frame changed: ${JSON.stringify(metrics)}.`);
  }
  if (Math.abs(metrics.patternWindowInset - 8.2) > 0.25 || metrics.patternWindowOverflow !== 'hidden') {
    throw new Error(`${faction} card-back tiled field is not clipped inside the opaque border: ${JSON.stringify(metrics)}.`);
  }
  if (metrics.surfaceBackground === 'none' || metrics.surfaceOpacity !== '0.055' || metrics.surfaceBlendMode !== 'soft-light') {
    throw new Error(`${faction} card-back printed-stock grain did not render correctly: ${JSON.stringify(metrics)}.`);
  }
  if (metrics.symbolCount !== 1296 || !metrics.symbolsMasked || metrics.wordmarkMask === 'none') {
    throw new Error(`${faction} card-back assets failed to render: ${JSON.stringify(metrics)}.`);
  }
  if (metrics.patternTransform === 'none') {
    throw new Error(`${faction} card-back tiling field is not rotated as one surface: ${JSON.stringify(metrics)}.`);
  }
  const patternWindowDiagonal = Math.hypot(metrics.patternWindowWidth, metrics.patternWindowHeight);
  if (Math.min(metrics.patternWidth, metrics.patternHeight) <= patternWindowDiagonal) {
    throw new Error(`${faction} card-back tiling surface does not cover every rotated corner: ${JSON.stringify(metrics)}.`);
  }
  if (new Set(metrics.patternRowTransforms).size < 4) {
    throw new Error(`${faction} card-back tiling no longer uses the interlocked four-phase lattice: ${JSON.stringify(metrics)}.`);
  }
  if (!Number.isFinite(metrics.symbolCellGap) || metrics.symbolCellGap > 3 || metrics.symbolBackground !== 'rgba(0, 0, 0, 0.42)') {
    throw new Error(`${faction} card-back faction icons are not the approved dense dark pattern: ${JSON.stringify(metrics)}.`);
  }
  if (metrics.wordmarkBackground !== 'rgb(255, 249, 241)' || metrics.wordmarkHeight < 230 || metrics.wordmarkWidth > 66 || metrics.wordmarkHeight <= metrics.wordmarkWidth || metrics.wordmarkFrameClearance < 12) {
    throw new Error(`${faction} card-back wordmark changed from the approved warm-ivory treatment: ${JSON.stringify(metrics)}.`);
  }
}

async function validateEmbeddedFrameInspector(page, sourceFrame, label) {
  await sourceFrame.scrollIntoViewIfNeeded();
  const frameHandle = await sourceFrame.elementHandle();
  const embedded = await frameHandle?.contentFrame();
  if (!embedded) throw new Error(`${label} canonical component iframe did not expose a content frame.`);
  const card = embedded.locator('.leader-card').first();
  await card.waitFor();
  await embedded.waitForFunction(() => document.querySelector('.leader-card')?.classList.contains('card-inspectable'));
  await card.click();

  const dialog = page.locator('.card-inspection-dialog[open]').first();
  await dialog.waitFor();
  const inspection = await dialog.evaluate(element => {
    const frame = element.querySelector('.card-inspection-frame');
    const frameRect = frame?.getBoundingClientRect();
    const stage = element.querySelector('.card-inspection-stage');
    const stageRect = stage?.getBoundingClientRect();
    return {
      open: element.open,
      position: getComputedStyle(element).position,
      hasFrame: Boolean(frame),
      frameWidth: frameRect?.width || 0,
      frameHeight: frameRect?.height || 0,
      stageWidth: stageRect?.width || 0,
      stageHeight: stageRect?.height || 0,
      inspectionSource: frame?.src || '',
    };
  });

  if (!inspection.open || inspection.position !== 'fixed' || !inspection.hasFrame) {
    throw new Error(`${label} did not open through the shared embedded-frame inspector: ${JSON.stringify(inspection)}.`);
  }
  if (inspection.frameWidth <= 240 || inspection.frameHeight <= 336 || inspection.stageWidth <= 240 || inspection.stageHeight <= 336) {
    throw new Error(`${label} embedded inspector did not enlarge the canonical frame: ${JSON.stringify(inspection)}.`);
  }
  if (!inspection.inspectionSource.includes('inspection=1')) {
    throw new Error(`${label} embedded inspector did not request canonical inspection mode: ${JSON.stringify(inspection)}.`);
  }

  await dialog.locator('.card-inspection-close').click();
  await page.waitForFunction(() => !document.querySelector('.card-inspection-dialog[open]'));
}

async function validateSharedInspector(page, source, cloneSelector, label) {
  await source.scrollIntoViewIfNeeded();
  await page.waitForFunction(selector => document.querySelector(selector)?.classList.contains('card-inspectable'), cloneSelector === '.gauntlet-card-back' ? '[data-gauntlet-card-back][data-card-back-faction="intelligence"]' : '.leader-card');
  await source.click();

  const dialog = page.locator('.card-inspection-dialog[open]').first();
  await dialog.waitFor();
  const inspection = await dialog.evaluate((element, selector) => {
    const clone = element.querySelector(`.card-inspection-clone${selector}`);
    const cloneRect = clone?.getBoundingClientRect();
    const sourceStage = element.querySelector('.card-inspection-stage');
    const stageRect = sourceStage?.getBoundingClientRect();
    return {
      open: element.open,
      position: getComputedStyle(element).position,
      hasClone: Boolean(clone),
      cloneWidth: cloneRect?.width || 0,
      cloneHeight: cloneRect?.height || 0,
      stageWidth: stageRect?.width || 0,
      stageHeight: stageRect?.height || 0,
    };
  }, cloneSelector);

  if (!inspection.open || inspection.position !== 'fixed' || !inspection.hasClone) {
    throw new Error(`${label} did not open in the shared fixed card inspector: ${JSON.stringify(inspection)}.`);
  }
  if (inspection.cloneWidth <= 240 || inspection.cloneHeight <= 336 || inspection.stageWidth <= 240 || inspection.stageHeight <= 336) {
    throw new Error(`${label} inspector did not enlarge the selected card: ${JSON.stringify(inspection)}.`);
  }

  await dialog.locator('.card-inspection-close').click();
  await page.waitForFunction(() => !document.querySelector('.card-inspection-dialog[open]'));
}

async function main() {
  const { chromium } = await import('playwright');
  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 2 });

  try {
    await page.goto(`${baseUrl}/card-design/?type=back#card-back`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('[data-gauntlet-card-back].gauntlet-card-back').length === 6);
    await page.waitForTimeout(100);

    const backs = page.locator('[data-gauntlet-card-back]');
    if (await backs.count() !== Object.keys(FACTIONS).length) {
      throw new Error(`Expected six card-back color studies, found ${await backs.count()}.`);
    }

    for (const faction of Object.keys(FACTIONS)) {
      const back = page.locator(`[data-gauntlet-card-back][data-card-back-faction="${faction}"]`);
      await back.waitFor();
      const metrics = await cardMetrics(back);
      validateCardMetrics(faction, metrics);
      await back.screenshot({ path: join(OUTPUT, `card-back-${faction}.png`), omitBackground: true });
    }

    const colorwaySheet = page.locator('[data-card-back-colorways]');
    await colorwaySheet.screenshot({ path: join(OUTPUT, 'card-back-colorways.png'), omitBackground: false });

    const intelligenceBack = page.locator('[data-gauntlet-card-back][data-card-back-faction="intelligence"]');
    await intelligenceBack.screenshot({ path: join(OUTPUT, 'universal-card-back.png'), omitBackground: true });

    /* Regression coverage for the review interaction itself, not just static
       specimen geometry. Validate each catalog slice independently so the
       filtered catalog does not need to instantiate unrelated components. */
    await validateSharedInspector(page, intelligenceBack, '.gauntlet-card-back', 'Card back');

    const leaderPage = await browser.newPage({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 2 });
    try {
      await leaderPage.goto(`${baseUrl}/card-design/?type=leader#leader-cards`, { waitUntil: 'load' });
      const leaderFrame = leaderPage.locator('#leader-cards .component-review-frame').first();
      await leaderFrame.waitFor();
      await leaderPage.waitForFunction(() => (
        document.querySelector('#leader-cards .component-review-frame')?.contentDocument?.body?.dataset.renderReady === 'true'
      ));
      await validateEmbeddedFrameInspector(leaderPage, leaderFrame, 'Leader card');
    } finally {
      await leaderPage.close();
    }

    for (const faction of Object.keys(FACTIONS)) {
      await page.evaluate(factionName => {
        const source = document.querySelector(`[data-gauntlet-card-back][data-card-back-faction="${factionName}"]`);
        const wrapper = document.createElement('div');
        wrapper.className = 'gauntlet-card-back-bleed-proof';
        wrapper.dataset.cardBackBleedProof = factionName;
        wrapper.dataset.cardBackFaction = factionName;
        wrapper.append(source.cloneNode(true));
        document.body.append(wrapper);
      }, faction);

      const bleedProof = page.locator(`[data-card-back-bleed-proof="${faction}"]`);
      const bleedMetrics = await bleedProof.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const card = element.querySelector('.gauntlet-card-back');
        const cardRect = card.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          cardWidth: cardRect.width,
          cardHeight: cardRect.height,
          insetLeft: cardRect.left - rect.left,
          insetTop: cardRect.top - rect.top,
          background: getComputedStyle(element).backgroundColor,
        };
      });

      if (Math.abs(bleedMetrics.width - 264) > 0.25 || Math.abs(bleedMetrics.height - 360) > 0.25) {
        throw new Error(`${faction} card-back bleed proof is not 2.75 × 3.75in: ${JSON.stringify(bleedMetrics)}.`);
      }
      if (Math.abs(bleedMetrics.cardWidth - 240) > 0.25 || Math.abs(bleedMetrics.cardHeight - 336) > 0.25) {
        throw new Error(`${faction} card-back trim changed inside the bleed proof: ${JSON.stringify(bleedMetrics)}.`);
      }
      if (Math.abs(bleedMetrics.insetLeft - 12) > 0.25 || Math.abs(bleedMetrics.insetTop - 12) > 0.25 || bleedMetrics.background !== FACTIONS[faction].border) {
        throw new Error(`${faction} card-back bleed does not carry the faction border color through the full 1/8in margin: ${JSON.stringify(bleedMetrics)}.`);
      }

      await bleedProof.screenshot({ path: join(OUTPUT, `card-back-${faction}-bleed.png`), omitBackground: false });
    }

    const intelligenceBleed = page.locator('[data-card-back-bleed-proof="intelligence"]');
    await intelligenceBleed.screenshot({ path: join(OUTPUT, 'universal-card-back-bleed.png'), omitBackground: false });
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
