import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const territorySource = readFileSync('deckbuilder/territories.js', 'utf8');
const previewCss = readFileSync('deckbuilder/rendered-card-preview.css', 'utf8');

describe('Deckbuilder Territory preview', () => {
  it('uses the production Territory renderer instead of rebuilding Territory text', () => {
    expect(territorySource).toContain('../card-design/territory-review-render.html?territory=');
    expect(territorySource).toContain('deckbuilder-territory-render-frame');
    expect(territorySource).toContain('complete rendered Territory card');
    expect(territorySource).not.toContain('<div class="card-text-label">Effect</div>');
  });

  it('scales the native landscape production surface without changing its aspect ratio', () => {
    expect(territorySource).toContain('const TERRITORY_WIDTH = 336;');
    expect(territorySource).toContain('const TERRITORY_HEIGHT = 240;');
    expect(territorySource).toContain('targetWidth / TERRITORY_WIDTH');
    expect(previewCss).toMatch(/\.deckbuilder-territory-render-frame\s*\{[\s\S]*width:\s*336px;[\s\S]*height:\s*240px;/);
  });
});
