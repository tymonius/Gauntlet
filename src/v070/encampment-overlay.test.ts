import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { advanceV070FrontLine } from './front-line';
import { placeV070OverlayFromBattle } from './overlays';
import {
  V070_ENCAMPMENT_OVERLAY_TEXT,
  resolveV070EncampmentEndOfTurn,
} from './encampment';
import { v070CanonicalContent } from '../content/v070';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'encampment-overlay-test',
    seed: 'encampment-overlay-seed',
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
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function attachOverlay(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  territoryPosition: number,
  suffix: string,
): string {
  const instanceId = `encampment-overlay-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  placeV070OverlayFromBattle(
    state,
    owner,
    instanceId,
    territoryPosition,
    'Encampment Overlay test',
  );
  return instanceId;
}

function prepareACleanupOnOwnTerritory(state: V070GameState): void {
  const territory = state.board.find(space => space.controller === 'A')!;
  state.players.A.position = territory.position;
  state.board.forEach(space => {
    if (space.occupant === 'A') space.occupant = null;
  });
  territory.occupant = 'A';
  state.turnState!.phase = 'cleanup';
}

describe('v0.7.0 Encampment persistent Overlay', () => {
  test('locks the Overlay implementation to released v0.7.0 text', () => {
    const card = v070CanonicalContent.cardsById.get('military-encampment');
    expect(card?.effects.find(effect => effect.label === 'Overlay')?.text)
      .toBe(V070_ENCAMPMENT_OVERLAY_TEXT);
  });

  test('active Encampment grants +1 Command at the end of its owner turn while they occupy and control that Territory', () => {
    const state = readyGame();
    prepareACleanupOnOwnTerritory(state);
    const position = state.players.A.position!;
    const encampment = attachOverlay(
      state,
      'A',
      'military-encampment',
      position,
      'active',
    );

    expect(state.players.A.military?.command).toBe(0);
    expect(resolveV070EncampmentEndOfTurn(state, 'A')).toBe(true);
    expect(state.players.A.military?.command).toBe(1);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'encampment_end_turn_resolved',
      actor: 'A',
      payload: expect.objectContaining({
        overlayInstanceId: encampment,
        command: 1,
      }),
    }));
  });

  test('complete_cleanup applies Encampment before the turn passes and respects the Command maximum', () => {
    let state = readyGame();
    prepareACleanupOnOwnTerritory(state);
    const position = state.players.A.position!;
    attachOverlay(
      state,
      'A',
      'military-encampment',
      position,
      'cleanup',
    );
    state.players.A.military!.command = 2;

    state = reduceV070TurnAction(state, {
      type: 'complete_cleanup',
      playerId: 'A',
    });

    expect(state.players.A.military?.command).toBe(2);
    expect(state.activePlayer).toBe('B');
    expect(state.turnNumber).toBe(2);
    expect(state.events.some(event =>
      event.type === 'encampment_end_turn_resolved'
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'military_command_gained'
      && event.actor === 'A'
      && (event.payload as { amount?: number }).amount === 0
    )).toBe(true);
  });

  test('Encampment does not apply while covered or when its owner no longer both occupies and controls the Territory', () => {
    const covered = readyGame();
    prepareACleanupOnOwnTerritory(covered);
    const position = covered.players.A.position!;
    attachOverlay(
      covered,
      'A',
      'military-encampment',
      position,
      'covered-encampment',
    );
    attachOverlay(
      covered,
      'A',
      'neutral-landslide',
      position,
      'cover',
    );

    expect(resolveV070EncampmentEndOfTurn(covered, 'A')).toBe(false);
    expect(covered.players.A.military?.command).toBe(0);

    const uncontrolled = readyGame();
    prepareACleanupOnOwnTerritory(uncontrolled);
    const uncontrolledPosition = uncontrolled.players.A.position!;
    const territory = uncontrolled.board.find(
      space => space.position === uncontrolledPosition,
    )!;
    attachOverlay(
      uncontrolled,
      'A',
      'military-encampment',
      uncontrolledPosition,
      'uncontrolled',
    );
    territory.controller = 'B';

    expect(resolveV070EncampmentEndOfTurn(uncontrolled, 'A')).toBe(false);
    expect(uncontrolled.players.A.military?.command).toBe(0);
  });

  test('an exposed Encampment enters its owner Graveyard when another player gains control through the shared Front Line procedure', () => {
    const state = readyGame();
    const target = [...state.board]
      .reverse()
      .find(territory => territory.controller !== 'B')!;
    expect(target.controller).toBe('A');
    const encampment = attachOverlay(
      state,
      'A',
      'military-encampment',
      target.position,
      'control-loss',
    );

    const result = advanceV070FrontLine(
      state,
      'B',
      1,
      'Encampment control-loss test',
    );

    expect(result.captures).toHaveLength(1);
    expect(target.controller).toBe('B');
    expect(state.overlays.some(overlay =>
      overlay.instanceId === encampment
    )).toBe(false);
    expect(state.players.A.zones.graveyard).toContain(encampment);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'overlay_graveyarded',
      actor: 'A',
      payload: expect.objectContaining({
        instanceId: encampment,
        reason: expect.stringContaining('opposing control gain'),
      }),
    }));
  });
});
