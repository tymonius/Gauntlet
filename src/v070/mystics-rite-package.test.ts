import { describe, expect, test } from 'vitest';
import canonical from '../../packages/game-data/current-game.json';
import {
  createV070StarterGame,
  type V070MysticRiteId,
} from './engine';
import { viewV070GameForPlayer } from './views';
import { beginV070MysticRite } from './mystics';
import {
  CURRENT_MYSTIC_RITE_IDS,
  LEGACY_STARTER_MYSTIC_RITE_IDS,
  selectV070MysticRitePackage,
} from './mystics-rite-package';

const mysticStarter = 'mystics-alchemist-first-principles';
const militaryStarter = 'military-commandant-holdfast';

function game(selectedRiteIds?: readonly V070MysticRiteId[]) {
  return createV070StarterGame({
    gameId: 'six-rite-package',
    seed: 'six-rite-package-seed',
    players: {
      A: { name: 'Mystic', starterDeckId: mysticStarter, selectedRiteIds },
      B: { name: 'Military', starterDeckId: militaryStarter },
    },
  });
}

describe('current six-Rite Mystics package state (pre-effect integration)', () => {
  test('all six names, package size and Rite identifiers bind to canonical current-game.json', () => {
    expect(CURRENT_MYSTIC_RITE_IDS).toEqual(canonical.mystics.rites.map(x => x.id));
    expect(CURRENT_MYSTIC_RITE_IDS).toEqual([
      'echoes', 'blood', 'crossing', 'shattering', 'consecration', 'equivalence',
    ]);
    expect(canonical.mystics.selectionPolicy.poolSize).toBe(6);
    expect(canonical.mystics.selectionPolicy.selectedCount).toBe(3);
    const state = game(['shattering', 'equivalence', 'consecration']);
    expect(Object.keys(state.players.A.mystics!.rites)).toEqual(
      CURRENT_MYSTIC_RITE_IDS,
    );
    expect(Object.values(state.players.A.mystics!.rites))
      .toEqual(Array(6).fill({
        status: 'incomplete',
        begunTurn: null,
        completedTurn: null,
        territoryInstanceId: null,
      }));
  });

  test('explicit chosen three are durable in setup snapshot, save/load and owner view', () => {
    const selected = ['consecration', 'equivalence', 'shattering'] as const;
    const state = game(selected);
    expect(state.players.A.mystics?.selectedRiteIds).toEqual(selected);
    const serialized = JSON.parse(JSON.stringify(state));
    expect(serialized.players.A.mystics.selectedRiteIds).toEqual(selected);
    expect(viewV070GameForPlayer(state, 'A').players.A.mystics?.selectedRiteIds)
      .toEqual(selected);
    expect(viewV070GameForPlayer(state, 'B').players.A.mystics)
      .not.toHaveProperty('selectedRiteIds');
    expect(JSON.stringify(viewV070GameForPlayer(state, 'B').players.A.mystics))
      .not.toContain('selectedRiteIds');
  });

  test('legacy starter defaults to the original three Rites but not all six', () => {
    const state = game();
    expect(state.players.A.mystics?.selectedRiteIds)
      .toEqual(LEGACY_STARTER_MYSTIC_RITE_IDS);
    expect(state.players.B.mystics).toBeNull();
  });

  test.each([
    [],
    ['echoes'],
    ['echoes', 'blood'],
    ['echoes', 'blood', 'crossing', 'shattering'],
    ['echoes', 'echoes', 'blood'],
    ['echoes', 'blood', 'not-a-rite'],
  ].map(candidate => ({ candidate })))(
    'rejects invalid package selection $candidate before setup',
    ({ candidate }) => {
    expect(() => selectV070MysticRitePackage(
      candidate as V070MysticRiteId[],
    )).toThrow(/exactly 3 different Rites/);
    expect(() => game(candidate as V070MysticRiteId[]))
      .toThrow(/exactly 3 different Rites/);
  });

  test('rejects an optional Rite package on a non-Mystics starter', () => {
    expect(() => createV070StarterGame({
      gameId: 'invalid-non-mystic',
      seed: 'invalid-non-mystic',
      players: {
        A: {
          name: 'Soldier',
          starterDeckId: militaryStarter,
          selectedRiteIds: ['echoes', 'blood', 'crossing'],
        },
        B: { name: 'Other', starterDeckId: militaryStarter },
      },
    })).toThrow(/Only a Mystics game package may select Rites/);
  });

  test('selected but unimplemented Rites cannot create false progress or spend a cost', () => {
    const state = game(['shattering', 'consecration', 'equivalence']);
    const baseline = structuredClone(state);
    expect(() => beginV070MysticRite(state, 'A', 'equivalence'))
      .toThrow(/must exchange one Hand card with one Graveyard card/);
    expect(state).toEqual(baseline);
    // Consecration is executable, but its beginning requires an Overlay.
    expect(() => beginV070MysticRite(state, 'A', 'consecration'))
      .toThrow(/requires an Overlay from Hand/);
    expect(state).toEqual(baseline);
    // Shattering is now executable, but cannot begin without a banked Asset.
    expect(() => beginV070MysticRite(state, 'A', 'shattering'))
      .toThrow(/one banked Asset/);
    expect(state).toEqual(baseline);
    expect(() => beginV070MysticRite(state, 'A', 'blood'))
      .toThrow(/not one of your three selected/);
    expect(state.players.A.mystics!.rites.blood.status).toBe('incomplete');
  });

  test('state copy is private and does not mutate when views are serialized', () => {
    const state = game(['echoes', 'shattering', 'crossing']);
    const view = viewV070GameForPlayer(state, 'A');
    view.players.A.mystics!.selectedRiteIds!.reverse();
    expect(state.players.A.mystics!.selectedRiteIds)
      .toEqual(['echoes', 'shattering', 'crossing']);
  });
});
