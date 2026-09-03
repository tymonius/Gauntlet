import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { activeBankedAssetCopies } from './banked-assets';
import { initializeGame } from './initialize';
import { SEDITION } from './neutral-sedition';
import { toPublicGameView } from './views';

const ASSET = 'neutral-supplies';
const OTHER_ASSET = 'neutral-decoys';
const VALOR = 'card-valor';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-sedition-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Instigator',
        factionId: 'military',
        leaderName: 'General',
        deck: [SEDITION, SEDITION, ASSET, OTHER_ASSET, VALOR],
        territories: ['territory-high-ground', 'territory-watchtower', 'territory-garrison'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [SEDITION, SEDITION, ASSET, OTHER_ASSET, VALOR],
        territories: ['territory-watchtower', 'territory-high-ground', 'territory-garrison'],
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
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId: SEDITION,
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

function beginReveal(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'sedition-battle',
    stage: 'dice',
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function reveal(state: GameState): GameState {
  return applyGameAction(state, {
    type: 'resolve_battle_reveal',
    playerId: 'player_1',
  }).state;
}

describe('Neutral Sedition', () => {
  it('registers both forms and discards after Action or Battle play', () => {
    expect(getCardPlayRule(SEDITION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: false,
    });
  });

  it('makes the opponent choose and discard exactly one controlled Asset', () => {
    let state = game();
    state.players.player_1.zones.hand = [SEDITION];
    state.players.player_2.zones.assetBank = [ASSET, ASSET, OTHER_ASSET];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: SEDITION,
    }).state;

    expect(state.players.player_1.zones.discard).toContain(SEDITION);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'sedition_action',
      playerId: 'player_2',
      cardOptions: expect.arrayContaining([ASSET, OTHER_ASSET]),
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'select_card',
      cardId: ASSET,
    }).state;

    expect(state.players.player_2.zones.assetBank.filter((card) => card === ASSET)).toHaveLength(1);
    expect(state.players.player_2.zones.discard).toContain(ASSET);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('does nothing beyond discarding itself when the opponent controls no Asset', () => {
    let state = game();
    state.players.player_1.zones.hand = [SEDITION];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: SEDITION,
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.discard).toContain(SEDITION);
  });

  it('lets the opponent choose one face-up physical Asset copy to make inactive', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ASSET, ASSET, OTHER_ASSET];
    beginReveal(state, [played('player_1')]);

    state = reveal(state);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'sedition_battle',
      playerId: 'player_2',
      triggersRemaining: 1,
      cardOptions: expect.arrayContaining([ASSET, OTHER_ASSET]),
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'select_card',
      cardId: ASSET,
    }).state;

    expect(state.battle?.seditionInactiveAssets?.player_2).toEqual([ASSET]);
    expect(activeBankedAssetCopies(state, 'player_2', ASSET)).toBe(1);
    expect(activeBankedAssetCopies(state, 'player_2', OTHER_ASSET)).toBe(1);
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
    expect(toPublicGameView(state).battle?.seditionInactiveAssets?.player_2).toEqual([ASSET]);
  });

  it('grants +1 for each Sedition copy that finds no remaining face-up Asset', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ASSET];
    beginReveal(state, [played('player_1', 'hand'), played('player_1')]);

    state = reveal(state);
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'sedition_battle', triggersRemaining: 2 });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'select_card',
      cardId: ASSET,
    }).state;

    expect(state.battle?.seditionInactiveAssets?.player_2).toEqual([ASSET]);
    expect(state.battle?.attacker.modifiers).toBe(1);
    expect(state.battle?.resolvedModifiers).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerId: 'player_1', source: SEDITION, amount: 1 }),
    ]));
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('grants the fallback immediately when every controlled Asset is face down', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ASSET];
    state.players.player_2.faceDownAssets = [ASSET];
    beginReveal(state, [played('player_1')]);

    state = reveal(state);

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle?.attacker.modifiers).toBe(1);
    expect(state.battle?.seditionInactiveAssets?.player_2).toBeUndefined();
  });

  it('resolves Sedition played by both players in source order', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [OTHER_ASSET];
    state.players.player_2.zones.assetBank = [ASSET];
    beginReveal(state, [played('player_1')], [played('player_2')]);

    state = reveal(state);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'sedition_battle',
      playerId: 'player_2',
      sourcePlayerId: 'player_1',
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'select_card', cardId: ASSET,
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'sedition_battle',
      playerId: 'player_1',
      sourcePlayerId: 'player_2',
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: OTHER_ASSET,
    }).state;
    expect(state.battle?.seditionInactiveAssets).toEqual({
      player_1: [OTHER_ASSET],
      player_2: [ASSET],
    });
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('still requires a face-up choice when all banked Asset effects are otherwise prohibited', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ASSET];
    beginReveal(state, [played('player_1')]);
    state.battle!.bankedAssetUseProhibited = ['player_2'];

    state = reveal(state);

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'sedition_battle',
      playerId: 'player_2',
      cardOptions: [ASSET],
    });
    expect(state.battle?.attacker.modifiers).toBe(0);
  });

  it('ignores canceled, negated, and virtual Battle copies', () => {
    let state = game();
    beginReveal(state, [
      played('player_1', 'hand', { canceled: true }),
      played('player_1', 'battle_draw', { negated: true }),
      played('player_1', 'battle_draw', { virtual: true }),
    ]);

    state = reveal(state);

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle?.attacker.modifiers).toBe(0);
    expect(state.battle?.seditionInactiveAssets).toBeUndefined();
  });
});
