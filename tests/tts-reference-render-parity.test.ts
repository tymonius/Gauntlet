import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const rendererPage = readFileSync('tts/supplemental-renderer/index.html', 'utf8');
const rendererStyle = readFileSync('tts/supplemental-renderer/supplemental-renderer.css', 'utf8');
const componentChrome = readFileSync('card-design/leader-card.css', 'utf8');
const production = readFileSync('card-design/supplemental-refinements.css', 'utf8');

describe('TTS faction-reference renderer parity', () => {
  it('loads the production component stack without a separate visual-fix stylesheet', () => {
    expect(rendererPage).toContain('/card-design/leader-card.css');
    expect(rendererPage).toContain('/card-design/reference-card.css');
    expect(rendererPage).toContain('/card-design/supplemental-refinements.css');
    expect(rendererPage).toContain('/card-design/universal-reference.css');
    expect(rendererPage).toContain('/tts/supplemental-renderer/supplemental-renderer.css');
    expect(rendererPage).not.toContain('visual-fixes.css');
    expect(componentChrome).toContain('.faction-component-card[data-faction="financiers"]');
    expect(componentChrome).toContain('--component-parchment-tint');
    expect(componentChrome).toContain('--component-footer-tint');
    expect(componentChrome).toContain('--faction-symbol');
  });

  it('leaves parchment treatment to production CSS while owning standalone asset resolution', () => {
    expect(production).toContain('.reference-card[data-component-id="financiers-reference"] .reference-card-interior');
    expect(production).toContain('linear-gradient(var(--component-parchment-tint), var(--component-parchment-tint))');
    expect(production).toContain('background-blend-mode: multiply, normal');

    for (const faction of ['diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
      expect(rendererStyle).not.toContain(`.reference-card[data-faction="${faction}"] .reference-card-interior`);
      expect(rendererStyle).toContain(`--reference-parchment-image: url("/images/artwork/card-backgrounds/${faction}-parchment-v2.png")`);
      expect(rendererStyle).toContain(`mask-image: url("/images/faction-symbols/${faction}.svg") !important`);
    }
  });

  it('retains the neutral ivory treatment and stylized G for Universal Reference', () => {
    expect(rendererStyle).toContain('.reference-card[data-component-id="universal-reference"]');
    expect(rendererStyle).toContain('--reference-border: #eee7d5');
    expect(rendererStyle).toContain('/images/artwork/card-backgrounds/neutral-parchment-v2.png');
    expect(rendererStyle).toContain('-webkit-mask-image: url("/images/Gauntlet-G.svg") !important');
    expect(rendererStyle).not.toContain('-webkit-mask-image: url("/images/Gauntlet.svg") !important');
  });

  it('keeps the Diplomat reverse title fitting rule in the renderer stylesheet', () => {
    expect(rendererStyle).toContain('.reference-card[data-component-id="diplomats-reference"][data-reference-side="reverse"] .reference-face-title');
    expect(rendererPage).not.toContain('font-size:10.9pt');
  });
});
