import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRENT_VISUAL_AUTHORITY_URL, normalizePublishedGame, rulesetModeFromUrl } from '../game-data/ruleset.mjs';

const published = JSON.parse(readFileSync('releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json', 'utf8'));
const starters = JSON.parse(readFileSync('releases/v0.7.1/Gauntlet_v0.7.1_Starter_Decks.json', 'utf8'));
const current = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const html = readFileSync('deckbuilder/index.html', 'utf8');
const runtime = readFileSync('deckbuilder/current-runtime.js', 'utf8');
const territories = readFileSync('deckbuilder/territories.js', 'utf8');
const rites = readFileSync('deckbuilder/mystics-rites.js', 'utf8');
const components = readFileSync('deckbuilder/faction-components.js', 'utf8');
const bulk = readFileSync('deckbuilder/print-all-starters.js', 'utf8');
const productionPrint = readFileSync('deckbuilder/production-print.js', 'utf8');
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

  it('normalizes the immutable v0.7.1 release into the Deckbuilder runtime shape', () => {
    const game = normalizePublishedGame(published, starters, current);
    expect(game.version).toBe('v0.7.1');
    expect(game.authorityUrl).toContain('/releases/v0.7.1/');
    expect(game.cards).toHaveLength(published.gameplay.cards.length);
    expect(game.territories).toHaveLength(published.gameplay.territories.length);
    expect(game.starterDecks).toHaveLength(12);
    expect(game.mystics.rites).toHaveLength(6);
    expect(game.mystics.selectionPolicy).toMatchObject({ poolSize: 6, selectedCount: 3 });
    expect(game.visualAuthorityUrl).toBe(CURRENT_VISUAL_AUTHORITY_URL);
    expect(game.artDirection).toEqual(current.artDirection);
    expect(game.artDirectionFor('financiers-banker')).toEqual(current.artDirection['financiers-banker']);
  });

  it('keeps the current authority synchronized to the released source', () => {
    expect(current.version).toBe('v0.7.1');
    expect(current.mystics.rites).toHaveLength(6);
    expect(current.mystics.selectionPolicy.selectedCount).toBe(3);
  });

  it('routes every Deckbuilder authority consumer through the selected shared ruleset bootstrap', () => {
    expect(runtime).toContain('../game-data/ruleset.mjs');
    expect(runtime).toContain('deckbuilder.setAuthorityBootstrap(currentGame)');
    expect(territories).toContain('await deckbuilder.bootstrap()');
    expect(rites).toContain('await deckbuilder.bootstrap()');
    expect(components).toContain('await deckbuilder.bootstrap()');
    expect(bulk).toContain('await deckbuilder.bootstrap()');
    expect(territories).not.toContain('../game-data/ruleset.mjs');
    expect(rites).not.toContain('../game-data/ruleset.mjs');
    expect(components).not.toContain('../game-data/ruleset.mjs');
    expect(bulk).not.toContain('../game-data/ruleset.mjs');
  });

  it('keeps Card Design composition canonical even when Deckbuilder content uses the released ruleset', () => {
    expect(current.artDirection['financiers-banker']).toEqual({
      fit: 'cover',
      focusX: 0.5,
      focusY: 0,
      smart: false,
      zoom: 1,
    });
    expect(runtime).toContain('loadGameRuleset(requestedRulesetMode)');
    expect(readFileSync('game-data/ruleset.mjs', 'utf8')).toContain('loadJson(CURRENT_VISUAL_AUTHORITY_URL)');
    expect(readFileSync('game-data/ruleset.mjs', 'utf8')).not.toContain('const artDirection = {};');
  });

  it('threads the selected ruleset through one production-render source API', () => {
    expect(productionPrint).toContain('deckbuilder.ruleset()?.mode');
    expect(productionPrint).toContain('&rules=${encodeURIComponent(selectedRulesetMode())}');
    expect(customPrint).toContain('deckbuilder.feature("productionPrintRenderer")');
    expect(customPrint).not.toContain('selectedRulesetMode');
    expect(currentRuntime).toContain("function requestedRulesetMode()");
    expect(currentRuntime).toContain("return requestedRulesetMode() === 'released';");
    expect(currentRuntime).toContain("requestedMode !== bridge.rulesetMode");
    expect(currentRuntime).toContain("import('./ruleset.mjs')");
  });

  it('keeps saved Deck libraries separate so candidate Decks do not silently appear as released Decks', () => {
    expect(runtime).toContain('gauntlet-${module.PUBLISHED_VERSION}-decks');
    expect(runtime).toContain('gauntlet-current-game-decks');
    expect(runtime).toContain('requestedRulesetMode === CANDIDATE_MODE');
    expect(runtime).not.toMatch(/gauntlet-v0\.\d+\.\d+-decks/);
  });

  it('treats v0.7.1 Mystics Rites as a pregame choice', () => {
    expect(rites).toContain('riteState.selectionEnabled = Boolean(policy)');
    expect(rites).toContain('riteState.selectedCount = riteState.selectionEnabled ? selectedCount : rites.length');
    expect(rites).toContain('const selectable = mystics && riteState.selectionEnabled');
    expect(rites).toContain('riteState.pool.map(rite => rite.id)');
  });
});
