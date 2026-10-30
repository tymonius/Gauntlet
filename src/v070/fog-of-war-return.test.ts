import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { v070CanonicalContent } from '../content/v070';
import { V070_FOG_OF_WAR_ID } from './fog-of-war';
import { returnV070UnappliedFogOfWarBattleCards } from './fog-of-war-return';
import type { V070BattleCardCommitment } from './battle-types';

function battle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'fog-return-foundation',
    seed: 'fog-return-foundation',
    players: {
      A: { name: 'Alpha', starterDeckId: 'military-general-forward-doctrine' },
      B: { name: 'Bravo', starterDeckId: 'military-commandant-holdfast' },
    },
  });
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId, cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId, territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => { space.occupant = null; space.blank = true; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  expect(state.battleRuntime).not.toBeNull();
  state.battleRuntime!.stage = 'reveal_tactics';
  return state;
}

function fixture() {
  const state = battle();
  const battleCardId = [...v070CanonicalContent.cardsById.values()]
    .find(card => card.effects.some(effect =>
      effect.label === 'Gambit/Tactic'
      && effect.text === '+1 Battle Total.'
    ))?.id;
  if (!battleCardId) throw new Error('No eligible battle-card fixture.');
  function add(
    owner: 'A' | 'B',
    suffix: string,
    role: 'gambit' | 'tactic',
    sourceZone: 'hand' | 'reserve',
    cardId = battleCardId,
  ): V070BattleCardCommitment {
    const instanceId = 'fog-source-' + suffix;
    state.cardInstances[instanceId] = { instanceId, owner, cardId };
    return { instanceId, owner, role, sourceZone, faceUp: true };
  }
  const fog = add('A', 'effect', 'gambit', 'hand', V070_FOG_OF_WAR_ID);
  const normalGambit = add('B', 'normal-gambit', 'gambit', 'hand');
  const extraGambit = add('B', 'extra-gambit', 'gambit', 'hand');
  const reserveTactic = add('B', 'reserve-tactic', 'tactic', 'reserve');
  const handTactic = add('B', 'hand-tactic', 'tactic', 'hand');
  const runtime = state.battleRuntime!;
  runtime.participants.A.gambit = fog;
  runtime.participants.B.gambit = normalGambit;
  runtime.participants.B.additionalGambits = [extraGambit];
  runtime.participants.B.tactic = reserveTactic;
  runtime.participants.B.additionalTactics = [handTactic];
  runtime.battleCardAftermathDestinationOverrides.push({
    sourceCardId: battleCardId, playerId: 'B',
    instanceId: handTactic.instanceId, destination: 'graveyard',
  });
  return { state, fog, normalGambit, extraGambit, reserveTactic, handTactic };
}

describe('Fog of War physical source return primitive (unapplied cards only)', () => {
  test('returns exactly one chosen Gambit to Hand and leaves the other commitments intact', () => {
    const { state, fog, normalGambit, extraGambit, reserveTactic } = fixture();
    const returned = returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId,
      { choice: 'one_gambit', targetInstanceId: extraGambit.instanceId },
    );
    expect(returned).toEqual([extraGambit.instanceId]);
    expect(state.players.B.zones.hand).toContain(extraGambit.instanceId);
    expect(state.battleRuntime!.participants.B.gambit?.instanceId)
      .toBe(normalGambit.instanceId);
    expect(state.battleRuntime!.participants.B.additionalGambits).toEqual([]);
    expect(state.battleRuntime!.participants.B.tactic?.instanceId)
      .toBe(reserveTactic.instanceId);
  });

  test('returns all Tactics to their distinct Reserve and Hand sources', () => {
    const { state, fog, reserveTactic, handTactic, normalGambit } = fixture();
    const returned = returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    );
    expect(returned).toEqual([reserveTactic.instanceId, handTactic.instanceId]);
    expect(state.battleRuntime!.participants.B.reserve)
      .toContain(reserveTactic.instanceId);
    expect(state.players.B.zones.hand).toContain(handTactic.instanceId);
    expect(state.battleRuntime!.participants.B.tactic).toBeNull();
    expect(state.battleRuntime!.participants.B.additionalTactics).toEqual([]);
    expect(state.battleRuntime!.participants.B.gambit?.instanceId)
      .toBe(normalGambit.instanceId);
    expect(state.battleRuntime!.battleCardAftermathDestinationOverrides)
      .not.toContainEqual(expect.objectContaining({
        instanceId: handTactic.instanceId,
      }));
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'fog_of_war_battle_cards_returned',
      payload: expect.objectContaining({
        choice: 'all_tactics',
        returned: expect.arrayContaining([
          expect.objectContaining({
            instanceId: reserveTactic.instanceId, sourceZone: 'reserve',
          }),
          expect.objectContaining({
            instanceId: handTactic.instanceId, sourceZone: 'hand',
          }),
        ]),
      }),
    }));
  });

  test('rejects applied effects before changing any card or battle state', () => {
    const { state, fog, reserveTactic } = fixture();
    state.battleRuntime!.appliedBattleCardEffectInstanceIds = [
      reserveTactic.instanceId,
    ];
    const before = structuredClone(state);
    expect(() => returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/applied effect/);
    expect(state).toEqual(before);
  });

  test('rejects a missing origin before partially returning mixed-source Tactics', () => {
    const { state, fog } = fixture();
    delete state.battleRuntime!.participants.B.additionalTactics[0].sourceZone;
    const before = structuredClone(state);
    expect(() => returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/source zone was not recorded/);
    expect(state).toEqual(before);
  });

  test('rejects ineligible opponents and incorrect source cards', () => {
    const { state, fog } = fixture();
    const before = structuredClone(state);
    expect(() => returnV070UnappliedFogOfWarBattleCards(
      state, 'B', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/own committed battle card/);
    expect(state).toEqual(before);
    state.battleRuntime!.participants.B.tactic = null;
    state.battleRuntime!.participants.B.additionalTactics = [];
    expect(() => returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'one_gambit', targetInstanceId: 'none' },
    )).toThrow(/Gambit and a Tactic/);
  });
});
