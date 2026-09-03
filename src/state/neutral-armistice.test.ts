import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { ARMISTICE } from './neutral-armistice';

const REQUISITION = 'neutral-requisition';
const RALLYING_CRY = 'neutral-rallying-cry';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-armistice-canonical-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'First',
        factionId: 'military',
        leaderName: 'General',
        deck: [ARMISTICE, ARMISTICE, REQUISITION, RALLYING_CRY, 'p1-a', 'p1-b', 'p1-c'],
        territories: ['territory-high-ground', 'territory-watchtower', 'territory-garrison'],
      },
      {
        id: 'player_2',
        name: 'Second',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [ARMISTICE, RALLYING_CRY, 'p2-a', 'p2-b'],
        territories: ['territory-supply-depot', 'territory-old-battlefield', 'territory-refuge'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 2;
  state.players.player_1.movementRemaining = 1;
  return state;
}

function placeAdjacent(state: GameState): { originId: string; locationId: string } {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.id === 'space-3')!;
  const location = state.board.spaces.find((space) => space.id === 'space-4')!;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  location.controller = 'player_2';
  location.revealed = true;
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  return { originId: origin.id, locationId: location.id };
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    ...overrides,
  };
}

function participant(playerId: PlayerID, cards: BattlePlayedCard[] = []): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    initialBattleHand: cards.filter((card) => card.origin === 'battle_draw').map((card) => card.cardId),
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[],
  defenderCards: BattlePlayedCard[] = [],
): void {
  const { originId, locationId } = placeAdjacent(state);
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `armistice-battle-${state.log.length + 1}`,
    stage: 'dice',
    location: locationId,
    attackerOrigin: originId,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function normalDraw(state: GameState): GameState {
  state.phase = 'turn_start';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  return applyGameAction(state, {
    type: 'draw_card',
    playerId: 'player_1',
  }).state;
}

describe('Neutral Armistice', () => {
  it('registers both forms and banks its Action as an Asset', () => {
    expect(getCardPlayRule(ARMISTICE)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [ARMISTICE];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ARMISTICE,
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual([ARMISTICE]);
  });

  it('prevents either player from initiating a battle while active', () => {
    const state = game();
    const { locationId } = placeAdjacent(state);
    state.phase = 'movement';
    state.players.player_1.zones.assetBank = [ARMISTICE];

    expect(() => applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: locationId,
    })).toThrow('active Armistice is banked');
  });

  it('does not prevent a battle while the Armistice Asset is face down', () => {
    let state = game();
    const { locationId } = placeAdjacent(state);
    state.phase = 'movement';
    state.players.player_1.zones.assetBank = [ARMISTICE];
    state.players.player_1.faceDownAssets = [ARMISTICE];

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: locationId,
    }).state;
    expect(state.battle).toBeDefined();
  });

  it('opens mandatory upkeep after the normal Draw step', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ARMISTICE];
    state.players.player_1.zones.hand = ['p1-a', 'p1-b'];
    state.players.player_1.zones.deck = ['p1-c'];

    state = normalDraw(state);

    expect(state.players.player_1.zones.hand).toEqual(expect.arrayContaining(['p1-a', 'p1-b', 'p1-c']));
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'armistice_asset',
      playerId: 'player_1',
      options: ['select_cards', 'use'],
    });
  });

  it('keeps Armistice after discarding exactly two cards from hand', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ARMISTICE];
    state.players.player_1.zones.hand = ['p1-a', 'p1-b'];
    state.players.player_1.zones.deck = ['p1-c'];
    state = normalDraw(state);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_cards',
      cardIds: ['p1-a', 'p1-b'],
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([ARMISTICE]);
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining(['p1-a', 'p1-b']));
  });

  it('discards Armistice when its controller declines or cannot pay the upkeep', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ARMISTICE];
    state.players.player_1.zones.hand = [];
    state.players.player_1.zones.deck = ['p1-a'];
    state = normalDraw(state);

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'armistice_asset',
      options: ['use'],
    });
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
    }).state;

    expect(state.players.player_1.zones.assetBank).not.toContain(ARMISTICE);
    expect(state.players.player_1.zones.discard).toContain(ARMISTICE);
  });

  it('resolves upkeep separately for multiple active copies', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ARMISTICE, ARMISTICE];
    state.players.player_1.zones.hand = ['p1-a', 'p1-b'];
    state.players.player_1.zones.deck = ['p1-c'];
    state = normalDraw(state);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_cards',
      cardIds: ['p1-a', 'p1-b'],
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'armistice_asset', options: ['use'] });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
    }).state;
    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([ARMISTICE]);
  });

  it('does not expire at the end of a turn', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ARMISTICE];
    state.phase = 'action_after_movement';
    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_1' }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([ARMISTICE]);
  });

  it('cannot be voluntarily discarded to pay Requisition', () => {
    const state = game();
    state.players.player_1.zones.hand = [REQUISITION];
    state.players.player_1.zones.assetBank = [ARMISTICE];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: REQUISITION,
      targets: [{ kind: 'card', owner: 'player_1', cardId: ARMISTICE }],
    })).toThrow('cannot voluntarily discard Armistice');
  });

  it('retains the canonical Battle form that ends the battle after cancellation', () => {
    let state = game();
    beginBattle(state, [played(ARMISTICE, 'player_1', 'hand')], [played(RALLYING_CRY, 'player_2')]);
    const originId = state.battle!.attackerOrigin;

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.occupiedSpaceId).toBe(originId);
    expect(state.players.player_1.zones.graveyard).toContain(ARMISTICE);
    expect(state.players.player_2.zones.discard).toContain(RALLYING_CRY);
    expect(state.log.at(-1)).toMatchObject({ type: 'neutral_armistice_battle_ended' });
  });
});
