import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('v0.7.2 booklet final v0.7.1 visual parity', () => {
  it('uses the final released watermark, cover field, Leader scale, and production-card viewport', async () => {
    const css = await readFile('apps/rules/booklet/v071-publication.css', 'utf8');

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

    // One-Leader modular pages use the available page rather than the small first-pass float.
    expect(css).toContain('width: 2.28in');
    expect(css).toContain('height: 3.05in');
    expect(css).toContain('max-height: 3.05in');

    // The existing Browser Rulebook renderer requires its proven 15rem x 21rem viewport.
    expect(css.match(/width: 15rem/g)?.length).toBeGreaterThanOrEqual(2);
    expect(css.match(/height: 21rem/g)?.length).toBeGreaterThanOrEqual(2);
    expect(css).toContain('transform: scale(.808)');
    expect(css).toContain('height: .468in');
    expect(css).toContain('transform: scale(.624)');
  });
});
