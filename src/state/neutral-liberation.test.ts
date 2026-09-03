import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { LIBERATION } from './neutral-liberation';
import { toPrivateGameView } from './views';

const FORTIFICATIONS = 'neutral-fortifications';
const VALOR = 'neutral-valor';
const REINFORCEMENTS = 'neutral-reinforcements';
const RALLYING_CRY = 'neutral-rallying-cry';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-liberation-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Counterattacker',
        factionId: 'military',
        leaderName: 'General',
        deck: [LIBERATION, LIBERATION, FORTIFICATIONS, VALOR, REINFORCEMENTS, RALLYING_CRY],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Occupier',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: [RALLYING_CRY, FORTIFICATIONS, VALOR],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  return state;
}

function participant(
  playerId: PlayerID,
  diceRoll?: number,
): BattleParticipantState {
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
    diceRoll,
  };
}

function placeForBattle(
  state: GameState,
  originIndex: number,
  locationIndex: number,
  controller: PlayerID,
): void {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.index === originIndex)!;
  const location = state.board.spaces.find((space) => space.index === locationIndex)!;
  origin.occupant = 'player_1';
  location.kind = 'territory';
  location.controller = controller;
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
}

function beginBattle(
  state: GameState,
  counterattack: boolean,
): GameState {
  const originIndex = counterattack ? 2 : 3;
  const locationIndex = counterattack ? 3 : 4;
  placeForBattle(state, originIndex, locationIndex, counterattack ? 'player_1' : 'player_2');
  const attacker = participant('player_1');
  const defender = participant('player_2');
  for (const side of [attacker, defender]) {
    side.passedHandCommit = false;
    side.passedBattleDrawPlay = false;
    side.hasDrawnBattleCards = false;
  }
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'liberation-setup-battle',
    stage: 'hand_commit',
    location: state.board.spaces.find((space) => space.index === locationIndex)!.id,
    attackerOrigin: state.board.spaces.find((space) => space.index === originIndex)!.id,
    attacker,
    defender,
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  return state;
}

function resolutionBattle(
  state: GameState,
  counterattack = true,
  attackerRoll = 6,
  defenderRoll = 1,
): BattleState {
  const originIndex = counterattack ? 2 : 3;
  const locationIndex = counterattack ? 3 : 4;
  placeForBattle(state, originIndex, locationIndex, counterattack ? 'player_1' : 'player_2');
  return {
    id: 'liberation-battle',
    stage: 'resolution',
    location: state.board.spaces.find((space) => space.index === locationIndex)!.id,
    attackerOrigin: state.board.spaces.find((space) => space.index === originIndex)!.id,
    attacker: participant('player_1', attackerRoll),
    defender: participant('player_2', defenderRoll),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function resolveBattle(state: GameState): GameState {
  state.phase = 'battle';
  return applyGameAction(state, {
    type: 'resolve_battle',
    playerId: 'player_1',
  }).state;
}

describe('Neutral Liberation', () => {
  it('registers both forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(LIBERATION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
      requiresTarget: false,
    });

    let state = game();
    state.players.player_1.zones.hand = [LIBERATION];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: LIBERATION,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([LIBERATION]);
  });

  it('expands the initial Battle Hand only when committed from hand during a counterattack', () => {
    let state = beginBattle(game(), true);
    state.players.player_1.zones.hand = [LIBERATION];

    state = applyGameAction(state, {
      type: 'commit_battle_hand_card',
      playerId: 'player_1',
      cardId: LIBERATION,
    }).state;

    expect(state.battle?.attacker.battleDrawCount).toBe(4);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(2);
    expect(state.battle?.defender.battleDrawCount).toBe(3);
  });

  it('does not expand the Battle Hand during an ordinary attack', () => {
    let state = beginBattle(game(), false);
    state.players.player_1.zones.hand = [LIBERATION];

    state = applyGameAction(state, {
      type: 'commit_battle_hand_card',
      playerId: 'player_1',
      cardId: LIBERATION,
    }).state;

    expect(state.battle?.attacker.battleDrawCount).toBe(3);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(1);
  });

  it('does not retroactively expand a Battle Hand when selected from that Battle Hand', () => {
    let state = beginBattle(game(), true);
    state.players.player_1.zones.deck = [LIBERATION, RALLYING_CRY, FORTIFICATIONS];
    state.players.player_2.zones.deck = [RALLYING_CRY, FORTIFICATIONS, VALOR];
    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    state = applyGameAction(state, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    state = applyGameAction(state, {
      type: 'play_battle_draw_card',
      playerId: 'player_1',
      cardId: LIBERATION,
    }).state;

    expect(state.battle?.attacker.battleDrawCount).toBe(3);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(1);
  });

  it('draws and grants an additional Action Opportunity after its owner wins a counterattack', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [LIBERATION];
    state.players.player_1.zones.deck = [FORTIFICATIONS];
    state.players.player_1.actionsRemaining = 0;
    state.players.player_1.hasPlayedBattleThisTurn = true;
    state.battle = resolutionBattle(state);

    state = resolveBattle(state);

    expect(state.players.player_1.zones.hand).toEqual([FORTIFICATIONS]);
    expect(state.players.player_1.actionsRemaining).toBe(1);
    expect(state.neutralLiberationActionOpportunity).toEqual({
      playerId: 'player_1',
      turn: state.turn,
      remaining: 1,
    });
    expect(toPrivateGameView(state, 'player_1').legalActionPlays).toContainEqual(
      expect.objectContaining({ cardId: FORTIFICATIONS }),
    );

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FORTIFICATIONS,
    }).state;
    expect(state.neutralLiberationActionOpportunity).toBeUndefined();
    expect(state.players.player_1.actionsRemaining).toBe(0);
  });

  it('stacks active Asset copies as separate draws and Action Opportunities', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [LIBERATION, LIBERATION];
    state.players.player_1.controlledTerritories.push('liberated-capacity');
    state.players.player_1.zones.deck = [FORTIFICATIONS, VALOR];
    state.players.player_1.actionsRemaining = 0;
    state.players.player_1.hasPlayedBattleThisTurn = true;
    state.battle = resolutionBattle(state);

    state = resolveBattle(state);
    expect(state.players.player_1.zones.hand).toEqual([FORTIFICATIONS, VALOR]);
    expect(state.players.player_1.actionsRemaining).toBe(2);
    expect(state.neutralLiberationActionOpportunity?.remaining).toBe(2);

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FORTIFICATIONS,
    }).state;
    expect(state.neutralLiberationActionOpportunity?.remaining).toBe(1);
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: VALOR,
    }).state;
    expect(state.neutralLiberationActionOpportunity).toBeUndefined();
  });

  it('does not trigger after an ordinary attack or a lost counterattack', () => {
    let ordinary = game();
    ordinary.players.player_1.zones.assetBank = [LIBERATION];
    ordinary.players.player_1.zones.deck = [FORTIFICATIONS];
    ordinary.battle = resolutionBattle(ordinary, false);
    ordinary = resolveBattle(ordinary);
    expect(ordinary.players.player_1.zones.hand).toEqual([]);
    expect(ordinary.neutralLiberationActionOpportunity).toBeUndefined();

    let lost = game();
    lost.players.player_1.zones.assetBank = [LIBERATION];
    lost.players.player_1.zones.deck = [FORTIFICATIONS];
    lost.battle = resolutionBattle(lost, true, 1, 6);
    lost = resolveBattle(lost);
    expect(lost.players.player_1.zones.hand).toEqual([]);
    expect(lost.neutralLiberationActionOpportunity).toBeUndefined();
  });

  it('honors battle-time Asset prohibition and Sedition suppression', () => {
    let prohibited = game();
    prohibited.players.player_1.zones.assetBank = [LIBERATION];
    prohibited.players.player_1.zones.deck = [FORTIFICATIONS];
    prohibited.battle = {
      ...resolutionBattle(prohibited),
      bankedAssetUseProhibited: ['player_1'],
    };
    prohibited = resolveBattle(prohibited);
    expect(prohibited.players.player_1.zones.hand).toEqual([]);

    let sedition = game();
    sedition.players.player_1.zones.assetBank = [LIBERATION, LIBERATION];
    sedition.players.player_1.zones.deck = [FORTIFICATIONS, VALOR];
    sedition.battle = {
      ...resolutionBattle(sedition),
      seditionInactiveAssets: { player_1: [LIBERATION] },
    };
    sedition = resolveBattle(sedition);
    expect(sedition.players.player_1.zones.hand).toEqual([FORTIFICATIONS]);
    expect(sedition.neutralLiberationActionOpportunity?.remaining).toBe(1);
  });

  it('blocks Reinforcements until the Liberation opportunity is spent and clears at turn end', () => {
    let state = game();
    state.phase = 'action_after_movement';
    state.players.player_1.zones.assetBank = [REINFORCEMENTS];
    state.players.player_1.actionsRemaining = 1;
    state.players.player_1.hasPlayedBattleThisTurn = true;
    state.neutralLiberationActionOpportunity = {
      playerId: 'player_1',
      turn: state.turn,
      remaining: 1,
    };

    expect(toPrivateGameView(state, 'player_1').legalNeutralAssetUses).toBeUndefined();
    expect(() => applyGameAction(state, {
      type: 'use_neutral_reinforcements_asset',
      playerId: 'player_1',
    })).toThrow(/Liberation Action Opportunity/);

    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_1' }).state;
    expect(state.neutralLiberationActionOpportunity).toBeUndefined();
  });
});
