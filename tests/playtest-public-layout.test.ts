import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('playtest/portal.css', 'utf8');

describe('public Playtest hero layout', () => {
  it('uses the same constrained public-page width as the global header and Start page', () => {
    expect(css).toContain('width:min(1180px,calc(100% - 40px));margin:0 auto;');
    expect(css).toContain('padding:5.5rem 0 5rem;');
    expect(css).toContain('gap:3.5rem;');
    expect(css).not.toContain('padding:clamp(4rem,8vw,8rem) max(5vw,2rem)');
  });

  it('keeps the mobile hero aligned to the shared narrow page gutter', () => {
    expect(css).toContain('width:min(100% - 28px,1180px);padding:3.2rem 0');
  });
});
