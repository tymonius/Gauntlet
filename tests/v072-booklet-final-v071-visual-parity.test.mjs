import { readFile, stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('v0.7.2 booklet final v0.7.1 visual parity', () => {
  it('uses released publication figures and deliberate modular page composition', async () => {
    const css = await readFile('apps/rules/booklet/v071-publication.css', 'utf8');
    const finalCss = await readFile('apps/rules/booklet/v071-final-parity.css', 'utf8');
    const html = await readFile('apps/rules/booklet/index.html', 'utf8');
    const refinements = await readFile('apps/rules/booklet/publication-layout-refinements.js', 'utf8');
    const adapter = await readFile('scripts/render-v072-dedicated-booklets.mjs', 'utf8');
    const playerGuide = await readFile('packages/rules/player-guide/player-guide.md', 'utf8');

    // Preserve the final v0.7.1 watermark geometry while using a print-safe
    // inline SVG layer instead of external CSS masks.
    expect(css).toContain('.faction-page-watermark');
    expect(css).toContain('opacity: .09');
    expect(css).toContain('width: 3.9in');
    expect(css).toContain('height: 3.9in');
    expect(css).toContain('right: -.62in');
    expect(css).toContain('left: -.62in');
    expect(css).toContain('bottom: -.72in');
    expect(css).toContain('isolation: isolate');
    expect(css).not.toContain('mask-image: var(--booklet-symbol)');

    // The approved color-edition paper field is continuous across front/back.
    expect(css).toContain('.back-cover');
    expect(css).toContain('background: #fbf7ee !important');

    // Exact final v0.7.1 Card Anatomy and Arcane figures are publication assets.
    const anatomyPath = 'apps/rules/booklet/assets/Gauntlet_v0.7.1_Card_Anatomy.png';
    const arcanePath = 'apps/rules/booklet/assets/Gauntlet_v0.7.1_Arcane_Trait_Mark.png';
    expect((await stat(anatomyPath)).size).toBeGreaterThan(1000000);
    expect((await stat(arcanePath)).size).toBeGreaterThan(100000);
    expect(finalCss).toContain('Gauntlet_v0.7.1_Card_Anatomy.png');
    expect(finalCss).toContain('Gauntlet_v0.7.1_Arcane_Trait_Mark.png');
    expect(finalCss).toContain('grid-template-columns: 2.30in minmax(0, 1fr)');
    expect(finalCss).toContain('font-size: 8.15pt');
    expect(finalCss).toContain('height: .58in');
    expect(finalCss).toContain('display: none !important');

    // Arcane is relocated after the complete Effect headings section, before Assets.
    expect(html).toContain('./publication-layout-refinements.js');
    expect(refinements).toContain("/^Effect headings$/i");
    expect(refinements).toContain("/^Assets$/i");
    expect(refinements).toContain("assetsBlock.parentElement.insertBefore(callout, assetsBlock)");
    expect(refinements).toContain("booklet-arcane-relocated");

    // Dedicated Leader pages use an explicit hero/identity block. Publication
    // fitting measures visible ink rather than treating whitespace in the PNG
    // canvas as artwork, paints that crop into a bounded high-resolution canvas,
    // and balances the two columns to the same hero height without forcing
    // the ability panel down to the bottom of the identity column.
    expect(finalCss).toContain('.leader-page .leader-hero-layout');
    expect(finalCss).toContain('grid-template-columns: 2.55in minmax(0, 1fr)');
    expect(finalCss).toContain('align-items: stretch');
    expect(finalCss).toContain('min-height: 3.80in');
    expect(finalCss).toContain('position: relative');
    expect(finalCss).toContain('overflow: hidden');
    expect(finalCss).toContain('img.leader-art-source');
    expect(finalCss).toContain('.leader-page .leader-art-canvas');
    expect(finalCss).toContain('display: flex');
    expect(finalCss).toContain('flex-direction: column');
    expect(finalCss).toContain('margin: .10in 0 0');
    expect(finalCss).not.toContain('margin: auto 0 0');
    expect(refinements).toContain('measureLeaderArtworkBounds');
    expect(refinements).toContain('getImageData');
    expect(refinements).toContain('desiredHeroHeight');
    expect(refinements).toContain('flow.clientHeight - flow.scrollHeight');
    expect(refinements).toContain('paintLeaderArtwork');
    expect(refinements).toContain('const rasterScale = 4');
    expect(refinements).toContain("artworkCanvas.className = 'leader-art-canvas'");
    expect(refinements).toContain("page.dataset.leaderArtworkFitted = 'true'");
    expect(refinements).toContain("hero.className = 'leader-hero-layout'");
    expect(refinements).toContain("identity.className = 'leader-identity-column'");
    expect(finalCss).toContain('There is no float boundary');

    // The final parity layer must load last so inherited historical values cannot override it.
    expect(html.indexOf('./v071-final-parity.css')).toBeGreaterThan(html.indexOf('./v071-publication.css'));

    // The render adapter waits until post-pagination refinements complete.
    expect(adapter).toContain("document.body.dataset.bookletMarkersReady === 'true'");
    expect(refinements).toContain("document.body.dataset.bookletMarkersReady = 'true'");
    expect(refinements).toContain("document.body.dataset.bookletLayoutRefined = 'true'");

    // Opening copy describes the game directly instead of using the weak "game about" construction.
    expect(playerGuide).toContain('Gauntlet is a two-player tactical card-and-territory game played across a line of six Territories.');
    expect(playerGuide).not.toContain('game about crossing a battlefield');
  });
});
