import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = (path) => readFile(path, 'utf8');

describe('v0.7.2 public release page', () => {
  it('uses the shared release surface instead of the unstyled generic page shell', async () => {
    const html = await read('v0.7.2/index.html');

    expect(html).toContain('<body class="release-page">');
    expect(html).toContain('href="/release-surface.css"');
    expect(html).toContain('<main class="release-main"');
    expect(html).toContain('class="release-hero"');
    expect(html).toContain('class="release-status"');
    expect(html).not.toContain('class="page-shell"');
  });

  it('publishes all eight modular printable rules documents', async () => {
    const html = await read('v0.7.2/index.html');
    for (const name of [
      'Player_Guide',
      'Military_Guide',
      'Diplomats_Guide',
      'Financiers_Guide',
      'Intelligence_Guide',
      'Mystics_Guide',
      'Inquisition_Guide',
      'Complete_Rules',
    ]) {
      expect(html).toContain(`/releases/v0.7.2/Gauntlet_v0.7.2_${name}_Booklet.pdf`);
    }
  });
});
