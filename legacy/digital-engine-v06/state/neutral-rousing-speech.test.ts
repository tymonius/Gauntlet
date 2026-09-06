import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { ILLEGAL_OCCUPATION } from './neutral-illegal-occupation';
import {
  applyRousingSpeechBattleEffects,
  captureRousingSpeechAssetSnapshot,
  registerRousingSpeechAssetTriggers,
  ROUSING_SPEECH,
} from './neutral-rousing-speech';
import { toPrivateGameView, toPublicGameView } from './views';

const BANKED_CARD = 'card-fortifications';
const DRAW_CARD = 'draw-card';
const KEEP_CARD = 'keep-card';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-rousing-speech-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: ['p1-draw'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [DRAW_CARD, 'p2-draw-two'],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.phase = 'action_before_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  return state;
}

function played(
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId: ROUSING_SPEECH,
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
    battleDrawPlayLimit: 3,
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
    id: 'rousing-speech-battle',
    stage: 'dice',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function bankAnAsset(state: GameState): GameState {
  state.players.player_1.zones.hand = [BANKED_CARD];
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: BANKED_CARD,
  }).state;
}

describe('Neutral Rousing Speech', () => {
  it('registers both canonical forms and banks its Action form', () => {
    expect(getCardPlayRule(ROUSING_SPEECH)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });
  });

  it('may draw one and then must discard one when the opponent banks an Asset', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ROUSING_SPEECH];
    state.players.player_2.zones.hand = [KEEP_CARD];

    state = bankAnAsset(state);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'rousing_speech_asset',
      playerId: 'player_2',
      sourcePlayerId: 'player_1',
      triggersRemaining: 1,
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
    }).state;
    expect(state.players.player_2.zones.hand).toEqual([KEEP_CARD, DRAW_CARD]);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'rousing_speech_discard',
      cardOptions: [KEEP_CARD, DRAW_CARD],
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'select_card',
      cardId: DRAW_CARD,
    }).state;
    expect(state.players.player_2.zones.hand).toEqual([KEEP_CARD]);
    expect(state.players.player_2.zones.discard).toContain(DRAW_CARD);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('may decline all remaining triggers for the banked Asset', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ROUSING_SPEECH, ROUSING_SPEECH];
    state.players.player_2.zones.hand = [KEEP_CARD];

    state = bankAnAsset(state);
    expect(state.pendingNeutralChoice).toMatchObject({ triggersRemaining: 2 });
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'pass',
    }).state;

    expect(state.players.player_2.zones.hand).toEqual([KEEP_CARD]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('resolves stacked physical copies sequentially', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ROUSING_SPEECH, ROUSING_SPEECH];
    state.players.player_2.zones.hand = [KEEP_CARD];

    state = bankAnAsset(state);
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'use',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'select_card', cardId: DRAW_CARD,
    }).state;

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'rousing_speech_asset',
      triggersRemaining: 1,
    });
  });

  it('does not trigger when an existing Asset merely changes facing', () => {
    const state = game();
    state.players.player_1.zones.assetBank = [BANKED_CARD];
    state.players.player_2.zones.assetBank = [ROUSING_SPEECH];
    const before = captureRousingSpeechAssetSnapshot(state);
    state.players.player_1.faceDownAssets = [BANKED_CARD];
    state.players.player_1.faceDownAssets = [];

    expect(registerRousingSpeechAssetTriggers(state, before, 'player_1')).toBe(0);
    expect(state.neutralRousingSpeechAssetQueue).toBeUndefined();
  });

  it('does not trigger while the Rousing Speech Asset is inactive', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ILLEGAL_OCCUPATION];
    state.players.player_2.zones.assetBank = [ROUSING_SPEECH];
    const occupied = state.board.spaces.find((space) => space.kind === 'territory')!;
    for (const space of state.board.spaces) space.occupant = undefined;
    occupied.controller = 'player_1';
    occupied.occupant = 'player_2';
    state.players.player_2.occupiedSpaceId = occupied.id;

    state = bankAnAsset(state);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('keeps the mandatory discard options private', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ROUSING_SPEECH];
    state.players.player_2.zones.hand = [KEEP_CARD];
    state = bankAnAsset(state);
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'use',
    }).state;

    expect(toPublicGameView(state).pendingNeutralChoice).toBeUndefined();
    expect(toPrivateGameView(state, 'player_2').pendingNeutralChoice).toMatchObject({
      kind: 'rousing_speech_discard',
      cardOptions: [KEEP_CARD, DRAW_CARD],
    });
  });

  it('gains one advantage per active copy when the opponent has more face-up Assets', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [BANKED_CARD];
    state.players.player_2.zones.assetBank = [BANKED_CARD, 'neutral-entrenchment'];
    beginBattle(state, [played('player_1'), played('player_1')]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.advantage).toBe(2);
    expect(applyRousingSpeechBattleEffects(state)).toBe(0);
    expect(state.battle?.attacker.advantage).toBe(2);
  });

  it('counts only face-up Assets and ignores canceled, negated, and virtual copies', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [BANKED_CARD];
    state.players.player_2.zones.assetBank = [BANKED_CARD, 'neutral-entrenchment'];
    state.players.player_2.faceDownAssets = ['neutral-entrenchment'];
    beginBattle(state, [
      played('player_1', 'battle_draw', { canceled: true }),
      played('player_1', 'battle_draw', { negated: true }),
      played('player_1', 'battle_draw', { virtual: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.advantage ?? 0).toBe(0);
  });
});
