import { readFile, stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('v0.7.2 booklet final v0.7.1 visual parity', () => {
  it('uses the released v0.7.1 publication treatments instead of reconstructing them', async () => {
    const css = await readFile('apps/rules/booklet/v071-publication.css', 'utf8');
    const finalCss = await readFile('apps/rules/booklet/v071-final-parity.css', 'utf8');
    const html = await readFile('apps/rules/booklet/index.html', 'utf8');
    const adapter = await readFile('scripts/render-v072-dedicated-booklets.mjs', 'utf8');
    const playerGuide = await readFile('packages/rules/player-guide/player-guide.md', 'utf8');

    // PR #1210 final v0.7.1 watermark, superseding the earlier PR #1198 pass.
    expect(css).toContain('FINAL v0.7.1 PRODUCTION WATERMARK — PR #1210');
    expect(css).toContain('opacity: .09');
    expect(css).toContain('mask-size: 3.9in 3.9in');
    expect(css).toContain('right -.62in bottom -.72in');
    expect(css).toContain('left -.62in bottom -.72in');
    expect(css).toContain('isolation: isolate');
    expect(css).toContain('position: static');

    // The approved color-edition paper field is continuous across front/back.
    expect(css).toContain('.back-cover');
    expect(css).toContain('background: #fbf7ee !important');

    // The exact final v0.7.1 Card Anatomy and Arcane figures are publication assets.
    const anatomyPath = 'apps/rules/booklet/assets/Gauntlet_v0.7.1_Card_Anatomy.png';
    const arcanePath = 'apps/rules/booklet/assets/Gauntlet_v0.7.1_Arcane_Trait_Mark.png';
    expect((await stat(anatomyPath)).size).toBeGreaterThan(1000000);
    expect((await stat(arcanePath)).size).toBeGreaterThan(100000);
    expect(finalCss).toContain('Gauntlet_v0.7.1_Card_Anatomy.png');
    expect(finalCss).toContain('Gauntlet_v0.7.1_Arcane_Trait_Mark.png');
    expect(finalCss).toContain('grid-template-columns: 2.30in minmax(0, 1fr)');
    expect(finalCss).toContain('font-size: 8.15pt');
    expect(finalCss).toContain('height: .58in');
    expect(finalCss).toContain('.booklet-card-marker');
    expect(finalCss).toContain('display: none !important');

    // One-Leader modular pages use the dedicated page, not the old undersized float.
    expect(finalCss).toContain('width: 2.82in');
    expect(finalCss).toContain('height: 5.20in');
    expect(finalCss).toContain('max-height: 5.20in');

    // The final parity layer must load last so inherited historical values cannot
    // override the released figures or the one-Leader-per-page adaptation.
    expect(html.indexOf('./v071-final-parity.css')).toBeGreaterThan(html.indexOf('./v071-publication.css'));

    // The hidden live Card Anatomy renderer remains only as a build-readiness fallback.
    expect(html).toContain('./card-anatomy-positioning.js');
    expect(adapter).toContain("document.body.dataset.bookletMarkersReady === 'true'");
    expect(finalCss).toContain('clip-path: inset(50%)');

    // Opening copy describes the game directly instead of using the weak "game about" construction.
    expect(playerGuide).toContain('Gauntlet is a two-player tactical card-and-territory game played across a line of six Territories.');
    expect(playerGuide).not.toContain('game about crossing a battlefield');
  });
});
