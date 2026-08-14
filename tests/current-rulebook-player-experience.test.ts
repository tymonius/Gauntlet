import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const app = read('rulebook/app.js');
const portraits = read('rulebook/leader-portraits.js');

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
  it('verifies the certified Rulebook source before presenting it', () => {
    expect(app).toContain("const SOURCE_URL = '/artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';");
    expect(app).toContain("const SOURCE_SHA256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';");
    expect(app).toContain("crypto.subtle.digest('SHA-256', bytes)");
    expect(app).toContain('if (actualHash !== SOURCE_SHA256)');
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
