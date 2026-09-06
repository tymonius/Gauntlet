import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import { buildBattleRevealOptions } from '../dev/battle-reveal-options';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { DISRUPTION } from './neutral-disruption';

const DECOYS = 'neutral-decoys';
const VALOR = 'card-valor';
const FORTIFICATIONS = 'card-fortifications';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-disruption-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Disruptor',
        factionId: 'military',
        leaderName: 'General',
        deck: [DISRUPTION, DISRUPTION, VALOR],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [DECOYS, VALOR, FORTIFICATIONS],
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
): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin,
    faceDown: false,
    canceled: false,
  };
}

function participant(
  playerId: PlayerID,
  handCommit?: BattlePlayedCard,
  battleDrawPlayed: BattlePlayedCard[] = [],
): BattleParticipantState {
  return {
    playerId,
    handCommit,
    passedHandCommit: !handCommit,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed,
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, battleDrawPlayed.length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[],
  defenderCards: BattlePlayedCard[],
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'disruption-battle',
    stage: 'dice',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant(
      'player_1',
      attackerCards.find((card) => card.origin === 'hand'),
      attackerCards.filter((card) => card.origin === 'battle_draw'),
    ),
    defender: participant(
      'player_2',
      defenderCards.find((card) => card.origin === 'hand'),
      defenderCards.filter((card) => card.origin === 'battle_draw'),
    ),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

afterEach(() => vi.restoreAllMocks());

describe('Neutral Disruption', () => {
  it('registers both canonical play forms', () => {
    expect(getCardPlayRule(DISRUPTION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
    });
  });

  it('discards one random opposing hand card as an Action', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    let state = game();
    state.players.player_1.zones.hand = [DISRUPTION];
    state.players.player_2.zones.hand = [DECOYS, VALOR, FORTIFICATIONS];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: DISRUPTION,
    }).state;

    expect(state.players.player_1.zones.discard).toContain(DISRUPTION);
    expect(state.players.player_2.zones.hand).toEqual([DECOYS, FORTIFICATIONS]);
    expect(state.players.player_2.zones.discard).toContain(VALOR);
    expect(state.log.at(-1)).toMatchObject({
      type: 'neutral_disruption_action',
      payload: { opponentId: 'player_2', cardId: VALOR },
    });
  });

  it('cannot be played for its Action effect against an empty hand', () => {
    const state = game();
    state.players.player_1.zones.hand = [DISRUPTION];
    state.players.player_2.zones.hand = [];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: DISRUPTION,
    })).toThrow('at least one card in hand');
    expect(state.players.player_1.zones.hand).toEqual([DISRUPTION]);
  });

  it('cancels the chosen active opposing Battle card', () => {
    let state = game();
    beginBattle(
      state,
      [played(DISRUPTION, 'player_1', 'hand')],
      [played(VALOR, 'player_2', 'hand')],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
      battleCardTargets: [{
        sourceCardId: DISRUPTION,
        sourceOwner: 'player_1',
        targetCardId: VALOR,
        targetOwner: 'player_2',
      }],
    }).state;

    expect(state.battle?.defender.handCommit).toMatchObject({ cardId: VALOR, canceled: true });
    expect(state.battle?.resolvedCancellations).toEqual([
      expect.objectContaining({ cardId: VALOR, owner: 'player_2', source: DISRUPTION }),
    ]);
  });

  it('requires Decoys to be canceled first', () => {
    let state = game();
    beginBattle(
      state,
      [played(DISRUPTION, 'player_1', 'hand')],
      [played(VALOR, 'player_2', 'hand'), played(DECOYS, 'player_2')],
    );

    const options = buildBattleRevealOptions(state, 'player_1');
    expect(options).toHaveLength(1);
    expect(options[0].action).toMatchObject({
      battleCardTargets: [expect.objectContaining({
        sourceCardId: DISRUPTION,
        targetCardId: DECOYS,
      })],
    });

    expect(() => applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
      battleCardTargets: [{
        sourceCardId: DISRUPTION,
        sourceOwner: 'player_1',
        targetCardId: VALOR,
        targetOwner: 'player_2',
      }],
    })).toThrow('Decoys must be canceled before another active Battle card');
  });

  it('resolves stacked cancellation cards through Decoys before another title', () => {
    const state = game();
    beginBattle(
      state,
      [
        played(DISRUPTION, 'player_1', 'hand'),
        played(DISRUPTION, 'player_1'),
      ],
      [played(VALOR, 'player_2', 'hand'), played(DECOYS, 'player_2')],
    );

    const options = buildBattleRevealOptions(state, 'player_1');
    expect(options).toHaveLength(1);
    expect(options[0].action).toMatchObject({
      battleCardTargets: [
        expect.objectContaining({ sourceCardId: DISRUPTION, targetCardId: DECOYS }),
        expect.objectContaining({ sourceCardId: DISRUPTION, targetCardId: VALOR }),
      ],
    });
  });
});
