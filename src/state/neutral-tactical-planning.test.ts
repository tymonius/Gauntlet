import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { TACTICAL_PLANNING } from './neutral-tactical-planning';
import { toPrivateGameView, toPublicGameView } from './views';

const FIRST = 'card-valor';
const SECOND = 'card-fortifications';
const THIRD = 'card-attrition';
const FOURTH = 'card-conscription';
const TAIL = 'neutral-rallying-cry';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-tactical-planning-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Planner',
        factionId: 'military',
        leaderName: 'General',
        deck: [TACTICAL_PLANNING, TACTICAL_PLANNING, FIRST, SECOND, THIRD, FOURTH, TAIL],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [FIRST, SECOND, THIRD, TAIL],
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

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: false,
    passedBattleDrawPlay: false,
    hasDrawnBattleCards: false,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(state: GameState): void {
  for (const space of state.board.spaces) delete space.occupant;
  state.board.spaces.find((space) => space.id === 'space-1')!.occupant = 'player_1';
  state.board.spaces.find((space) => space.id === 'space-2')!.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = 'space-1';
  state.players.player_2.occupiedSpaceId = 'space-2';
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'tactical-planning-battle',
    stage: 'hand_commit',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Tactical Planning', () => {
  it('registers both canonical forms with normal discard destinations', () => {
    expect(getCardPlayRule(TACTICAL_PLANNING)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: false,
    });
  });

  it('draws two cards, then privately places one chosen hand card on the bottom of the Draw Pile', () => {
    let state = game();
    state.players.player_1.zones.hand = [TACTICAL_PLANNING, FIRST];
    state.players.player_1.zones.deck = [SECOND, THIRD, TAIL];

    const result = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: TACTICAL_PLANNING,
    });
    state = result.state;

    expect(result.result?.drawnCards).toEqual([SECOND, THIRD]);
    expect(state.players.player_1.zones.hand).toEqual([FIRST, SECOND, THIRD]);
    expect(state.players.player_1.zones.discard).toEqual([TACTICAL_PLANNING]);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'tactical_planning_action',
      playerId: 'player_1',
      cardOptions: expect.arrayContaining([FIRST, SECOND, THIRD]),
    });
    expect(toPublicGameView(state).pendingNeutralChoice).toBeUndefined();
    expect(toPrivateGameView(state, 'player_1').pendingNeutralChoice).toMatchObject({
      kind: 'tactical_planning_action',
    });
    expect(toPrivateGameView(state, 'player_2').pendingNeutralChoice).toBeUndefined();

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: FIRST,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([SECOND, THIRD]);
    expect(state.players.player_1.zones.deck).toEqual([TAIL, FIRST]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('removes exactly one physical Action copy and may bottom-deck another copy', () => {
    let state = game();
    state.players.player_1.zones.hand = [TACTICAL_PLANNING, TACTICAL_PLANNING, FIRST];
    state.players.player_1.zones.deck = [SECOND, THIRD];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: TACTICAL_PLANNING,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([
      TACTICAL_PLANNING,
      FIRST,
      SECOND,
      THIRD,
    ]);
    expect(state.players.player_1.zones.discard).toEqual([TACTICAL_PLANNING]);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: TACTICAL_PLANNING,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([FIRST, SECOND, THIRD]);
    expect(state.players.player_1.zones.deck).toEqual([TACTICAL_PLANNING]);
    expect(state.players.player_1.zones.discard).toEqual([TACTICAL_PLANNING]);
  });

  it('adds exactly one card to the initial Battle Hand when committed from hand', () => {
    let state = game();
    beginBattle(state);
    state.players.player_1.zones.hand = [TACTICAL_PLANNING];
    state.players.player_1.zones.deck = [FIRST, SECOND, THIRD, FOURTH, TAIL];
    state.players.player_2.zones.deck = [FIRST, SECOND, THIRD];

    state = applyGameAction(state, {
      type: 'commit_battle_hand_card',
      playerId: 'player_1',
      cardId: TACTICAL_PLANNING,
    }).state;
    expect(state.battle?.attacker.battleDrawCount).toBe(4);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(1);

    state = applyGameAction(state, {
      type: 'pass_battle_hand_commit',
      playerId: 'player_2',
    }).state;
    const drawResult = applyGameAction(state, {
      type: 'draw_battle_cards',
      playerId: 'player_1',
    });
    state = drawResult.state;

    expect(drawResult.result?.battleDrawnCards).toEqual([FIRST, SECOND, THIRD, FOURTH]);
    expect(state.battle?.attacker.battleDraw).toEqual([FIRST, SECOND, THIRD, FOURTH]);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(1);
  });

  it('does not apply the draw bonus when selected from the Battle Hand', () => {
    let state = game();
    beginBattle(state);
    state.players.player_1.zones.deck = [TACTICAL_PLANNING, FIRST, SECOND, TAIL];
    state.players.player_2.zones.deck = [FIRST, SECOND, THIRD];

    state = applyGameAction(state, {
      type: 'pass_battle_hand_commit',
      playerId: 'player_1',
    }).state;
    state = applyGameAction(state, {
      type: 'pass_battle_hand_commit',
      playerId: 'player_2',
    }).state;
    state = applyGameAction(state, {
      type: 'draw_battle_cards',
      playerId: 'player_1',
    }).state;
    state = applyGameAction(state, {
      type: 'draw_battle_cards',
      playerId: 'player_2',
    }).state;

    expect(state.battle?.attacker.battleDraw).toEqual([TACTICAL_PLANNING, FIRST, SECOND]);
    state = applyGameAction(state, {
      type: 'play_battle_draw_card',
      playerId: 'player_1',
      cardId: TACTICAL_PLANNING,
    }).state;

    expect(state.battle?.attacker.battleDrawCount).toBe(3);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(1);
  });

  it('does not grant its hand-commitment bonus a second time when another setup card is selected', () => {
    let state = game();
    beginBattle(state);
    state.players.player_1.zones.hand = [TACTICAL_PLANNING];
    state.players.player_1.zones.deck = [FOURTH, FIRST, SECOND, THIRD];
    state.players.player_2.zones.deck = [FIRST, SECOND, THIRD];

    state = applyGameAction(state, {
      type: 'commit_battle_hand_card',
      playerId: 'player_1',
      cardId: TACTICAL_PLANNING,
    }).state;
    state = applyGameAction(state, {
      type: 'pass_battle_hand_commit',
      playerId: 'player_2',
    }).state;
    state = applyGameAction(state, {
      type: 'draw_battle_cards',
      playerId: 'player_1',
    }).state;
    state = applyGameAction(state, {
      type: 'draw_battle_cards',
      playerId: 'player_2',
    }).state;
    state = applyGameAction(state, {
      type: 'play_battle_draw_card',
      playerId: 'player_1',
      cardId: FOURTH,
    }).state;

    expect(state.battle?.attacker.battleDrawCount).toBe(4);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(2);
  });
});
