import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const app = read('apps/rulebook/app.js');
const portraits = read('apps/rulebook/leader-portraits.js');

const leaders = [
  ['General', 'images/sketches/general.png'],
  ['Commandant', 'images/sketches/commandant.png'],
  ['Ambassador', 'images/sketches/ambassador.png'],
  ['Senator', 'images/sketches/senator.png'],
  ['Banker', 'images/sketches/banker.png'],
  ['Executive', 'images/sketches/executive.png'],
  ['Ranger', 'images/sketches/ranger.png'],
  ['Spymaster', 'images/sketches/spymaster.png'],
  ['Alchemist', 'images/sketches/alchemist.png'],
  ['Spirit Walker', 'images/sketches/spirit walker.png'],
  ['Grand Inquisitor', 'images/sketches/grand inquisitor.png'],
  ['Witch Hunter', 'images/sketches/witch hunter.png'],
] as const;

describe('current Browser Rulebook components', () => {
  it('binds released Rulebook presentation to the published release manifest', () => {
    expect(app).toContain("const RELEASE_MANIFEST_URL = '../releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json';");
    expect(app).toContain("const CURRENT_SOURCE_URL = './player-facing/current-rulebook.md';");
    expect(app).toContain("crypto.subtle.digest('SHA-256', bytes)");
    expect(app).toContain('if (actualHash !== rulebook.sha256)');
  });

  it('builds all six two-Leader galleries from existing approved sketches', () => {
    for (const faction of ['Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition']) {
      expect(portraits).toContain(`['${faction}', [`);
    }

    for (const [leader, path] of leaders) {
      expect(portraits).toContain(`['${leader}',`);
      expect(existsSync(path), `${leader} sketch is missing at ${path}`).toBe(true);
    }

    expect(portraits).toContain("gallery.dataset.leaderPortraitGallery = faction");
    expect(portraits).toContain("heading.insertAdjacentElement('afterend', buildGallery(faction, leaders))");
  });
});
