import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  V072_BOOKLET_HERO_WOODCUTS,
  V072_BOOKLET_MANIFEST,
  V072_BOOKLET_OUTPUT_ROOT,
  V072_BOOKLET_RELEASE_VERSION,
  V072_MODULAR_BOOKLETS,
  v072BookletImposition,
} from '../packages/rules/publication/v072-modular-booklets.mjs';

const expected = [
  ['player-guide', 'Gauntlet_v0.7.2_Player_Guide_Booklet.pdf'],
  ['military', 'Gauntlet_v0.7.2_Military_Guide_Booklet.pdf'],
  ['diplomats', 'Gauntlet_v0.7.2_Diplomats_Guide_Booklet.pdf'],
  ['financiers', 'Gauntlet_v0.7.2_Financiers_Guide_Booklet.pdf'],
  ['intelligence', 'Gauntlet_v0.7.2_Intelligence_Guide_Booklet.pdf'],
  ['mystics', 'Gauntlet_v0.7.2_Mystics_Guide_Booklet.pdf'],
  ['inquisition', 'Gauntlet_v0.7.2_Inquisition_Guide_Booklet.pdf'],
  ['complete-rules', 'Gauntlet_v0.7.2_Complete_Rules_Booklet.pdf'],
];

describe('v0.7.2 modular booklet pipeline', () => {
  it('defines exactly the eight required publication booklets', () => {
    expect(V072_BOOKLET_RELEASE_VERSION).toBe('v0.7.2');
    expect(V072_BOOKLET_OUTPUT_ROOT).toBe('artifacts/rules-booklets/v0.7.2');
    expect(V072_BOOKLET_MANIFEST).toBe('Gauntlet_v0.7.2_Modular_Rules_Manifest.json');
    expect(V072_MODULAR_BOOKLETS.map(({ id, filename }) => [id, filename])).toEqual(expected);
    expect(new Set(V072_MODULAR_BOOKLETS.map(publication => publication.source)).size).toBe(8);
  });

  it('uses the approved hero woodcut compositions for semantic padding pages', () => {
    expect(V072_BOOKLET_HERO_WOODCUTS).toHaveLength(4);
    expect(V072_BOOKLET_HERO_WOODCUTS.map(hero => hero.source)).toEqual([
      'images/woodcuts/hero compositions/hero 1.png',
      'images/woodcuts/hero compositions/hero 2.png',
      'images/woodcuts/hero compositions/hero 3.png',
      'images/woodcuts/hero compositions/hero 4.png',
    ]);
    expect(V072_BOOKLET_HERO_WOODCUTS.every(hero => hero.publicUrl.startsWith('/images/woodcuts/hero compositions/'))).toBe(true);
  });

  it('uses standard saddle-stitch imposition order', () => {
    expect(v072BookletImposition(4, 0)).toEqual({ front: [4, 1], back: [2, 3] });
    expect(v072BookletImposition(8, 0)).toEqual({ front: [8, 1], back: [2, 7] });
    expect(v072BookletImposition(8, 1)).toEqual({ front: [6, 3], back: [4, 5] });
    expect(() => v072BookletImposition(6, 0)).toThrow(/multiple of four/i);
  });

  it('renders a dedicated print publication instead of printing Browser Rulebook chrome', async () => {
    const adapter = await readFile('scripts/render-v072-dedicated-booklets.mjs', 'utf8');
    const renderer = await readFile('scripts/render-v072-modular-booklets.mjs', 'utf8');
    const html = await readFile('apps/rules/booklet/index.html', 'utf8');
    const css = await readFile('apps/rules/booklet/booklet.css', 'utf8');
    const client = await readFile('apps/rules/booklet/booklet.js', 'utf8');
    const validator = await readFile('scripts/validate-v072-modular-booklets.mjs', 'utf8');
    const workflow = await readFile('.github/workflows/build-v072-modular-booklets.yml', 'utf8');

    expect(renderer).toContain('/rulebook/?rules=candidate&doc=');
    expect(adapter).toContain("'/rulebook/booklet/?doc='");
    expect(adapter).toContain("'displayHeaderFooter: false,'");
    expect(adapter).toContain('addPublicationFurniture');
    expect(adapter).toContain('dedicated print-only booklet composition');
    expect(html).toContain('class="booklet-cover"');
    expect(html).toContain('class="booklet-back-cover"');
    expect(html).toContain('data-booklet-content');
    expect(html).not.toContain('Start</');
    expect(html).not.toContain('Playtest</');
    expect(css).toContain('--paper: #f4efe4');
    expect(css).toContain('--crimson: #9c2026');
    expect(css).toContain('.back-cover-band');
    expect(css).toContain('.cover-wordmark');
    expect(client).toContain("document.body.dataset.bookletReady = 'true'");
    expect(client).toContain("document.body.dataset.rulesetMode = 'candidate'");
    expect(renderer).toContain("width: '5.5in'");
    expect(renderer).toContain("height: '8.5in'");
    expect(renderer).toContain('LETTER_LANDSCAPE');
    expect(renderer).toContain('booklet-woodcut-interstitial');
    expect(renderer).toContain('booklet-interstitial-anchor');
    expect(validator).toContain("await import('pdf-lib')");
    expect(validator).toContain('paddedPages % 4');
    expect(validator).toContain('interstitials.length');
    expect(workflow).toContain('Render all eight modular booklets');
    expect(workflow).toContain('render-v072-dedicated-booklets.mjs');
    expect(workflow).toContain('Browser Rulebook chrome leaked');
    expect(workflow).toContain('pdftoppm');
    expect(workflow).toContain('pdftotext');
    expect(workflow).toContain('upload-artifact@v4');
  });
});
