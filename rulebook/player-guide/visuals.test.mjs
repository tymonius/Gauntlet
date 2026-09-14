import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const visuals = readFileSync('rulebook/player-guide/visuals.js', 'utf8');
const styles = readFileSync('rulebook/player-guide/visuals.css', 'utf8');
const reviewApp = readFileSync('rulebook/player-guide-review/app.js', 'utf8');
const reviewHtml = readFileSync('rulebook/player-guide-review/index.html', 'utf8');

describe("Player's Guide instructional visual layer", () => {
  it('is reusable from the Player Guide package and loaded by the review surface', () => {
    expect(reviewApp).toContain("import '../player-guide/visuals.js';");
    expect(reviewHtml).toContain('<link rel="stylesheet" href="../player-guide/visuals.css" />');
    expect(visuals).toContain("[data-player-guide-content], [data-review-content]");
  });

  it('covers the high-value pedagogy anchors without changing rules source', () => {
    for (const anchor of [
      '#welcome-to-gauntlet',
      '#the-gauntlet',
      '#3-setting-up',
      '#4-your-turn',
      '#5-movement',
      '#1-onset',
      '#7-taking-and-holding-ground',
      '#route-2-force-your-opponent-to-make-a-last-stand',
      '#9-the-six-factions',
      '#10-building-a-deck',
      '#where-to-go-from-here',
    ]) {
      expect(visuals).toContain(anchor);
    }

    expect(visuals).not.toContain('loadCurrentGame');
    expect(visuals).not.toContain('current-game.json');
  });

  it('preserves the mechanically important teaching distinctions', () => {
    expect(visuals.match(/Attacker → Defender/g)?.length).toBe(2);
    expect(visuals).toContain('from Hand');
    expect(visuals).toContain('from Reserve');
    expect(visuals).toContain('Position now. Control later.');
    expect(visuals).toContain('new movement sequence');
    expect(visuals).toContain('Defender normally has Defensive Edge and separately +1 battle total.');
    expect(visuals).toContain('ONE NORMAL ACTION');
  });

  it('keeps diagrams usable on narrow screens and in print', () => {
    expect(styles).toContain('@media (max-width: 520px)');
    expect(styles).toContain('@media print');
    expect(styles).toContain('break-inside: avoid');
  });
});
