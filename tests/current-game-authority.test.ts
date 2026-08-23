import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CURRENT_ART_DIRECTION_SOURCE_URL,
  parseArtDirectionSource,
  resolveCards,
  resolveCardTextOverrides,
  resolveRuleSection,
} from '../game-data/current-game.mjs';

const manifest = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const rulesSource = JSON.parse(readFileSync('docs/v0.6.4-rules.json', 'utf8'));

const CURRENT_RUNTIME_SURFACES = [
  'card-reference/app.js',
  'card-design/card-review-render.js',
  'card-design/territory-review-render.js',
  'card-design/card-review.js',
  'card-design/v064-card-candidates.js',
  'card-design/proposal-card.js',
  'card-design/rite-card.js',
  'card-design/reference-card.js',
  'card-design/supplemental-card.js',
  'deckbuilder/v061-runtime.js',
  'deckbuilder/starter-decks.js',
  'deckbuilder/territories.js',
  'deckbuilder/faction-components.js',
  'deckbuilder/print-duplex-sheet-pairing.js',
  'rules-assistant/v064-candidate-corpus.js',
];

const RAW_CURRENT_SOURCE_MARKERS = [
  'v0.6.4-card-additions.json',
  'v0.6.4-territories.json',
  'v0.6.4-diplomat-proposals.json',
  'v0.6.4-arcane-symbol.json',
  'v0.6.4-rules.json',
  'clean-v0.6.3/complete-authority/canonical-structured-data.json',
  'clean-v0.6.3/downstream/canonical-data.json',
  '/config/tts-component-contract.json',
  '/deckbuilder/starter-decks.json',
];

describe('single current-game authority', () => {
  it('declares one current-development authority and its provenance inputs', () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.authority).toBe('current-game');
    expect(manifest.version).toBe('v0.6.4-candidate');
    expect(manifest.baseVersion).toBe('v0.6.3');
    expect(manifest.runtimePolicy).toContain('All current-development tools and render surfaces consume the resolved current-game authority');
    expect(manifest.sources).toEqual(expect.objectContaining({
      baseGameplay: expect.any(String),
      cardChanges: expect.any(String),
      territories: expect.any(String),
      proposals: expect.any(String),
      arcaneSymbol: expect.any(String),
      rules: '/docs/v0.6.4-rules.json',
      componentContract: expect.any(String),
      starterDecks: '/deckbuilder/starter-decks.json',
    }));
  });

  it('uses stable-id replacement, addition, and retirement semantics', () => {
    const sourceManifest = { version: 'v-next', baseVersion: 'v-base' };
    const resolved = resolveCards(
      [
        { id: 'keep', name: 'Keep', cost: 1 },
        { id: 'revise', name: 'Revise', cost: 1 },
        { id: 'retire', name: 'Retire', cost: 2 },
      ],
      {
        version: 'v-next',
        base_version: 'v-base',
        retired_cards: [{ id: 'retire', name: 'Retire' }],
        cards: [
          { id: 'revise', name: 'Revise', cost: 4 },
          { id: 'add', name: 'Add', cost: 3 },
        ],
      },
      sourceManifest,
    );

    expect(resolved.map(card => card.id).sort()).toEqual(['add', 'keep', 'revise']);
    expect(resolved.find(card => card.id === 'revise')?.cost).toBe(4);
    expect(resolved.some(card => card.id === 'retire')).toBe(false);
    expect(resolved.every(card => card.current_game_authority === '/game-data/current-game.json')).toBe(true);
  });

  it('applies rule-driven card wording after the playable-card pool is resolved', () => {
    const cards = resolveCardTextOverrides([
      {
        id: 'neutral-advance-guard',
        name: 'Advance Guard',
        action: 'Old pending battle wording.',
        effects: [
          { label: 'Action', text: 'Old pending battle wording.' },
          { label: 'Gambit/Tactic', text: 'Attacker without a Gambit — gain Advantage.' },
        ],
      },
      {
        id: 'neutral-forced-march',
        name: 'Forced March',
        action: 'Old pending battle wording.',
        effects: [
          { label: 'Action', text: 'Old pending battle wording.' },
        ],
      },
    ], rulesSource);

    const advanceGuard = cards.find(card => card.id === 'neutral-advance-guard');
    const forcedMarch = cards.find(card => card.id === 'neutral-forced-march');
    expect(advanceGuard?.effects[0].text).toContain('initiates a battle');
    expect(forcedMarch?.effects[0].text).toContain('cannot initiate a battle');
    expect(advanceGuard?.action).toContain('initiates a battle');
    expect(forcedMarch?.action).toContain('cannot initiate a battle');
    expect(JSON.stringify(cards)).not.toContain('pending battle');
  });

  it('removes the inherited pending-battle sequence from current shared rules', () => {
    const battle = resolveRuleSection({
      sequence: ['onset', 'gambits'],
      pending_sequence: ['pending_battle', 'terms', 'onset', 'gambits'],
      withdrawal: 'old withdrawal rule',
    }, rulesSource.battle);

    expect(battle).not.toHaveProperty('pending_sequence');
    expect(battle.sequence).toEqual([
      'onset',
      'set_gambits',
      'form_reserves',
      'reveal_gambits',
      'choose_tactics',
      'reveal_tactics',
      'outcome',
      'aftermath',
    ]);
    expect(String(battle.onset)).toContain('Resolve Terms first');
    expect(String(battle.withdrawal)).toContain('Withdrawal during Onset');
  });

  it('resolves compositor artwork positioning into the current-game object', () => {
    expect(CURRENT_ART_DIRECTION_SOURCE_URL).toBe('/tts/artwork-direction-overrides.js');
    const source = readFileSync(`.${CURRENT_ART_DIRECTION_SOURCE_URL}`, 'utf8');
    const directions = parseArtDirectionSource(source);
    expect(Object.keys(directions).length).toBeGreaterThan(0);
    expect(directions['territory-quicksand']).toEqual(expect.objectContaining({ focusY: expect.any(Number) }));

    const cardRenderer = readFileSync('card-design/card-review-render.js', 'utf8');
    const territoryRenderer = readFileSync('card-design/territory-review-render.js', 'utf8');
    expect(cardRenderer).toContain('currentGame.artDirection');
    expect(territoryRenderer).toContain('currentGame.artDirection');
    expect(cardRenderer).not.toContain("loadScript('/tts/artwork-direction-overrides.js')");
    expect(territoryRenderer).not.toContain("loadScript('/tts/artwork-direction-overrides.js')");
  });

  it('prevents current browser/runtime surfaces from selecting raw version sources independently', () => {
    for (const path of CURRENT_RUNTIME_SURFACES) {
      const source = readFileSync(path, 'utf8');
      expect(source, `${path} must consume the current-game authority`).toMatch(/current-game|loadCurrentGame|currentGameData|GAUNTLET_CURRENT_GAME_DATA/);
      for (const marker of RAW_CURRENT_SOURCE_MARKERS) {
        expect(source, `${path} must not select ${marker} directly`).not.toContain(marker);
      }
    }
  });

  it('makes the static digital-game adapter subordinate to the same authority', () => {
    const digital = readFileSync('src/content/v064.ts', 'utf8');
    expect(digital).toContain("import currentGameAuthorityJson from '../../game-data/current-game.json'");
    expect(digital).toContain('currentGameAuthority.sources.territories !== BUNDLED_TERRITORY_SOURCE');
    expect(digital).toContain('currentGameAuthority.sources.rules !== BUNDLED_RULES_SOURCE');
    expect(digital).toContain("currentGameAuthority.authority !== 'current-game'");
    expect(digital).toContain('rulesVersion: V064_CANDIDATE_RULES_VERSION');
    expect(digital).toContain('applyRuleCardTextOverrides');
  });

  it('keeps source precedence out of the Deckbuilder starter and faction-component layers', () => {
    const starters = readFileSync('deckbuilder/starter-decks.js', 'utf8');
    const factionComponents = readFileSync('deckbuilder/faction-components.js', 'utf8');
    expect(starters).not.toContain('installV064PlaytestCards');
    expect(starters).not.toContain('retired_cards');
    expect(starters).not.toContain('fetch(STARTER_DECK_SOURCE');
    expect(starters).toContain('state.currentGameData?.starterDeckData');
    expect(factionComponents).not.toContain('installDiplomatProposalWording');
    expect(factionComponents).not.toContain('installMysticsRitualComponent');
  });

  it('keeps current Leader and Rite rules out of presentation renderers', () => {
    const cardCatalog = readFileSync('card-design/card-review.js', 'utf8');
    const rites = readFileSync('card-design/rite-card.js', 'utf8');
    expect(cardCatalog).not.toContain("name: 'General'");
    expect(cardCatalog).not.toContain("name: 'Grand Inquisitor'");
    expect(rites).not.toContain("name: 'Rite of Blood'");
    expect(rites).not.toContain("name: 'Ritual of Ascension'");
    expect(cardCatalog).toContain('current.leaders');
    expect(rites).toContain('currentGame.mystics');
  });

  it('makes the Rules Arbiter consume the resolved current-game corpus inputs', () => {
    const rules = readFileSync('rules-assistant/v064-candidate-corpus.js', 'utf8');
    expect(rules).toContain('loadCurrentGame');
    expect(rules).toContain('currentGame.ruleChanges');
    expect(rules).toContain('currentGame.cards');
    expect(rules).toContain('currentGame.proposals');
    expect(rules).toContain('currentGame.territories');
    expect(rules).toContain('currentGame.arcaneSymbol');
    expect(rules).not.toContain('fetchImpl(proposalUrl');
    expect(rules).not.toContain('fetchImpl(territoryUrl');
  });

  it('drives production print component identity and back policy from the resolved contract', () => {
    const printing = readFileSync('deckbuilder/print-duplex-sheet-pairing.js', 'utf8');
    expect(printing).toContain('currentGame.components');
    expect(printing).toContain('component.family');
    expect(printing).toContain('component.backPolicy');
    expect(printing).toContain('component.renderSource');
    expect(printing).not.toContain('TRACKER_COMPONENT_IDS');
    expect(printing).not.toContain('REFERENCE_COMPONENTS');
  });
});
