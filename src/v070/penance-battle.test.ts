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
    gameId: 'penance-battle',
    seed: 'penance-battle-seed',
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
  const instanceId = `penance-${owner}-${suffix}`;
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

describe('v0.7.0 Penance battle effect', () => {
  test('opponent may put one eligible Hand card in their Graveyard', () => {
    let state = startBattle();
    const penance = injectCard(
      state,
      'A',
      'inquisition-penance',
      'graveyard',
    );
    const payment = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'payment',
    );
    state.players.A.zones.hand.push(penance);
    state.players.B.zones.hand = [payment];

    state = revealGambits(setGambits(state, penance));

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'penance',
        owner: 'A',
        opponent: 'B',
        sourceInstanceId: penance,
        candidateInstanceIds: [payment],
      }),
    );
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/Penance/);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_penance_battle',
      playerId: 'A',
      choice: 'graveyard',
      cardInstanceId: payment,
    })).toThrow(/opponent targeted by Penance/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_penance_battle',
      playerId: 'B',
      choice: 'graveyard',
      cardInstanceId: payment,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.B.zones.hand).not.toContain(payment);
    expect(state.players.B.zones.graveyard).toContain(payment);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
  });

  test('opponent may choose to give the Penance owner +1 Battle Total', () => {
    let state = startBattle();
    const penance = injectCard(
      state,
      'A',
      'inquisition-penance',
      'battle-total',
    );
    const payment = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'battle-total-payment',
    );
    state.players.A.zones.hand.push(penance);
    state.players.B.zones.hand = [payment];

    state = revealGambits(setGambits(state, penance));
    state = reduceV070BattleAction(state, {
      type: 'resolve_penance_battle',
      playerId: 'B',
      choice: 'battle_total',
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.B.zones.hand).toContain(payment);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.events.some(event =>
      event.type === 'penance_battle_total_gained'
      && (event.payload as { reason?: string }).reason === 'opponent_chose_battle_total'
    )).toBe(true);
  });

  test('empty opposing Hand gives +1 Battle Total immediately', () => {
    let state = startBattle();
    const penance = injectCard(
      state,
      'A',
      'inquisition-penance',
      'empty-hand',
    );
    state.players.A.zones.hand.push(penance);
    state.players.B.zones.hand = [];

    state = revealGambits(setGambits(state, penance));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.events.some(event =>
      event.type === 'penance_battle_total_gained'
      && (event.payload as { reason?: string }).reason === 'opponent_hand_empty'
    )).toBe(true);
  });

  test('a card added after Penance took effect cannot satisfy the Hand-card choice', () => {
    let state = startBattle();
    const penance = injectCard(
      state,
      'A',
      'inquisition-penance',
      'snapshot',
    );
    const original = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'snapshot-original',
    );
    const later = injectCard(
      state,
      'B',
      'neutral-stand-ground',
      'snapshot-later',
    );
    state.players.A.zones.hand.push(penance);
    state.players.B.zones.hand = [original];

    state = revealGambits(setGambits(state, penance));
    state.players.B.zones.hand.push(later);

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_penance_battle',
      playerId: 'B',
      choice: 'graveyard',
      cardInstanceId: later,
    })).toThrow(/eligible when its battle effect took effect/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_penance_battle',
      playerId: 'B',
      choice: 'graveyard',
      cardInstanceId: original,
    });
    expect(state.players.B.zones.hand).toContain(later);
    expect(state.players.B.zones.graveyard).toContain(original);
  });

  test('works as a Tactic and blocks dice until the opponent resolves Penance', () => {
    let state = startBattle();
    state.players.B.zones.hand = [];
    state = revealGambits(setGambits(state));

    const penance = injectCard(
      state,
      'A',
      'inquisition-penance',
      'tactic',
    );
    const payment = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'tactic-payment',
    );
    state.battleRuntime!.participants.A.reserve.push(penance);
    state.players.B.zones.hand.push(payment);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: penance,
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
    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('penance');
    expect(() => reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    })).toThrow(/Penance/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_penance_battle',
      playerId: 'B',
      choice: 'graveyard',
      cardInstanceId: payment,
    });
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
    expect(state.players.B.zones.graveyard).toContain(payment);
  });
});
