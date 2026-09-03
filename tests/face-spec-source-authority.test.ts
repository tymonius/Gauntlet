import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listFaces } from '../card-design/face-authority.mjs';
import {
  FACE_TEMPLATE_CONTRACTS,
  resolveAllFaceSpecs,
  resolveFaceSpec,
} from '../card-design/face-spec.mjs';

const authority = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const game = Object.freeze({
  authorityUrl: '/game-data/current-game.json',
  visualAuthorityUrl: '/game-data/current-game.json',
  version: authority.version,
  displayVersion: authority.displayVersion,
  visualPolicy: authority.visualPolicy,
  artDirection: authority.artDirection,
  cards: authority.gameplay.cards,
  territories: authority.gameplay.territories,
  leaders: authority.leaders,
  proposals: authority.proposals,
  mystics: authority.mystics,
  components: authority.componentContract.components,
  sharedComponents: authority.componentContract.sharedComponents,
});

describe('complete FaceSpec source authority', () => {
  it('resolves every canonical physical face through one FaceSpec function', () => {
    const faces = listFaces(game);
    const specs = resolveAllFaceSpecs(game);
    expect(faces).toHaveLength(242);
    expect(specs).toHaveLength(faces.length);
    expect(new Set(specs.map(spec => spec.id)).size).toBe(specs.length);

    for (const spec of specs) {
      expect(spec.schemaVersion).toBe(1);
      expect(spec.template).toBeTruthy();
      expect(FACE_TEMPLATE_CONTRACTS[spec.template]).toBeTruthy();
      expect(spec.dependencies.styles.length).toBeGreaterThan(0);
      expect(spec.provenance).toEqual({
        gameplay: '/game-data/current-game.json',
        visual: '/game-data/current-game.json',
        version: authority.version,
        displayVersion: authority.displayVersion,
      });
      expect(Object.isFrozen(spec)).toBe(true);
      expect(Object.isFrozen(spec.content)).toBe(true);
      expect(Object.isFrozen(spec.readiness)).toBe(true);
    }
  });

  it('resolves representative families without caller-selected renderer knowledge', () => {
    const playable = resolveFaceSpec(game, 'card:mystics-accursed-wager');
    const territory = resolveFaceSpec(game, 'territory:territory-quicksand');
    const leader = resolveFaceSpec(game, 'leader:military-general');
    const proposal = resolveFaceSpec(game, 'component:diplomats-proposal-de-escalation:front');
    const proposalReverse = resolveFaceSpec(game, 'component:diplomats-proposal-de-escalation:reverse');
    const rite = resolveFaceSpec(game, 'component:mystics-rite-blood:front');
    const riteReverse = resolveFaceSpec(game, 'component:mystics-rite-crossing:reverse');
    const ritualReverse = resolveFaceSpec(game, 'component:mystics-ritual-of-ascension:reverse');
    const reference = resolveFaceSpec(game, 'component:universal-reference:front');
    const tracker = resolveFaceSpec(game, 'component:military-command-tracker:front');
    const ledger = resolveFaceSpec(game, 'component:financiers-capital-ledger:front');
    const deed = resolveFaceSpec(game, 'component:financiers-deed:front');
    const back = resolveFaceSpec(game, 'back:intelligence');

    expect(playable.content).toMatchObject({ type: 'playable', card: { id: 'mystics-accursed-wager' } });
    expect(territory.content).toMatchObject({ type: 'territory', territory: { id: 'territory-quicksand' } });
    expect(leader.content).toMatchObject({ type: 'leader', leader: { id: 'general', faction: 'military' } });
    expect(proposal.content).toMatchObject({ type: 'proposal', mode: 'proposal', proposal: { id: 'de-escalation' } });
    expect(proposalReverse.content).toMatchObject({ type: 'proposal', mode: 'ratified', proposal: { id: 'de-escalation' } });
    expect(rite.content).toMatchObject({ type: 'rite', mode: 'active', rite: { id: 'blood' } });
    expect(riteReverse.content).toMatchObject({ type: 'rite', mode: 'completed', rite: { id: 'crossing' } });
    expect(ritualReverse.content).toMatchObject({ type: 'ritual', mode: 'reverse', ritual: { id: 'ascension' } });
    expect(reference.content).toMatchObject({ type: 'reference', selector: { title: 'Turn & Battle' } });
    expect(tracker.content).toMatchObject({
      type: 'tracker',
      trackedValue: { name: 'Command' },
      presentation: { scaleMaximum: 4, labelSizePt: 11.2, title: 'Command Tracker' },
    });
    expect(ledger.content).toMatchObject({ type: 'ledger', openingBalance: 2, blankRows: 11 });
    expect(deed.content).toMatchObject({ type: 'deed' });
    expect(back.content).toEqual({ type: 'standard-back', faction: 'intelligence' });
  });

  it('makes artwork source and composition provenance explicit in the spec', () => {
    const playable = resolveFaceSpec(game, 'card:mystics-accursed-wager');
    expect(playable.artwork).toMatchObject({
      role: 'crop',
      source: { mode: 'first-existing' },
      composition: { id: 'mystics-accursed-wager', explicit: false },
    });
    expect(playable.artwork.source.candidates.length).toBeGreaterThan(0);

    const banker = resolveFaceSpec(game, 'leader:financiers-banker');
    expect(banker.artwork).toMatchObject({
      role: 'crop',
      source: { mode: 'exact', src: '/images/banker.png' },
      composition: { id: 'financiers-banker', explicit: true },
    });
    expect(banker.readiness.productionReady).toBe(false);
    expect(banker.readiness.issues).toContain('artwork-composition-not-final');

    const general = resolveFaceSpec(game, 'leader:military-general');
    expect(general.artwork.composition).toMatchObject({
      id: 'military-general',
      explicit: false,
    });
    expect(general.readiness.issues).toContain('artwork-composition-not-explicit');

    const crossingCompleted = resolveFaceSpec(game, 'component:mystics-rite-crossing:reverse');
    expect(crossingCompleted.artwork).toMatchObject({
      role: 'crop',
      source: { mode: 'exact', src: authority.mystics.completedArtwork },
      composition: { id: 'rite-crossing-completed', explicit: true },
    });

    const ritualBack = resolveFaceSpec(game, 'component:mystics-ritual-of-ascension:reverse');
    expect(ritualBack.artwork).toEqual({
      role: 'full-face',
      source: { mode: 'exact', src: authority.mystics.ritual.cardBack },
      composition: null,
    });
  });

  it('surfaces unresolved presentation authority instead of hiding fallbacks', () => {
    const tracker = resolveFaceSpec(game, 'component:military-command-tracker:front');
    expect(tracker.readiness).toEqual({ productionReady: true, issues: [] });

    const reference = resolveFaceSpec(game, 'component:universal-reference:front');
    expect(reference.readiness.productionReady).toBe(false);
    expect(reference.readiness.issues).toContain('reference-presentation-still-legacy');

    const general = resolveFaceSpec(game, 'leader:military-general');
    expect(general.readiness.productionReady).toBe(false);
    expect(general.readiness.issues).toContain('artwork-composition-not-explicit');

    const deed = resolveFaceSpec(game, 'component:financiers-deed:front');
    expect(deed.readiness).toEqual({ productionReady: true, issues: [] });

    const cardBack = resolveFaceSpec(game, 'back:intelligence');
    expect(cardBack.readiness).toEqual({ productionReady: true, issues: [] });
  });

  it('does not alter or depend on any production render route', () => {
    const source = readFileSync('card-design/face-spec.mjs', 'utf8');
    expect(source).not.toContain('component-render.html');
    expect(source).not.toContain('card-review-render.html');
    expect(source).not.toContain('territory-review-render.html');
    expect(source).not.toContain('window.location');
    expect(source).not.toContain('document.');
  });
});
