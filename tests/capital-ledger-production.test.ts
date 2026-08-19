import { test, expect } from '@playwright/test';

const DESIGN_URL = '/card-design/';

test.describe('Financiers Capital Ledger', () => {
  test('renders identical duplex ledger faces', async ({ page }) => {
    await page.goto(DESIGN_URL);
    const ledgers = page.locator('.capital-ledger-card');
    await expect(ledgers).toHaveCount(2);

    const texts = await ledgers.allTextContents();
    expect(texts[0].replace(/\s+/g, ' ').trim()).toBe(texts[1].replace(/\s+/g, ' ').trim());
  });

  test('shows columns, example entry, opening balance, and writable rows', async ({ page }) => {
    await page.goto(DESIGN_URL);
    const ledger = page.locator('.capital-ledger-card').first();

    await expect(ledger).toContainText('Capital Ledger');
    await expect(ledger).toContainText('Public Capital Record');
    await expect(ledger).toContainText('Entry');
    await expect(ledger).toContainText('±');
    await expect(ledger).toContainText('Balance');
    await expect(ledger.locator('.capital-ledger-row--example')).toContainText('Income');
    await expect(ledger.locator('.capital-ledger-row--example')).toContainText('+1');
    await expect(ledger.locator('.capital-ledger-row--example')).toContainText('3');
    await expect(ledger.locator('.capital-ledger-row--opening')).toContainText('Opening Balance');
    await expect(ledger.locator('.capital-ledger-row--opening')).toContainText('2');
    await expect(ledger.locator('.capital-ledger-row--blank')).toHaveCount(10);
  });

  test('uses handwritten typography for the faint example entry', async ({ page }) => {
    await page.goto(DESIGN_URL);
    const example = page.locator('.capital-ledger-card').first().locator('.capital-ledger-row--example');
    const fontFamily = await example.evaluate(element => getComputedStyle(element).fontFamily.toLowerCase());
    expect(fontFamily).toMatch(/declaration|handwritten/);

    const opacityColor = await example.evaluate(element => getComputedStyle(element).color);
    expect(opacityColor).toMatch(/rgba?\(/);
  });

  test('uses ledger metadata footer', async ({ page }) => {
    await page.goto(DESIGN_URL);
    const footer = page.locator('.capital-ledger-card').first().locator('.card-footer');
    await expect(footer).toContainText('Financiers');
    await expect(footer).toContainText('Ledger');
  });
});
