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

const ATTRITION = 'neutral-attrition';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-attrition-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Attrition Player',
        factionId: 'military',
        leaderName: 'General',
        deck: [ATTRITION, 'winner-card-one', 'winner-card-two'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: ['initial-selected', 'initial-unselected', 'later-selected', 'later-unselected'],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  return state;
}

function played(
  cardId: string,
  owner: PlayerID,
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin: 'battle_draw',
    faceDown: false,
    canceled: false,
    ...overrides,
  };
}

function participant(
  playerId: PlayerID,
  overrides: Partial<BattleParticipantState> = {},
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
    ...overrides,
  };
}

function beginResolvedBattle(
  state: GameState,
  attacker: BattleParticipantState,
  defender: BattleParticipantState,
): void {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.id === 'space-1')!;
  const location = state.board.spaces.find((space) => space.id === 'space-2')!;
  origin.occupant = attacker.playerId;
  location.occupant = defender.playerId;
  state.players[attacker.playerId].occupiedSpaceId = origin.id;
  state.players[defender.playerId].occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = attacker.playerId;
  attacker.diceRoll = 6;
  defender.diceRoll = 1;
  state.battle = {
    id: 'attrition-battle',
    stage: 'resolution',
    location: location.id,
    attackerOrigin: origin.id,
    attacker,
    defender,
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

describe('Neutral Attrition', () => {
  it('registers both canonical forms and banks its Action form', () => {
    expect(getCardPlayRule(ATTRITION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.phase = 'action_before_movement';
    state.players.player_1.actionsRemaining = 1;
    state.players.player_1.zones.hand = [ATTRITION];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ATTRITION,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([ATTRITION]);
  });

  it('sends every chosen Battle Hand card to Graveyard after the Asset owner wins', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ATTRITION];
    beginResolvedBattle(
      state,
      participant('player_1'),
      participant('player_2', {
        initialBattleHand: ['initial-selected', 'initial-unselected'],
        battleDrawPlayed: [
          played('initial-selected', 'player_2', { fromInitialBattleHand: true }),
          played('later-selected', 'player_2', { fromInitialBattleHand: false }),
        ],
        battleDraw: ['initial-unselected', 'later-unselected'],
      }),
    );

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_2.zones.graveyard).toEqual(expect.arrayContaining([
      'initial-selected',
      'later-selected',
    ]));
    expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining([
      'initial-unselected',
      'later-unselected',
    ]));
  });

  it('does not override another destination replacement with the Asset form', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ATTRITION];
    beginResolvedBattle(
      state,
      participant('player_1'),
      participant('player_2', {
        initialBattleHand: ['initial-selected'],
        battleDrawPlayed: [played('initial-selected', 'player_2', {
          fromInitialBattleHand: true,
          cleanupDestination: 'hand',
        })],
      }),
    );

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.players.player_2.zones.hand).toContain('initial-selected');
    expect(state.players.player_2.zones.graveyard).not.toContain('initial-selected');
  });

  it('sends only the initial Battle Hand to Graveyard with its winning Battle form', () => {
    let state = game();
    beginResolvedBattle(
      state,
      participant('player_1', {
        handCommit: {
          cardId: ATTRITION,
          owner: 'player_1',
          origin: 'hand',
          faceDown: false,
          canceled: false,
        },
      }),
      participant('player_2', {
        initialBattleHand: ['initial-selected', 'initial-unselected'],
        battleDrawPlayed: [
          played('initial-selected', 'player_2', {
            fromInitialBattleHand: true,
            cleanupDestination: 'hand',
          }),
          played('later-selected', 'player_2', { fromInitialBattleHand: false }),
        ],
        battleDraw: ['initial-unselected', 'later-unselected'],
      }),
    );

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_1.zones.graveyard).toContain(ATTRITION);
    expect(state.players.player_2.zones.graveyard).toEqual(expect.arrayContaining([
      'initial-selected',
      'initial-unselected',
    ]));
    expect(state.players.player_2.zones.hand).not.toContain('initial-selected');
    expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining([
      'later-selected',
      'later-unselected',
    ]));
  });

  it('does not resolve from an inactive Asset or a canceled Battle card', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ATTRITION];
    state.players.player_1.faceDownAssets = [ATTRITION];
    beginResolvedBattle(
      state,
      participant('player_1', {
        handCommit: {
          cardId: ATTRITION,
          owner: 'player_1',
          origin: 'hand',
          faceDown: false,
          canceled: true,
        },
      }),
      participant('player_2', {
        initialBattleHand: ['initial-selected', 'initial-unselected'],
        battleDrawPlayed: [played('initial-selected', 'player_2', { fromInitialBattleHand: true })],
        battleDraw: ['initial-unselected'],
      }),
    );

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.players.player_2.zones.graveyard).toEqual([]);
    expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining([
      'initial-selected',
      'initial-unselected',
    ]));
  });

  it('targets exact cleanup slots when initial and later Battle Hand cards share an ID', () => {
    let state = game();
    beginResolvedBattle(
      state,
      participant('player_1', {
        handCommit: {
          cardId: ATTRITION,
          owner: 'player_1',
          origin: 'hand',
          faceDown: false,
          canceled: false,
        },
      }),
      participant('player_2', {
        initialBattleHand: ['duplicate', 'duplicate'],
        battleDrawPlayed: [
          played('duplicate', 'player_2', { fromInitialBattleHand: true }),
          played('duplicate', 'player_2', { fromInitialBattleHand: false }),
        ],
        battleDraw: ['duplicate', 'duplicate'],
      }),
    );

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.players.player_2.zones.graveyard.filter((cardId) => cardId === 'duplicate')).toHaveLength(2);
    expect(state.players.player_2.zones.discard.filter((cardId) => cardId === 'duplicate')).toHaveLength(2);
  });

  it('supports Treason copying its Battle effect without creating another physical card', () => {
    let state = game();
    const attacker = participant('player_1');
    const defender = participant('player_2', {
      initialBattleHand: ['initial-selected', 'initial-unselected'],
      battleDrawPlayed: [played('initial-selected', 'player_2', { fromInitialBattleHand: true })],
      battleDraw: ['initial-unselected'],
    });
    beginResolvedBattle(state, attacker, defender);
    state.battle!.effectsResolved.push('treason_copy:player_1:neutral-attrition');

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.players.player_2.zones.graveyard).toEqual(expect.arrayContaining([
      'initial-selected',
      'initial-unselected',
    ]));
  });
});
