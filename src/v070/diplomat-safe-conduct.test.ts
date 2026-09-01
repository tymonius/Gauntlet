import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
  type V070PlayerZones,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { viewV070GameForPlayer } from './views';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function activeBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'safe-conduct-test',
    seed: 'safe-conduct-seed',
    players: {
      A: { name: 'Diplomat', starterDeckId: diplomatStarter },
      B: { name: 'Opponent', starterDeckId: militaryStarter },
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
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'A', value: 6 });
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'B', value: 1 });

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => { space.occupant = null; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].blank = true;

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function relocateCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  target: keyof Pick<V070PlayerZones, 'hand' | 'discardPile' | 'graveyard' | 'assetBank'>,
): string {
  const instance = Object.values(state.cardInstances)
    .find(candidate => candidate.owner === playerId && candidate.cardId === cardId);
  if (!instance) throw new Error(`Missing ${playerId} card ${cardId}`);

  const player = state.players[playerId];
  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(instance.instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones[target].push(instance.instanceId);
  return instance.instanceId;
}

function refuseAndLose(
  state: V070GameState,
  proposalId: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'offer_terms',
    playerId: 'A',
    proposalId,
  });
  state = reduceV070BattleAction(state, {
    type: 'respond_to_terms',
    playerId: 'B',
    response: 'refuse',
  });
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
  state = reduceV070BattleAction(state, {
    type: 'use_leverage',
    playerId: 'A',
    bonus: 0,
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [1],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [6],
  });
}

describe('v0.7.0 Safe Conduct', () => {
  test('replaces a refused-Terms loss with withdrawal, returns the Stake, and produces no winner', () => {
    let state = activeBattle();
    const safeConduct = relocateCard(state, 'A', 'diplomats-safe-conduct', 'assetBank');

    state = refuseAndLose(state, 'open-channels');

    expect(state.battleRuntime?.stage).toBe('loss_replacement');
    expect(state.battleRuntime?.pendingOutcome).toEqual(expect.objectContaining({
      winner: 'B',
      loser: 'A',
    }));
    expect(state.players.A.diplomats?.influence).toBe(0);

    const view = viewV070GameForPlayer(state, 'A');
    expect(view.battleRuntime?.pendingOutcome).toEqual(expect.objectContaining({
      winner: 'B',
      loser: 'A',
    }));

    state = reduceV070BattleAction(state, {
      type: 'use_safe_conduct',
      playerId: 'A',
      cardInstanceId: safeConduct,
    });

    expect(state.players.A.zones.assetBank).not.toContain(safeConduct);
    expect(state.players.A.zones.discardPile).toContain(safeConduct);
    expect(state.players.A.diplomats?.influence).toBe(1);
    expect(state.battle).toEqual(expect.objectContaining({
      stage: 'ended',
      winner: null,
      loser: null,
      endReason: 'withdrawal',
      positions: { A: 2, B: 3 },
      completeNonResultAftermath: true,
      clearCommittedCards: true,
    }));
    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battleRuntime?.pendingOutcome).toBeNull();
    expect(state.battleRuntime?.terms.stage).toBe('closed');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battle).toBeNull();
    expect(state.turnState?.phase).toBe('denouement');
  });

  test('passing the loss replacement applies the original battle loss normally', () => {
    let state = activeBattle();
    const safeConduct = relocateCard(state, 'A', 'diplomats-safe-conduct', 'assetBank');

    state = refuseAndLose(state, 'open-channels');
    state = reduceV070BattleAction(state, {
      type: 'pass_loss_replacement',
      playerId: 'A',
    });

    expect(state.players.A.zones.assetBank).toContain(safeConduct);
    expect(state.players.A.diplomats?.influence).toBe(0);
    expect(state.battle).toEqual(expect.objectContaining({
      stage: 'resolved',
      winner: 'B',
      loser: 'A',
      positions: { A: 2, B: 3 },
    }));
    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.events.some(event =>
      event.type === 'battle_outcome'
      && (event.payload as { winner?: string })?.winner === 'B'
    )).toBe(true);
  });

  test('a no-winner Safe Conduct path still preserves Rebuilding Pact’s refused Aftermath choice', () => {
    let state = activeBattle();
    const safeConduct = relocateCard(state, 'A', 'diplomats-safe-conduct', 'assetBank');
    relocateCard(state, 'A', 'diplomats-good-faith', 'hand');

    state = refuseAndLose(state, 'rebuilding-pact');
    state = reduceV070BattleAction(state, {
      type: 'use_safe_conduct',
      playerId: 'A',
      cardInstanceId: safeConduct,
    });

    expect(state.players.A.diplomats?.influence).toBe(1);
    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battleRuntime?.terms.stage).toBe('proposal_choice');
    expect(state.battleRuntime?.terms.proposalChoice).toEqual(expect.objectContaining({
      kind: 'rebuilding_pact_refused',
      playerId: 'A',
      optional: true,
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'A',
    });
    expect(state.battleRuntime?.terms.stage).toBe('closed');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battle).toBeNull();
  });
});
