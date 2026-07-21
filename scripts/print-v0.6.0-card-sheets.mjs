import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'releases/v0.6');
fs.mkdirSync(OUT, { recursive: true });

const base = process.env.GAUNTLET_BASE_URL ?? 'http://127.0.0.1:8000';
const sheets = [
  ['build/v0.6.0/cards/neutral.html', 'Gauntlet_v0.6.0_Neutral_Cards.pdf'],
  ['build/v0.6.0/cards/territories.html', 'Gauntlet_v0.6.0_Territories.pdf'],
  ['faction-sheets/military.html', 'Gauntlet_v0.6.0_Military_Cards_and_Components.pdf'],
  ['faction-sheets/diplomat.html', 'Gauntlet_v0.6.0_Diplomat_Cards_and_Components.pdf'],
  ['faction-sheets/financier.html', 'Gauntlet_v0.6.0_Financier_Cards_and_Components.pdf'],
  ['faction-sheets/intelligence.html', 'Gauntlet_v0.6.0_Intelligence_Cards_and_Components.pdf'],
  ['faction-sheets/mystics.html', 'Gauntlet_v0.6.0_Mystics_Cards_and_Components.pdf'],
  ['faction-sheets/inquisition.html', 'Gauntlet_v0.6.0_Inquisition_Cards_and_Components.pdf']
];

const browser = await chromium.launch({ headless: true });
try {
  for (const [urlPath, filename] of sheets) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
    const url = `${base}/${urlPath}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.print-card, .card', { timeout: 30000 });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      if (typeof window.fitCards === 'function') window.fitCards();
    });
    await page.waitForTimeout(750);

    const results = await page.evaluate(() => {
      if (Array.isArray(window.__cardFitResults) && window.__cardFitResults.length) {
        return window.__cardFitResults;
      }
      return [...document.querySelectorAll('.print-card:not(.placeholder-card), .card:not(.placeholder)')].map(card => ({
        name: card.dataset.cardName || card.dataset.name || card.querySelector('.card-name, .card-title, .leader-title, .reference-heading')?.textContent?.trim() || 'unnamed card',
        fits: card.scrollHeight <= card.clientHeight + 1,
        overflow: Math.max(0, card.scrollHeight - card.clientHeight)
      }));
    });

    const failures = results.filter(result => !result.fits);
    if (failures.length) throw new Error(`${filename} has overflowing cards: ${JSON.stringify(failures)}`);

    await page.pdf({
      path: path.join(OUT, filename),
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    console.log(`${filename}: ${results.length} fitted cards`);
    await page.close();
  }
} finally {
  await browser.close();
}
