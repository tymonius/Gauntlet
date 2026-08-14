import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const index = read('rulebook/index.html');
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

describe('current v0.6.3 Browser Rulebook experience', () => {
  it('uses the established polished shell and current player-facing actions', () => {
    expect(index).toContain('<h1>Official Browser Rulebook</h1>');
    expect(index).toContain('class="rulebook-hero"');
    expect(index).toContain('class="rulebook-sidebar"');
    expect(index).toContain('data-rulebook-search');
    expect(index).toContain('data-open-rules-assistant');
    expect(index).toContain('../rules-assistant/widget.css');
    expect(index).toContain('../rules-assistant/widget.js');
    expect(index).toContain('../images/sketches/hero sketch.png');
    expect(index).toContain('../releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook.pdf');
    expect(index).toContain('../releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook.md');
    expect(index).toContain('leader-portraits.css');
    expect(index).toContain('leader-portraits.js');

    expect(index).not.toContain('reconstruction-banner');
    expect(index).not.toContain('certified clean');
    expect(index).not.toContain('authority set');
    expect(index).not.toMatch(/authority\s+<code>[0-9a-f]{32,}/i);
    expect(index).not.toContain('publication remains locked');
  });

  it('keeps certified source integrity checks internal while presenting ordinary status text', () => {
    expect(app).toContain("const SOURCE_URL = '/artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';");
    expect(app).toContain("const SOURCE_SHA256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';");
    expect(app).toContain("crypto.subtle.digest('SHA-256', bytes)");
    expect(app).toContain('if (actualHash !== SOURCE_SHA256)');
    expect(app).toContain('publicRulebookSource');
    expect(app).toContain('Canonical v0.6.3 · ${sectionCount} sections · rules loaded');
    expect(app).toContain("document.querySelector('[data-open-rules-assistant]')");
    expect(app).toContain("document.querySelector('.ga-rules-launcher')?.click()");
    expect(app).not.toContain('AUTHORITY_SET_ID');
  });

  it('restores all six two-Leader galleries and all twelve approved sketches', () => {
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

  it('links only to current reconstructed-package Rulebook downloads that exist', () => {
    expect(existsSync('releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook.pdf')).toBe(true);
    expect(existsSync('releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook.md')).toBe(true);
    expect(index).not.toContain('Gauntlet_v0.6.3_Rulebook_Booklet.pdf');
    expect(index).not.toContain('../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook');
  });
});
