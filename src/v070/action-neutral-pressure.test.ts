import { describe, expect, test } from 'vitest';
import {
  appendV070Event,
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'neutral-pressure-actions',
    seed: 'neutral-pressure-actions-seed',
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
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'A',
    value: 1,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 6,
  });
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'B' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'B' });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function injectHandCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner: playerId };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function markCurrentTurnCapture(
  state: V070GameState,
  playerId: 'A' | 'B',
): void {
  appendV070Event(state, {
    type: 'territory_captured',
    actor: playerId,
    visibility: 'public',
    payload: {
      territoryId: 'test-territory',
      source: 'test-current-turn-capture',
    },
  });
}

describe('v0.7.0 Neutral pressure Actions', () => {
  test('Consolidation cannot be played without a Territory captured this turn', () => {
    const state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-consolidation', 'consolidation');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/captured a Territory this turn/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(0);
  });

  test('Consolidation draws two after a current-turn capture and then discards its source', () => {
    let state = openingForB();
    markCurrentTurnCapture(state, 'B');
    const source = injectHandCard(state, 'B', 'neutral-consolidation', 'consolidation');
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).not.toContain(source);
    expect(state.players.B.zones.hand.length).toBe(handBefore + 1);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string })?.purpose === 'Consolidation'
      && (event.payload as { count?: number })?.count === 2
    )).toBe(true);
  });

  test('a capture before the current turn-start boundary does not qualify Consolidation', () => {
    const state = openingForB();
    markCurrentTurnCapture(state, 'B');
    state.turnNumber += 1;
    appendV070Event(state, {
      type: 'turn_started',
      actor: 'B',
      visibility: 'public',
      payload: {
        turnNumber: state.turnNumber,
        phase: state.turnState?.phase,
      },
    });
    const source = injectHandCard(state, 'B', 'neutral-consolidation', 'old-capture');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/captured a Territory this turn/);
  });

  test('Disruption cannot be played when the opponent has no Hand card to discard', () => {
    const state = openingForB();
    state.players.A.zones.drawPile.push(...state.players.A.zones.hand.splice(0));
    const source = injectHandCard(state, 'B', 'neutral-disruption', 'disruption');

    expect(state.players.A.zones.hand).toHaveLength(0);
    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/opponent’s Hand/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('Disruption deterministically discards one opposing Hand card to public Discard', () => {
    const original = openingForB();
    injectHandCard(original, 'A', 'neutral-rallying-cry', 'extra-a');
    const source = injectHandCard(original, 'B', 'neutral-disruption', 'disruption');

    const first = reduceV070TurnAction(original, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    const second = reduceV070TurnAction(original, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const firstEvent = first.events.find(event =>
      event.type === 'random_hand_card_discarded'
      && (event.payload as { purpose?: string })?.purpose === 'Disruption'
    );
    const secondEvent = second.events.find(event =>
      event.type === 'random_hand_card_discarded'
      && (event.payload as { purpose?: string })?.purpose === 'Disruption'
    );
    const selected = (firstEvent?.payload as { instanceId?: string } | undefined)?.instanceId;

    expect(selected).toBeTruthy();
    expect((secondEvent?.payload as { instanceId?: string } | undefined)?.instanceId).toBe(selected);
    expect(first.players.A.zones.hand).not.toContain(selected);
    expect(first.players.A.zones.discardPile).toContain(selected);
    expect(first.players.B.zones.discardPile).toContain(source);
    expect(first.pendingActionCard).toBeNull();
  });

  test('Disruption reveals only the randomly discarded card through its public event', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-disruption', 'visibility');
    const opponentHandBefore = [...state.players.A.zones.hand];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const event = state.events.find(candidate => candidate.type === 'random_hand_card_discarded');
    expect(event?.visibility).toBe('public');
    const payload = event?.payload as {
      instanceId?: string;
      cardId?: string;
      hand?: unknown;
      cardInstanceIds?: unknown;
    } | undefined;
    expect(payload?.instanceId).toBeTruthy();
    expect(payload?.cardId).toBeTruthy();
    expect(payload?.hand).toBeUndefined();
    expect(payload?.cardInstanceIds).toBeUndefined();
    expect(opponentHandBefore).toContain(payload?.instanceId);
  });
});
