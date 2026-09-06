import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { CONSCRIPTION } from './neutral-conscription';
import { toPrivateGameView, toPublicGameView } from './views';

const FEALTY = 'neutral-fealty';
const ROUSING_SPEECH = 'neutral-rousing-speech';
const RALLYING_CRY = 'neutral-rallying-cry';
const RESERVE_FORCE = 'military-reserve-force';
const BATTLE_ONE = 'card-valor';
const BATTLE_TWO = 'card-fortifications';
const BATTLE_THREE = 'card-attrition';
const BATTLE_FOUR = 'card-conscription';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-conscription-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Conscription Player',
        factionId: 'military',
        leaderName: 'General',
        deck: [
          CONSCRIPTION,
          CONSCRIPTION,
          FEALTY,
          ROUSING_SPEECH,
          RALLYING_CRY,
          RESERVE_FORCE,
          BATTLE_ONE,
          BATTLE_TWO,
          BATTLE_THREE,
          BATTLE_FOUR,
        ],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: [BATTLE_ONE, BATTLE_TWO, BATTLE_THREE, BATTLE_FOUR],
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
    id: 'conscription-battle',
    stage: 'hand_commit',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Conscription', () => {
  it('registers both canonical forms with normal discard destinations', () => {
    expect(getCardPlayRule(CONSCRIPTION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: false,
    });
  });

  it('draws one card and privately offers eligible Asset cards without another Action Opportunity', () => {
    let state = game();
    state.players.player_1.zones.hand = [CONSCRIPTION, FEALTY, RALLYING_CRY];
    state.players.player_1.zones.deck = [ROUSING_SPEECH];

    const result = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONSCRIPTION,
    });
    state = result.state;

    expect(result.result?.drawnCards).toEqual([ROUSING_SPEECH]);
    expect(state.players.player_1.zones.hand).toEqual([FEALTY, RALLYING_CRY, ROUSING_SPEECH]);
    expect(state.players.player_1.zones.discard).toContain(CONSCRIPTION);
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'conscription_action',
      playerId: 'player_1',
      cardOptions: expect.arrayContaining([FEALTY, ROUSING_SPEECH]),
    });
    expect(state.pendingNeutralChoice && 'cardOptions' in state.pendingNeutralChoice
      ? state.pendingNeutralChoice.cardOptions
      : []).not.toContain(RALLYING_CRY);
    expect(toPublicGameView(state).pendingNeutralChoice).toBeUndefined();
    expect(toPrivateGameView(state, 'player_2').pendingNeutralChoice).toBeUndefined();
    expect(toPrivateGameView(state, 'player_1').legalActionPlays?.map((option) => option.cardId))
      .toEqual(expect.arrayContaining([FEALTY, ROUSING_SPEECH]));
  });

  it('immediately plays the selected Asset through its normal Action pipeline without spending another opportunity', () => {
    let state = game();
    state.players.player_1.zones.hand = [CONSCRIPTION, FEALTY];
    state.players.player_1.zones.deck = [RALLYING_CRY];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONSCRIPTION,
    }).state;
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FEALTY,
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toContain(FEALTY);
    expect(state.players.player_1.zones.hand).toEqual([RALLYING_CRY]);
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(true);
    expect(state.log.some((event) => event.type === 'neutral_conscription_action_asset')).toBe(true);
  });

  it('may decline the immediate Asset play', () => {
    let state = game();
    state.players.player_1.zones.hand = [CONSCRIPTION, FEALTY];
    state.players.player_1.zones.deck = [RALLYING_CRY];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONSCRIPTION,
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.hand).toEqual([FEALTY, RALLYING_CRY]);
    expect(state.players.player_1.zones.assetBank).not.toContain(FEALTY);
    expect(state.players.player_1.actionsRemaining).toBe(0);
  });

  it('removes exactly one physical Conscription copy', () => {
    let state = game();
    state.players.player_1.zones.hand = [CONSCRIPTION, CONSCRIPTION, RALLYING_CRY];
    state.players.player_1.zones.deck = [BATTLE_ONE];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONSCRIPTION,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([CONSCRIPTION, RALLYING_CRY, BATTLE_ONE]);
    expect(state.players.player_1.zones.discard.filter((cardId) => cardId === CONSCRIPTION)).toHaveLength(1);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('exposes target-requiring Asset cards as legal Conscription plays', () => {
    let state = game();
    state.players.player_1.zones.hand = [CONSCRIPTION, RESERVE_FORCE];
    state.players.player_1.zones.deck = [RALLYING_CRY];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONSCRIPTION,
    }).state;

    expect(toPrivateGameView(state, 'player_1').legalActionPlays).toContainEqual(expect.objectContaining({
      cardId: RESERVE_FORCE,
      destination: 'asset_bank',
      requiresTarget: true,
    }));
  });

  it('draws and may choose one additional initial Battle Hand card when committed from hand', () => {
    let state = game();
    beginBattle(state);
    state.players.player_1.zones.hand = [CONSCRIPTION];
    state.players.player_1.zones.deck = [BATTLE_ONE, BATTLE_TWO, BATTLE_THREE, BATTLE_FOUR];
    state.players.player_2.zones.deck = [BATTLE_ONE, BATTLE_TWO, BATTLE_THREE];

    state = applyGameAction(state, {
      type: 'commit_battle_hand_card',
      playerId: 'player_1',
      cardId: CONSCRIPTION,
    }).state;
    expect(state.battle?.attacker.battleDrawCount).toBe(4);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(2);

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
      cardId: BATTLE_ONE,
    }).state;
    state = applyGameAction(state, {
      type: 'play_battle_draw_card',
      playerId: 'player_1',
      cardId: BATTLE_TWO,
    }).state;

    expect(state.battle?.attacker.battleDrawPlayed.map((card) => card.cardId)).toEqual([BATTLE_ONE, BATTLE_TWO]);
    expect(state.battle?.attacker.battleDraw).toEqual([BATTLE_THREE, BATTLE_FOUR]);
  });

  it('does not grant the bonus when selected from the Battle Hand', () => {
    let state = game();
    beginBattle(state);
    state.players.player_1.zones.deck = [CONSCRIPTION, BATTLE_ONE, BATTLE_TWO];
    state.players.player_2.zones.deck = [BATTLE_ONE, BATTLE_TWO, BATTLE_THREE];

    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    state = applyGameAction(state, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    state = applyGameAction(state, {
      type: 'play_battle_draw_card',
      playerId: 'player_1',
      cardId: CONSCRIPTION,
    }).state;

    expect(state.battle?.attacker.battleDrawCount).toBe(3);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(1);
  });
});
