import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const rendererPage = readFileSync('tts/supplemental-renderer/index.html', 'utf8');
const bridge = readFileSync('tts/supplemental-renderer/visual-fixes.css', 'utf8');
const componentChrome = readFileSync('card-design/leader-card.css', 'utf8');
const production = readFileSync('card-design/supplemental-refinements.css', 'utf8');

describe('TTS faction-reference render bridge', () => {
  it('loads the shared faction-component variables used by the Card Review catalog', () => {
    expect(rendererPage).toContain('/card-design/leader-card.css');
    expect(componentChrome).toContain('.faction-component-card[data-faction="financiers"]');
    expect(componentChrome).toContain('--component-parchment-tint');
    expect(componentChrome).toContain('--component-footer-tint');
    expect(componentChrome).toContain('--faction-symbol');
  });

  it('leaves faction-reference parchment treatment to the production supplemental stylesheet', () => {
    expect(production).toContain('.reference-card[data-component-id="financiers-reference"] .reference-card-interior');
    expect(production).toContain('linear-gradient(var(--component-parchment-tint), var(--component-parchment-tint))');
    expect(production).toContain('background-blend-mode: multiply, normal');

    for (const faction of ['diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
      expect(bridge).not.toContain(`.reference-card[data-faction="${faction}"] .reference-card-interior`);
      expect(bridge).toContain(`--reference-parchment-image: url("/images/artwork/card-backgrounds/${faction}-parchment-v2.png")`);
    }
  });

  it('keeps only the standalone-renderer asset-resolution fixes for faction emblems', () => {
    expect(bridge).toContain('-webkit-mask-image: url("/images/faction-symbols/diplomats.svg") !important');
    expect(bridge).toContain('-webkit-mask-image: url("/images/faction-symbols/financiers.svg") !important');
    expect(bridge).toContain('background: var(--reference-accent) !important');
  });

  it('retains the neutral ivory treatment and stylized G for Universal Reference', () => {
    expect(bridge).toContain('.reference-card[data-component-id="universal-reference"]');
    expect(bridge).toContain('--reference-border: #eee7d5');
    expect(bridge).toContain('/images/artwork/card-backgrounds/neutral-parchment-v2.png');
    expect(bridge).toContain('-webkit-mask-image: url("/images/Gauntlet-G.svg") !important');
    expect(bridge).not.toContain('-webkit-mask-image: url("/images/Gauntlet.svg") !important');
  });
});
