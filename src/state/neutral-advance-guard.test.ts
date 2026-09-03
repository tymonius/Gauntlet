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
import {
  ADVANCE_GUARD,
  applyAdvanceGuardBattleEffects,
} from './neutral-advance-guard';
import { toPrivateGameView, toPublicGameView } from './views';

const OTHER_CARD = 'card-valor';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-advance-guard-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: [ADVANCE_GUARD, ADVANCE_GUARD, OTHER_CARD],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: ['card-fortifications', 'card-attrition', OTHER_CARD],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.movementRemaining = 1;
  state.players.player_1.advanceGuardMovementRemaining = 0;
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

function participant(playerId: PlayerID, cards: BattlePlayedCard[] = []): BattleParticipantState {
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
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'advance-guard-battle',
    stage: 'dice',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function playAction(state: GameState): GameState {
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: ADVANCE_GUARD,
  }).state;
}

function placeOpponent(state: GameState, spaceId: string): void {
  const previous = state.board.spaces.find((space) => space.occupant === 'player_2');
  if (previous) previous.occupant = undefined;
  state.board.spaces.find((space) => space.id === spaceId)!.occupant = 'player_2';
  state.players.player_2.occupiedSpaceId = spaceId;
}

describe('Neutral Advance Guard', () => {
  it('registers both canonical forms and removes exactly one Action copy', () => {
    expect(getCardPlayRule(ADVANCE_GUARD)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [ADVANCE_GUARD, ADVANCE_GUARD, OTHER_CARD];
    state = playAction(state);

    expect(state.players.player_1.zones.hand).toEqual([ADVANCE_GUARD, OTHER_CARD]);
    expect(state.players.player_1.zones.discard).toEqual([ADVANCE_GUARD]);
    expect(state.players.player_1.movementRemaining).toBe(2);
    expect(state.players.player_1.advanceGuardMovementRemaining).toBe(1);
    expect(toPublicGameView(state).players.player_1.advanceGuardMovementRemaining).toBe(1);
  });

  it('can be played only before movement', () => {
    const state = game();
    state.phase = 'action_after_movement';
    state.players.player_1.zones.hand = [ADVANCE_GUARD];

    expect(() => playAction(state)).toThrow(/only during the Action Opportunity before movement/);
  });

  it('spends ordinary movement first, so a first-position battle still permits a hand commitment', () => {
    let state = game();
    state.players.player_1.zones.hand = [ADVANCE_GUARD, OTHER_CARD];
    state = playAction(state);
    state.phase = 'movement';
    placeOpponent(state, 'space-1');

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-1',
    }).state;

    expect(state.battle?.handCommitProhibitedFor).toBeUndefined();
    state = applyGameAction(state, {
      type: 'commit_battle_hand_card',
      playerId: 'player_1',
      cardId: OTHER_CARD,
    }).state;
    expect(state.battle?.attacker.handCommit?.cardId).toBe(OTHER_CARD);
  });

  it('prohibits a hand commitment when the additional position initiates battle', () => {
    let state = game();
    state.players.player_1.zones.hand = [ADVANCE_GUARD, OTHER_CARD];
    state = playAction(state);
    state.phase = 'movement';

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-1',
    }).state;
    expect(state.phase).toBe('movement');
    expect(state.players.player_1.movementRemaining).toBe(1);
    expect(state.players.player_1.advanceGuardMovementRemaining).toBe(1);

    placeOpponent(state, 'space-2');
    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-2',
    }).state;

    expect(state.battle?.handCommitProhibitedFor).toEqual(['player_1']);
    expect(state.players.player_1.advanceGuardMovementRemaining).toBe(0);
    expect(toPublicGameView(state).battle?.handCommitProhibitedFor).toEqual(['player_1']);
    expect(toPrivateGameView(state, 'player_1').battle?.legalBattlePlays).toEqual([
      { action: 'pass_battle_hand_commit' },
    ]);
    expect(() => applyGameAction(state, {
      type: 'commit_battle_hand_card',
      playerId: 'player_1',
      cardId: OTHER_CARD,
    })).toThrow(/prevents this player from committing/);

    state = applyGameAction(state, {
      type: 'pass_battle_hand_commit',
      playerId: 'player_1',
    }).state;
    expect(state.battle?.attacker.passedHandCommit).toBe(true);
  });

  it('consumes the extra position on unopposed movement and clears it when movement ends', () => {
    let state = game();
    state.players.player_1.zones.hand = [ADVANCE_GUARD];
    state = playAction(state);
    state.phase = 'movement';

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-1',
    }).state;
    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-2',
    }).state;

    expect(state.phase).toBe('action_after_movement');
    expect(state.players.player_1.movementRemaining).toBe(0);
    expect(state.players.player_1.advanceGuardMovementRemaining).toBe(0);

    state.phase = 'movement';
    state.players.player_1.movementRemaining = 1;
    state.players.player_1.advanceGuardMovementRemaining = 1;
    state = applyGameAction(state, {
      type: 'finish_movement',
      playerId: 'player_1',
    }).state;
    expect(state.players.player_1.advanceGuardMovementRemaining).toBe(0);
  });

  it('clears unused Advance Guard movement across turn transitions', () => {
    let state = game();
    state.players.player_1.advanceGuardMovementRemaining = 1;
    state.players.player_1.movementRemaining = 2;

    state = applyGameAction(state, {
      type: 'end_turn',
      playerId: 'player_1',
    }).state;

    expect(state.players.player_1.advanceGuardMovementRemaining).toBe(0);
  });

  it('grants advantage per active Battle copy only to an attacker with no hand commitment', () => {
    let state = game();
    beginBattle(
      state,
      [played(ADVANCE_GUARD, 'player_1'), played(ADVANCE_GUARD, 'player_1')],
      [played(ADVANCE_GUARD, 'player_2')],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.advantage).toBe(2);
    expect(state.battle?.defender.advantage ?? 0).toBe(0);
  });

  it('grants no advantage if the attacker committed any card from hand', () => {
    let state = game();
    beginBattle(state, [
      played(OTHER_CARD, 'player_1', 'hand'),
      played(ADVANCE_GUARD, 'player_1'),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.advantage ?? 0).toBe(0);
  });

  it('ignores canceled and negated copies and resolves only once', () => {
    let state = game();
    beginBattle(state, [
      played(ADVANCE_GUARD, 'player_1', 'battle_draw', { canceled: true }),
      played(ADVANCE_GUARD, 'player_1', 'battle_draw', { negated: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    applyAdvanceGuardBattleEffects(state);

    expect(state.battle?.attacker.advantage ?? 0).toBe(0);
    expect(state.battle?.effectsResolved.filter((key) => key === 'neutral_advance_guard_battle')).toHaveLength(1);
  });
});
