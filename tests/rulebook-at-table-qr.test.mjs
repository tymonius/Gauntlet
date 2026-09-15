import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const qrAssets = [
  ['chief-justice.svg', 'https://gauntlet.run/rules-arbiter/'],
  ['card-reference.svg', 'https://gauntlet.run/card-reference/'],
  ['full-rules.svg', 'https://gauntlet.run/rulebook/'],
  ['deckbuilder.svg', 'https://gauntlet.run/deckbuilder/'],
  ['start-playing.svg', 'https://gauntlet.run/start/'],
  ['playtest.svg', 'https://gauntlet.run/playtest/tracked/'],
];

describe("Player's Guide At the Table QR assets", () => {
  it('keeps every referenced QR image backed by a deployable Browser Rulebook asset', async () => {
    const guide = await read('packages/rules/player-guide/player-guide.md');

    for (const [filename, target] of qrAssets) {
      expect(guide).toContain(`/rulebook/assets/qr/${filename}`);
      const svg = await read(`legacy/rulebook-browser/assets/qr/${filename}`);
      expect(svg).toContain('<svg');
      expect(svg).toContain(`QR-URL:${target}`);
    }
  });
});
