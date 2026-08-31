import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const authority = JSON.parse(read('game-data/current-game.json'));
const runtime = read('game-data/current-game.mjs');
const nodeAuthority = read('scripts/current-game-authority.mjs');
const ttsCatalog = read('scripts/tts-current-catalog.mjs');
const componentLoader = read('scripts/tts-component-contract.mjs');
const releaseBuilder = read('scripts/build-v071-release-source.mjs');
const rulebook = read('rulebook/player-facing/current-rulebook.md');
const artworkWorker = read('workers/artwork-authoring/src/index.js');
const artworkSession = read('workers/artwork-authoring/src/index-session.js');
const artworkClient = read('card-design/artwork-authoring-client.js');
const artworkServer = read('scripts/card-design-server.mjs');
const artworkCompositor = read('card-design/artwork-compositor.js');
const livePublicationWorkflow = read('.github/workflows/verify-current-live-publication.yml');

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

describe('complete current-game authority', () => {
  it('is a native, complete v0.7.1 release authority rather than a resolution manifest', () => {
    expect(authority.schemaVersion).toBe(2);
    expect(authority.authority).toBe('current-game');
    expect(authority.version).toBe('v0.7.1');
    expect(authority.displayVersion).toBe('v0.7.1');
    expect(authority.status).toBe('current-release');
    expect(authority.runtimePolicy).toContain('complete current gameplay authority');
    expect(authority.runtimePolicy).toContain('historical source and change documents are provenance only');

    for (const forbidden of ['sources', 'resolution', 'baseVersion', 'factionOverrides']) {
      expect(authority).not.toHaveProperty(forbidden);
    }
  });

  it('publishes the v0.7.1 starter Deck authority with the Mystics packages', () => {
    expect(authority.starterDecks.version).toBe('v0.7.1');
    expect(authority.starterDecks.status).toBe('Active v0.7.1 starter set');
    expect(authority.starterDecks.purpose).toContain('selected three-Rite package');
    expect(authority.starterDecks.optimizationPolicy.status).toBe('active-for-v0.7.1');
    expect(authority.starterDecks.optimizationPolicy.mysticsRitePackageSupport).toBe(true);
    expect(authority.starterDecks.approval.status).toBe('approved-for-v0.7.1');

    // Historical source paths remain provenance; active release identity must not.
    expect(authority.starterDecks.optimizationPolicy.predecessorAudit).toContain('v0.6.3');
    expect(authority.starterDecks.optimizationPolicy.cardAdditions).toContain('v0.6.4-card-additions.json');
    expect(JSON.stringify({
      version: authority.starterDecks.version,
      status: authority.starterDecks.status,
      purpose: authority.starterDecks.purpose,
      optimizationStatus: authority.starterDecks.optimizationPolicy.status,
      approvalStatus: authority.starterDecks.approval.status,
    })).not.toMatch(/v0\.6\.4|v0\.6\.3/i);
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

  it('promotes the approved v0.7.1 Mystics six-Rite model into current authority', () => {
    expect(authority.provenance.currentDevelopmentInputs.mysticsRites).toBe('/docs/v0.7.1-mystics-rites.json');
    expect(authority.mystics.selectionPolicy).toMatchObject({
      poolSize: 6,
      selectedCount: 3,
      timing: 'game-package construction',
      visibility: 'secret until begun',
    });
    expect(authority.mystics.rites.map((rite: any) => rite.id)).toEqual([
      'echoes', 'blood', 'crossing', 'shattering', 'consecration', 'equivalence',
    ]);
    expect(new Set(authority.mystics.rites.map((rite: any) => rite.id)).size).toBe(6);
    expect(authority.mystics.generalRules.impossibleCompletion).toContain('can no longer be completed');
    expect(authority.mystics.rites.find((rite: any) => rite.id === 'blood')?.reminder)
      .toMatchObject({ style: 'italic' });
    expect(authority.mystics.ritual.begin).toContain('all three selected Rites');
  });

  it('locks the two Mystics starter Rite packages, recommended orders, and supporting card swaps', () => {
    const byId = new Map(authority.starterDecks.decks.map((deck: any) => [deck.id, deck]));
    const alchemist = byId.get('mystics-alchemist-first-principles');
    const spiritWalker = byId.get('mystics-spirit-walker-unbroken-circle');

    expect(alchemist.selectedRites).toEqual(['echoes', 'blood', 'equivalence']);
    expect(alchemist.recommendedRiteOrder).toEqual(['equivalence', 'echoes', 'blood']);
    expect(alchemist.cards.find((entry: any) => entry.name === 'Accursed Wager')).toBeUndefined();
    expect(alchemist.cards.find((entry: any) => entry.name === 'Threefold Vision')?.quantity).toBe(1);
    expect(alchemist.cardCount).toBe(30);
    expect(alchemist.deckbuildingValue).toBe(60);

    expect(spiritWalker.selectedRites).toEqual(['crossing', 'shattering', 'consecration']);
    expect(spiritWalker.recommendedRiteOrder).toEqual(['consecration', 'shattering', 'crossing']);
    expect(spiritWalker.cards.find((entry: any) => entry.name === 'Necromancy')).toBeUndefined();
    expect(spiritWalker.cards.find((entry: any) => entry.name === 'Threefold Vision')).toBeUndefined();
    expect(spiritWalker.cards.find((entry: any) => entry.name === 'Paths of Shadow')?.quantity).toBe(2);
    expect(spiritWalker.cards.find((entry: any) => entry.name === 'Witchcraft')?.quantity).toBe(2);
    expect(spiritWalker.cardCount).toBe(30);
    expect(spiritWalker.deckbuildingValue).toBe(60);

    const riteIds = new Set(authority.mystics.rites.map((rite: any) => rite.id));
    for (const deck of [alchemist, spiritWalker]) {
      expect(deck.selectedRites).toHaveLength(authority.mystics.selectionPolicy.selectedCount);
      expect(new Set(deck.selectedRites).size).toBe(deck.selectedRites.length);
      expect(deck.selectedRites.every((id: string) => riteIds.has(id))).toBe(true);
      expect([...deck.recommendedRiteOrder].sort()).toEqual([...deck.selectedRites].sort());
    }
  });

  it('keeps card-pool summary metadata synchronized with the actual playable pool', () => {
    const cards = authority.gameplay.cards;
    const summary = authority.gameplay.card_pool_summary;

    const expectedCounts = cards.reduce((counts: Record<string, number>, card: any) => {
      counts[card.allegiance] = (counts[card.allegiance] || 0) + 1;
      return counts;
    }, {});

    expect(expectedCounts).toEqual({
      Neutral: 52,
      Military: 15,
      Diplomats: 15,
      Financiers: 15,
      Intelligence: 15,
      Mystics: 15,
      Inquisition: 15,
    });

    for (const [allegiance, count] of Object.entries(expectedCounts)) {
      expect(summary[allegiance]?.count).toBe(count);
      expect(summary[allegiance]?.total_value).toBe(
        cards
          .filter((card: any) => card.allegiance === allegiance)
          .reduce((total: number, card: any) => total + Number(card.cost || 0), 0)
      );
    }

    for (const faction of authority.gameplay.factions) {
      expect(faction.card_count).toBe(expectedCounts[faction.name]);
    }
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
    expect(rules.diplomats.peace_treaty_threshold).toBe(6);
    expect(rulebook.replace(/<!--.*?-->/g, '')).toContain('Ratify six different Proposals');
    expect(rulebook.replace(/<!--.*?-->/g, '')).toContain('if six different Proposals are ratified');
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

  it('keeps the embedded Arcane-symbol authority current-version native', () => {
    expect(authority.arcaneSymbol.version).toBe('v0.7.0');
    expect(authority.arcaneSymbol).not.toHaveProperty('base_version');
    expect(authority.arcaneSymbol.mechanics_changed).toBe(false);
    expect(authority.arcaneSymbol.general_rule.body).toContain('Arcane cards are marked with the Mystics sigil');
    expect(authority.provenance.historicalInputs.arcaneSymbol).toBe('/docs/v0.6.4-arcane-symbol.json');
  });

  it('stores the effective component package directly without runtime corrections', () => {
    const contract = authority.componentContract;
    expect(contract.standardBack.mode).toBe('universal-black');
    expect(contract.effectiveBackPolicy).toMatchObject({
      standardBack: 'universal-black',
      factionComponentBack: 'faction',
    });

    const references = [
      ...(contract.sharedComponents || []),
      ...(contract.components || []),
    ].filter((component: any) => component.family === 'reference-card');
    expect(references).toHaveLength(8);
    expect(references.every((component: any) =>
      component.source.startsWith('card-design/reference-copy/v0.7.0/')
    )).toBe(true);

    const universal = references.find((component: any) => component.id === 'universal-reference');
    expect(universal.authoritySource).toBe('rulebook/player-facing/current-rulebook.md');
    expect(references.filter((component: any) => component.id !== 'universal-reference')
      .every((component: any) => component.authoritySource === 'game-data/current-game.json')).toBe(true);

    const diplomat = references.find((component: any) => component.id === 'diplomats-reference');
    expect(diplomat.referenceFaces.front.sections.map((section: any) => section.heading)).toEqual([
      'Offering Terms',
      'Diplomat Mirror',
      'Accepted',
      'Refused',
    ]);

    expect(componentLoader).toContain('const contract = JSON.parse(JSON.stringify(embedded))');
    expect(componentLoader).not.toContain('alignBespokeReferenceFaces');
    expect(componentLoader).not.toContain('config/tts-component-contract.json');
    expect(componentLoader).not.toContain('reference-copy/v0.6.3');
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
    expect(runtime).toContain('validateMysticsStarterRites(authority)');
    expect(runtime).not.toContain('Promise.all([');
    expect(runtime).not.toContain('CURRENT_ART_DIRECTION_SOURCE_URL');
    expect(runtime).not.toContain('card_text_overrides');

    expect(nodeAuthority).toContain("CURRENT_GAME_AUTHORITY_SOURCE = 'game-data/current-game.json'");
    expect(nodeAuthority).toContain('export async function loadCurrentGameAuthority()');
    expect(nodeAuthority).toContain('Invalid Mystics starter Rite package');
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
    expect(releaseBuilder).toContain('source_version: RELEASE_VERSION');
    expect(releaseBuilder).not.toContain('readCurrentJsonSource');
    expect(releaseBuilder).not.toContain('baseGameplay');
    expect(releaseBuilder).not.toContain('cardChanges');
    expect(releaseBuilder).not.toContain('card_text_overrides');
  });

  it('writes artwork composition edits back into the complete current authority', () => {
    expect(artworkWorker).toContain("authorityPath: String(env.GITHUB_AUTHORITY_PATH || 'game-data/current-game.json')");
    expect(artworkWorker).toContain("const before = authority.artDirection");
    expect(artworkWorker).toContain("const nextAuthority = { ...authority, artDirection: after }");
    expect(artworkWorker).not.toContain('tts/artwork-direction-overrides.js');
    expect(artworkWorker).not.toContain('GITHUB_OVERRIDE_PATH');

    expect(artworkSession).toContain("authorityPath: String(env.GITHUB_AUTHORITY_PATH || 'game-data/current-game.json')");
    expect(artworkSession).toContain('file: context.cfg.authorityPath');
    expect(artworkSession).not.toContain('GITHUB_OVERRIDE_PATH');

    expect(artworkClient).toContain('contents/game-data/current-game.json?ref=');
    expect(artworkClient).toContain('const directions = authority?.artDirection');
    expect(artworkClient).not.toContain('contents/tts/artwork-direction-overrides.js');

    expect(artworkServer).toContain("const AUTHORITY_FILE = join(ROOT, 'game-data', 'current-game.json')");
    expect(artworkServer).toContain('const next = { ...authority, artDirection: map }');
    expect(artworkServer).not.toContain("join(ROOT, 'tts', 'artwork-direction-overrides.js')");

    expect(artworkCompositor).toContain('game-data/current-game.json · artDirection');
    expect(artworkCompositor).not.toContain('tts/artwork-direction-overrides.js');
    expect(livePublicationWorkflow).toContain("'game-data/current-game.json'");
    expect(livePublicationWorkflow).not.toContain("'tts/artwork-direction-overrides.js'");
  });

  it('keeps the maintained Rulebook on the v0.7.1 release identity', () => {
    expect(rulebook).toContain('**Version 0.7.1**');
    expect(rulebook).not.toContain('**Version 0.7.1 Candidate**');
    expect(rulebook).toContain('## Card anatomy');
    expect(rulebook).toContain('Terms occur during Onset');
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
