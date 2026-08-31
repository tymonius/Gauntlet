import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const mysticsStarter = 'mystics-alchemist-first-principles';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'necromancy-action',
    seed: 'necromancy-action-seed',
    players: {
      A: { name: 'A', starterDeckId: diplomatStarter },
      B: { name: 'B', starterDeckId: mysticsStarter },
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

function inject(
  state: V070GameState,
  cardId: string,
  zone: 'hand' | 'graveyard' | 'drawPile',
  suffix: string,
): string {
  const instanceId = `test-B-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'B',
  };
  state.players.B.zones[zone].push(instanceId);
  return instanceId;
}

describe('v0.7.0 Necromancy Action', () => {
  test('opens a choice between recycle and reclaim with public reclaim candidates', () => {
    let state = openingForB();
    const source = inject(state, 'mystics-necromancy', 'hand', 'source');
    const candidate = inject(state, 'neutral-rallying-cry', 'graveyard', 'candidate');
    inject(state, 'mystics-necromancy', 'graveyard', 'excluded');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'necromancy_mode',
      playerId: 'B',
      sourceActionInstanceId: source,
      reclaimCandidateInstanceIds: [candidate],
    });
  });

  test('recycle puts Necromancy beneath the Draw Pile, draws one, and grants +1 Action', () => {
    let state = openingForB();
    const source = inject(state, 'mystics-necromancy', 'hand', 'source');
    const nextDraw = inject(state, 'neutral-rallying-cry', 'drawPile', 'next-draw');
    const priorDrawPile = [...state.players.B.zones.drawPile];
    // Keep the injected test card at the actual top.
    state.players.B.zones.drawPile = [
      nextDraw,
      ...priorDrawPile.filter(id => id !== nextDraw),
    ];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_necromancy_action',
      playerId: 'B',
      mode: 'recycle',
    });

    expect(state.players.B.zones.hand).toContain(nextDraw);
    expect(state.players.B.zones.drawPile.at(-1)).toBe(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.phaseActionGrants.opening).toBe(1);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.events.some(event =>
      event.type === 'action_card_resolved'
      && (event.payload as { instanceId?: string; destination?: string })?.instanceId === source
      && (event.payload as { destination?: string })?.destination === 'draw_bottom'
    )).toBe(true);
  });

  test('recycle can draw Necromancy itself when the Draw Pile was empty', () => {
    let state = openingForB();
    state.players.B.zones.drawPile = [];
    const source = inject(state, 'mystics-necromancy', 'hand', 'source');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_necromancy_action',
      playerId: 'B',
      mode: 'recycle',
    });

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.players.B.zones.drawPile).not.toContain(source);
  });

  test('reclaim moves the entire current Hand to Graveyard, then returns up to three chosen non-Necromancy cards', () => {
    let state = openingForB();
    state.players.B.zones.hand = [];
    const source = inject(state, 'mystics-necromancy', 'hand', 'source');
    const hand1 = inject(state, 'neutral-fealty', 'hand', 'hand-1');
    const hand2 = inject(state, 'neutral-supplies', 'hand', 'hand-2');
    const reclaim1 = inject(state, 'neutral-rallying-cry', 'graveyard', 'reclaim-1');
    const reclaim2 = inject(state, 'neutral-tactical-planning', 'graveyard', 'reclaim-2');
    const leave = inject(state, 'neutral-forced-march', 'graveyard', 'leave');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_necromancy_action',
      playerId: 'B',
      mode: 'reclaim',
      targetInstanceIds: [reclaim1, reclaim2],
    });

    expect(state.players.B.zones.graveyard).toContain(hand1);
    expect(state.players.B.zones.graveyard).toContain(hand2);
    expect(state.players.B.zones.graveyard).toContain(leave);
    expect(state.players.B.zones.graveyard).toContain(source);
    expect(state.players.B.zones.graveyard).not.toContain(reclaim1);
    expect(state.players.B.zones.graveyard).not.toContain(reclaim2);
    expect(state.players.B.zones.hand).toEqual(
      expect.arrayContaining([reclaim1, reclaim2]),
    );
    expect(state.pendingActionCard).toBeNull();
  });

  test('reclaim may choose zero cards', () => {
    let state = openingForB();
    state.players.B.zones.hand = [];
    const source = inject(state, 'mystics-necromancy', 'hand', 'source');
    const handCard = inject(state, 'neutral-fealty', 'hand', 'hand-card');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_necromancy_action',
      playerId: 'B',
      mode: 'reclaim',
      targetInstanceIds: [],
    });

    expect(state.players.B.zones.hand).toEqual([]);
    expect(state.players.B.zones.graveyard).toEqual(
      expect.arrayContaining([handCard, source]),
    );
  });

  test('reclaim rejects duplicate, over-limit, stale, and Necromancy targets while leaving the choice pending', () => {
    let state = openingForB();
    state.players.B.zones.hand = [];
    const source = inject(state, 'mystics-necromancy', 'hand', 'source');
    const a = inject(state, 'neutral-rallying-cry', 'graveyard', 'a');
    const b = inject(state, 'neutral-fealty', 'graveyard', 'b');
    const c = inject(state, 'neutral-supplies', 'graveyard', 'c');
    const d = inject(state, 'neutral-forced-march', 'graveyard', 'd');
    const necro = inject(state, 'mystics-necromancy', 'graveyard', 'necro');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_necromancy_action',
      playerId: 'B',
      mode: 'reclaim',
      targetInstanceIds: [a, a],
    })).toThrow(/different cards/);

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_necromancy_action',
      playerId: 'B',
      mode: 'reclaim',
      targetInstanceIds: [a, b, c, d],
    })).toThrow(/up to three/);

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_necromancy_action',
      playerId: 'B',
      mode: 'reclaim',
      targetInstanceIds: [necro],
    })).toThrow(/non-Necromancy cards/);

    const index = state.players.B.zones.graveyard.indexOf(a);
    state.players.B.zones.graveyard.splice(index, 1);
    state.players.B.zones.discardPile.push(a);

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_necromancy_action',
      playerId: 'B',
      mode: 'reclaim',
      targetInstanceIds: [a],
    })).toThrow(/currently in your Graveyard/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'necromancy_mode',
      sourceActionInstanceId: source,
    }));
  });
});
