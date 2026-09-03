import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { FOOTHOLD } from './neutral-foothold';

const FIRST = 'card-valor';
const SECOND = 'card-fortifications';
const THIRD = 'card-attrition';
const FOURTH = 'neutral-rallying-cry';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-foothold-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Attacker',
        factionId: 'military',
        leaderName: 'General',
        deck: [FOOTHOLD, FIRST, SECOND, THIRD],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [FOOTHOLD, FOOTHOLD, FIRST, SECOND, THIRD, FOURTH],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
  return state;
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

function participant(
  playerId: PlayerID,
  cards: BattlePlayedCard[] = [],
): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
  controller: PlayerID | undefined = 'player_1',
  stage: 'dice' | 'resolution' = 'dice',
  attackerRoll = 1,
  defenderRoll = 6,
): void {
  for (const space of state.board.spaces) space.occupant = undefined;
  const origin = state.board.spaces.find((space) => space.id === 'space-2')!;
  const location = state.board.spaces.find((space) => space.id === 'space-3')!;
  origin.occupant = 'player_1';
  location.kind = 'territory';
  location.territoryId = 'p1-three';
  location.controller = controller;
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'foothold-battle',
    stage,
    location: location.id,
    attackerOrigin: origin.id,
    attacker: {
      ...participant('player_1', attackerCards),
      diceRoll: stage === 'resolution' ? attackerRoll : undefined,
    },
    defender: {
      ...participant('player_2', defenderCards),
      diceRoll: stage === 'resolution' ? defenderRoll : undefined,
    },
    tiePolicy: 'defender',
    effectsResolved: stage === 'resolution' ? ['before_battle_resolution'] : [],
  };
}

describe('Neutral Foothold', () => {
  it('registers both canonical forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(FOOTHOLD)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state.players.player_2.actionsRemaining = 1;
    state.players.player_2.hasPlayedActionThisTurn = false;
    state.players.player_2.zones.hand = [FOOTHOLD];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_2',
      cardId: FOOTHOLD,
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual([FOOTHOLD]);
  });

  it('gains advantage per active defending copy on a Territory the defender does not control', () => {
    let state = game();
    beginBattle(
      state,
      [played(FOOTHOLD, 'player_1', 'hand')],
      [
        played(FOOTHOLD, 'player_2', 'hand'),
        played(FOOTHOLD, 'player_2', 'battle_draw'),
      ],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.defender.advantage).toBe(2);
    expect(state.battle?.attacker.advantage ?? 0).toBe(0);
  });

  it('does not gain Battle advantage when the defender controls the Territory or copies are inactive', () => {
    let controlled = game();
    beginBattle(controlled, [], [played(FOOTHOLD, 'player_2')], 'player_2');
    controlled = applyGameAction(controlled, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    expect(controlled.battle?.defender.advantage ?? 0).toBe(0);

    let inactive = game();
    beginBattle(inactive, [], [
      played(FOOTHOLD, 'player_2', 'hand', { canceled: true }),
      played(FOOTHOLD, 'player_2', 'battle_draw', { negated: true }),
    ]);
    inactive = applyGameAction(inactive, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    expect(inactive.battle?.defender.advantage ?? 0).toBe(0);
  });

  it('draws once per active Battle copy during cleanup after a qualifying defensive win', () => {
    let state = game();
    state.players.player_2.zones.deck = [FIRST, SECOND, THIRD];
    beginBattle(
      state,
      [],
      [played(FOOTHOLD, 'player_2', 'hand'), played(FOOTHOLD, 'player_2')],
      'player_1',
      'resolution',
    );

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_2',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_2.zones.hand).toEqual([FIRST, SECOND]);
    expect(state.players.player_2.zones.graveyard).toContain(FOOTHOLD);
    expect(state.players.player_2.zones.discard).toContain(FOOTHOLD);
  });

  it('may discard stacked banked copies after a qualifying defensive win to draw two each', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [FOOTHOLD, FOOTHOLD];
    state.players.player_2.zones.deck = [FIRST, SECOND, THIRD, FOURTH];
    beginBattle(state, [], [], 'player_1', 'resolution');

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_2',
    }).state;

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'foothold_asset',
      playerId: 'player_2',
      battleId: 'foothold-battle',
      triggersRemaining: 2,
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual([FOOTHOLD]);
    expect(state.players.player_2.zones.discard).toEqual([FOOTHOLD]);
    expect(state.players.player_2.zones.hand).toEqual([FIRST, SECOND]);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'foothold_asset',
      triggersRemaining: 1,
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'pass',
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual([FOOTHOLD]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('does not offer banked Foothold after a loss, on a controlled Territory, or while Assets were prohibited', () => {
    let loss = game();
    loss.players.player_2.zones.assetBank = [FOOTHOLD];
    beginBattle(loss, [], [], 'player_1', 'resolution', 6, 1);
    loss = applyGameAction(loss, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;
    expect(loss.pendingNeutralChoice).toBeUndefined();

    let controlled = game();
    controlled.players.player_2.zones.assetBank = [FOOTHOLD];
    beginBattle(controlled, [], [], 'player_2', 'resolution');
    controlled = applyGameAction(controlled, {
      type: 'resolve_battle',
      playerId: 'player_2',
    }).state;
    expect(controlled.pendingNeutralChoice).toBeUndefined();

    let prohibited = game();
    prohibited.players.player_2.zones.assetBank = [FOOTHOLD];
    beginBattle(prohibited, [], [], 'player_1', 'resolution');
    prohibited.battle!.bankedAssetUseProhibited = ['player_2'];
    prohibited = applyGameAction(prohibited, {
      type: 'resolve_battle',
      playerId: 'player_2',
    }).state;
    expect(prohibited.pendingNeutralChoice).toBeUndefined();
    expect(prohibited.players.player_2.zones.assetBank).toEqual([FOOTHOLD]);
  });
});
