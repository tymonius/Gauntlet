import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const legacyRenderer = readFileSync('tts/supplemental-renderer/index.html', 'utf8');
const componentRenderer = readFileSync('card-design/component-render.html', 'utf8');
const componentChrome = readFileSync('card-design/leader-card.css', 'utf8');
const production = readFileSync('card-design/supplemental-refinements.css', 'utf8');
const universalReference = readFileSync('card-design/universal-reference.css', 'utf8');

describe('TTS faction-reference renderer parity', () => {
  it('redirects the legacy TTS reference surface to the canonical Card Design component renderer', () => {
    expect(legacyRenderer).toContain('/card-design/component-render.html');
    expect(legacyRenderer).toContain("kind = 'reference'");
    expect(existsSync(['tts', 'supplemental-renderer', 'supplemental-renderer.js'].join('/'))).toBe(false);
    expect(existsSync(['tts', 'supplemental-renderer', 'supplemental-renderer.css'].join('/'))).toBe(false);
  });

  it('loads the complete production reference styling from the canonical component surface', () => {
    for (const stylesheet of [
      '/card-design/leader-card.css',
      '/card-design/reference-card.css',
      '/card-design/supplemental-refinements.css',
      '/card-design/universal-reference.css',
    ]) {
      expect(componentRenderer).toContain(stylesheet);
    }
    expect(componentChrome).toContain('.faction-component-card[data-faction="financiers"]');
    expect(componentChrome).toContain('--component-parchment-tint');
    expect(componentChrome).toContain('--component-footer-tint');
    expect(componentChrome).toContain('--faction-symbol');
  });

  it('leaves parchment and Universal-reference treatment in Card Design production CSS', () => {
    expect(production).toContain('.reference-card[data-component-id="financiers-reference"] .reference-card-interior');
    expect(production).toContain('linear-gradient(var(--component-parchment-tint), var(--component-parchment-tint))');
    expect(production).toContain('background-blend-mode: multiply, normal');
    expect(universalReference).toContain('.reference-card[data-component-id="universal-reference"] .reference-watermark');
    expect(universalReference).toContain('Gauntlet.svg');
  });
});
