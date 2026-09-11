import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  V070_COUNTERWORKS_BATTLE_TEXT,
  V070_COUNTERWORKS_ID,
  pendingV070CounterworksBattleChoice,
  v070CounterworksOverlayInactiveDuringBattle,
} from './counterworks-battle';
import {
  activeV070Overlay,
  placeV070OverlayFromBattle,
} from './overlays';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import { viewV070GameForPlayer } from './views';

function startBattle(existingOverlayCardId?: string): {
  state: V070GameState;
  existingOverlayInstanceId?: string;
} {
  let state = createV070StarterGame({
    gameId: 'counterworks-battle',
    seed: 'counterworks-battle-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: 'military-general-forward-doctrine' },
      B: { name: 'Bravo', starterDeckId: 'military-commandant-holdfast' },
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
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
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

  let existingOverlayInstanceId: string | undefined;
  if (existingOverlayCardId) {
    existingOverlayInstanceId = injectCard(
      state,
      'B',
      existingOverlayCardId,
      'existing-overlay',
    );
    state.overlays.push({
      instanceId: existingOverlayInstanceId,
      owner: 'B',
      territoryInstanceId: state.board[3].territoryInstanceId,
      placedTurn: state.turnNumber,
      sequence: state.nextOverlaySequence,
    });
    state.nextOverlaySequence += 1;
  }

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
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset', playerId: 'A',
  });
  return { state, existingOverlayInstanceId };
}

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `counterworks-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function revealCounterworks(
  state: V070GameState,
  opposingGambitId?: string,
): { state: V070GameState; source: string; opposing?: string } {
  const source = injectCard(
    state,
    'A',
    V070_COUNTERWORKS_ID,
    'source',
  );
  state.players.A.zones.hand.push(source);
  let opposing: string | undefined;
  if (opposingGambitId) {
    opposing = injectCard(state, 'B', opposingGambitId, 'opposing-gambit');
    state.players.B.zones.hand.push(opposing);
  }

  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A', cardInstanceId: source,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B', cardInstanceId: opposing,
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });
  return { state, source, opposing };
}

function finishBattle(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics', playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'A', values: [6],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'B', values: [1],
  });
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath', playerId: 'A',
  });
}

describe('v0.7.0 Counterworks battle effect', () => {
  test('locks the handler to the released Overlay text', () => {
    const card = v070CanonicalContent.cardsById.get(V070_COUNTERWORKS_ID);
    expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_COUNTERWORKS_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_COUNTERWORKS_ID)?.expectedText)
      .toBe(V070_COUNTERWORKS_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_COUNTERWORKS_ID);
  });

  test('opens at the normal reveal stage and exposes the two released modes', () => {
    let { state } = startBattle('diplomats-demilitarized-zone');
    ({ state } = revealCounterworks(state));

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(pendingV070CounterworksBattleChoice(state)).toEqual(
      expect.objectContaining({
        owner: 'A',
        territoryPosition: 3,
        candidateOverlayInstanceIds: expect.any(Array),
      }),
    );
    expect(viewV070GameForPlayer(state, 'A').pendingCounterworksBattle)
      .toEqual(expect.objectContaining({
        playerId: 'A',
        canSuppressOverlay: true,
        canPreventNextOpposingOverlay: true,
      }));
  });

  test('makes one existing Overlay inactive without uncovering or removing it', () => {
    let { state, existingOverlayInstanceId } = startBattle(
      'diplomats-demilitarized-zone',
    );
    ({ state } = revealCounterworks(state));

    state = reduceV070BattleAction(state, {
      type: 'resolve_counterworks_battle',
      playerId: 'A',
      mode: 'suppress_overlay',
      overlayInstanceId: existingOverlayInstanceId!,
    });

    expect(v070CounterworksOverlayInactiveDuringBattle(
      state,
      existingOverlayInstanceId!,
    )).toBe(true);
    expect(activeV070Overlay(state, 3)?.instanceId)
      .toBe(existingOverlayInstanceId);
    expect(state.overlays.some(overlay =>
      overlay.instanceId === existingOverlayInstanceId
    )).toBe(true);

    state = finishBattle(state);
    expect(state.overlays.some(overlay =>
      overlay.instanceId === existingOverlayInstanceId
    )).toBe(true);
  });

  test('can arm prevention even when no Overlay is currently on the Territory', () => {
    let { state } = startBattle();
    ({ state } = revealCounterworks(state));
    const pending = pendingV070CounterworksBattleChoice(state);
    expect(pending?.candidateOverlayInstanceIds).toEqual([]);

    state = reduceV070BattleAction(state, {
      type: 'resolve_counterworks_battle',
      playerId: 'A',
      mode: 'prevent_next_opposing_overlay',
    });
    expect(state.battleRuntime?.counterworksOverlayPlacementPreventions)
      .toHaveLength(1);
  });

  test('prevents and discards the next opposing Overlay that would be placed there', () => {
    let { state } = startBattle();
    ({ state } = revealCounterworks(state));
    state = reduceV070BattleAction(state, {
      type: 'resolve_counterworks_battle',
      playerId: 'A',
      mode: 'prevent_next_opposing_overlay',
    });

    const circle = injectCard(
      state,
      'B',
      'mystics-circle-of-bones',
      'prevented-circle',
    );
    const placed = placeV070OverlayFromBattle(
      state,
      'B',
      circle,
      3,
      'Counterworks regression',
    );

    expect(placed).toBeNull();
    expect(state.overlays.some(overlay => overlay.instanceId === circle))
      .toBe(false);
    expect(state.players.B.zones.discardPile).toContain(circle);
    expect(state.battleRuntime?.counterworksOverlayPlacementPreventions)
      .toEqual([]);
  });

  test('does not consume prevention on a friendly Overlay and only stops one opposing placement', () => {
    let { state } = startBattle();
    ({ state } = revealCounterworks(state));
    state = reduceV070BattleAction(state, {
      type: 'resolve_counterworks_battle',
      playerId: 'A',
      mode: 'prevent_next_opposing_overlay',
    });

    const friendly = injectCard(
      state,
      'A',
      'mystics-circle-of-bones',
      'friendly-circle',
    );
    expect(placeV070OverlayFromBattle(
      state,
      'A',
      friendly,
      3,
      'friendly Overlay',
    )?.instanceId).toBe(friendly);
    expect(state.battleRuntime?.counterworksOverlayPlacementPreventions)
      .toHaveLength(1);

    const firstOpposing = injectCard(
      state,
      'B',
      'mystics-spirit-hollow',
      'first-opposing',
    );
    expect(placeV070OverlayFromBattle(
      state,
      'B',
      firstOpposing,
      3,
      'first opposing Overlay',
    )).toBeNull();

    const secondOpposing = injectCard(
      state,
      'B',
      'mystics-circle-of-bones',
      'second-opposing',
    );
    expect(placeV070OverlayFromBattle(
      state,
      'B',
      secondOpposing,
      3,
      'second opposing Overlay',
    )?.instanceId).toBe(secondOpposing);
  });

  test('rejects suppression mode when there was no existing Overlay to choose', () => {
    let { state } = startBattle();
    ({ state } = revealCounterworks(state));

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_counterworks_battle',
      playerId: 'A',
      mode: 'suppress_overlay',
      overlayInstanceId: 'not-an-overlay',
    })).toThrow(/Overlay/i);
  });
});
