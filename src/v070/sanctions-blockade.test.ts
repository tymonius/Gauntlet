import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { advanceV070FrontLine } from './front-line';
import {
  activeV070Overlay,
  placeV070OverlayFromHand,
} from './overlays';
import {
  associateV070Sanction,
  expireV070SanctionsAfterAcceptance,
  reduceV070SanctionAction,
  V070_SANCTIONS_BLOCKADE_ID,
} from './sanctions';
import { openV070BlockadeChoicesForPositionChange } from './movement-triggers';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function setupGame(firstPlayer: 'A' | 'B' = 'A'): V070GameState {
  let state = createV070StarterGame({
    gameId: `blockade-test-${firstPlayer}`,
    seed: `blockade-seed-${firstPlayer}`,
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
    value: firstPlayer === 'A' ? 6 : 1,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: firstPlayer === 'B' ? 6 : 1,
  });
}

function syncOccupants(state: V070GameState): void {
  state.board.forEach(territory => { territory.occupant = null; });
  for (const playerId of ['A', 'B'] as const) {
    const position = state.players[playerId].position;
    if (position === null) continue;
    const territory = state.board.find(candidate => candidate.position === position);
    if (territory) territory.occupant = playerId;
  }
}

function activeBattle(): V070GameState {
  let state = setupGame('A');
  state.players.A.position = 2;
  state.players.B.position = 3;
  syncOccupants(state);

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function refusedBattleAtAftermath(): V070GameState {
  let state = activeBattle();
  state = reduceV070BattleAction(state, {
    type: 'offer_terms',
    playerId: 'A',
    proposalId: 'de-escalation',
  });
  state = reduceV070BattleAction(state, {
    type: 'respond_to_terms',
    playerId: 'B',
    response: 'refuse',
  });
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
  state = reduceV070BattleAction(state, {
    type: 'use_leverage',
    playerId: 'A',
    bonus: 0,
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [6],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [1],
  });
}

function movementForB(): V070GameState {
  let state = setupGame('B');
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'B' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'B' });
  return reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'B' });
}

function injectHandCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: playerId,
  };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function placeAssociatedBlockade(
  state: V070GameState,
  position: number,
  suffix = 'blockade',
): string {
  const blockade = injectHandCard(
    state,
    'A',
    V070_SANCTIONS_BLOCKADE_ID,
    suffix,
  );
  placeV070OverlayFromHand(state, 'A', blockade, position, 'test');
  associateV070Sanction(state, {
    instanceId: blockade,
    owner: 'A',
    opponent: 'B',
    kind: 'overlay',
  });
  return blockade;
}

describe('v0.7.0 Sanctions: Blockade', () => {
  test('may be placed during the Aftermath following refusal on a Territory the refusing opponent controls', () => {
    let state = refusedBattleAtAftermath();
    const blockade = injectHandCard(
      state,
      'A',
      V070_SANCTIONS_BLOCKADE_ID,
      'aftermath',
    );
    const target = state.board.find(territory => territory.position === 4)!;

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battleRuntime?.refusedTermsContext).toEqual({
      offerer: 'A',
      opponent: 'B',
    });
    expect(target.controller).toBe('B');

    state = reduceV070BattleAction(state, {
      type: 'use_sanctions_blockade',
      playerId: 'A',
      cardInstanceId: blockade,
      territoryPosition: 4,
    });

    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId: blockade,
      owner: 'A',
      territoryInstanceId: target.territoryInstanceId,
    }));
    expect(state.sanctions).toContainEqual({
      instanceId: blockade,
      owner: 'A',
      opponent: 'B',
      kind: 'overlay',
    });
    expect(activeV070Overlay(state, 4)?.instanceId).toBe(blockade);
  });

  test('rejects Aftermath placement on a Territory not controlled by the refusing opponent', () => {
    const state = refusedBattleAtAftermath();
    const blockade = injectHandCard(
      state,
      'A',
      V070_SANCTIONS_BLOCKADE_ID,
      'invalid-target',
    );

    expect(state.board.find(territory => territory.position === 1)?.controller).toBe('A');
    expect(() => reduceV070BattleAction(state, {
      type: 'use_sanctions_blockade',
      playerId: 'A',
      cardInstanceId: blockade,
      territoryPosition: 1,
    })).toThrow(/controlled by the refusing opponent/);

    expect(state.players.A.zones.hand).toContain(blockade);
    expect(state.overlays.some(overlay => overlay.instanceId === blockade)).toBe(false);
  });

  test('a Blockade placed during Aftermath does not retroactively trigger for the retreat that already occurred', () => {
    let state = refusedBattleAtAftermath();
    const blockade = injectHandCard(
      state,
      'A',
      V070_SANCTIONS_BLOCKADE_ID,
      'retreat-timing',
    );

    // The battle result has already established B's retreat from 3 to 4,
    // although settled player state is synchronized only when Aftermath closes.
    expect(state.players.B.position).toBe(3);
    expect(state.battle?.positions.B).toBe(4);
    expect(state.pendingSanctionChoices).toHaveLength(0);

    state = reduceV070BattleAction(state, {
      type: 'use_sanctions_blockade',
      playerId: 'A',
      cardInstanceId: blockade,
      territoryPosition: 4,
    });
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.B.position).toBe(4);
    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.sanctionTriggerTurns[blockade]).toBeUndefined();
    expect(state.turnState?.phase).toBe('denouement');
  });

  test('leaving an exposed Blockade opens one choice and holds the Movement boundary until it resolves', () => {
    let state = movementForB();
    const blockade = placeAssociatedBlockade(state, 5, 'leave');
    const influenceBefore = state.players.A.diplomats!.influence;

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'advance',
    });

    expect(state.players.B.position).toBe(4);
    expect(state.turnState?.phase).toBe('movement');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
    expect(state.pendingSanctionChoices).toEqual([{
      kind: 'blockade_movement',
      playerId: 'B',
      sanctionInstanceId: blockade,
      territoryInstanceId: state.board[5].territoryInstanceId,
      movement: 'leave',
    }]);

    state = reduceV070SanctionAction(state, {
      type: 'resolve_blockade_choice',
      playerId: 'B',
      sanctionInstanceId: blockade,
      choice: 'influence',
    });

    expect(state.players.A.diplomats?.influence).toBe(influenceBefore + 1);
    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.turnState?.phase).toBe('denouement');
  });

  test('Blockade discard choice removes a different card from the associated opponent Hand', () => {
    let state = movementForB();
    const blockade = placeAssociatedBlockade(state, 5, 'discard');
    const payment = state.players.B.zones.hand[0];

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'advance',
    });
    state = reduceV070SanctionAction(state, {
      type: 'resolve_blockade_choice',
      playerId: 'B',
      sanctionInstanceId: blockade,
      choice: 'discard',
      discardInstanceId: payment,
    });

    expect(state.players.B.zones.hand).not.toContain(payment);
    expect(state.players.B.zones.discardPile).toContain(payment);
    expect(state.events.some(event =>
      event.type === 'blockade_resolved'
      && (event.payload as { choice?: string })?.choice === 'discard'
    )).toBe(true);
  });

  test('battle-initiating movement is paused until the Blockade choice resolves', () => {
    let state = movementForB();
    state.players.A.position = 4;
    state.players.B.position = 5;
    syncOccupants(state);
    const blockade = placeAssociatedBlockade(state, 5, 'battle');

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'advance',
    });

    expect(state.battle).not.toBeNull();
    expect(state.pendingSanctionChoices[0]).toEqual(expect.objectContaining({
      kind: 'blockade_movement',
      sanctionInstanceId: blockade,
      movement: 'leave',
    }));

    expect(() => reduceV070BattleAction(state, {
      type: 'pass_terms',
      playerId: 'A',
    })).toThrow(/pending Sanction movement choice/);

    state = reduceV070SanctionAction(state, {
      type: 'resolve_blockade_choice',
      playerId: 'B',
      sanctionInstanceId: blockade,
      choice: 'influence',
    });

    expect(state.battle).not.toBeNull();
    expect(state.pendingSanctionChoices).toHaveLength(0);

    state = reduceV070BattleAction(state, {
      type: 'pass_terms',
      playerId: 'A',
    });
    expect(state.battleRuntime?.terms.stage).toBe('closed');
  });

  test('each exposed Blockade triggers only the first time each turn for its associated opponent', () => {
    let state = setupGame();
    const blockade = placeAssociatedBlockade(state, 5, 'once');

    expect(openV070BlockadeChoicesForPositionChange(state, 'B', 5, 4)).toBe(1);
    state = reduceV070SanctionAction(state, {
      type: 'resolve_blockade_choice',
      playerId: 'B',
      sanctionInstanceId: blockade,
      choice: 'influence',
    });

    expect(openV070BlockadeChoicesForPositionChange(state, 'B', 4, 5)).toBe(0);
    expect(state.pendingSanctionChoices).toHaveLength(0);

    state.turnNumber += 1;
    expect(openV070BlockadeChoicesForPositionChange(state, 'B', 4, 5)).toBe(1);
    expect(state.pendingSanctionChoices[0]).toEqual(expect.objectContaining({
      sanctionInstanceId: blockade,
      movement: 'enter',
    }));
  });

  test('a covered Blockade is dormant for movement triggers', () => {
    const state = setupGame();
    const blockade = placeAssociatedBlockade(state, 5, 'dormant');
    const landslide = injectHandCard(state, 'A', 'neutral-landslide', 'cover');
    placeV070OverlayFromHand(state, 'A', landslide, 5, 'test cover');

    expect(activeV070Overlay(state, 5)?.instanceId).toBe(landslide);
    expect(openV070BlockadeChoicesForPositionChange(state, 'B', 5, 4)).toBe(0);
    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.sanctions.some(sanction => sanction.instanceId === blockade)).toBe(true);
  });

  test('loss of Territory control removes an associated Blockade even while it is dormant', () => {
    const state = setupGame();
    const target = state.board.find(territory => territory.position === 3)!;
    const blockade = placeAssociatedBlockade(state, 3, 'control-loss');
    const landslide = injectHandCard(state, 'A', 'neutral-landslide', 'cover-control-loss');
    placeV070OverlayFromHand(state, 'A', landslide, 3, 'test cover');

    expect(target.controller).toBe('B');
    expect(activeV070Overlay(state, 3)?.instanceId).toBe(landslide);

    advanceV070FrontLine(state, 'A', 1, 'test_capture');

    expect(target.controller).toBe('A');
    expect(state.overlays.some(overlay => overlay.instanceId === blockade)).toBe(false);
    expect(state.overlays.some(overlay => overlay.instanceId === landslide)).toBe(true);
    expect(state.sanctions.some(sanction => sanction.instanceId === blockade)).toBe(false);
    expect(state.players.A.zones.discardPile).toContain(blockade);
  });

  test('default Sanction expiry removes an Overlay Blockade after the associated opponent accepts later Terms', () => {
    const state = setupGame();
    const blockade = placeAssociatedBlockade(state, 5, 'acceptance');

    expireV070SanctionsAfterAcceptance(state, 'A', 'B');

    expect(state.overlays.some(overlay => overlay.instanceId === blockade)).toBe(false);
    expect(state.sanctions.some(sanction => sanction.instanceId === blockade)).toBe(false);
    expect(state.players.A.zones.discardPile).toContain(blockade);
  });
});
