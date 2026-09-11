import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import { v070BattleRevealEffectsPending } from './battle-effects';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'reveal-resume',
    seed: 'reveal-resume-seed',
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
  const instanceId = `reveal-resume-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function setGambits(
  state: V070GameState,
  aGambit: string,
  bGambit: string,
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

describe('v0.7.0 resumable reveal effect ordering', () => {
  test('a defender core effect does not apply before the attacker resolves Dark Omens', () => {
    let state = startBattle();
    const darkOmens = injectCard(
      state,
      'A',
      'mystics-dark-omens',
      'dark-omens',
    );
    const gunboat = injectCard(
      state,
      'B',
      'diplomats-gunboat-diplomacy',
      'gunboat',
    );
    const darkDraw = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'dark-draw',
    );
    state.players.A.zones.hand.push(darkOmens);
    state.players.B.zones.hand.push(gunboat);

    state = setGambits(state, darkOmens, gunboat);
    state.players.A.zones.drawPile.unshift(darkDraw);
    state = revealGambits(state);

    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('dark_omens');
    expect(v070BattleRevealEffectsPending(state)).toBe(true);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(state.events.some(event =>
      event.type === 'battle_card_effect_applied'
      && (event.payload as { instanceId?: string }).instanceId === gunboat
    )).toBe(false);

    state = reduceV070BattleAction(state, {
      type: 'resolve_dark_omens_battle',
      playerId: 'A',
      use: false,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(v070BattleRevealEffectsPending(state)).toBe(false);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(2);
    expect(state.events.some(event =>
      event.type === 'battle_card_effect_applied'
      && (event.payload as { instanceId?: string }).instanceId === gunboat
    )).toBe(true);
  });

  test('Tariffs resolves before a later defender reveal modifier applies', () => {
    let state = startBattle();
    const tariffs = injectCard(
      state,
      'A',
      'financiers-tariffs',
      'tariffs',
    );
    const recruits = injectCard(
      state,
      'B',
      'neutral-new-recruits',
      'recruits',
    );
    const payment = injectCard(
      state,
      'B',
      'neutral-stand-ground',
      'payment',
    );
    state.players.A.zones.hand.push(tariffs);
    state.players.B.zones.hand.push(recruits, payment);

    state = revealGambits(setGambits(state, tariffs, recruits));

    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('tariffs');
    expect(v070BattleRevealEffectsPending(state)).toBe(true);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);

    state = reduceV070BattleAction(state, {
      type: 'resolve_tariffs_battle',
      playerId: 'B',
      cardInstanceId: payment,
    });

    expect(state.players.B.zones.discardPile).toContain(payment);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    expect(v070BattleRevealEffectsPending(state)).toBe(false);
  });
});
