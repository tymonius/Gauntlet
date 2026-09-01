import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { placeV070OverlayFromHand } from './overlays';
import { reduceV070TurnAction } from './turn-engine';

const militaryA = 'military-general-forward-doctrine';
const militaryB = 'military-commandant-holdfast';

function atRuinedStorehouse(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'ruined-storehouse',
    seed: 'ruined-storehouse-seed',
    players: {
      A: { name: 'Active', starterDeckId: militaryA },
      B: { name: 'Opponent', starterDeckId: militaryB },
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

  const territory = state.board.find(
    candidate => candidate.position === state.players.A.position,
  )!;
  territory.territoryId = 'territory-ruined-storehouse';
  territory.blank = false;

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  expect(state.turnState?.phase).toBe('draw');
  return state;
}

function injectDiscardTop(
  state: V070GameState,
  cardId: string,
  suffix: string,
): string {
  const instanceId = `ruined-A-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'A',
  };
  state.players.A.zones.discardPile.push(instanceId);
  return instanceId;
}

function injectHand(
  state: V070GameState,
  cardId: string,
  suffix: string,
): string {
  const instanceId = `ruined-A-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

describe('v0.7.0 Ruined Storehouse Territory', () => {
  test('may draw the top Discard card instead of the normal Draw-Pile card', () => {
    let state = atRuinedStorehouse();
    const expected = injectDiscardTop(
      state,
      'neutral-rallying-cry',
      'top',
    );
    const drawPileBefore = [...state.players.A.zones.drawPile];
    const handBefore = state.players.A.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'A',
      useRuinedStorehouse: true,
    });

    expect(state.turnState?.phase).toBe('opening');
    expect(state.players.A.zones.hand).toContain(expected);
    expect(state.players.A.zones.hand).toHaveLength(handBefore + 1);
    expect(state.players.A.zones.discardPile).not.toContain(expected);
    expect(state.players.A.zones.drawPile).toEqual(drawPileBefore);
    expect(state.events.some(event =>
      event.type === 'turn_card_drawn'
      && (event.payload as { source?: string })?.source ===
        'ruined_storehouse'
    )).toBe(true);

    expect(() => reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'A',
      useRuinedStorehouse: true,
    })).toThrow(/Expected draw phase/);
  });

  test('may decline Ruined Storehouse and take the normal turn draw', () => {
    let state = atRuinedStorehouse();
    const topDiscard = injectDiscardTop(
      state,
      'neutral-rallying-cry',
      'declined-top',
    );
    const drawTop = state.players.A.zones.drawPile.at(-1)!;

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'A',
    });

    expect(state.players.A.zones.hand).toContain(drawTop);
    expect(state.players.A.zones.discardPile).toContain(topDiscard);
    expect(state.events.some(event =>
      event.type === 'turn_card_drawn'
      && (event.payload as { source?: string })?.source ===
        'draw_pile'
    )).toBe(true);
  });

  test('cannot choose the replacement when the Discard Pile is empty', () => {
    const state = atRuinedStorehouse();
    state.players.A.zones.discardPile = [];

    expect(() => reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'A',
      useRuinedStorehouse: true,
    })).toThrow(/Discard Pile is nonempty/);

    expect(state.turnState?.phase).toBe('draw');
  });

  test('an exposed Overlay supersedes the Ruined Storehouse replacement', () => {
    const state = atRuinedStorehouse();
    injectDiscardTop(
      state,
      'neutral-rallying-cry',
      'overlay-top',
    );
    const overlay = injectHand(
      state,
      'mystics-circle-of-bones',
      'overlay',
    );
    placeV070OverlayFromHand(
      state,
      'A',
      overlay,
      state.players.A.position!,
      'Ruined Storehouse test',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'A',
      useRuinedStorehouse: true,
    })).toThrow(/printed effect is active/);
  });
});
