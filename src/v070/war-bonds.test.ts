import { describe, expect, test } from 'vitest';
import {
  appendV070Event,
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const intelligenceStarter = 'intelligence-ranger-field-operations';
const financierStarter = 'financiers-banker-sound-investment';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'war-bonds',
    seed: 'war-bonds-seed',
    players: {
      A: { name: 'A', starterDeckId: intelligenceStarter },
      B: { name: 'B', starterDeckId: financierStarter },
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
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'B',
  });
  expect(state.turnState?.phase).toBe('opening');
  expect(state.players.B.financiers).not.toBeNull();
  return state;
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'assetBank' | 'discardPile',
  suffix: string,
): string {
  const instanceId = `test-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function markBattleComplete(state: V070GameState): void {
  appendV070Event(state, {
    type: 'battle_aftermath_complete',
    visibility: 'public',
    payload: { test: true },
  });
}

function eligibleState(): {
  state: V070GameState;
  warBonds: string;
  handCard: string;
} {
  const state = openingForB();
  const warBonds = inject(
    state,
    'B',
    'financiers-war-bonds',
    'assetBank',
    'war-bonds',
  );
  const handCard = inject(
    state,
    'B',
    'neutral-rallying-cry',
    'hand',
    'treasury-target',
  );
  markBattleComplete(state);
  return { state, warBonds, handCard };
}

describe('v0.7.0 War Bonds Asset lifecycle', () => {
  test('opens after the first completed battle before consuming the next turn action', () => {
    let { state, warBonds } = eligibleState();
    const actionsBefore = state.turnState?.actionsTaken.opening;

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });

    expect(state.pendingWarBondsChoice).toEqual({
      playerId: 'B',
      assetInstanceId: warBonds,
      remainingPlayerIds: ['A'],
    });
    expect(state.turnState?.phase).toBe('opening');
    expect(state.turnState?.actionsTaken.opening).toBe(actionsBefore);
    expect(state.warBondsFirstBattleTurn).toBe(state.turnNumber);
  });

  test('passing preserves the turn action and does not reopen on the same battle', () => {
    let { state } = eligibleState();
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_war_bonds',
      playerId: 'B',
      choice: 'pass',
    });
    expect(state.pendingWarBondsChoice ?? null).toBeNull();

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    expect(state.turnState?.phase).toBe('movement');
    expect(state.pendingWarBondsChoice ?? null).toBeNull();
  });

  test('using War Bonds places the chosen Hand card in Treasury and gains 1 Capital', () => {
    let { state, handCard } = eligibleState();
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    const capitalBefore = state.players.B.financiers!.capital;

    state = reduceV070TurnAction(state, {
      type: 'resolve_war_bonds',
      playerId: 'B',
      choice: 'use',
      handInstanceId: handCard,
    });

    expect(state.players.B.zones.hand).not.toContain(handCard);
    expect(state.players.B.financiers!.treasury).toContain(handCard);
    expect(state.players.B.financiers!.capital).toBe(capitalBefore + 1);
    expect(state.pendingWarBondsChoice ?? null).toBeNull();
    expect(state.events.some(event => event.type === 'war_bonds_resolved'))
      .toBe(true);
  });

  test('does not trigger after a later battle in the same turn', () => {
    let { state } = eligibleState();
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_war_bonds',
      playerId: 'B',
      choice: 'pass',
    });

    markBattleComplete(state);
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });

    expect(state.pendingWarBondsChoice ?? null).toBeNull();
    expect(state.turnState?.phase).toBe('movement');
  });

  test('inactive War Bonds is skipped and the requested turn action proceeds', () => {
    let { state, warBonds } = eligibleState();
    state.assetFaceStates.push({
      instanceId: warBonds,
      owner: 'B',
      faceUp: false,
      changedBy: 'A',
      sourceInstanceId: null,
      reason: 'test inactive War Bonds',
      appliedTurn: state.turnNumber,
      restoreAtPlayer: 'B',
    });

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });

    expect(state.pendingWarBondsChoice ?? null).toBeNull();
    expect(state.turnState?.phase).toBe('movement');
    expect(state.warBondsFirstBattleTurn).toBe(state.turnNumber);
  });

  test('Subversion can answer a committed War Bonds use after the battle has ended', () => {
    let { state, warBonds, handCard } = eligibleState();
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'assetBank',
      'subversion',
    );
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_war_bonds',
      playerId: 'B',
      choice: 'use',
      handInstanceId: handCard,
    });

    expect(state.battle).toBeNull();
    expect(state.pendingSubversionTurnAsset).toMatchObject({
      playerId: 'A',
      targetOwner: 'B',
      targetAssetInstanceId: warBonds,
      effectLabel: 'War Bonds',
      candidateSubversionInstanceIds: [subversion],
    });
    expect(state.players.B.zones.hand).toContain(handCard);
    expect(state.players.B.financiers!.treasury).not.toContain(handCard);
  });

  test('Subversion pass lets War Bonds apply', () => {
    let { state, handCard } = eligibleState();
    inject(
      state,
      'A',
      'intelligence-subversion',
      'assetBank',
      'subversion',
    );
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_war_bonds',
      playerId: 'B',
      choice: 'use',
      handInstanceId: handCard,
    });
    const capitalBefore = state.players.B.financiers!.capital;

    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'pass',
    });

    expect(state.players.B.financiers!.treasury).toContain(handCard);
    expect(state.players.B.financiers!.capital).toBe(capitalBefore + 1);
    expect(state.pendingSubversionTurnAsset ?? null).toBeNull();
  });

  test('Subversion use negates War Bonds and discards the Asset', () => {
    let { state, warBonds, handCard } = eligibleState();
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'assetBank',
      'subversion',
    );
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_war_bonds',
      playerId: 'B',
      choice: 'use',
      handInstanceId: handCard,
    });
    const capitalBefore = state.players.B.financiers!.capital;

    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.players.B.zones.discardPile).toContain(warBonds);
    expect(state.players.A.zones.graveyard).toContain(subversion);
    expect(state.players.B.zones.hand).toContain(handCard);
    expect(state.players.B.financiers!.treasury).not.toContain(handCard);
    expect(state.players.B.financiers!.capital).toBe(capitalBefore);
    expect(state.pendingWarBondsChoice ?? null).toBeNull();
  });

  test('player views keep eligible Hand identities private', () => {
    let { state, handCard } = eligibleState();
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });

    const ownerView = viewV070GameForPlayer(state, 'B');
    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(ownerView.pendingWarBondsChoice?.candidateHandInstanceIds)
      .toContain(handCard);
    expect(opponentView.pendingWarBondsChoice?.handCount)
      .toBe(state.players.B.zones.hand.length);
    expect(opponentView.pendingWarBondsChoice)
      .not.toHaveProperty('candidateHandInstanceIds');
  });
});
