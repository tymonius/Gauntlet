import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'foothold-asset-test',
    seed: 'foothold-asset-seed',
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

function battleWithController(
  controller: 'A' | 'B',
): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = controller;

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function injectBanked(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `foothold-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.assetBank.push(instanceId);
  return instanceId;
}

function resolveDefenderWin(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [1],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [6],
  });
}

describe('v0.7.0 Foothold Asset', () => {
  test('locks the released Asset text', () => {
    const card = v070CanonicalContent.cardsById.get('neutral-foothold');
    expect(card?.effects).toContainEqual({
      label: 'Asset',
      text: 'After you win while defending against a Counterattack, you may discard this card for +2 Cards.',
    });
  });

  test('opens after a defending Counterattack win, then discards Foothold for +2 Cards and resumes Aftermath', () => {
    let state = battleWithController('A');
    const foothold = injectBanked(
      state,
      'B',
      'neutral-foothold',
      'single',
    );

    state = resolveDefenderWin(state);

    expect(state.battle?.winner).toBe('B');
    expect(state.battleRuntime?.footholdAssetWindowPlayer).toBe('B');
    expect(state.battleRuntime?.aftermathCardsCleared).toBe(false);
    expect(() => reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    })).toThrow(/pending Foothold Asset opportunity/);

    const handBefore = state.players.B.zones.hand.length;
    state = reduceV070BattleAction(state, {
      type: 'use_foothold_asset',
      playerId: 'B',
      assetInstanceId: foothold,
    });

    expect(state.players.B.zones.assetBank).not.toContain(foothold);
    expect(state.players.B.zones.discardPile).toContain(foothold);
    expect(state.players.B.zones.hand).toHaveLength(handBefore + 2);
    expect(state.battle).toBeNull();
  });

  test('the defender may decline Foothold and keep the Asset banked', () => {
    let state = battleWithController('A');
    const foothold = injectBanked(
      state,
      'B',
      'neutral-foothold',
      'pass',
    );

    state = resolveDefenderWin(state);
    state = reduceV070BattleAction(state, {
      type: 'pass_foothold_asset',
      playerId: 'B',
    });

    expect(state.players.B.zones.assetBank).toContain(foothold);
    expect(state.players.B.zones.discardPile).not.toContain(foothold);
    expect(state.battle).toBeNull();
  });

  test('multiple active Footholds may be used sequentially before the Aftermath resumes', () => {
    let state = battleWithController('A');
    const first = injectBanked(
      state,
      'B',
      'neutral-foothold',
      'first',
    );
    const second = injectBanked(
      state,
      'B',
      'neutral-foothold',
      'second',
    );

    state = resolveDefenderWin(state);
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070BattleAction(state, {
      type: 'use_foothold_asset',
      playerId: 'B',
      assetInstanceId: first,
    });
    expect(state.battleRuntime?.footholdAssetWindowPlayer).toBe('B');
    expect(state.battle).not.toBeNull();
    expect(state.players.B.zones.hand).toHaveLength(handBefore + 2);

    state = reduceV070BattleAction(state, {
      type: 'use_foothold_asset',
      playerId: 'B',
      assetInstanceId: second,
    });
    expect(state.players.B.zones.hand).toHaveLength(handBefore + 4);
    expect(state.battle).toBeNull();
  });

  test('does not open after an ordinary defending win that is not against a Counterattack', () => {
    let state = battleWithController('B');
    injectBanked(
      state,
      'B',
      'neutral-foothold',
      'ordinary-defense',
    );

    state = resolveDefenderWin(state);

    expect(state.battleRuntime?.footholdAssetWindowPlayer).toBeNull();
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battle).toBeNull();
  });

  test('an inactive Foothold does not open while Illegal Occupation suppresses the defender’s Assets', () => {
    let state = battleWithController('A');
    injectBanked(
      state,
      'A',
      'neutral-illegal-occupation',
      'suppression-source',
    );
    injectBanked(
      state,
      'B',
      'neutral-foothold',
      'suppressed',
    );

    state = resolveDefenderWin(state);

    expect(state.battleRuntime?.footholdAssetWindowPlayer).toBeNull();
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battle).toBeNull();
  });

  test('using Foothold discards active Extraordinary Rendition first, then Foothold, before drawing', () => {
    let state = battleWithController('A');
    const rendition = injectBanked(
      state,
      'B',
      'intelligence-extraordinary-rendition',
      'rendition',
    );
    const foothold = injectBanked(
      state,
      'B',
      'neutral-foothold',
      'with-rendition',
    );

    state = resolveDefenderWin(state);
    const eventCount = state.events.length;
    state = reduceV070BattleAction(state, {
      type: 'use_foothold_asset',
      playerId: 'B',
      assetInstanceId: foothold,
    });

    expect(state.players.B.zones.assetBank).not.toContain(rendition);
    expect(state.players.B.zones.assetBank).not.toContain(foothold);
    expect(state.players.B.zones.discardPile).toContain(rendition);
    expect(state.players.B.zones.discardPile).toContain(foothold);

    const discarded = state.events.slice(eventCount)
      .filter(event => event.type === 'asset_discarded')
      .map(event =>
        (event.payload as { instanceId?: string }).instanceId
      );
    expect(discarded.slice(0, 2)).toEqual([rendition, foothold]);
  });
});
