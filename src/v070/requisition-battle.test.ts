import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'requisition-battle',
    seed: 'requisition-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-general-forward-doctrine',
      },
      B: {
        name: 'Bravo',
        starterDeckId: 'military-commandant-holdfast',
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
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';

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
    choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `requisition-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function setGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aGambit,
  });
  return reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bGambit,
  });
}

function revealGambits(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

describe('v0.7.0 Requisition battle effect', () => {
  test('may discard one eligible Asset to gain Advantage', () => {
    let state = startBattle();
    const requisition = injectCard(
      state,
      'A',
      'neutral-requisition',
      'use',
    );
    const asset = injectCard(
      state,
      'A',
      'neutral-resourcefulness',
      'asset',
    );
    state.players.A.zones.hand.push(requisition);
    state.players.A.zones.assetBank.push(asset);

    state = revealGambits(setGambits(state, requisition));

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'requisition',
        owner: 'A',
        sourceInstanceId: requisition,
        candidateInstanceIds: [asset],
      }),
    );
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/Requisition/);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_requisition_battle',
      playerId: 'B',
      assetInstanceId: asset,
    })).toThrow(/Requisition owner/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_requisition_battle',
      playerId: 'A',
      assetInstanceId: asset,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.A.zones.assetBank).not.toContain(asset);
    expect(state.players.A.zones.discardPile).toContain(asset);
    expect(state.battleRuntime?.participants.A.advantage).toBe(1);
  });

  test('may decline without discarding an Asset or gaining Advantage', () => {
    let state = startBattle();
    const requisition = injectCard(
      state,
      'A',
      'neutral-requisition',
      'decline',
    );
    const asset = injectCard(
      state,
      'A',
      'neutral-resourcefulness',
      'decline-asset',
    );
    state.players.A.zones.hand.push(requisition);
    state.players.A.zones.assetBank.push(asset);

    state = revealGambits(setGambits(state, requisition));
    state = reduceV070BattleAction(state, {
      type: 'resolve_requisition_battle',
      playerId: 'A',
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.A.zones.assetBank).toContain(asset);
    expect(state.players.A.zones.discardPile).not.toContain(asset);
    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
    expect(state.events.some(event =>
      event.type === 'requisition_battle_declined'
    )).toBe(true);
  });

  test('opens no choice when the owner has no discardable Asset', () => {
    let state = startBattle();
    const requisition = injectCard(
      state,
      'A',
      'neutral-requisition',
      'no-asset',
    );
    state.players.A.zones.hand.push(requisition);

    state = revealGambits(setGambits(state, requisition));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
    expect(state.events.some(event =>
      event.type === 'requisition_battle_choice_unavailable'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId === requisition
    )).toBe(true);
  });

  test('works as a Tactic and blocks dice until the optional choice resolves', () => {
    let state = startBattle();
    state = revealGambits(setGambits(state));

    const requisition = injectCard(
      state,
      'A',
      'neutral-requisition',
      'tactic',
    );
    const asset = injectCard(
      state,
      'A',
      'neutral-resourcefulness',
      'tactic-asset',
    );
    state.battleRuntime!.participants.A.reserve.push(requisition);
    state.players.A.zones.assetBank.push(asset);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: requisition,
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
    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('requisition');
    expect(() => reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    })).toThrow(/Requisition/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_requisition_battle',
      playerId: 'A',
      assetInstanceId: asset,
    });
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.advantage).toBe(1);
  });
});
