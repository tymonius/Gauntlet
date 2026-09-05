import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { DIVINE_MERCY } from './inquisition-divine-mercy';
import { initializeGame } from './initialize';
import {
  captureDiscardSnapshot,
  openNextRedemptionChoice,
  REDEMPTION,
  registerRedemptionDiscardEntries,
} from './neutral-redemption';
import { toPublicGameView } from './views';

const FIRST = 'card-valor';
const SECOND = 'card-fortifications';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-redemption-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [DIVINE_MERCY, 'neutral-rallying-cry', FIRST],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'military',
        leaderName: 'General',
        deck: [REDEMPTION, REDEMPTION, SECOND],
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
    diceRoll: playerId === 'player_1' ? 6 : 1,
    modifiers: 0,
    retreated: false,
  };
}

function beginResolvedBattle(
  state: GameState,
  defenderPlayed: BattlePlayedCard[],
): void {
  // Isolate Redemption from the Inquisition's separate Condemnation destination override.
  state.players.player_1.inquisition = undefined;
  for (const space of state.board.spaces) space.occupant = undefined;
  state.board.spaces.find((space) => space.id === 'space-1')!.occupant = 'player_1';
  state.board.spaces.find((space) => space.id === 'space-2')!.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = 'space-1';
  state.players.player_2.occupiedSpaceId = 'space-2';
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'redemption-battle',
    stage: 'resolution',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1'),
    defender: participant(
      'player_2',
      played(REDEMPTION, 'player_2', 'hand'),
      defenderPlayed,
    ),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

describe('Neutral Redemption', () => {
  it('registers both canonical forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(REDEMPTION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [REDEMPTION];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: REDEMPTION,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([REDEMPTION]);
  });

  it('opens after an opposing effect puts a card in the protected player’s Discard Pile', () => {
    let state = game();
    state.players.player_1.zones.hand = [DIVINE_MERCY];
    state.players.player_2.zones.assetBank = [REDEMPTION];
    state.players.player_2.zones.graveyard = [FIRST];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: DIVINE_MERCY,
      targets: [{ kind: 'card', owner: 'player_2', cardId: FIRST }],
    }).state;

    expect(state.players.player_2.zones.discard).toContain(FIRST);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'redemption_asset',
      playerId: 'player_2',
      sourcePlayerId: 'player_1',
      cardOptions: [FIRST],
    });
    expect(toPublicGameView(state).pendingNeutralChoice).toEqual(state.pendingNeutralChoice);
  });

  it('discards the Asset and returns the chosen card to hand after the effect', () => {
    let state = game();
    state.players.player_1.zones.hand = [DIVINE_MERCY];
    state.players.player_2.zones.assetBank = [REDEMPTION];
    state.players.player_2.zones.graveyard = [FIRST];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: DIVINE_MERCY,
      targets: [{ kind: 'card', owner: 'player_2', cardId: FIRST }],
    }).state;

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      cardId: FIRST,
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual([]);
    expect(state.players.player_2.zones.hand).toContain(FIRST);
    expect(state.players.player_2.zones.discard).toEqual([REDEMPTION]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('allows each banked copy to answer one card from the same effect', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [REDEMPTION, REDEMPTION];
    const before = captureDiscardSnapshot(state);
    state.players.player_2.zones.discard = [FIRST, SECOND];
    expect(registerRedemptionDiscardEntries(state, before, 'player_1')).toBe(1);
    expect(openNextRedemptionChoice(state)).toBe(true);

    let next = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      cardId: FIRST,
    }).state;
    expect(next.pendingNeutralChoice).toMatchObject({ kind: 'redemption_asset', triggersRemaining: 1 });

    next = applyGameAction(next, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      cardId: SECOND,
    }).state;
    expect(next.players.player_2.zones.hand).toEqual(expect.arrayContaining([FIRST, SECOND]));
    expect(next.players.player_2.zones.discard).toEqual([REDEMPTION, REDEMPTION]);
    expect(next.pendingNeutralChoice).toBeUndefined();
  });

  it('does not react to the protected player’s own discard or while banked Assets are prohibited', () => {
    let own = game();
    own.players.player_1.zones.assetBank = [REDEMPTION];
    own.players.player_1.zones.hand = ['neutral-rallying-cry'];
    own.players.player_1.zones.deck = [FIRST];
    own = applyGameAction(own, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'neutral-rallying-cry',
    }).state;
    expect(own.pendingNeutralChoice).toBeUndefined();

    const suppressed = game();
    suppressed.players.player_2.zones.assetBank = [REDEMPTION];
    suppressed.phase = 'battle';
    suppressed.battle = {
      id: 'suppressed-redemption-battle',
      stage: 'dice',
      location: 'space-1',
      attackerOrigin: 'player_1-heartland',
      attacker: participant('player_1'),
      defender: participant('player_2'),
      tiePolicy: 'defender',
      effectsResolved: [],
      bankedAssetUseProhibited: ['player_2'],
    };
    const before = captureDiscardSnapshot(suppressed);
    suppressed.players.player_2.zones.discard = [FIRST];
    expect(registerRedemptionDiscardEntries(suppressed, before, 'player_1')).toBe(0);
  });

  it('automatically returns one negated battle-draw card during cleanup', () => {
    let state = game();
    beginResolvedBattle(state, [played(FIRST, 'player_2', 'battle_draw', { negated: true })]);

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_2.zones.hand).toContain(FIRST);
    expect(state.players.player_2.zones.discard).not.toContain(FIRST);
    expect(state.players.player_2.zones.graveyard).toContain(REDEMPTION);
  });

  it('asks which negated card to protect when copies are insufficient, then resumes resolution', () => {
    let state = game();
    beginResolvedBattle(state, [
      played(FIRST, 'player_2', 'battle_draw', { negated: true }),
      played(SECOND, 'player_2', 'battle_draw', { negated: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;
    expect(state.battle).toBeDefined();
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'redemption_battle',
      playerId: 'player_2',
      selectCount: 1,
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'select_cards',
      cardIds: [SECOND],
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_2.zones.hand).toContain(SECOND);
    expect(state.players.player_2.zones.discard).toContain(FIRST);
    expect(state.players.player_2.zones.discard).not.toContain(SECOND);
  });

  it('does not protect canceled, unnegated, or Redemption source cards', () => {
    let state = game();
    beginResolvedBattle(state, [
      played(FIRST, 'player_2', 'battle_draw', { canceled: true, negated: true }),
      played(SECOND, 'player_2'),
      played(REDEMPTION, 'player_2', 'battle_draw', { negated: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;

    expect(state.players.player_2.zones.hand).not.toEqual(expect.arrayContaining([FIRST, SECOND]));
    expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining([FIRST, SECOND, REDEMPTION]));
  });
});
