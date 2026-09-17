import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('v0.7.2 booklet final v0.7.1 visual parity', () => {
  it('uses the final released watermark, cover field, enlarged Leader plate, and production-card viewport', async () => {
    const css = await readFile('apps/rules/booklet/v071-publication.css', 'utf8');
    const html = await readFile('apps/rules/booklet/index.html', 'utf8');
    const positioning = await readFile('apps/rules/booklet/card-anatomy-positioning.js', 'utf8');
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

    // One-Leader modular pages use the available page instead of leaving a large dead field.
    expect(css).toContain('width: 2.62in');
    expect(css).toContain('height: 3.85in');
    expect(css).toContain('max-height: 3.85in');

    // The existing Browser Rulebook renderer requires its proven 15rem x 21rem viewport.
    expect(css.match(/width: 15rem/g)?.length).toBeGreaterThanOrEqual(2);
    expect(css.match(/height: 21rem/g)?.length).toBeGreaterThanOrEqual(2);
    expect(css).toContain('transform: scale(.808)');
    expect(css).toContain('height: .468in');
    expect(css).toContain('transform: scale(.624)');

    // Card Anatomy callouts are positioned from the actual rendered elements, not guessed percentages.
    expect(html).toContain('./card-anatomy-positioning.js');
    expect(positioning).toContain("selector: '.card-title'");
    expect(positioning).toContain("selector: '.value-medallion'");
    expect(positioning).toContain("selector: '.card-art'");
    expect(positioning).toContain("selector: '.rule-section h4'");
    expect(positioning).toContain("selector: '.rule-section p'");
    expect(positioning).toContain("selector: '.card-footer'");
    expect(positioning).toContain('frameRect.height / viewportHeight');
    expect(positioning).toContain("bookletMarkersReady = 'true'");
    expect(adapter).toContain("document.body.dataset.bookletMarkersReady === 'true'");

    // Opening copy describes the game directly instead of using the weak "game about" construction.
    expect(playerGuide).toContain('Gauntlet is a two-player tactical card-and-territory game played across a line of six Territories.');
    expect(playerGuide).not.toContain('game about crossing a battlefield');
  });
});
