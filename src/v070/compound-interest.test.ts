import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const intelligenceStarter = 'intelligence-ranger-field-operations';
const financierStarter = 'financiers-banker-sound-investment';

function drawForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'compound-interest',
    seed: 'compound-interest-seed',
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
  expect(state.turnState?.phase).toBe('draw');
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
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function addTreasuryCard(
  state: V070GameState,
  suffix = 'treasury',
): string {
  const instanceId = `test-B-${suffix}-neutral-rallying-cry`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: 'neutral-rallying-cry',
    owner: 'B',
  };
  state.players.B.financiers!.treasury.push(instanceId);
  return instanceId;
}

function eligibleCompoundState(): {
  state: V070GameState;
  compound: string;
} {
  const state = drawForB();
  const compound = inject(
    state,
    'B',
    'financiers-compound-interest',
    'assetBank',
    'compound',
  );
  addTreasuryCard(state);
  return { state, compound };
}

describe('v0.7.0 Compound Interest Asset lifecycle', () => {
  test('opens an optional post-normal-Draw use window before Opening', () => {
    let { state, compound } = eligibleCompoundState();
    const drawn = state.players.B.zones.drawPile[0];
    const revealCandidate = state.players.B.zones.drawPile[1];

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(state.players.B.zones.hand).toContain(drawn);
    expect(state.players.B.zones.drawPile[0]).toBe(revealCandidate);
    expect(state.turnState?.phase).toBe('draw');
    expect(state.pendingCompoundInterestChoice).toEqual({
      kind: 'use',
      playerId: 'B',
      assetInstanceId: compound,
    });
    expect(state.events[state.events.length - 1]?.type)
      .toBe('compound_interest_choice_pending');
  });

  test('passing the optional use window enters Opening without revealing a card', () => {
    let { state } = eligibleCompoundState();
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });
    const top = state.players.B.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'resolve_compound_interest_use',
      playerId: 'B',
      choice: 'pass',
    });

    expect(state.turnState?.phase).toBe('opening');
    expect(state.players.B.zones.drawPile[0]).toBe(top);
    expect(state.pendingCompoundInterestChoice).toBeNull();
    expect(state.events.some(event =>
      event.type === 'compound_interest_card_revealed'
    )).toBe(false);
  });

  test('using the Asset reveals the top Draw card before choosing its destination', () => {
    let { state, compound } = eligibleCompoundState();
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });
    const revealed = state.players.B.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'resolve_compound_interest_use',
      playerId: 'B',
      choice: 'use',
    });

    expect(state.turnState?.phase).toBe('draw');
    expect(state.pendingCompoundInterestChoice).toEqual({
      kind: 'destination',
      playerId: 'B',
      assetInstanceId: compound,
      revealedInstanceId: revealed,
    });
    expect(state.players.B.zones.drawPile[0]).toBe(revealed);
    expect(state.events.some(event => {
      if (event.type !== 'compound_interest_card_revealed') return false;
      const payload = event.payload as { instanceId?: string } | undefined;
      return payload?.instanceId === revealed;
    })).toBe(true);
  });

  test('routes the revealed card face up to Treasury, then enters Opening', () => {
    let { state } = eligibleCompoundState();
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });
    const revealed = state.players.B.zones.drawPile[0];
    state = reduceV070TurnAction(state, {
      type: 'resolve_compound_interest_use',
      playerId: 'B',
      choice: 'use',
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_compound_interest_destination',
      playerId: 'B',
      destination: 'treasury',
    });

    expect(state.players.B.zones.drawPile).not.toContain(revealed);
    expect(state.players.B.financiers!.treasury).toContain(revealed);
    expect(state.turnState?.phase).toBe('opening');
    expect(state.pendingCompoundInterestChoice).toBeNull();
  });

  test('routes the revealed card to Discard, then enters Opening', () => {
    let { state } = eligibleCompoundState();
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });
    const revealed = state.players.B.zones.drawPile[0];
    state = reduceV070TurnAction(state, {
      type: 'resolve_compound_interest_use',
      playerId: 'B',
      choice: 'use',
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_compound_interest_destination',
      playerId: 'B',
      destination: 'discard',
    });

    expect(state.players.B.zones.drawPile).not.toContain(revealed);
    expect(state.players.B.zones.discardPile).toContain(revealed);
    expect(state.turnState?.phase).toBe('opening');
  });

  test('does not open when Treasury is empty', () => {
    let state = drawForB();
    inject(
      state,
      'B',
      'financiers-compound-interest',
      'assetBank',
      'compound',
    );

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(state.pendingCompoundInterestChoice ?? null).toBeNull();
    expect(state.turnState?.phase).toBe('opening');
  });

  test('does not open while Compound Interest is inactive', () => {
    let state = drawForB();
    const compound = inject(
      state,
      'B',
      'financiers-compound-interest',
      'assetBank',
      'compound',
    );
    addTreasuryCard(state);
    state.assetFaceStates.push({
      instanceId: compound,
      owner: 'B',
      faceUp: false,
      changedBy: 'A',
      sourceInstanceId: null,
      reason: 'test inactive Compound Interest',
      appliedTurn: state.turnNumber,
      restoreAtPlayer: 'B',
    });

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(state.pendingCompoundInterestChoice ?? null).toBeNull();
    expect(state.turnState?.phase).toBe('opening');
  });

  test('does not open if the normal Draw leaves no top Draw Pile card', () => {
    let { state } = eligibleCompoundState();
    const only = state.players.B.zones.drawPile[0];
    state.players.B.zones.drawPile = [only];
    state.players.B.zones.discardPile = [];

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(state.players.B.zones.hand).toContain(only);
    expect(state.players.B.zones.drawPile).toEqual([]);
    expect(state.pendingCompoundInterestChoice ?? null).toBeNull();
    expect(state.turnState?.phase).toBe('opening');
  });

  test('Tariffs skipping the normal Draw prevents the Compound Interest trigger', () => {
    let { state } = eligibleCompoundState();
    inject(
      state,
      'B',
      'financiers-tariffs',
      'assetBank',
      'tariffs',
    );

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(state.pendingCompoundInterestChoice ?? null).toBeNull();
    expect(state.turnState?.phase).toBe('opening');
    expect(state.events.some(event =>
      event.type === 'tariffs_normal_draw_skipped'
    )).toBe(true);
  });

  test('negating Tariffs restores the normal Draw and therefore opens Compound Interest afterward', () => {
    let { state, compound } = eligibleCompoundState();
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
    expect(state.pendingSubversionTurnAsset).toMatchObject({
      targetAssetInstanceId: tariffs,
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.players.B.zones.discardPile).toContain(tariffs);
    expect(state.pendingCompoundInterestChoice).toEqual({
      kind: 'use',
      playerId: 'B',
      assetInstanceId: compound,
    });
    expect(state.turnState?.phase).toBe('draw');
  });

  test('Ruined Storehouse can replace the Draw source and Compound Interest still triggers after that Draw', () => {
    let { state, compound } = eligibleCompoundState();
    const storehouse = state.board.find(territory =>
      territory.territoryId === 'territory-ruined-storehouse'
    );
    expect(storehouse).toBeDefined();
    state.players.B.position = storehouse!.position;
    storehouse!.occupant = 'B';
    storehouse!.controller = 'B';
    const discardTop = inject(
      state,
      'B',
      'neutral-pathfinders',
      'discardPile',
      'storehouse-draw',
    );
    const drawTop = state.players.B.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
      useRuinedStorehouse: true,
    });

    expect(state.players.B.zones.hand).toContain(discardTop);
    expect(state.players.B.zones.drawPile[0]).toBe(drawTop);
    expect(state.pendingCompoundInterestChoice).toEqual({
      kind: 'use',
      playerId: 'B',
      assetInstanceId: compound,
    });
    expect(state.turnState?.phase).toBe('draw');
  });

  test('Subversion pass allows a committed Compound Interest use to reveal', () => {
    let { state, compound } = eligibleCompoundState();
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
    const revealCandidate = state.players.B.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'resolve_compound_interest_use',
      playerId: 'B',
      choice: 'use',
    });

    expect(state.pendingCompoundInterestChoice ?? null).toBeNull();
    expect(state.pendingSubversionTurnAsset).toMatchObject({
      playerId: 'A',
      targetOwner: 'B',
      targetAssetInstanceId: compound,
      effectLabel: 'Compound Interest',
      candidateSubversionInstanceIds: [subversion],
      deferredAction: {
        type: 'compound_interest_reveal',
        playerId: 'B',
        assetInstanceId: compound,
      },
    });
    expect(state.events.some(event =>
      event.type === 'compound_interest_card_revealed'
    )).toBe(false);

    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'pass',
    });

    expect(state.pendingCompoundInterestChoice).toEqual({
      kind: 'destination',
      playerId: 'B',
      assetInstanceId: compound,
      revealedInstanceId: revealCandidate,
    });
    expect(state.turnState?.phase).toBe('draw');
  });

  test('Subversion negates a committed Compound Interest use before reveal', () => {
    let { state, compound } = eligibleCompoundState();
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
    const unrevealedTop = state.players.B.zones.drawPile[0];
    state = reduceV070TurnAction(state, {
      type: 'resolve_compound_interest_use',
      playerId: 'B',
      choice: 'use',
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.players.B.zones.discardPile).toContain(compound);
    expect(state.players.B.zones.drawPile[0]).toBe(unrevealedTop);
    expect(state.players.A.zones.graveyard).toContain(subversion);
    expect(state.pendingCompoundInterestChoice ?? null).toBeNull();
    expect(state.pendingSubversionTurnAsset ?? null).toBeNull();
    expect(state.turnState?.phase).toBe('opening');
    expect(state.events.some(event =>
      event.type === 'compound_interest_card_revealed'
    )).toBe(false);
  });

  test('blocks unrelated turn actions while a Compound Interest choice is pending', () => {
    let { state } = eligibleCompoundState();
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    })).toThrow(/pending Compound Interest choice/);
  });

  test('views do not expose the top card before reveal and expose it publicly afterward', () => {
    let { state, compound } = eligibleCompoundState();
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });
    const revealCandidate = state.players.B.zones.drawPile[0];

    expect(viewV070GameForPlayer(state, 'A').pendingCompoundInterestChoice)
      .toEqual({
        kind: 'use',
        playerId: 'B',
        assetInstanceId: compound,
      });
    expect(viewV070GameForPlayer(state, 'B').pendingCompoundInterestChoice)
      .toEqual({
        kind: 'use',
        playerId: 'B',
        assetInstanceId: compound,
      });

    state = reduceV070TurnAction(state, {
      type: 'resolve_compound_interest_use',
      playerId: 'B',
      choice: 'use',
    });

    const expected = {
      kind: 'destination' as const,
      playerId: 'B' as const,
      assetInstanceId: compound,
      revealedInstanceId: revealCandidate,
      revealedCardId: state.cardInstances[revealCandidate]?.cardId,
    };
    expect(viewV070GameForPlayer(state, 'A').pendingCompoundInterestChoice)
      .toEqual(expected);
    expect(viewV070GameForPlayer(state, 'B').pendingCompoundInterestChoice)
      .toEqual(expected);
  });
});
