import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import {
  applyResourcefulnessActionDraw,
  applyResourcefulnessBattleAssetDraw,
  applyResourcefulnessBattleEffects,
  canBankResourcefulness,
  RESOURCEFULNESS,
  resourcefulnessActionTriggerEligible,
} from './neutral-resourcefulness';
import { toPrivateGameView } from './views';

const FEALTY = 'neutral-fealty';
const FORCED_MARCH = 'neutral-forced-march';
const FORTIFICATIONS = 'neutral-fortifications';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-resourcefulness-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Resourceful',
        factionId: 'military',
        leaderName: 'General',
        deck: [FORTIFICATIONS, RESOURCEFULNESS, FEALTY, FORCED_MARCH],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: [FORTIFICATIONS, FEALTY, FORCED_MARCH],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 2;
  return state;
}

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    initialBattleHand: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  options: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    ...options,
  };
}

function battle(state: GameState): BattleState {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.index === 2)!;
  const location = state.board.spaces.find((space) => space.index === 3)!;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  return {
    id: 'resourcefulness-battle',
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Resourcefulness', () => {
  it('registers both forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(RESOURCEFULNESS)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [RESOURCEFULNESS];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: RESOURCEFULNESS,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([RESOURCEFULNESS]);
  });

  it('permits only one banked copy and removes a second Action copy from legal plays', () => {
    const state = game();
    state.players.player_1.zones.assetBank = [RESOURCEFULNESS];
    state.players.player_1.zones.hand = [RESOURCEFULNESS, FEALTY];

    expect(canBankResourcefulness(state, 'player_1')).toBe(false);
    expect(toPrivateGameView(state, 'player_1').legalActionPlays?.map((option) => option.cardId)).toEqual([FEALTY]);
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: RESOURCEFULNESS,
    })).toThrow(/only one banked Resourcefulness/);
  });

  it('draws once on its controller’s turn after a cost-1 Action is used', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [RESOURCEFULNESS];
    state.players.player_1.zones.hand = [FEALTY];
    state.players.player_1.zones.deck = [FORTIFICATIONS];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FEALTY,
    }).state;
    expect(state.players.player_1.zones.hand).toEqual([FORTIFICATIONS]);
    expect(state.log.filter((event) => event.type === 'neutral_resourcefulness_asset_draw')).toHaveLength(1);

    expect(applyResourcefulnessActionDraw(state, 'player_1', FORCED_MARCH, true)).toEqual([]);
    state.turn += 1;
    state.players.player_1.zones.deck = [FORCED_MARCH];
    const eligible = resourcefulnessActionTriggerEligible(state, 'player_1', FEALTY);
    expect(applyResourcefulnessActionDraw(state, 'player_1', FEALTY, eligible)).toEqual([FORCED_MARCH]);
  });

  it('does not draw for higher-cost Actions, outside the controller’s turn, or from inactive Assets', () => {
    const costly = game();
    costly.players.player_1.zones.assetBank = [RESOURCEFULNESS];
    expect(resourcefulnessActionTriggerEligible(costly, 'player_1', FORTIFICATIONS)).toBe(false);

    const wrongTurn = game();
    wrongTurn.activePlayer = 'player_2';
    wrongTurn.players.player_1.zones.assetBank = [RESOURCEFULNESS];
    expect(resourcefulnessActionTriggerEligible(wrongTurn, 'player_1', FEALTY)).toBe(false);

    const faceDown = game();
    faceDown.players.player_1.zones.assetBank = [RESOURCEFULNESS];
    faceDown.players.player_1.faceDownAssets = [RESOURCEFULNESS];
    expect(resourcefulnessActionTriggerEligible(faceDown, 'player_1', FEALTY)).toBe(false);
  });

  it('draws once after an active cost-1 Battle card is used during its controller’s turn', () => {
    const state = game();
    state.phase = 'battle';
    state.players.player_1.zones.assetBank = [RESOURCEFULNESS];
    state.players.player_1.zones.deck = [FORTIFICATIONS];
    state.battle = battle(state);
    state.battle.attacker.battleDrawPlayed = [played(FEALTY, 'player_1')];

    expect(applyResourcefulnessBattleAssetDraw(state)).toEqual([FORTIFICATIONS]);
    expect(applyResourcefulnessBattleAssetDraw(state)).toEqual([]);
  });

  it('shares the same once-per-turn draw between Action and Battle use', () => {
    const state = game();
    state.phase = 'battle';
    state.players.player_1.zones.assetBank = [RESOURCEFULNESS];
    state.players.player_1.zones.deck = [FORTIFICATIONS];
    state.battle = battle(state);
    state.battle.attacker.battleDrawPlayed = [played(FEALTY, 'player_1')];

    expect(applyResourcefulnessActionDraw(state, 'player_1', FEALTY, true)).toEqual([FORTIFICATIONS]);
    state.players.player_1.zones.deck = [FORCED_MARCH];
    expect(applyResourcefulnessBattleAssetDraw(state)).toEqual([]);
    expect(state.players.player_1.zones.deck).toEqual([FORCED_MARCH]);
  });

  it('grants one advantage per active Resourcefulness copy when accompanied by another cost-1 card', () => {
    const state = game();
    state.phase = 'battle';
    state.battle = battle(state);
    state.battle.attacker.handCommit = played(RESOURCEFULNESS, 'player_1', 'hand');
    state.battle.attacker.battleDrawPlayed = [
      played(RESOURCEFULNESS, 'player_1'),
      played(FEALTY, 'player_1'),
    ];
    state.battle.defender.handCommit = played(RESOURCEFULNESS, 'player_2', 'hand');
    state.battle.defender.battleDrawPlayed = [played(FORCED_MARCH, 'player_2')];

    expect(applyResourcefulnessBattleEffects(state)).toBe(3);
    expect(state.battle.attacker.advantage).toBe(2);
    expect(state.battle.defender.advantage).toBe(1);
    expect(applyResourcefulnessBattleEffects(state)).toBe(0);
  });

  it('ignores inactive cost-1 cards and does not let Resourcefulness satisfy itself', () => {
    const state = game();
    state.phase = 'battle';
    state.battle = battle(state);
    state.battle.attacker.handCommit = played(RESOURCEFULNESS, 'player_1', 'hand');
    state.battle.attacker.battleDrawPlayed = [
      played(FEALTY, 'player_1', 'battle_draw', { canceled: true }),
      played(FORCED_MARCH, 'player_1', 'battle_draw', { virtual: true }),
    ];

    expect(applyResourcefulnessBattleEffects(state)).toBe(0);
    expect(state.battle.attacker.advantage ?? 0).toBe(0);
  });
});
