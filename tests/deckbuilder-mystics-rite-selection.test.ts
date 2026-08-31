import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const authority = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const html = readFileSync('deckbuilder/index.html', 'utf8');
const rites = readFileSync('deckbuilder/mystics-rites.js', 'utf8');
const riteCss = readFileSync('deckbuilder/mystics-rites.css', 'utf8');
const starters = readFileSync('deckbuilder/starter-decks.js', 'utf8');
const components = readFileSync('deckbuilder/faction-components.js', 'utf8');
const print = readFileSync('deckbuilder/print.js', 'utf8');
const printRequest = readFileSync('deckbuilder/print-request.js', 'utf8');
const bulkPrint = readFileSync('deckbuilder/print-all-starters.js', 'utf8');

describe('Deckbuilder Mystics Rite selection', () => {
  it('uses the six-Rite current authority and its exactly-three package rule', () => {
    expect(authority.mystics.rites).toHaveLength(6);
    expect(authority.mystics.selectionPolicy.selectedCount).toBe(3);
    expect(authority.mystics.rites.map((rite: any) => rite.id)).toEqual([
      'echoes', 'blood', 'crossing', 'shattering', 'consecration', 'equivalence',
    ]);
  });

  it('adds a Mystics-only Rite picker, metric, selected-package view, and production-card preview', () => {
    expect(html).toContain('id="mysticsRitesPanel"');
    expect(html).toContain('id="riteMetricCard"');
    expect(html).toContain('id="deckRitesSection"');
    expect(html).toContain('mystics-rites.css');
    expect(html).toContain('mystics-rites.js');
    expect(rites).toContain('../card-design/component-print-render.html?kind=rite&id=');
    expect(rites).toContain('Choose exactly ${state.riteSelectedCount} different Rites');
    expect(riteCss).toContain('.compact-rite-row.chosen');
  });

  it('persists selected Rites through current Deck data, save/load, JSON import/export, and copied lists', () => {
    expect(rites).toContain('schemaVersion: Math.max(3');
    expect(rites).toContain('selectedRites: isMystics() ? [...state.rites] : []');
    expect(rites).toContain('data.selectedRites || []');
    expect(rites).toContain('"Rites:"');
    expect(rites).toContain('state.pendingRites');
  });

  it('loads and recognizes the official starter Rite packages and preserves them during bulk printing', () => {
    expect(starters).toContain('state.rites = starterRiteIds(preset)');
    expect(starters).toContain('const currentRites = [...(state.rites || [])].sort()');
    expect(starters).toContain('if (Array.isArray(state.rites)) state.rites = starterRiteIds()');
    expect(bulkPrint).toContain('rites: [...(state.rites || [])]');
    expect(bulkPrint).toContain('state.rites = starterRiteIds(preset)');

    const mystics = authority.starterDecks.decks.filter((deck: any) => deck.factionId === 'mystics');
    expect(mystics.map((deck: any) => deck.selectedRites)).toEqual([
      ['echoes', 'blood', 'equivalence'],
      ['crossing', 'shattering', 'consecration'],
    ]);
  });

  it('prints and displays only the selected Rite package rather than treating the production component subset as the package', () => {
    expect(components).toContain('component.family === "rite-card"');
    expect(components).toContain('const selectedRiteItems = state.factionId === "mystics"');
    expect(components).toContain('reminder: rite.reminder?.text || ""');
    expect(print).toContain('(packageData.rites || []).filter(rite => data.selectedRiteIds.includes(rite.id))');
    expect(print).toContain('data.selectedRites.map(rite =>');
    expect(printRequest).toContain('Rites: ${rites.length ? rites.join(", ") : "None selected"}');
  });

  it('keeps candidate snapshots invalid until three legal Rites are chosen while released v0.7.0 uses its fixed three-Rite package', () => {
    expect(rites).toContain('state.riteSelectionEnabled = Boolean(policy)');
    expect(rites).toContain('state.rites = isMystics() ? state.ritePool.map(rite => rite.id) : []');
    expect(rites).toContain('state.rites = state.riteSelectionEnabled');
    expect(rites).toContain('errors.push(`Choose exactly ${state.riteSelectedCount} different Rites');
    expect(rites).not.toContain('selectedRites || ["echoes", "blood", "crossing"]');
  });
});
