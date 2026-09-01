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

  it('projects the selected ruleset Rite count into player-facing Deckbuilder presentation', () => {
    expect(html).toContain('id="riteRequiredCount"');
    expect(html).toContain('id="riteInstructionCount"');
    expect(html).toContain('<span id="riteSelectedCount" class="pill">0 / —</span>');
    expect(html).not.toContain('Choose exactly three different Rites');
    expect(html).not.toContain('<span id="riteMetricCount">0</span> / 3');
    expect(html).not.toContain('Mystics imports also use the three Rites selected in this Deck.');
    expect(rites).toContain('riteElements.riteRequiredCount.textContent = String(state.riteSelectedCount)');
    expect(rites).toContain('riteElements.riteInstructionCount.textContent = String(state.riteSelectedCount)');
    expect(rites).not.toContain('FALLBACK_SELECTED_COUNT');
  });

  it('persists selected Rites through current Deck data, save/load, JSON import/export, and copied lists', () => {
    expect(rites).toContain('deckbuilder.registerSerializeHook(serializeRites)');
    expect(rites).toContain('deckbuilder.registerHydrateHook(hydrateRites)');
    expect(rites).toContain('selectedRites: isMystics() ? [...state.rites] : []');
    expect(rites).toContain('data.selectedRites || []');
    expect(rites).toContain('function riteDeckListLines()');
    expect(rites).toContain('Rites: ${names.join(", ") || "None"}');
    expect(rites).toContain('state.pendingRites');
  });

  it('loads and recognizes the official starter Rite packages and preserves them during bulk printing', () => {
    expect(starters).toContain('ritesApi()?.setSelectedIds?.(starterRiteIds(preset))');
    expect(starters).toContain('const currentRites = [...(ritesApi()?.selectedIds?.() || [])].sort()');
    expect(starters).toContain('ritesApi()?.setSelectedIds?.(starterRiteIds())');
    expect(bulkPrint).toContain('rites: ritesApi()?.selectedIds?.() || []');
    expect(bulkPrint).toContain('ritesApi()?.setSelectedIds?.(starterRiteIds(preset))');

    const mystics = authority.starterDecks.decks.filter((deck: any) => deck.factionId === 'mystics');
    expect(mystics.map((deck: any) => deck.selectedRites)).toEqual([
      ['echoes', 'blood', 'equivalence'],
      ['crossing', 'shattering', 'consecration'],
    ]);
  });

  it('prints and displays only the selected Rite package rather than treating the production component subset as the package', () => {
    expect(components).toContain('component.family === "rite-card"');
    expect(components).toContain('const selectedRiteItems = state.factionId === "mystics"');
    expect(components).toContain('ritesApi()?.selectedRites?.() || []');
    expect(components).not.toContain('state.rites');
    expect(components).toContain('reminder: rite.reminder?.text || ""');
    expect(print).toContain('(packageData.rites || []).filter(rite => data.selectedRiteIds.includes(rite.id))');
    expect(print).toContain('data.selectedRites.map(rite =>');
    expect(print).not.toContain('three double-sided rite cards');
    expect(printRequest).toContain('Rites: ${rites.length ? rites.join(", ") : "None selected"}');
  });

  it('enforces the selected ruleset Rite policy while retaining support for fixed Rite packages', () => {
    expect(rites).toContain('state.riteSelectionEnabled = Boolean(policy)');
    expect(rites).toContain('state.rites = isMystics() ? state.ritePool.map(rite => rite.id) : []');
    expect(rites).toContain('state.rites = state.riteSelectionEnabled');
    expect(rites).toContain('errors.push(`Choose exactly ${state.riteSelectedCount} different Rites');
    expect(rites).not.toContain('selectedRites || ["echoes", "blood", "crossing"]');
  });
});
