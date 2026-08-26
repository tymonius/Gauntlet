import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const authority = JSON.parse(read('game-data/current-game.json'));
const runtime = read('game-data/current-game.mjs');
const nodeAuthority = read('scripts/current-game-authority.mjs');
const ttsCatalog = read('scripts/tts-current-catalog.mjs');
const releaseBuilder = read('scripts/build-v070-release-source.mjs');
const rulebook = read('rulebook/player-facing/current-rulebook.md');

const TRANSITIONAL_RUNTIME_MARKERS = [
  'docs/v0.6.4-card-additions.json',
  'docs/v0.6.4-territories.json',
  'docs/v0.6.4-diplomat-proposals.json',
  'docs/v0.6.4-arcane-symbol.json',
  'docs/v0.6.4-rules.json',
  'clean-v0.6.3/complete-authority/canonical-structured-data.json',
  'readCurrentJsonSource',
  'loadCurrentGameManifest',
  'resolveCards(',
  'resolveCardTextOverrides(',
  'resolveFactionRules(',
];

describe('complete v0.7.0 current-game authority', () => {
  it('is a native, complete v0.7.0 authority rather than a resolution manifest', () => {
    expect(authority.schemaVersion).toBe(2);
    expect(authority.authority).toBe('current-game');
    expect(authority.version).toBe('v0.7.0');
    expect(authority.displayVersion).toBe('v0.7.0');
    expect(authority.status).toBe('release-ready');
    expect(authority.runtimePolicy).toContain('complete current gameplay authority');
    expect(authority.runtimePolicy).toContain('historical source and change documents are provenance only');

    for (const forbidden of ['sources', 'resolution', 'baseVersion', 'factionOverrides']) {
      expect(authority).not.toHaveProperty(forbidden);
    }
  });

  it('contains the entire resolved gameplay and component state in one document', () => {
    expect(authority.gameplay.cards).toHaveLength(142);
    expect(authority.gameplay.territories).toHaveLength(25);
    expect(authority.gameplay.factions).toHaveLength(6);
    expect(authority.leaders).toHaveLength(12);
    expect(authority.proposals).toHaveLength(9);
    expect(authority.starterDecks.decks).toHaveLength(12);
    expect(Object.keys(authority.artDirection).length).toBeGreaterThan(0);
    expect(authority.componentContract).toBeTruthy();
    expect(authority.arcaneSymbol).toBeTruthy();
    expect(authority.mystics).toBeTruthy();
  });

  it('keeps historical derivation only as explicit non-runtime provenance', () => {
    expect(authority.provenance).toMatchObject({
      historicalBaseVersion: 'v0.6.3',
      transitionalSourceVersion: 'v0.6.4-candidate',
    });
    expect(authority.provenance.note).toContain('not runtime inputs');
    expect(authority.provenance.note).toContain('override layers');
    expect(authority.provenance.historicalInputs).toEqual(expect.objectContaining({
      baseGameplay: expect.stringContaining('v0.6.3'),
      cardChanges: '/docs/v0.6.4-card-additions.json',
      territories: '/docs/v0.6.4-territories.json',
      rules: '/docs/v0.6.4-rules.json',
    }));
  });

  it('contains the finalized current card wording directly', () => {
    const natureAltar = authority.gameplay.cards.find((card: any) => card.id === 'mystics-nature-s-altar');
    expect(natureAltar).toBeDefined();
    expect(natureAltar.effects.find((effect: any) => effect.label === 'Overlay')?.text)
      .toContain('Begin a Rite Faction Feature');
    expect(natureAltar.overlay).toContain('Begin a Rite Faction Feature');

    const activeCardText = authority.gameplay.cards.flatMap((card: any) => [
      ...(card.effects || []).map((effect: any) => effect.text || ''),
      card.action || '',
      card.gambit || '',
      card.tactic || '',
      card.gambit_tactic || '',
      card.asset || '',
      card.overlay || '',
    ]).join('\n');

    expect(activeCardText).not.toMatch(/Faction Actions?|Faction Abilit(?:y|ies)|faction procedure|pending(?:-|\s+)battles?/i);
  });

  it('contains resolved current faction rules directly', () => {
    const rules = authority.gameplay.faction_rules;
    expect(rules.diplomats.terms_timing).toBe('During Onset');
    expect(rules.financiers.faction_feature_action_phase).toBe('Denouement');
    expect(rules.financiers.financial_capacity).toContain('Faction Feature marked 1 Action');
    expect(rules.intelligence.faction_features_1_action).toEqual([
      'Start Mission',
      'Complete Mission',
      'Abort Mission',
      'Start Special Operation',
      'Complete Special Operation',
    ]);
    expect(rules.intelligence.mission_control_classification).toBe('Leader Ability');
    expect(rules.inquisition.final_judgment_classification).toBe('Leader Ability');
    expect(JSON.stringify(rules)).not.toMatch(/Faction Actions?|Faction Abilit(?:y|ies)|faction procedure|pending(?:-|\s+)battles?/i);
  });

  it('keeps Faction Feature taxonomy and structured Leader mechanics authoritative', () => {
    expect(Object.keys(authority.factionFeatureTaxonomy.actionProfiles).sort()).toEqual([
      '1 Action',
      'Automatic',
      'No Action',
    ]);
    expect(authority.factionFeatures.diplomats).toContainEqual({
      name: 'Terms',
      profile: 'No Action',
      timing: 'During Onset',
    });
    expect(authority.factionFeatures.military).toEqual([]);

    for (const leader of authority.leaders) {
      expect(leader.sections.length).toBeGreaterThan(0);
      expect(leader.sections.every((section: any) =>
        !Array.isArray(section)
        && typeof section.classification === 'string'
        && typeof section.name === 'string'
      )).toBe(true);
    }
  });

  it('stores Resource and Progression classifications without derived corrections', () => {
    const intelligence = authority.gameplay.factions.find((faction: any) => faction.id === 'intelligence');
    expect(intelligence.resource).toBe('Intel (no maximum)');
    expect(intelligence.progression).toBe('Operation Progress');

    const mystics = authority.gameplay.factions.find((faction: any) => faction.id === 'mystics');
    expect(mystics.resource).toBeNull();
    expect(mystics.progression).toBe('Rites');
  });

  it('loads the complete authority directly in browser and Node runtimes', () => {
    expect(runtime).toContain("const authority = await loadJson(CURRENT_GAME_AUTHORITY_URL)");
    expect(runtime).toContain("authority?.schemaVersion !== 2");
    expect(runtime).not.toContain('Promise.all([');
    expect(runtime).not.toContain('CURRENT_ART_DIRECTION_SOURCE_URL');
    expect(runtime).not.toContain('card_text_overrides');

    expect(nodeAuthority).toContain("CURRENT_GAME_AUTHORITY_SOURCE = 'game-data/current-game.json'");
    expect(nodeAuthority).toContain('export async function loadCurrentGameAuthority()');
    expect(nodeAuthority).not.toContain('readCurrentJsonSource');
    expect(nodeAuthority).not.toContain('resolveCurrentSourcePath');
  });

  it('makes TTS and release publication consume that same complete authority', () => {
    expect(ttsCatalog).toContain("loadCurrentGameAuthority");
    expect(ttsCatalog).toContain('const gameplay = authority.gameplay');
    expect(ttsCatalog).toContain('const starterDecks = authority.starterDecks');
    expect(ttsCatalog).not.toContain('readCurrentJsonSource');
    expect(ttsCatalog).not.toContain('resolveCards(');

    expect(releaseBuilder).toContain('loadCurrentGameAuthority()');
    expect(releaseBuilder).toContain('gameplay: clone(authority.gameplay)');
    expect(releaseBuilder).toContain("source_version: authority.version");
    expect(releaseBuilder).not.toContain('readCurrentJsonSource');
    expect(releaseBuilder).not.toContain('baseGameplay');
    expect(releaseBuilder).not.toContain('cardChanges');
    expect(releaseBuilder).not.toContain('card_text_overrides');
  });

  it('keeps the maintained Rulebook itself native v0.7.0', () => {
    expect(rulebook).toContain('**Version 0.7.0**');
    expect(rulebook).toContain('## Card anatomy');
    expect(rulebook).toContain('Terms occur during Onset');
    expect(rulebook).not.toContain('Release candidate');
    expect(rulebook).not.toContain('GENERATED CLEAN V0.6.3');
    expect(rulebook).not.toMatch(/\bpending(?:-|\s+)battles?\b|\bFaction Actions?\b|\bFaction Abilit(?:y|ies)\b|\bfaction procedure\b/i);
  });

  it('contains no transitional runtime source markers in current production loaders', () => {
    const production = [runtime, nodeAuthority, ttsCatalog, releaseBuilder].join('\n');
    for (const marker of TRANSITIONAL_RUNTIME_MARKERS) {
      expect(production).not.toContain(marker);
    }
  });
});
