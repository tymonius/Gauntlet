import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { v070Conviction } from './inquisition';

const inquisitionStarter = 'inquisition-grand-inquisitor-final-judgment';
const militaryStarter = 'military-commandant-holdfast';

function readyGame(firstPlayer: 'A' | 'B' = 'A'): V070GameState {
  let state = createV070StarterGame({
    gameId: 'inquisition-doctrine',
    seed: `inquisition-doctrine-${firstPlayer}`,
    players: {
      A: { name: 'Inquisition', starterDeckId: inquisitionStarter },
      B: { name: 'Military', starterDeckId: militaryStarter },
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
    value: firstPlayer === 'A' ? 6 : 1,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: firstPlayer === 'B' ? 6 : 1,
  });

  return state;
}

function openingFor(playerId: 'A' | 'B'): V070GameState {
  let state = readyGame(playerId);
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId,
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId,
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function activeBattle(): V070GameState {
  let state = readyGame('A');

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => { space.occupant = null; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].blank = true;

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

  expect(state.battle?.attacker).toBe('A');
  return state;
}

function injectHand(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `doctrine-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function injectBattleReserve(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  if (!state.battleRuntime) {
    throw new Error('Battle runtime required for reserve injection.');
  }
  const instanceId = `doctrine-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.battleRuntime.participants[owner].reserve.push(instanceId);
  return instanceId;
}

describe('v0.7.0 Inquisition doctrine integration', () => {
  test('Blasphemy gains Conviction immediately when the opponent plays an Arcane Action', () => {
    let state = openingFor('B');
    const source = injectHand(
      state,
      'B',
      'mystics-fate-s-toll',
      'arcane-action',
    );
    injectHand(
      state,
      'B',
      'neutral-rallying-cry',
      'payment',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'fates_toll_cost',
      playerId: 'B',
      sourceActionInstanceId: source,
    });

    const played = state.events.find(event =>
      event.type === 'action_card_played'
      && (event.payload as { instanceId?: string })?.instanceId === source
    );
    const blasphemy = state.events.find(event =>
      event.type === 'blasphemy_triggered'
      && (event.payload as { cardId?: string })?.cardId === 'mystics-fate-s-toll'
    );
    const conviction = state.events.find(event =>
      event.type === 'conviction_changed'
      && (event.payload as { reason?: string })?.reason
        === 'Blasphemy: opposing Arcane Action played'
    );

    expect(played).toBeDefined();
    expect(blasphemy).toBeDefined();
    expect(conviction).toBeDefined();
    expect(played!.index).toBeLessThan(conviction!.index);
  });

  test('Blasphemy gains Conviction when an opposing Arcane Gambit is revealed, even if its effect then halts as unsupported', () => {
    let state = activeBattle();
    const arcane = injectHand(
      state,
      'B',
      'mystics-fate-s-toll',
      'arcane-gambit',
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
      cardInstanceId: arcane,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.battleRuntime?.stage).toBe('halted');

    const revealed = state.events.find(event =>
      event.type === 'gambit_revealed'
      && (event.payload as { instanceId?: string })?.instanceId === arcane
    );
    const conviction = state.events.find(event =>
      event.type === 'conviction_changed'
      && (event.payload as { reason?: string })?.reason
        === 'Blasphemy: opposing Arcane gambit revealed'
    );
    const halted = state.events.find(event =>
      event.type === 'battle_halted_unsupported_effect'
    );

    expect(revealed).toBeDefined();
    expect(conviction).toBeDefined();
    expect(halted).toBeDefined();
    expect(revealed!.index).toBeLessThan(conviction!.index);
    expect(conviction!.index).toBeLessThan(halted!.index);
  });

  test('Condemnation sends an opposing Tactic to Graveyard and that qualifying Aftermath grants normal Conviction', () => {
    let state = activeBattle();

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

    const tactic = injectBattleReserve(
      state,
      'B',
      'neutral-rallying-cry',
      'condemned-tactic',
    );

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
      cardInstanceId: tactic,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.B.zones.graveyard).toContain(tactic);
    expect(state.players.B.zones.discardPile).not.toContain(tactic);
    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.players.A.inquisition?.normalConvictionGainTurn)
      .toBe(state.turnNumber);

    const condemnation = state.events.find(event =>
      event.type === 'condemnation_applied'
      && (event.payload as { instanceId?: string })?.instanceId === tactic
    );
    const normalGain = state.events.find(event =>
      event.type === 'inquisition_aftermath_conviction_triggered'
    );
    const completed = state.events.find(event =>
      event.type === 'battle_aftermath_complete'
    );

    expect(condemnation).toBeDefined();
    expect(normalGain).toBeDefined();
    expect(completed).toBeDefined();
    expect(condemnation!.index).toBeLessThan(normalGain!.index);
    expect(normalGain!.index).toBeLessThan(completed!.index);
  });

  test('Condemnation does not redirect the Inquisition player’s own Tactic', () => {
    let state = activeBattle();

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

    const tactic = injectBattleReserve(
      state,
      'A',
      'neutral-rallying-cry',
      'own-tactic',
    );

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: tactic,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.discardPile).toContain(tactic);
    expect(state.players.A.zones.graveyard).not.toContain(tactic);
    expect(state.events.some(event =>
      event.type === 'condemnation_applied'
      && (event.payload as { instanceId?: string })?.instanceId === tactic
    )).toBe(false);
  });
});
