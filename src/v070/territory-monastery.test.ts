import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070BattleAction } from './battle-engine';
import { reduceV070TurnAction } from './turn-engine';
import { placeV070OverlayFromHand } from './overlays';

const militaryA = 'military-general-forward-doctrine';
const militaryB = 'military-commandant-holdfast';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'territory-monastery',
    seed: 'territory-monastery-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: militaryA },
      B: { name: 'Bravo', starterDeckId: militaryB },
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
  return state;
}

function inject(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'graveyard',
  suffix: string,
): string {
  const instanceId = `monastery-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: playerId,
  };
  state.players[playerId].zones[zone].push(instanceId);
  return instanceId;
}

function openingAtControlledMonastery(): V070GameState {
  let state = readyGame();
  const position = state.players.A.position!;
  const territory = state.board[position]!;
  territory.territoryId = 'territory-monastery';
  territory.controller = 'A';
  territory.occupant = 'A';
  territory.blank = false;

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function battleAtMonastery(blank = false): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  for (const territory of state.board) territory.occupant = null;
  state.board[2]!.occupant = 'A';
  state.board[2]!.blank = true;
  state.board[3]!.occupant = 'B';
  state.board[3]!.territoryId = 'territory-monastery';
  state.board[3]!.controller = 'B';
  state.board[3]!.blank = blank;

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
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  return state;
}

describe('v0.7.0 Monastery Territory', () => {
  test('while its controller is there, cards cannot leave either Graveyard', () => {
    let state = openingAtControlledMonastery();
    const action = inject(
      state,
      'A',
      'neutral-arcane-knowledge',
      'hand',
      'action',
    );
    inject(
      state,
      'A',
      'neutral-rallying-cry',
      'graveyard',
      'target',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: action,
    })).toThrow(/Monastery prevents cards from leaving either player's Graveyard/);

    state.board[state.players.A.position!]!.occupant = null;
    state.players.A.position = 1;
    state.board[1]!.occupant = 'A';

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: action,
    });
    expect(state.pendingActionEffectChoice).toMatchObject({
      kind: 'arcane_knowledge_target',
      playerId: 'A',
    });
  });

  test('an exposed Overlay supersedes the printed Graveyard lock', () => {
    let state = openingAtControlledMonastery();
    const position = state.players.A.position!;
    const overlay = inject(
      state,
      'A',
      'mystics-circle-of-bones',
      'hand',
      'overlay',
    );
    placeV070OverlayFromHand(
      state,
      'A',
      overlay,
      position,
      'Monastery test',
    );

    const action = inject(
      state,
      'A',
      'neutral-arcane-knowledge',
      'hand',
      'action-overlay',
    );
    inject(
      state,
      'A',
      'neutral-rallying-cry',
      'graveyard',
      'target-overlay',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: action,
    });
    expect(state.pendingActionEffectChoice?.kind).toBe(
      'arcane_knowledge_target',
    );
  });

  test('Arcane battle cards have no effect here instead of halting as unsupported', () => {
    let state = battleAtMonastery();
    const arcane = inject(
      state,
      'A',
      'neutral-arcane-knowledge',
      'hand',
      'battle',
    );

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: arcane,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.unsupportedEffects).toHaveLength(0);
    expect(state.events.some(event =>
      event.type === 'battle_card_effect_suppressed'
      && (event.payload as { reason?: string })?.reason === 'Monastery'
    )).toBe(true);
  });

  test('without the printed Monastery effect, the same unsupported Arcane card still halts explicitly', () => {
    let state = battleAtMonastery(true);
    const arcane = inject(
      state,
      'A',
      'neutral-arcane-knowledge',
      'hand',
      'blank-battle',
    );

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: arcane,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('halted');
    expect(state.battleRuntime?.unsupportedEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: 'neutral-arcane-knowledge',
          role: 'gambit',
        }),
      ]),
    );
  });
});
