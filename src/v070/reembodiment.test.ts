import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { viewV070GameForPlayer } from './views';
import {
  openV070ReembodimentRecovery,
  recordV070ReembodimentQualifyingTransition,
  resolveV070ReembodimentRecovery,
  viewV070ReembodimentRecoveryForPlayer,
} from './reembodiment';

type Zone = 'hand' | 'discardPile' | 'graveyard' | 'assetBank';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'reembodiment-test',
    seed: 'reembodiment-seed',
    players: {
      A: {
        name: 'Alchemist',
        starterDeckId: 'mystics-alchemist-first-principles',
      },
      B: {
        name: 'Ranger',
        starterDeckId: 'intelligence-ranger-fieldcraft',
      },
    },
  });

  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'A',
    value: 6,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function toDenouement(state: V070GameState): V070GameState {
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'hold',
  });
  expect(state.turnState?.phase).toBe('denouement');
  return state;
}

function activeBattle(): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone?: Zone,
): string {
  const instanceId = `reembodiment-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  if (zone) state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function handToGraveyard(
  state: V070GameState,
  playerId: 'A' | 'B',
  instanceId: string,
): void {
  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(instanceId);
  expect(index).toBeGreaterThanOrEqual(0);
  hand.splice(index, 1);
  state.players[playerId].zones.graveyard.push(instanceId);
}

describe('v0.7.0 Reembodiment', () => {
  test('recovers one other lower-value Graveyard card after the qualifying effect resolves', () => {
    const state = readyGame();
    const asset = inject(
      state,
      'A',
      'mystics-sacrifice-recovery',
      'asset',
      'assetBank',
    );
    const trigger = inject(
      state,
      'A',
      'neutral-arcane-knowledge',
      'trigger',
      'hand',
    );
    const lower = inject(
      state,
      'A',
      'neutral-supplies',
      'lower',
      'graveyard',
    );
    const equal = inject(
      state,
      'A',
      'mystics-witchcraft',
      'equal',
      'graveyard',
    );
    const higher = inject(
      state,
      'A',
      'mystics-necromancy',
      'higher',
      'graveyard',
    );

    handToGraveyard(state, 'A', trigger);
    const continuation = recordV070ReembodimentQualifyingTransition(
      state,
      'A',
      [trigger],
      'test effect',
      false,
    );
    expect(continuation).toMatchObject({
      playerId: 'A',
      assetInstanceId: asset,
      triggeringArcaneInstanceId: trigger,
      triggerValue: 4,
    });
    expect(openV070ReembodimentRecovery(state, continuation!)).toBe(true);
    expect(state.pendingReembodimentRecovery?.candidateInstanceIds)
      .toContain(lower);
    expect(state.pendingReembodimentRecovery?.candidateInstanceIds)
      .not.toEqual(expect.arrayContaining([trigger, equal, higher]));

    resolveV070ReembodimentRecovery(state, 'A', lower);
    expect(state.players.A.zones.hand).toContain(lower);
    expect(state.players.A.zones.graveyard).not.toContain(lower);
    expect(state.players.A.zones.assetBank).toContain(asset);
    expect(state.pendingReembodimentRecovery ?? null).toBeNull();
  });

  test('a non-Arcane Hand-to-Graveyard move does not consume the first qualifying occurrence', () => {
    const state = readyGame();
    inject(
      state,
      'A',
      'mystics-sacrifice-recovery',
      'asset',
      'assetBank',
    );
    const ordinary = inject(
      state,
      'A',
      'neutral-supplies',
      'ordinary',
      'hand',
    );
    const arcane = inject(
      state,
      'A',
      'mystics-fate-s-toll',
      'arcane',
      'hand',
    );

    handToGraveyard(state, 'A', ordinary);
    expect(recordV070ReembodimentQualifyingTransition(
      state,
      'A',
      [ordinary],
      'ordinary cost',
      false,
    )).toBeNull();

    handToGraveyard(state, 'A', arcane);
    expect(recordV070ReembodimentQualifyingTransition(
      state,
      'A',
      [arcane],
      'Arcane cost',
      false,
    )).not.toBeNull();
  });

  test('the first qualifying occurrence is consumed even when Reembodiment is not banked yet', () => {
    const state = readyGame();
    const first = inject(
      state,
      'A',
      'mystics-fate-s-toll',
      'first',
      'hand',
    );
    handToGraveyard(state, 'A', first);
    expect(recordV070ReembodimentQualifyingTransition(
      state,
      'A',
      [first],
      'first qualifying effect',
      false,
    )).toBeNull();
    expect(state.reembodimentFirstQualifyingTurn?.A).toBe(state.turnNumber);

    inject(
      state,
      'A',
      'mystics-sacrifice-recovery',
      'late-asset',
      'assetBank',
    );
    const second = inject(
      state,
      'A',
      'mystics-paths-of-shadow',
      'second',
      'hand',
    );
    handToGraveyard(state, 'A', second);
    expect(recordV070ReembodimentQualifyingTransition(
      state,
      'A',
      [second],
      'later qualifying effect',
      false,
    )).toBeNull();
  });

  test('simultaneous qualifying Arcane cards use the highest value as the recovery threshold', () => {
    const state = readyGame();
    inject(
      state,
      'A',
      'mystics-sacrifice-recovery',
      'asset',
      'assetBank',
    );
    const valueFive = inject(
      state,
      'A',
      'mystics-necromancy',
      'five',
      'hand',
    );
    const valueFour = inject(
      state,
      'A',
      'neutral-arcane-knowledge',
      'four',
      'hand',
    );
    handToGraveyard(state, 'A', valueFive);
    handToGraveyard(state, 'A', valueFour);

    const continuation = recordV070ReembodimentQualifyingTransition(
      state,
      'A',
      [valueFour, valueFive],
      'batch effect',
      false,
    );
    expect(continuation).toMatchObject({
      triggeringArcaneInstanceId: valueFive,
      triggerValue: 5,
    });
    expect(continuation?.simultaneousArcaneInstanceIds)
      .toEqual([valueFour, valueFive]);

    expect(openV070ReembodimentRecovery(state, continuation!)).toBe(true);
    expect(state.pendingReembodimentRecovery?.candidateInstanceIds)
      .toContain(valueFour);
  });

  test('the optional recovery may be declined without moving either card', () => {
    const state = readyGame();
    inject(
      state,
      'A',
      'mystics-sacrifice-recovery',
      'asset',
      'assetBank',
    );
    const trigger = inject(
      state,
      'A',
      'mystics-paths-of-shadow',
      'trigger',
      'hand',
    );
    const lower = inject(
      state,
      'A',
      'neutral-supplies',
      'lower',
      'graveyard',
    );
    handToGraveyard(state, 'A', trigger);
    const continuation = recordV070ReembodimentQualifyingTransition(
      state,
      'A',
      [trigger],
      'test effect',
      false,
    );
    openV070ReembodimentRecovery(state, continuation!);

    resolveV070ReembodimentRecovery(state, 'A');
    expect(state.players.A.zones.graveyard)
      .toEqual(expect.arrayContaining([trigger, lower]));
    expect(state.pendingReembodimentRecovery ?? null).toBeNull();
    expect(state.events.some(event =>
      event.type === 'reembodiment_recovery_declined'
    )).toBe(true);
  });

  test('recovery choices are private to the Reembodiment player', () => {
    const state = readyGame();
    const asset = inject(
      state,
      'A',
      'mystics-sacrifice-recovery',
      'asset',
      'assetBank',
    );
    const trigger = inject(
      state,
      'A',
      'mystics-paths-of-shadow',
      'trigger',
      'hand',
    );
    const lower = inject(
      state,
      'A',
      'neutral-supplies',
      'lower',
      'graveyard',
    );
    handToGraveyard(state, 'A', trigger);
    const continuation = recordV070ReembodimentQualifyingTransition(
      state,
      'A',
      [trigger],
      'test effect',
      false,
    );
    openV070ReembodimentRecovery(state, continuation!);

    expect(viewV070ReembodimentRecoveryForPlayer(state, 'A'))
      .toMatchObject({
        playerId: 'A',
        assetInstanceId: asset,
        candidateCount: 1,
        candidateInstanceIds: [lower],
      });
    expect(viewV070ReembodimentRecoveryForPlayer(state, 'B'))
      .toEqual(expect.objectContaining({
        playerId: 'A',
        assetInstanceId: asset,
        candidateCount: 1,
      }));
    expect(viewV070ReembodimentRecoveryForPlayer(state, 'B'))
      .not.toHaveProperty('candidateInstanceIds');
    expect(viewV070GameForPlayer(state, 'B').pendingReembodimentRecovery)
      .not.toHaveProperty('candidateInstanceIds');
  });

  test('Rite of Blood opens Reembodiment only after its controlled Arcane cost has resolved', () => {
    let state = toDenouement(readyGame());
    inject(
      state,
      'A',
      'mystics-sacrifice-recovery',
      'asset',
      'assetBank',
    );
    const cost = inject(
      state,
      'A',
      'mystics-fate-s-toll',
      'blood-cost',
      'hand',
    );
    const lower = inject(
      state,
      'A',
      'neutral-supplies',
      'blood-recovery',
      'graveyard',
    );

    state = reduceV070TurnAction(state, {
      type: 'mystics_begin_rite',
      playerId: 'A',
      riteId: 'blood',
      bloodCostInstanceId: cost,
    });

    expect(state.players.A.mystics?.rites.blood.status).toBe('begun');
    expect(state.players.A.zones.graveyard).toContain(cost);
    expect(state.pendingReembodimentRecovery).toMatchObject({
      playerId: 'A',
      triggeringArcaneInstanceId: cost,
      candidateInstanceIds: expect.arrayContaining([lower]),
      sourceLabel: 'Rite of Blood',
    });
    expect(() => reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId: 'A',
    })).toThrow(/Reembodiment recovery/);

    state = reduceV070TurnAction(state, {
      type: 'resolve_reembodiment_recovery',
      playerId: 'A',
      targetInstanceId: lower,
    });
    expect(state.players.A.zones.hand).toContain(lower);
  });

  test('reactive Subversion may pass and let Reembodiment open its recovery', () => {
    let state = toDenouement(readyGame());
    const reembodiment = inject(
      state,
      'A',
      'mystics-sacrifice-recovery',
      'asset',
      'assetBank',
    );
    inject(
      state,
      'B',
      'intelligence-subversion',
      'reactive',
      'assetBank',
    );
    const cost = inject(
      state,
      'A',
      'mystics-fate-s-toll',
      'blood-cost',
      'hand',
    );
    inject(
      state,
      'A',
      'neutral-supplies',
      'blood-recovery',
      'graveyard',
    );

    state = reduceV070TurnAction(state, {
      type: 'mystics_begin_rite',
      playerId: 'A',
      riteId: 'blood',
      bloodCostInstanceId: cost,
    });
    expect(state.pendingSubversionAssetTurn).toMatchObject({
      playerId: 'B',
      targetOwner: 'A',
      targetAssetInstanceId: reembodiment,
      effectLabel: 'Reembodiment',
    });
    expect(state.pendingReembodimentRecovery ?? null).toBeNull();

    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'B',
      choice: 'pass',
    });
    expect(state.pendingSubversionAssetTurn ?? null).toBeNull();
    expect(state.pendingReembodimentRecovery?.playerId).toBe('A');
  });

  test('reactive Subversion use negates Reembodiment and discards the targeted Asset', () => {
    let state = toDenouement(readyGame());
    const reembodiment = inject(
      state,
      'A',
      'mystics-sacrifice-recovery',
      'asset',
      'assetBank',
    );
    const subversion = inject(
      state,
      'B',
      'intelligence-subversion',
      'reactive',
      'assetBank',
    );
    const cost = inject(
      state,
      'A',
      'mystics-fate-s-toll',
      'blood-cost',
      'hand',
    );
    inject(
      state,
      'A',
      'neutral-supplies',
      'blood-recovery',
      'graveyard',
    );

    state = reduceV070TurnAction(state, {
      type: 'mystics_begin_rite',
      playerId: 'A',
      riteId: 'blood',
      bloodCostInstanceId: cost,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'B',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.players.B.zones.graveyard).toContain(subversion);
    expect(state.players.A.zones.discardPile).toContain(reembodiment);
    expect(state.players.A.zones.assetBank).not.toContain(reembodiment);
    expect(state.pendingReembodimentRecovery ?? null).toBeNull();
  });

  test('battle Transmutation opens Reembodiment after the sacrifice while preserving battle state', () => {
    let state = activeBattle();
    state.players.A.mystics!.rites.echoes.status = 'completed';
    state.players.A.mystics!.rites.echoes.completedTurn = state.turnNumber - 1;
    state.players.A.mystics!.rites.blood.status = 'completed';
    state.players.A.mystics!.rites.blood.completedTurn = state.turnNumber - 1;
    inject(
      state,
      'A',
      'mystics-sacrifice-recovery',
      'asset',
      'assetBank',
    );
    const sacrifice = inject(
      state,
      'A',
      'mystics-paths-of-shadow',
      'transmutation',
      'hand',
    );
    const lower = inject(
      state,
      'A',
      'neutral-supplies',
      'transmutation-recovery',
      'graveyard',
    );

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('outcome');

    state = reduceV070BattleAction(state, {
      type: 'use_mystic_transmutation',
      playerId: 'A',
      cardInstanceId: sacrifice,
    });

    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(3);
    expect(state.players.A.zones.graveyard).toContain(sacrifice);
    expect(state.pendingReembodimentRecovery).toMatchObject({
      playerId: 'A',
      triggeringArcaneInstanceId: sacrifice,
      candidateInstanceIds: expect.arrayContaining([lower]),
      duringBattle: true,
    });
  });
});
