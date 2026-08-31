import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizePublishedGame, rulesetModeFromUrl } from '../game-data/ruleset.mjs';

const published = JSON.parse(readFileSync('releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json', 'utf8'));
const starters = JSON.parse(readFileSync('releases/v0.7.0/Gauntlet_v0.7.0_Starter_Decks.json', 'utf8'));
const current = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const html = readFileSync('deckbuilder/index.html', 'utf8');
const runtime = readFileSync('deckbuilder/current-runtime.js', 'utf8');
const territories = readFileSync('deckbuilder/territories.js', 'utf8');
const rites = readFileSync('deckbuilder/mystics-rites.js', 'utf8');
const components = readFileSync('deckbuilder/faction-components.js', 'utf8');
const bulk = readFileSync('deckbuilder/print-all-starters.js', 'utf8');
const productionPrint = readFileSync('deckbuilder/print-duplex-sheet-pairing.js', 'utf8');
const customPrint = readFileSync('deckbuilder/custom-print.mjs', 'utf8');
const currentRuntime = readFileSync('game-data/current-game.mjs', 'utf8');

describe('Deckbuilder released / release-candidate ruleset toggle', () => {
  it('defaults to the published release and uses the same candidate query convention as the Rulebook', () => {
    expect(rulesetModeFromUrl('https://gauntlet.run/deckbuilder/')).toBe('released');
    expect(rulesetModeFromUrl('https://gauntlet.run/deckbuilder/?rules=candidate')).toBe('candidate');
    expect(html).toContain('data-ruleset-mode="released"');
    expect(html).toContain('data-ruleset="released"');
    expect(html).toContain('data-ruleset="candidate"');
  });

  it('normalizes the immutable v0.7.0 release into the Deckbuilder runtime shape', () => {
    const game = normalizePublishedGame(published, starters);
    expect(game.version).toBe('v0.7.0');
    expect(game.authorityUrl).toContain('/releases/v0.7.0/');
    expect(game.cards).toHaveLength(published.gameplay.cards.length);
    expect(game.territories).toHaveLength(published.gameplay.territories.length);
    expect(game.starterDecks).toHaveLength(12);
    expect(game.mystics.rites.map((rite: any) => rite.id)).toEqual(['echoes', 'blood', 'crossing']);
    expect(game.mystics).not.toHaveProperty('selectionPolicy');
  });

  it('keeps the current candidate distinct from the released source', () => {
    expect(current.version).not.toBe('v0.7.0');
    expect(current.mystics.rites).toHaveLength(6);
    expect(current.mystics.selectionPolicy.selectedCount).toBe(3);
  });

  it('routes every Deckbuilder authority consumer through the selected shared ruleset bootstrap', () => {
    expect(runtime).toContain('../game-data/ruleset.mjs');
    expect(runtime).toContain('GAUNTLET_DECKBUILDER_BOOTSTRAP');
    expect(territories).toContain('window.GAUNTLET_DECKBUILDER_BOOTSTRAP');
    expect(rites).toContain('window.GAUNTLET_DECKBUILDER_BOOTSTRAP');
    expect(territories).not.toContain('../game-data/ruleset.mjs');
    expect(rites).not.toContain('../game-data/ruleset.mjs');
    expect(components).toContain('../game-data/ruleset.mjs');
    expect(bulk).toContain('../game-data/ruleset.mjs');
  });

  it('threads the selected ruleset into production and custom-print render surfaces', () => {
    expect(productionPrint).toContain('&rules=${encodeURIComponent(selectedRulesetMode())}');
    expect(customPrint).toContain('&rules=${encodeURIComponent(selectedRulesetMode())}');
    expect(currentRuntime).toContain("get('rules') === 'released'");
    expect(currentRuntime).toContain("import('./ruleset.mjs')");
  });

  it('keeps saved Deck libraries separate so candidate Decks do not silently appear as released Decks', () => {
    expect(runtime).toContain('gauntlet-v0.7.0-decks');
    expect(runtime).toContain('gauntlet-current-game-decks');
    expect(runtime).toContain('requestedRulesetMode === CANDIDATE_MODE');
  });

  it('treats released Mystics Rites as fixed components but candidate Rites as a pregame choice', () => {
    expect(rites).toContain('state.riteSelectionEnabled = Boolean(policy)');
    expect(rites).toContain('state.riteSelectedCount = state.riteSelectionEnabled ? selectedCount : rites.length');
    expect(rites).toContain('const selectable = mystics && state.riteSelectionEnabled');
    expect(rites).toContain('state.ritePool.map(rite => rite.id)');
  });
});
