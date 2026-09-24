import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  reduceV070TurnAction,
  CURRENT_EXECUTABLE_ACTION_CARD_IDS,
} from './turn-engine';
import { currentCanonicalContent } from '../content/current-game';
import {
  CURRENT_FOG_OF_WAR_ACTION_TEXT,
  V070_FOG_OF_WAR_ID,
  V070_FOG_OF_WAR_OVERLAY_TEXT,
} from './fog-of-war';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'overlay-action-placement',
    seed: 'overlay-action-placement-seed',
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

function currentPosition(state: V070GameState): number {
  const position = state.players.B.position;
  if (position === null) throw new Error('B should have a current Territory.');
  return position;
}

describe('v0.7.0 local Territory Overlay Action placement', () => {
  test('Encampment places only on the Territory its owner currently occupies and controls', () => {
    let state = openingForB();
    const position = currentPosition(state);
    const territory = state.board.find(item => item.position === position)!;
    expect(territory.occupant).toBe('B');
    expect(territory.controller).toBe('B');

    const source = injectHandCard(state, 'B', 'military-encampment', 'encampment');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'territory_overlay_target',
      playerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'Encampment',
    });
    const pending = state.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Encampment'
    );
    expect((pending?.payload as { territoryPositions?: number[] })?.territoryPositions)
      .toEqual([position]);

    state = reduceV070TurnAction(state, {
      type: 'choose_territory_overlay_target',
      playerId: 'B',
      territoryPosition: position,
    });

    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId: source,
      owner: 'B',
      territoryInstanceId: territory.territoryInstanceId,
    }));
    expect(state.players.B.zones.discardPile).not.toContain(source);
    expect(state.pendingActionCard).toBeNull();
  });

  test('Encampment is rejected before spending an Action if the current Territory is not controlled', () => {
    const state = openingForB();
    const position = currentPosition(state);
    const territory = state.board.find(item => item.position === position)!;
    territory.controller = 'A';

    const source = injectHandCard(state, 'B', 'military-encampment', 'invalid');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/occupied and controlled by you/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test.each([
    ['mystics-circle-of-bones', 'Circle of Bones'],
    ['mystics-nature-s-altar', "Nature's Altar"],
    ['mystics-spirit-hollow', 'Spirit Hollow'],
  ])('%s may target the current or an adjacent Territory', (cardId, purpose) => {
    let state = openingForB();
    const position = currentPosition(state);
    const adjacent = state.board.find(
      territory => Math.abs(territory.position - position) === 1,
    );
    expect(adjacent).toBeDefined();

    const source = injectHandCard(state, 'B', cardId, 'local');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const pending = state.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === purpose
    );
    const positions = (pending?.payload as { territoryPositions?: number[] })
      ?.territoryPositions ?? [];
    expect(positions).toContain(position);
    expect(positions).toContain(adjacent!.position);
    expect(positions.every(candidate => Math.abs(candidate - position) <= 1)).toBe(true);

    state = reduceV070TurnAction(state, {
      type: 'choose_territory_overlay_target',
      playerId: 'B',
      territoryPosition: adjacent!.position,
    });

    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId: source,
      owner: 'B',
      territoryInstanceId: adjacent!.territoryInstanceId,
    }));
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
  });

  test('a Mystics local Overlay cannot be placed on a non-adjacent Territory', () => {
    let state = openingForB();
    const position = currentPosition(state);
    const remote = state.board.find(
      territory => Math.abs(territory.position - position) > 1,
    );
    expect(remote).toBeDefined();

    const source = injectHandCard(
      state,
      'B',
      'mystics-circle-of-bones',
      'remote',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_territory_overlay_target',
      playerId: 'B',
      territoryPosition: remote!.position,
    })).toThrow(/current Territory or an adjacent Territory/);

    expect(state.pendingActionCard?.instanceId).toBe(source);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'territory_overlay_target',
      sourceActionInstanceId: source,
    }));
  });
});

describe('current v0.7.2 Bombardment Action placement', () => {
  test('binds the normalized Action heading to current authority and the executable registry', () => {
    const bombardment =
      currentCanonicalContent.cardsById.get('neutral-bombardment');
    expect(bombardment?.effects.find(effect => effect.label === 'Action')?.text)
      .toBe('The first enemy-controlled Territory ahead of you without an Overlay.');
    expect(CURRENT_EXECUTABLE_ACTION_CARD_IDS).toContain('neutral-bombardment');
  });

  test('places automatically on the first enemy-controlled Territory ahead without an Overlay', () => {
    let state = openingForB();
    const current = currentPosition(state);
    const ahead = state.board
      .filter(territory => territory.position < current)
      .sort((left, right) => right.position - left.position);
    expect(ahead.length).toBeGreaterThanOrEqual(2);

    for (const territory of state.board) territory.controller = 'B';
    ahead[0].controller = 'A';
    ahead[1].controller = 'A';

    const source = injectHandCard(
      state,
      'B',
      'neutral-bombardment',
      'bombardment-first',
    );
    const actionsBefore = state.turnState!.actionsAvailable;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId: source,
      owner: 'B',
      territoryInstanceId: ahead[0].territoryInstanceId,
    }));
    expect(state.turnState?.actionsAvailable).toBe(actionsBefore - 1);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.players.B.zones.discardPile).not.toContain(source);
  });

  test('skips a nearer enemy Territory that already has an Overlay', () => {
    let state = openingForB();
    const current = currentPosition(state);
    const ahead = state.board
      .filter(territory => territory.position < current)
      .sort((left, right) => right.position - left.position);
    expect(ahead.length).toBeGreaterThanOrEqual(2);

    for (const territory of state.board) territory.controller = 'B';
    ahead[0].controller = 'A';
    ahead[1].controller = 'A';

    const covering = injectHandCard(
      state,
      'A',
      'mystics-circle-of-bones',
      'existing-overlay',
    );
    state.players.A.zones.hand =
      state.players.A.zones.hand.filter(instanceId => instanceId !== covering);
    state.overlays.push({
      instanceId: covering,
      owner: 'A',
      territoryInstanceId: ahead[0].territoryInstanceId,
      placedTurn: state.turnNumber,
      sequence: state.nextOverlaySequence,
    });
    state.nextOverlaySequence += 1;

    const source = injectHandCard(
      state,
      'B',
      'neutral-bombardment',
      'bombardment-skip',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId: source,
      territoryInstanceId: ahead[1].territoryInstanceId,
    }));
    expect(state.overlays).not.toContainEqual(expect.objectContaining({
      instanceId: source,
      territoryInstanceId: ahead[0].territoryInstanceId,
    }));
  });

  test('rejects Bombardment before spending an Action when no legal target exists', () => {
    const state = openingForB();
    const current = currentPosition(state);
    for (const territory of state.board) {
      if (territory.position < current) territory.controller = 'B';
    }

    const source = injectHandCard(
      state,
      'B',
      'neutral-bombardment',
      'bombardment-no-target',
    );
    const actionsBefore = state.turnState!.actionsAvailable;

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(
      /enemy-controlled Territory ahead without an Overlay/,
    );

    expect(state.turnState?.actionsAvailable).toBe(actionsBefore);
    expect(state.players.B.zones.hand).toContain(source);
    expect(state.pendingActionCard).toBeNull();
  });
});

describe('current v0.7.2 Fog of War Action placement', () => {
  test('binds the normalized Action and unchanged Overlay text to current authority', () => {
    const fog = currentCanonicalContent.cardsById.get(V070_FOG_OF_WAR_ID);
    expect(CURRENT_FOG_OF_WAR_ACTION_TEXT).toBe('Any Territory.');
    expect(fog?.effects.find(effect => effect.label === 'Action')?.text)
      .toBe(CURRENT_FOG_OF_WAR_ACTION_TEXT);
    expect(fog?.effects.find(effect => effect.label === 'Overlay')?.text)
      .toBe(V070_FOG_OF_WAR_OVERLAY_TEXT);
    expect(CURRENT_EXECUTABLE_ACTION_CARD_IDS).toContain(V070_FOG_OF_WAR_ID);
  });

  test('may target any Territory in the Gauntlet', () => {
    let state = openingForB();
    const current = currentPosition(state);
    const remote = state.board.find(
      territory => Math.abs(territory.position - current) > 1,
    );
    expect(remote).toBeDefined();

    const source = injectHandCard(
      state,
      'B',
      V070_FOG_OF_WAR_ID,
      'fog-anywhere',
    );
    const actionsBefore = state.turnState!.actionsAvailable;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'territory_overlay_target',
      playerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'Fog of War',
    });
    const pending = state.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Fog of War'
    );
    expect((pending?.payload as { territoryPositions?: number[] })
      ?.territoryPositions)
      .toEqual(state.board.map(territory => territory.position));

    state = reduceV070TurnAction(state, {
      type: 'choose_territory_overlay_target',
      playerId: 'B',
      territoryPosition: remote!.position,
    });

    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId: source,
      owner: 'B',
      territoryInstanceId: remote!.territoryInstanceId,
    }));
    expect(state.turnState?.actionsAvailable).toBe(actionsBefore - 1);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
  });
});

