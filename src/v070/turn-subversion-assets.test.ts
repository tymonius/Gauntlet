import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { bindV070CardFromPlayerZone, v070BindingsForHost } from './bindings';
import { viewV070GameForPlayer } from './views';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const intelligenceStarter = 'intelligence-spymaster-mission-network';

function drawForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'subversion-turn-assets',
    seed: 'subversion-turn-assets-seed',
    players: {
      A: { name: 'A', starterDeckId: diplomatStarter },
      B: { name: 'B', starterDeckId: intelligenceStarter },
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
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'B',
  });
  expect(state.turnState?.phase).toBe('draw');
  return state;
}

function openingForB(): V070GameState {
  let state = drawForB();
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'B',
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
  const instanceId = `test-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function pendingTurnSubversion(state: V070GameState) {
  return state.pendingSubversionTurnAsset ?? null;
}

describe('v0.7.0 turn-time Subversion Asset interruption', () => {
  test('Tariffs skips the normal Draw and leaves the Asset banked', () => {
    let state = drawForB();
    const tariffs = inject(
      state,
      'B',
      'financiers-tariffs',
      'assetBank',
      'tariffs',
    );
    const top = state.players.B.zones.drawPile[0];
    const handCount = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(state.turnState?.phase).toBe('opening');
    expect(state.players.B.zones.hand).toHaveLength(handCount);
    expect(state.players.B.zones.drawPile[0]).toBe(top);
    expect(state.players.B.zones.assetBank).toContain(tariffs);
    expect(state.events.some(event =>
      event.type === 'tariffs_normal_draw_skipped'
    )).toBe(true);
  });

  test('inactive Tariffs does not skip the Draw', () => {
    let state = drawForB();
    const tariffs = inject(
      state,
      'B',
      'financiers-tariffs',
      'assetBank',
      'tariffs',
    );
    state.assetFaceStates.push({
      instanceId: tariffs,
      owner: 'B',
      faceUp: false,
      changedBy: 'A',
      sourceInstanceId: null,
      reason: 'test inactive Tariffs',
      appliedTurn: state.turnNumber,
      restoreAtPlayer: 'B',
    });
    const top = state.players.B.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(state.players.B.zones.hand).toContain(top);
    expect(state.turnState?.phase).toBe('opening');
  });

  test('Margin Loan blocks the normal Draw before Tariffs would apply', () => {
    let state = drawForB();
    const tariffs = inject(
      state,
      'B',
      'financiers-tariffs',
      'assetBank',
      'tariffs',
    );
    const marginLoan = inject(
      state,
      'B',
      'financiers-margin-loan',
      'assetBank',
      'margin-loan',
    );

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(state.turnState?.phase).toBe('opening');
    expect(state.players.B.zones.assetBank).toEqual(
      expect.arrayContaining([tariffs, marginLoan]),
    );
    expect(state.events.some(event =>
      event.type === 'margin_loan_turn_draw_blocked'
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'tariffs_normal_draw_skipped'
    )).toBe(false);
    expect(pendingTurnSubversion(state)).toBeNull();
  });

  test('Subversion may pass Tariffs and the normal Draw remains skipped', () => {
    let state = drawForB();
    const tariffs = inject(
      state,
      'B',
      'financiers-tariffs',
      'assetBank',
      'tariffs',
    );
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'assetBank',
      'subversion',
    );
    const top = state.players.B.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(state.turnState?.phase).toBe('draw');
    expect(pendingTurnSubversion(state)).toMatchObject({
      playerId: 'A',
      targetOwner: 'B',
      targetAssetInstanceId: tariffs,
      effectLabel: 'Tariffs',
      candidateSubversionInstanceIds: [subversion],
      deferredAction: {
        type: 'draw_turn_card',
        playerId: 'B',
      },
    });
    expect(state.players.B.zones.hand).not.toContain(top);

    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'pass',
    });

    expect(pendingTurnSubversion(state)).toBeNull();
    expect(state.turnState?.phase).toBe('opening');
    expect(state.players.B.zones.hand).not.toContain(top);
    expect(state.players.B.zones.assetBank).toContain(tariffs);
    expect(state.players.A.zones.assetBank).toContain(subversion);
  });

  test('Subversion negates Tariffs, discards it, and the deferred Draw occurs', () => {
    let state = drawForB();
    const tariffs = inject(
      state,
      'B',
      'financiers-tariffs',
      'assetBank',
      'tariffs',
    );
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'assetBank',
      'subversion',
    );
    const top = state.players.B.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.turnState?.phase).toBe('opening');
    expect(state.players.B.zones.hand).toContain(top);
    expect(state.players.B.zones.discardPile).toContain(tariffs);
    expect(state.players.B.zones.assetBank).not.toContain(tariffs);
    expect(state.players.A.zones.graveyard).toContain(subversion);
    expect(state.players.A.zones.assetBank).not.toContain(subversion);
    expect(pendingTurnSubversion(state)).toBeNull();
  });

  test('Sleeper Network pays its Action before Subversion answers and resumes after a pass', () => {
    let state = openingForB();
    const sleeper = inject(
      state,
      'B',
      'intelligence-sleeper-network',
      'assetBank',
      'sleeper',
    );
    const bound = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'bound',
    );
    bindV070CardFromPlayerZone(state, {
      hostId: sleeper,
      owner: 'B',
      cardInstanceId: bound,
      sourceZone: 'hand',
      faceUp: false,
      purpose: 'Sleeper Network',
    });
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'assetBank',
      'subversion',
    );

    state = reduceV070TurnAction(state, {
      type: 'use_sleeper_network_asset',
      playerId: 'B',
      assetInstanceId: sleeper,
    });

    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.players.B.zones.assetBank).toContain(sleeper);
    expect(v070BindingsForHost(state, sleeper)).toEqual([
      expect.objectContaining({
        cardInstanceId: bound,
        faceUp: false,
      }),
    ]);
    expect(pendingTurnSubversion(state)).toMatchObject({
      playerId: 'A',
      targetOwner: 'B',
      targetAssetInstanceId: sleeper,
      effectLabel: 'Sleeper Network activation',
      candidateSubversionInstanceIds: [subversion],
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'pass',
    });

    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.players.B.zones.graveyard).toContain(sleeper);
    expect(state.players.B.zones.assetBank).not.toContain(sleeper);
    expect(state.pendingSleeperNetworkChoice).toMatchObject({
      kind: 'bound_action_queue',
      playerId: 'B',
      hostInstanceId: sleeper,
      mode: 'activate',
      playedCount: 0,
    });
    expect(v070BindingsForHost(state, sleeper)).toEqual([
      expect.objectContaining({
        cardInstanceId: bound,
        faceUp: true,
      }),
    ]);
  });

  test('Subversion negates Sleeper Network without refunding the Action or firing Removed', () => {
    let state = openingForB();
    const sleeper = inject(
      state,
      'B',
      'intelligence-sleeper-network',
      'assetBank',
      'sleeper',
    );
    const bound = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'bound',
    );
    bindV070CardFromPlayerZone(state, {
      hostId: sleeper,
      owner: 'B',
      cardInstanceId: bound,
      sourceZone: 'hand',
      faceUp: false,
      purpose: 'Sleeper Network',
    });
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'assetBank',
      'subversion',
    );

    state = reduceV070TurnAction(state, {
      type: 'use_sleeper_network_asset',
      playerId: 'B',
      assetInstanceId: sleeper,
    });
    expect(state.turnState?.actionsAvailable).toBe(0);

    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.players.B.zones.discardPile).toEqual(
      expect.arrayContaining([sleeper, bound]),
    );
    expect(state.players.B.zones.graveyard).not.toContain(sleeper);
    expect(v070BindingsForHost(state, sleeper)).toEqual([]);
    expect(state.pendingSleeperNetworkChoice).toBeNull();
    expect(state.players.A.zones.graveyard).toContain(subversion);
    expect(state.events.some(event =>
      event.type === 'sleeper_network_revealed'
    )).toBe(false);
  });

  test('blocks unrelated turn actions while the Subversion response is pending', () => {
    let state = drawForB();
    inject(
      state,
      'B',
      'financiers-tariffs',
      'assetBank',
      'tariffs',
    );
    inject(
      state,
      'A',
      'intelligence-subversion',
      'assetBank',
      'subversion',
    );

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    })).toThrow(/pending Subversion Asset opportunity/);
  });

  test('player views expose turn Subversion candidates only to the chooser', () => {
    let state = drawForB();
    const tariffs = inject(
      state,
      'B',
      'financiers-tariffs',
      'assetBank',
      'tariffs',
    );
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'assetBank',
      'subversion',
    );

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(viewV070GameForPlayer(state, 'A').pendingSubversionTurnAsset)
      .toEqual({
        playerId: 'A',
        targetOwner: 'B',
        targetAssetInstanceId: tariffs,
        effectLabel: 'Tariffs',
        candidateCount: 1,
        candidateSubversionInstanceIds: [subversion],
      });
    expect(viewV070GameForPlayer(state, 'B').pendingSubversionTurnAsset)
      .toEqual({
        playerId: 'A',
        targetOwner: 'B',
        targetAssetInstanceId: tariffs,
        effectLabel: 'Tariffs',
        candidateCount: 1,
      });
  });
});
