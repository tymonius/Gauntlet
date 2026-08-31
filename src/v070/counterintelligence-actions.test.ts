import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  isV070AssetFaceUp,
  turnV070AssetFaceDownUntilPlayerNextTurn,
} from './asset-face-state';
import { v070BindingsForHost } from './bindings';

const intelligenceStarter = 'intelligence-ranger-field-operations';
const inquisitionStarter = 'inquisition-grand-inquisitor-final-judgment';
const militaryStarter = 'military-commandant-holdfast';

function openingForA(
  starterA: string,
  starterB: string = militaryStarter,
): V070GameState {
  let state = createV070StarterGame({
    gameId: `counterintelligence-${starterA}`,
    seed: `counterintelligence-${starterA}-seed`,
    players: {
      A: { name: 'A', starterDeckId: starterA },
      B: { name: 'B', starterDeckId: starterB },
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

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'assetBank',
  suffix: string,
): string {
  const instanceId = `counter-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function bankCounterintelligence(state: V070GameState): string {
  return inject(
    state,
    'B',
    'neutral-counterintelligence',
    'assetBank',
    'protection',
  );
}

describe('v0.7.0 Counterintelligence opposing Hand-reveal prevention', () => {
  test('blocks the entire Assassins reveal/discard effect', () => {
    let state = openingForA(intelligenceStarter);
    const protectedCard = state.players.B.zones.hand[0];
    const counter = bankCounterintelligence(state);
    const source = inject(
      state,
      'A',
      'intelligence-assassins',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(isV070AssetFaceUp(state, counter)).toBe(true);
    expect(state.players.B.zones.hand).toContain(protectedCard);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.events.some(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Assassins'
    )).toBe(false);
    expect(state.events.some(event =>
      event.type === 'counterintelligence_prevented_reveal'
      && (event.payload as { purpose?: string })?.purpose === 'Assassins'
    )).toBe(true);
  });

  test('blocks the entire Spies effect, including its draw and forced discard', () => {
    let state = openingForA(intelligenceStarter);
    bankCounterintelligence(state);
    const source = inject(
      state,
      'A',
      'intelligence-spies',
      'hand',
      'source',
    );
    const handBefore = state.players.A.zones.hand.filter(
      instanceId => instanceId !== source,
    );
    const drawPileCountBefore = state.players.A.zones.drawPile.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.players.A.zones.hand).toEqual(handBefore);
    expect(state.players.A.zones.drawPile.length).toBe(drawPileCountBefore);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string })?.purpose === 'Spies'
    )).toBe(false);
  });

  test('blocks Extraordinary Rendition reveal/bind while the source remains banked', () => {
    let state = openingForA(intelligenceStarter);
    const protectedCard = state.players.B.zones.hand[0];
    bankCounterintelligence(state);
    const source = inject(
      state,
      'A',
      'intelligence-extraordinary-rendition',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.players.A.zones.assetBank).toContain(source);
    expect(state.players.B.zones.hand).toContain(protectedCard);
    expect(v070BindingsForHost(state, source)).toEqual([]);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.events.some(event =>
      event.type === 'counterintelligence_prevented_reveal'
      && (event.payload as { purpose?: string })?.purpose
        === 'Extraordinary Rendition'
    )).toBe(true);
  });

  test('blocks the entire Burning at the Stake effect', () => {
    let state = openingForA(inquisitionStarter);
    const protectedCard = state.players.B.zones.hand[0];
    bankCounterintelligence(state);
    const source = inject(
      state,
      'A',
      'inquisition-burning-at-the-stake',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toContain(protectedCard);
    expect(state.players.B.zones.graveyard).not.toContain(protectedCard);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.events.some(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose
        === 'Burning at the Stake'
    )).toBe(false);
  });

  test('a face-down Counterintelligence Asset does not prevent opposing Hand reveals', () => {
    let state = openingForA(intelligenceStarter);
    const counter = bankCounterintelligence(state);
    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: counter,
      changedBy: 'A',
      restoreAtPlayer: 'A',
      reason: 'test face-down suppression',
    });
    const source = inject(
      state,
      'A',
      'intelligence-assassins',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual(
      expect.objectContaining({
        kind: 'opponent_hand_discard_target',
        playerId: 'A',
        opponentId: 'B',
        sourceActionInstanceId: source,
      }),
    );
    expect(state.events.some(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Assassins'
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'counterintelligence_prevented_reveal'
      && (event.payload as { purpose?: string })?.purpose === 'Assassins'
    )).toBe(false);
  });
});
