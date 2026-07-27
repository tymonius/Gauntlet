import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types';
import { buildBattleRevealOptions } from '../dev/battle-reveal-options';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { resolveAssassinsPreRevealCard } from './intelligence-simple-battle-effects';
import {
  captureDecoysAssetSnapshot,
  openNextDecoysChoice,
  registerDecoysAssetExits,
} from './neutral-decoys';
import {
  cancellationTargetCardIdsWithDecoysPriority,
  DECOYS,
} from './neutral-decoys-battle';
import { toPrivateGameView } from './views';

const ASSET = 'neutral-fealty';
const SECOND_ASSET = 'neutral-supplies';
const OTHER_CARD = 'card-valor';
const EMBARGO = 'card-embargo';
const ASSASSINS = 'intelligence-assassins';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-decoys-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Opponent',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [EMBARGO, ASSASSINS, OTHER_CARD],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Protected Player',
        factionId: 'military',
        leaderName: 'General',
        deck: [DECOYS, DECOYS, ASSET, SECOND_ASSET, OTHER_CARD],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_2';
  state.priorityPlayer = 'player_2';
  state.phase = 'action_before_movement';
  state.players.player_2.actionsRemaining = 1;
  state.players.player_2.hasPlayedActionThisTurn = false;
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
    modifiers: 0,
    retreated: false,
  };
}

function beginEmbargoBattle(
  state: GameState,
  protectedCards: BattlePlayedCard[],
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'decoys-embargo-battle',
    stage: 'dice',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1', played(EMBARGO, 'player_1', 'hand')),
    defender: participant(
      'player_2',
      protectedCards.find((card) => card.origin === 'hand'),
      protectedCards.filter((card) => card.origin === 'battle_draw'),
    ),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function registerExit(
  state: GameState,
  cardIds: string[],
  destination: 'discard' | 'graveyard' = 'discard',
): void {
  const before = captureDecoysAssetSnapshot(state);
  for (const cardId of cardIds) {
    const index = state.players.player_2.zones.assetBank.indexOf(cardId);
    if (index >= 0) state.players.player_2.zones.assetBank.splice(index, 1);
    state.players.player_2.zones[destination].push(cardId);
  }
  registerDecoysAssetExits(state, before, 'player_1');
  openNextDecoysChoice(state);
}

describe('Neutral Decoys', () => {
  it('registers both canonical forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(DECOYS)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_2.zones.hand = [DECOYS];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_2',
      cardId: DECOYS,
    }).state;
    expect(state.players.player_2.zones.assetBank).toEqual([DECOYS]);
  });

  it('may discard a banked Decoys instead of an Asset removed by an opposing effect', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [DECOYS, ASSET];
    registerExit(state, [ASSET]);

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'decoys_asset',
      playerId: 'player_2',
      sourcePlayerId: 'player_1',
      assetOptions: [expect.objectContaining({ cardId: ASSET, destination: 'discard' })],
    });
    const targetKey = state.pendingNeutralChoice?.kind === 'decoys_asset'
      ? state.pendingNeutralChoice.assetOptions[0].exitId
      : undefined;

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey,
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual([ASSET]);
    expect(state.players.player_2.zones.discard).toEqual([DECOYS]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('may decline Decoys and leave the affected Asset in its destination', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [DECOYS, ASSET];
    registerExit(state, [ASSET], 'graveyard');

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'pass',
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual([DECOYS]);
    expect(state.players.player_2.zones.graveyard).toEqual([ASSET]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('uses multiple physical Decoys copies to preserve multiple affected Assets', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [DECOYS, DECOYS, ASSET, SECOND_ASSET];
    registerExit(state, [ASSET, SECOND_ASSET]);

    let targetKey = state.pendingNeutralChoice?.kind === 'decoys_asset'
      ? state.pendingNeutralChoice.assetOptions.find((asset) => asset.cardId === ASSET)?.exitId
      : undefined;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey,
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'decoys_asset', triggersRemaining: 1 });

    targetKey = state.pendingNeutralChoice?.kind === 'decoys_asset'
      ? state.pendingNeutralChoice.assetOptions.find((asset) => asset.cardId === SECOND_ASSET)?.exitId
      : undefined;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey,
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual(expect.arrayContaining([ASSET, SECOND_ASSET]));
    expect(state.players.player_2.zones.assetBank).toHaveLength(2);
    expect(state.players.player_2.zones.discard).toEqual([DECOYS, DECOYS]);
  });

  it('can use a Decoys copy removed by the same opposing effect', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [DECOYS, ASSET];
    registerExit(state, [DECOYS, ASSET], 'graveyard');
    const targetKey = state.pendingNeutralChoice?.kind === 'decoys_asset'
      ? state.pendingNeutralChoice.assetOptions[0].exitId
      : undefined;

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey,
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual([ASSET]);
    expect(state.players.player_2.zones.graveyard).toEqual([]);
    expect(state.players.player_2.zones.discard).toEqual([DECOYS]);
  });

  it('tracks duplicate Asset titles by physical multiplicity', () => {
    const state = game();
    state.players.player_2.zones.assetBank = [DECOYS, ASSET, ASSET];
    registerExit(state, [ASSET]);

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'decoys_asset',
      assetOptions: [expect.objectContaining({ cardId: ASSET })],
    });
    expect(state.players.player_2.zones.assetBank).toEqual([DECOYS, ASSET]);
  });

  it('does not trigger for the protected player’s own effect or while banked Assets are prohibited', () => {
    const own = game();
    own.players.player_2.zones.assetBank = [DECOYS, ASSET];
    const ownBefore = captureDecoysAssetSnapshot(own);
    own.players.player_2.zones.assetBank = [DECOYS];
    own.players.player_2.zones.discard = [ASSET];
    expect(registerDecoysAssetExits(own, ownBefore, 'player_2')).toBe(0);

    const suppressed = game();
    suppressed.players.player_2.zones.assetBank = [DECOYS, ASSET];
    suppressed.phase = 'battle';
    suppressed.battle = {
      id: 'decoys-suppressed-battle',
      stage: 'dice',
      location: 'space-1',
      attackerOrigin: 'player_1-heartland',
      attacker: participant('player_1'),
      defender: participant('player_2'),
      tiePolicy: 'defender',
      effectsResolved: [],
      bankedAssetUseProhibited: ['player_2'],
    };
    const before = captureDecoysAssetSnapshot(suppressed);
    suppressed.players.player_2.zones.assetBank = [DECOYS];
    suppressed.players.player_2.zones.discard = [ASSET];
    expect(registerDecoysAssetExits(suppressed, before, 'player_1')).toBe(0);
  });

  it('offers only Decoys as an Embargo target while an active copy remains', () => {
    const state = game();
    beginEmbargoBattle(state, [
      played(DECOYS, 'player_2', 'hand'),
      played(OTHER_CARD, 'player_2'),
    ]);

    const options = buildBattleRevealOptions(state, 'player_1');
    expect(options).toHaveLength(1);
    expect(options[0].action).toMatchObject({
      type: 'resolve_battle_reveal',
      battleCardTargets: [{ targetCardId: DECOYS }],
    });
    expect(toPrivateGameView(state, 'player_1').battle?.validBattleCardTargets).toEqual([
      expect.objectContaining({ targetCardId: DECOYS }),
    ]);
  });

  it('rejects direct Embargo targeting of another card before Decoys', () => {
    const state = game();
    beginEmbargoBattle(state, [
      played(DECOYS, 'player_2', 'hand'),
      played(OTHER_CARD, 'player_2'),
    ]);

    expect(() => applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
      battleCardTargets: [{
        sourceCardId: EMBARGO,
        sourceOwner: 'player_1',
        targetCardId: OTHER_CARD,
        targetOwner: 'player_2',
      }],
    })).toThrow(/Decoys must be canceled/);
  });

  it('cancels Decoys first and then permits another title after no active Decoys remain', () => {
    let state = game();
    beginEmbargoBattle(state, [
      played(DECOYS, 'player_2', 'hand'),
      played(OTHER_CARD, 'player_2'),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
      battleCardTargets: [{
        sourceCardId: EMBARGO,
        sourceOwner: 'player_1',
        targetCardId: DECOYS,
        targetOwner: 'player_2',
      }],
    }).state;

    expect(state.battle?.defender.handCommit?.canceled).toBe(true);
    expect(state.battle?.defender.battleDrawPlayed[0].canceled).toBe(false);
    expect(cancellationTargetCardIdsWithDecoysPriority(state.battle!.defender)).toEqual([OTHER_CARD]);
  });

  it('requires each stacked active Decoys copy to be canceled before another title', () => {
    const state = game();
    beginEmbargoBattle(state, [
      played(DECOYS, 'player_2', 'hand'),
      played(DECOYS, 'player_2'),
      played(OTHER_CARD, 'player_2'),
    ]);
    expect(cancellationTargetCardIdsWithDecoysPriority(state.battle!.defender)).toEqual([DECOYS]);
    state.battle!.defender.handCommit!.canceled = true;
    expect(cancellationTargetCardIdsWithDecoysPriority(state.battle!.defender)).toEqual([DECOYS]);
    state.battle!.defender.battleDrawPlayed[0].canceled = true;
    expect(cancellationTargetCardIdsWithDecoysPriority(state.battle!.defender)).toEqual([OTHER_CARD]);
  });

  it('ignores canceled or negated Decoys when determining cancellation priority', () => {
    const state = game();
    beginEmbargoBattle(state, [
      played(DECOYS, 'player_2', 'hand', { canceled: true }),
      played(DECOYS, 'player_2', 'battle_draw', { negated: true }),
      played(OTHER_CARD, 'player_2'),
    ]);
    expect(cancellationTargetCardIdsWithDecoysPriority(state.battle!.defender)).toEqual([OTHER_CARD]);
  });

  it('does not redirect Assassins because negation is not cancellation', () => {
    const state = game();
    state.phase = 'battle';
    const assassins = played(ASSASSINS, 'player_1', 'battle_draw');
    const target = played(OTHER_CARD, 'player_2', 'hand');
    const decoys = played(DECOYS, 'player_2', 'battle_draw');
    state.battle = {
      id: 'decoys-assassins-battle',
      stage: 'normal_reveal',
      location: 'space-2',
      attackerOrigin: 'space-1',
      attacker: participant('player_1', undefined, [assassins]),
      defender: participant('player_2', target, [decoys]),
      tiePolicy: 'defender',
      effectsResolved: [],
    };

    resolveAssassinsPreRevealCard(state, state.battle.attacker, assassins);

    expect(target.negated).toBe(true);
    expect(decoys.negated).not.toBe(true);
  });
});
