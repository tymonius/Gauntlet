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
    gameId: 'speculation-battle',
    seed: 'speculation-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'financiers-banker-sound-investment',
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
  const instanceId = `speculation-${owner}-${suffix}`;
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

function chooseNoTactics(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

describe('v0.7.0 Speculation battle effect', () => {
  test('attacker may spend 1 Capital and gains +2 Capital in the Aftermath after winning', () => {
    let state = startBattle();
    const speculation = injectCard(
      state,
      'A',
      'financiers-speculation',
      'win',
    );
    state.players.A.zones.hand.push(speculation);
    const capitalBefore = state.players.A.financiers!.capital;

    state = revealGambits(setGambits(state, speculation));

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'speculation',
        owner: 'A',
        sourceInstanceId: speculation,
      }),
    );
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/Speculation/);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_speculation_battle',
      playerId: 'B',
      use: true,
    })).toThrow(/Speculation owner/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_speculation_battle',
      playerId: 'A',
      use: true,
    });
    expect(state.players.A.financiers!.capital).toBe(capitalBefore - 1);

    state = chooseNoTactics(state);
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

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.players.A.financiers!.capital).toBe(capitalBefore + 1);
    expect(state.battleRuntime?.speculationAftermathEffects).toEqual([]);
  });

  test('attacker may decline without spending Capital or scheduling an Aftermath effect', () => {
    let state = startBattle();
    const speculation = injectCard(
      state,
      'A',
      'financiers-speculation',
      'decline',
    );
    state.players.A.zones.hand.push(speculation);
    const capitalBefore = state.players.A.financiers!.capital;

    state = revealGambits(setGambits(state, speculation));
    state = reduceV070BattleAction(state, {
      type: 'resolve_speculation_battle',
      playerId: 'A',
      use: false,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.A.financiers!.capital).toBe(capitalBefore);
    expect(state.battleRuntime?.speculationAftermathEffects ?? []).toHaveLength(0);
  });

  test('Speculation has no battle effect when its owner did not initiate the battle', () => {
    let state = startBattle();
    const speculation = injectCard(
      state,
      'B',
      'financiers-speculation',
      'defender',
    );
    state.players.B.zones.hand.push(speculation);

    state = revealGambits(setGambits(state, undefined, speculation));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.events.some(event =>
      event.type === 'speculation_battle_choice_unavailable'
      && (event.payload as { reason?: string }).reason === 'owner_did_not_initiate_battle'
    )).toBe(true);
  });

  test('insufficient Capital makes the optional spend unavailable', () => {
    let state = startBattle();
    state.players.A.financiers!.capital = 0;
    const speculation = injectCard(
      state,
      'A',
      'financiers-speculation',
      'no-capital',
    );
    state.players.A.zones.hand.push(speculation);

    state = revealGambits(setGambits(state, speculation));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.A.financiers!.capital).toBe(0);
    expect(state.events.some(event =>
      event.type === 'speculation_battle_choice_unavailable'
      && (event.payload as { reason?: string }).reason === 'insufficient_capital'
    )).toBe(true);
  });

  test('a paid Speculation Tactic goes to the Graveyard when its owner loses', () => {
    let state = startBattle();
    state = revealGambits(setGambits(state));
    const speculation = injectCard(
      state,
      'A',
      'financiers-speculation',
      'tactic-loss',
    );
    state.battleRuntime!.participants.A.reserve.push(speculation);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: speculation,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('speculation');

    state = reduceV070BattleAction(state, {
      type: 'resolve_speculation_battle',
      playerId: 'A',
      use: true,
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6],
    });

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battleRuntime?.battleCardAftermathDestinationOverrides).toContainEqual(
      expect.objectContaining({
        sourceCardId: 'financiers-speculation',
        playerId: 'A',
        instanceId: speculation,
        destination: 'graveyard',
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.players.A.zones.graveyard).toContain(speculation);
    expect(state.players.A.zones.discardPile).not.toContain(speculation);
  });
});
