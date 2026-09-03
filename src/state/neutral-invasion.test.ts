import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type { BattleParticipantState, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { INVASION } from './neutral-invasion';

const RALLYING_CRY = 'neutral-rallying-cry';
const FORCED_MARCH = 'neutral-forced-march';
const FEALTY = 'neutral-fealty';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-invasion-canonical-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Attacker',
        factionId: 'military',
        leaderName: 'General',
        deck: [INVASION, RALLYING_CRY, FORCED_MARCH, FEALTY, 'p1-extra'],
        territories: ['territory-high-ground', 'territory-watchtower', 'territory-garrison'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [INVASION, RALLYING_CRY, FORCED_MARCH, FEALTY, 'p2-extra'],
        territories: ['territory-supply-depot', 'territory-old-battlefield', 'territory-refuge'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.movementRemaining = 1;
  return state;
}

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: false,
    passedBattleDrawPlay: false,
    hasDrawnBattleCards: false,
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

function beginBattle(state: GameState): void {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.id === 'space-3')!;
  const location = state.board.spaces.find((space) => space.id === 'space-4')!;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  location.controller = 'player_2';
  location.revealed = true;
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `invasion-battle-${state.log.length + 1}`,
    stage: 'hand_commit',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function commit(state: GameState, playerId: PlayerID, cardId: string): GameState {
  state.players[playerId].zones.hand = [cardId];
  return applyGameAction(state, {
    type: 'commit_battle_hand_card',
    playerId,
    cardId,
  }).state;
}

function passCommit(state: GameState, playerId: PlayerID): GameState {
  return applyGameAction(state, {
    type: 'pass_battle_hand_commit',
    playerId,
  }).state;
}

function drawBattleHand(state: GameState, playerId: PlayerID): GameState {
  return applyGameAction(state, {
    type: 'draw_battle_cards',
    playerId,
  }).state;
}

describe('Neutral Invasion', () => {
  it('registers both canonical forms with normal destinations', () => {
    expect(getCardPlayRule(INVASION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
    });
  });

  it('grants two advance-only movement positions from its Action form', () => {
    let state = game();
    state.players.player_1.zones.hand = [INVASION];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: INVASION,
    }).state;

    expect(state.players.player_1.zones.discard).toContain(INVASION);
    expect(state.players.player_1.movementRemaining).toBe(3);
    expect(state.players.player_1.invasionAdvanceMovementRemaining).toBe(2);
  });

  it('adds one card and one selection when the attacker commits Invasion before formation', () => {
    let state = game();
    beginBattle(state);
    state = commit(state, 'player_1', INVASION);
    state = passCommit(state, 'player_2');

    expect(state.battle?.attacker.battleDrawCount).toBe(4);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(2);
    expect(state.battle?.defender.battleDrawCount).toBe(3);
    expect(state.battle?.defender.battleDrawPlayLimit).toBe(1);

    state.players.player_1.zones.deck = [RALLYING_CRY, FORCED_MARCH, FEALTY, 'p1-extra'];
    state.players.player_2.zones.deck = [RALLYING_CRY, FORCED_MARCH, FEALTY];
    state = drawBattleHand(state, 'player_1');
    state = drawBattleHand(state, 'player_2');

    expect(state.battle?.attacker.initialBattleHand).toHaveLength(4);
    expect(state.battle?.defender.initialBattleHand).toHaveLength(3);

    state = applyGameAction(state, {
      type: 'play_battle_draw_card', playerId: 'player_1', cardId: RALLYING_CRY,
    }).state;
    expect(state.battle?.attacker.passedBattleDrawPlay).toBe(false);
    state = applyGameAction(state, {
      type: 'play_battle_draw_card', playerId: 'player_1', cardId: FORCED_MARCH,
    }).state;
    expect(state.battle?.attacker.battleDrawPlayed).toHaveLength(2);
  });

  it('does not grant the formation bonus to a defending hand commitment', () => {
    let state = game();
    beginBattle(state);
    state = passCommit(state, 'player_1');
    state = commit(state, 'player_2', INVASION);

    expect(state.battle?.attacker.battleDrawCount).toBe(3);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(1);
    expect(state.battle?.defender.battleDrawCount).toBe(3);
    expect(state.battle?.defender.battleDrawPlayLimit).toBe(1);
  });

  it('does not reopen formation when Invasion is selected from the Battle Hand', () => {
    let state = game();
    beginBattle(state);
    state = passCommit(state, 'player_1');
    state = passCommit(state, 'player_2');
    state.players.player_1.zones.deck = [INVASION, RALLYING_CRY, FORCED_MARCH];
    state.players.player_2.zones.deck = [RALLYING_CRY, FORCED_MARCH, FEALTY];
    state = drawBattleHand(state, 'player_1');
    state = drawBattleHand(state, 'player_2');

    state = applyGameAction(state, {
      type: 'play_battle_draw_card',
      playerId: 'player_1',
      cardId: INVASION,
    }).state;

    expect(state.battle?.attacker.battleDrawCount).toBe(3);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(1);
    expect(state.battle?.attacker.initialBattleHand).toHaveLength(3);
  });

  it('creates no post-reveal draw or special Invasion choice', () => {
    let state = game();
    beginBattle(state);
    state = commit(state, 'player_1', INVASION);
    state = passCommit(state, 'player_2');
    state.players.player_1.zones.deck = [RALLYING_CRY, FORCED_MARCH, FEALTY, 'p1-extra'];
    state.players.player_2.zones.deck = [RALLYING_CRY, FORCED_MARCH, FEALTY];
    state = drawBattleHand(state, 'player_1');
    state = drawBattleHand(state, 'player_2');
    state = applyGameAction(state, {
      type: 'play_battle_draw_card', playerId: 'player_1', cardId: RALLYING_CRY,
    }).state;
    state = applyGameAction(state, {
      type: 'play_battle_draw_card', playerId: 'player_1', cardId: FORCED_MARCH,
    }).state;
    state = applyGameAction(state, {
      type: 'pass_battle_draw_play', playerId: 'player_2',
    }).state;

    const deckBefore = [...state.players.player_1.zones.deck];
    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.deck).toEqual(deckBefore);
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
  });
});
