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
    gameId: 'gambit-control-test',
    seed: 'gambit-control-seed',
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

describe('v0.7.0 Diplomat Gambit control', () => {
  test('Neutral Observers forces the opponent to choose first and exposes their Gambit face up', () => {
    let state = activeBattle();
    const observers = relocateCard(state, 'A', 'diplomats-neutral-observers', 'assetBank');
    const opponentGambit = relocateCard(state, 'B', 'neutral-new-recruits', 'hand');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_neutral_observers',
      playerId: 'A',
      cardInstanceId: observers,
    });

    expect(state.players.A.zones.assetBank).not.toContain(observers);
    expect(state.players.A.zones.discardPile).toContain(observers);
    expect(state.battleRuntime?.gambitOrderOverride).toEqual({
      source: 'neutral_observers',
      firstPlayer: 'B',
      secondPlayer: 'A',
      nextPlayer: 'B',
      firstCommitmentFaceUp: true,
    });

    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });

    expect(() => reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    })).toThrow(/B must make the next Gambit choice/);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: opponentGambit,
    });
    expect(state.battleRuntime?.participants.B.gambit).toEqual(expect.objectContaining({
      instanceId: opponentGambit,
      faceUp: true,
    }));
    expect(state.battleRuntime?.gambitOrderOverride?.nextPlayer).toBe('A');

    const diplomatView = viewV070GameForPlayer(state, 'A');
    expect(diplomatView.battleRuntime?.gambitOrderOverride?.nextPlayer).toBe('A');
    expect(diplomatView.battleRuntime?.participants.B.gambit).toEqual({
      instanceId: opponentGambit,
      cardId: 'neutral-new-recruits',
    });

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('reveal_gambits');

    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
  });

  test('Trade Concessions battle effect draws the opponent one card and gives its owner +2 Battle Total', () => {
    let state = activeBattle();
    const trade = relocateCard(state, 'A', 'diplomats-trade-concessions', 'hand');
    const opponentHandBefore = state.players.B.zones.hand.length;

    state = reduceV070BattleAction(state, { type: 'pass_terms', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: trade,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.players.B.zones.hand.length).toBe(opponentHandBefore + 1);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
    expect(state.events.some(event =>
      event.type === 'battle_card_effect_applied'
      && (event.payload as { cardId?: string })?.cardId === 'diplomats-trade-concessions'
    )).toBe(true);
  });
});
