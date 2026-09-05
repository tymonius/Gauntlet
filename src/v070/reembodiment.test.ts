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
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });
}

function toDenouement(state: V070GameState): V070GameState {
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
    type: 'choose_movement', playerId: 'A', choice: 'hold',
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
    type: 'resolve_capture', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening', playerId: 'A',
  });
  return reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
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

function moveHandToGraveyard(
  state: V070GameState,
  playerId: 'A' | 'B',
  instanceId: string,
): void {
  const hand = state.players[playerId].zones.hand;
  hand.splice(hand.indexOf(instanceId), 1);
  state.players[playerId].zones.graveyard.push(instanceId);
}

describe('v0.7.0 Reembodiment', () => {
  test('recovers only one other lower-value card and leaves the Asset banked', () => {
    const state = readyGame();
    const asset = inject(state, 'A', 'mystics-sacrifice-recovery', 'asset', 'assetBank');
    const trigger = inject(state, 'A', 'neutral-arcane-knowledge', 'trigger', 'hand');
    const lower = inject(state, 'A', 'neutral-supplies', 'lower', 'graveyard');
    const equal = inject(state, 'A', 'mystics-witchcraft', 'equal', 'graveyard');
    const higher = inject(state, 'A', 'mystics-necromancy', 'higher', 'graveyard');
    moveHandToGraveyard(state, 'A', trigger);

    const continuation = recordV070ReembodimentQualifyingTransition(
      state, 'A', [trigger], 'test effect', false,
    );
    expect(continuation).toMatchObject({
      assetInstanceId: asset,
      triggeringArcaneInstanceId: trigger,
      triggerValue: 4,
    });
    expect(openV070ReembodimentRecovery(state, continuation!)).toBe(true);
    expect(state.pendingReembodimentRecovery?.candidateInstanceIds).toContain(lower);
    expect(state.pendingReembodimentRecovery?.candidateInstanceIds)
      .not.toEqual(expect.arrayContaining([trigger, equal, higher]));

    resolveV070ReembodimentRecovery(state, 'A', lower);
    expect(state.players.A.zones.hand).toContain(lower);
    expect(state.players.A.zones.assetBank).toContain(asset);
    expect(state.pendingReembodimentRecovery ?? null).toBeNull();
  });

  test('non-Arcane movement does not consume the trigger, but an unavailable first Arcane occurrence does', () => {
    const state = readyGame();
    const ordinary = inject(state, 'A', 'neutral-supplies', 'ordinary', 'hand');
    moveHandToGraveyard(state, 'A', ordinary);
    expect(recordV070ReembodimentQualifyingTransition(
      state, 'A', [ordinary], 'ordinary effect', false,
    )).toBeNull();
    expect(state.reembodimentFirstQualifyingTurn?.A).toBeUndefined();

    const first = inject(state, 'A', 'mystics-fate-s-toll', 'first', 'hand');
    moveHandToGraveyard(state, 'A', first);
    expect(recordV070ReembodimentQualifyingTransition(
      state, 'A', [first], 'first Arcane effect', false,
    )).toBeNull();
    expect(state.reembodimentFirstQualifyingTurn?.A).toBe(state.turnNumber);

    inject(state, 'A', 'mystics-sacrifice-recovery', 'late', 'assetBank');
    const second = inject(state, 'A', 'mystics-paths-of-shadow', 'second', 'hand');
    moveHandToGraveyard(state, 'A', second);
    expect(recordV070ReembodimentQualifyingTransition(
      state, 'A', [second], 'later Arcane effect', false,
    )).toBeNull();
  });

  test('a simultaneous batch uses the highest qualifying Arcane value as its threshold', () => {
    const state = readyGame();
    inject(state, 'A', 'mystics-sacrifice-recovery', 'asset', 'assetBank');
    const five = inject(state, 'A', 'mystics-necromancy', 'five', 'hand');
    const four = inject(state, 'A', 'neutral-arcane-knowledge', 'four', 'hand');
    moveHandToGraveyard(state, 'A', five);
    moveHandToGraveyard(state, 'A', four);

    const continuation = recordV070ReembodimentQualifyingTransition(
      state, 'A', [four, five], 'batch effect', false,
    );
    expect(continuation).toMatchObject({
      triggeringArcaneInstanceId: five,
      triggerValue: 5,
    });
    openV070ReembodimentRecovery(state, continuation!);
    expect(state.pendingReembodimentRecovery?.candidateInstanceIds).toContain(four);
  });

  test('recovery identities are private and the optional recovery may be declined', () => {
    const state = readyGame();
    const asset = inject(state, 'A', 'mystics-sacrifice-recovery', 'asset', 'assetBank');
    const trigger = inject(state, 'A', 'mystics-paths-of-shadow', 'trigger', 'hand');
    const lower = inject(state, 'A', 'neutral-supplies', 'lower', 'graveyard');
    moveHandToGraveyard(state, 'A', trigger);
    const continuation = recordV070ReembodimentQualifyingTransition(
      state, 'A', [trigger], 'test effect', false,
    );
    openV070ReembodimentRecovery(state, continuation!);

    expect(viewV070GameForPlayer(state, 'A').pendingReembodimentRecovery)
      .toMatchObject({ assetInstanceId: asset, candidateInstanceIds: [lower] });
    expect(viewV070GameForPlayer(state, 'B').pendingReembodimentRecovery)
      .not.toHaveProperty('candidateInstanceIds');

    resolveV070ReembodimentRecovery(state, 'A');
    expect(state.players.A.zones.graveyard)
      .toEqual(expect.arrayContaining([trigger, lower]));
    expect(state.pendingReembodimentRecovery ?? null).toBeNull();
  });

  test('an Arcane Action reaching its normal Action destination does not trigger Reembodiment', () => {
    let state = toDenouement(readyGame());
    inject(state, 'A', 'mystics-sacrifice-recovery', 'asset', 'assetBank');
    const source = inject(state, 'A', 'neutral-arcane-knowledge', 'source', 'hand');
    const target = inject(state, 'A', 'neutral-supplies', 'target', 'graveyard');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card', playerId: 'A', cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_recovery_action_target', playerId: 'A', targetInstanceId: target,
    });

    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.reembodimentFirstQualifyingTurn?.A).toBeUndefined();
    expect(state.pendingReembodimentRecovery ?? null).toBeNull();
  });

  test('Rite of Blood opens recovery only after its controlled Arcane cost resolves', () => {
    let state = toDenouement(readyGame());
    inject(state, 'A', 'mystics-sacrifice-recovery', 'asset', 'assetBank');
    const cost = inject(state, 'A', 'mystics-fate-s-toll', 'blood', 'hand');
    const lower = inject(state, 'A', 'neutral-supplies', 'recover', 'graveyard');

    state = reduceV070TurnAction(state, {
      type: 'mystics_begin_rite',
      playerId: 'A',
      riteId: 'blood',
      bloodCostInstanceId: cost,
    });
    expect(state.players.A.mystics?.rites.blood.status).toBe('begun');
    expect(state.pendingReembodimentRecovery).toMatchObject({
      triggeringArcaneInstanceId: cost,
      sourceLabel: 'Rite of Blood',
      candidateInstanceIds: expect.arrayContaining([lower]),
    });
    expect(() => reduceV070TurnAction(state, {
      type: 'pass_denouement', playerId: 'A',
    })).toThrow(/Reembodiment recovery/);
  });

  test('reactive Subversion pass lets Reembodiment apply', () => {
    let state = toDenouement(readyGame());
    const reembodiment = inject(
      state, 'A', 'mystics-sacrifice-recovery', 'asset', 'assetBank',
    );
    inject(state, 'B', 'intelligence-subversion', 'subversion', 'assetBank');
    const cost = inject(state, 'A', 'mystics-fate-s-toll', 'blood', 'hand');
    inject(state, 'A', 'neutral-supplies', 'recover', 'graveyard');

    state = reduceV070TurnAction(state, {
      type: 'mystics_begin_rite',
      playerId: 'A',
      riteId: 'blood',
      bloodCostInstanceId: cost,
    });
    expect(state.pendingSubversionTurnAsset).toMatchObject({
      playerId: 'B',
      targetOwner: 'A',
      targetAssetInstanceId: reembodiment,
      effectLabel: 'Reembodiment',
    });
    expect(state.pendingReembodimentRecovery ?? null).toBeNull();

    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset', playerId: 'B', choice: 'pass',
    });
    expect(state.pendingSubversionTurnAsset ?? null).toBeNull();
    expect(state.pendingReembodimentRecovery?.playerId).toBe('A');
  });

  test('reactive Subversion use negates Reembodiment and discards its physical Asset', () => {
    let state = toDenouement(readyGame());
    const reembodiment = inject(
      state, 'A', 'mystics-sacrifice-recovery', 'asset', 'assetBank',
    );
    const subversion = inject(
      state, 'B', 'intelligence-subversion', 'subversion', 'assetBank',
    );
    const cost = inject(state, 'A', 'mystics-fate-s-toll', 'blood', 'hand');
    inject(state, 'A', 'neutral-supplies', 'recover', 'graveyard');

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
    expect(state.pendingReembodimentRecovery ?? null).toBeNull();
  });

  test('battle Transmutation opens Reembodiment without advancing the battle stage', () => {
    let state = activeBattle();
    state.players.A.mystics!.rites.echoes.status = 'completed';
    state.players.A.mystics!.rites.echoes.completedTurn = state.turnNumber - 1;
    state.players.A.mystics!.rites.blood.status = 'completed';
    state.players.A.mystics!.rites.blood.completedTurn = state.turnNumber - 1;
    inject(state, 'A', 'mystics-sacrifice-recovery', 'asset', 'assetBank');
    const sacrifice = inject(
      state, 'A', 'mystics-paths-of-shadow', 'transmutation', 'hand',
    );
    const lower = inject(
      state, 'A', 'neutral-supplies', 'recover', 'graveyard',
    );

    for (const action of [
      { type: 'proceed_from_onset', playerId: 'A' },
      { type: 'set_gambit', playerId: 'A' },
      { type: 'set_gambit', playerId: 'B' },
      { type: 'reveal_gambits', playerId: 'A' },
      { type: 'choose_tactic', playerId: 'A' },
      { type: 'choose_tactic', playerId: 'B' },
      { type: 'reveal_tactics', playerId: 'A' },
    ] as const) {
      state = reduceV070BattleAction(state, action);
    }
    expect(state.battleRuntime?.stage).toBe('outcome');

    state = reduceV070BattleAction(state, {
      type: 'use_mystic_transmutation',
      playerId: 'A',
      cardInstanceId: sacrifice,
    });
    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(3);
    expect(state.pendingReembodimentRecovery).toMatchObject({
      triggeringArcaneInstanceId: sacrifice,
      candidateInstanceIds: expect.arrayContaining([lower]),
      duringBattle: true,
    });
  });
});
