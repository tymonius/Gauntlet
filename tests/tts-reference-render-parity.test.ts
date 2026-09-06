import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const legacyRenderer = readFileSync('tts/supplemental-renderer/index.html', 'utf8');
const faceSpec = readFileSync('card-design/face-spec.mjs', 'utf8');
const factionComponent = readFileSync('card-design/faction-component.css', 'utf8');
const production = readFileSync('card-design/supplemental-refinements.css', 'utf8');
const universalReference = readFileSync('card-design/universal-reference.css', 'utf8');

describe('TTS faction-reference renderer parity', () => {
  it('redirects the legacy TTS reference surface to the canonical physical face renderer', () => {
    expect(legacyRenderer).toContain('/card-design/face-render.html');
    expect(legacyRenderer).toContain('component:${component}:${side}');
    expect(legacyRenderer).not.toContain('/card-design/component-render.html');
    expect(existsSync(['tts', 'supplemental-renderer', 'supplemental-renderer.js'].join('/'))).toBe(false);
    expect(existsSync(['tts', 'supplemental-renderer', 'supplemental-renderer.css'].join('/'))).toBe(false);
    expect(readdirSync('tts/supplemental-renderer').sort()).toEqual(['index.html']);
  });

  it('loads reference styling from the FaceSpec template contract', () => {
    for (const stylesheet of [
      '/card-design/reference-card.css',
      '/card-design/supplemental-refinements.css',
      '/card-design/universal-reference.css',
    ]) {
      expect(faceSpec).toContain(stylesheet);
    }
    expect(faceSpec).toContain('/card-design/faction-component.css');
    expect(factionComponent).toContain('.faction-component-card[data-faction="financiers"]');
    expect(factionComponent).toContain('--component-parchment-tint');
    expect(factionComponent).toContain('--component-footer-tint');
    expect(factionComponent).toContain('--faction-symbol');
  });

  it('leaves parchment and Universal-reference treatment in Card Design production CSS', () => {
    expect(production).toContain('.reference-card[data-component-id="financiers-reference"] .reference-card-interior');
    expect(production).toContain('linear-gradient(var(--component-parchment-tint), var(--component-parchment-tint))');
    expect(production).toContain('background-blend-mode: multiply, normal');
    expect(universalReference).toContain('.reference-card[data-component-id="universal-reference"] .reference-watermark');
    expect(universalReference).toContain('Gauntlet.svg');
  });
});
