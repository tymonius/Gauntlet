import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const base = process.env.GAUNTLET_PUBLIC_UI_BASE_URL || 'http://127.0.0.1:8000';
const previewDir = process.env.GAUNTLET_PUBLIC_UI_PREVIEW_DIR || '/tmp/gauntlet-v063-public-ui-previews';
fs.mkdirSync(previewDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const pages = [
    ['home', '/'],
    ['start', '/start/'],
    ['factions', '/factions/'],
    ['rulebook', '/rulebook/'],
    ['military', '/factions/military/'],
    ['diplomats', '/factions/diplomats/'],
    ['financiers', '/factions/financiers/'],
    ['intelligence', '/factions/intelligence/'],
    ['mystics', '/factions/mystics/'],
    ['inquisition', '/factions/inquisition/'],
  ];

  for (const [key, route] of pages) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().startsWith(base)) errors.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
    assert(response?.ok(), `${route} failed to load (${response?.status()}).`);
    if (errors.length) throw new Error(`${route} browser errors:\n${errors.join('\n')}`);

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    assert(layout.scrollWidth <= layout.clientWidth + 2, `${route} has horizontal overflow: ${layout.scrollWidth} > ${layout.clientWidth}.`);

    if (key === 'home' || key === 'start' || key === 'factions') {
      const selector = key === 'home' ? '.faction-symbol-asset' : key === 'start' ? '.choice-mark.faction-symbol-asset' : '.hub-symbol.faction-symbol-asset';
      const symbols = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => {
        const style = getComputedStyle(node);
        return {
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
          mask: style.maskImage || style.webkitMaskImage,
          background: style.backgroundColor,
        };
      }));
      assert.equal(symbols.length, 6, `${route} should render six asset-backed faction symbols.`);
      for (const [index, symbol] of symbols.entries()) {
        assert(symbol.width > 10 && symbol.height > 10, `${route} faction symbol ${index + 1} has no visible box.`);
        assert(symbol.mask && symbol.mask !== 'none', `${route} faction symbol ${index + 1} has no resolved mask image.`);
      }
    }

    if (key === 'start') {
      const typography = await page.evaluate(() => {
        const selectors = ['.start-hero h1', '.section-heading h2', '.overview-feature h3', '.faction-choice strong', '.intro-card h3'];
        return selectors.map((selector) => {
          const element = document.querySelector(selector);
          const style = getComputedStyle(element);
          return { selector, family: style.fontFamily, weight: style.fontWeight };
        });
      });
      for (const item of typography) {
        assert(item.family.toLowerCase().includes('p22-1722-pro'), `${item.selector} is not using the historical display face: ${item.family}`);
        assert.equal(item.weight, '400', `${item.selector} is still bold (${item.weight}).`);
      }
    }

    if (key === 'rulebook') {
      const printActions = await page.evaluate(() => ({
        booklet: [...document.querySelectorAll('a')].filter((a) => a.href.includes('Gauntlet_v0.6.3_Rulebook_Booklet.pdf')).length,
        reader: [...document.querySelectorAll('a')].filter((a) => a.href.endsWith('Gauntlet_v0.6.3_Rulebook.pdf')).length,
        markdown: [...document.querySelectorAll('a')].filter((a) => a.href.endsWith('Gauntlet_v0.6.3_Rulebook.md')).length,
        browserPrint: document.querySelectorAll('[data-print-rulebook]').length,
      }));
      assert(printActions.booklet >= 1, 'Rulebook has no printable booklet action.');
      assert.equal(printActions.reader, 0, 'Rulebook still exposes the Reader PDF.');
      assert.equal(printActions.markdown, 0, 'Rulebook still exposes Markdown.');
      assert.equal(printActions.browserPrint, 0, 'Rulebook still exposes browser printing.');
    }

    if (key !== 'military' && key !== 'diplomats' && key !== 'financiers' && key !== 'intelligence' && key !== 'mystics' && key !== 'inquisition') {
      await page.screenshot({ path: path.join(previewDir, `${key}.png`), fullPage: true, timeout: 30000 });
    } else {
      const heroSymbols = await page.locator('.faction-eyebrow-symbol.faction-symbol-asset').evaluateAll((nodes) => nodes.map((node) => {
        const style = getComputedStyle(node);
        return { width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, mask: style.maskImage || style.webkitMaskImage };
      }));
      assert.equal(heroSymbols.length, 1, `${route} should render one faction-symbol asset in the hero label.`);
      assert(heroSymbols[0].width > 10 && heroSymbols[0].height > 10 && heroSymbols[0].mask !== 'none', `${route} hero faction symbol is not visibly rendered.`);
    }

    await page.close();
  }
} finally {
  await browser.close();
}

console.log('Rendered and validated v0.6.3 public UI invariants.');
