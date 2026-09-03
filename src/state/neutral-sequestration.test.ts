import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { bankedAssetUseAllowed } from './banked-assets';
import { initializeGame } from './initialize';
import { CAPITAL_PUNISHMENT } from './neutral-capital-punishment';
import { DECOYS } from './neutral-decoys-battle';
import { SEQUESTRATION } from './neutral-sequestration';
import { toPrivateGameView, toPublicGameView } from './views';

const ASSET_A = 'neutral-entrenchment';
const ASSET_B = 'neutral-fortifications';
const ASSET_C = 'neutral-valor';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-sequestration-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1', name: 'Sequester', factionId: 'intelligence', leaderName: 'Spy',
        deck: [SEQUESTRATION, CAPITAL_PUNISHMENT, 'p1-draw'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2', name: 'Opponent', factionId: 'intelligence', leaderName: 'Spy',
        deck: [SEQUESTRATION, DECOYS, 'p2-draw'],
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
    fromInitialBattleHand: origin === 'battle_draw',
    ...overrides,
  };
}

function participant(playerId: PlayerID, cards: BattlePlayedCard[]): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    initialBattleHand: cards.filter((card) => card.origin === 'battle_draw').map((card) => card.cardId),
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
  attackerCards: BattlePlayedCard[],
  defenderCards: BattlePlayedCard[],
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `sequestration-battle-${state.log.length + 1}`,
    stage: 'dice',
    location: 'space-4',
    attackerOrigin: 'space-3',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function choose(state: GameState, playerId: PlayerID, cardId: string): GameState {
  return applyGameAction(state, {
    type: 'resolve_neutral_choice',
    playerId,
    choice: 'select_card',
    cardId,
  }).state;
}

describe('Neutral Sequestration', () => {
  it('registers both canonical forms with normal destinations', () => {
    expect(getCardPlayRule(SEQUESTRATION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: false,
    });
  });

  it('automatically keeps each player’s only Asset', () => {
    let state = game();
    state.players.player_1.zones.hand = [SEQUESTRATION];
    state.players.player_1.zones.assetBank = [ASSET_A];
    state.players.player_2.zones.assetBank = [ASSET_B];

    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_1', cardId: SEQUESTRATION,
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([ASSET_A]);
    expect(state.players.player_2.zones.assetBank).toEqual([ASSET_B]);
  });

  it('collects private keep choices before discarding either player’s other Assets', () => {
    let state = game();
    state.players.player_1.zones.hand = [SEQUESTRATION];
    state.players.player_1.zones.assetBank = [ASSET_A, ASSET_B];
    state.players.player_2.zones.assetBank = [ASSET_B, ASSET_C];

    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_1', cardId: SEQUESTRATION,
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'sequestration_action', playerId: 'player_1' });
    expect(toPublicGameView(state).pendingNeutralChoice).toBeUndefined();
    expect(toPrivateGameView(state, 'player_1').pendingNeutralChoice).toMatchObject({ kind: 'sequestration_action' });

    state = choose(state, 'player_1', ASSET_A);
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'sequestration_action', playerId: 'player_2' });
    expect(state.players.player_1.zones.assetBank).toEqual([ASSET_A, ASSET_B]);
    expect(state.players.player_2.zones.assetBank).toEqual([ASSET_B, ASSET_C]);

    state = choose(state, 'player_2', ASSET_C);
    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([ASSET_A]);
    expect(state.players.player_2.zones.assetBank).toEqual([ASSET_C]);
    expect(state.players.player_1.zones.discard).toContain(ASSET_B);
    expect(state.players.player_2.zones.discard).toContain(ASSET_B);
  });

  it('keeps exactly one physical copy when the selected Asset has duplicates', () => {
    let state = game();
    state.players.player_1.zones.hand = [SEQUESTRATION];
    state.players.player_1.zones.assetBank = [ASSET_A, ASSET_A, ASSET_B];

    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_1', cardId: SEQUESTRATION,
    }).state;
    state = choose(state, 'player_1', ASSET_A);

    expect(state.players.player_1.zones.assetBank).toEqual([ASSET_A]);
    expect(state.players.player_1.zones.discard.filter((cardId) => cardId === ASSET_A)).toHaveLength(1);
  });

  it('registers opponent Decoys after the final simultaneous discard resolves', () => {
    let state = game();
    state.players.player_1.zones.hand = [SEQUESTRATION];
    state.players.player_2.zones.assetBank = [DECOYS, ASSET_A, ASSET_B];

    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_1', cardId: SEQUESTRATION,
    }).state;
    state = choose(state, 'player_2', DECOYS);

    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'decoys_asset', playerId: 'player_2' });
    expect(state.players.player_2.zones.assetBank).toEqual([DECOYS, ASSET_A, ASSET_B]);
    const pending = state.pendingNeutralChoice;
    if (!pending || pending.kind !== 'decoys_asset') throw new Error('Expected a Decoys replacement choice.');
    const protectedAsset = pending.assetOptions.find((asset) => asset.cardId === ASSET_A);
    if (!protectedAsset) throw new Error('Expected Asset A to be protectable with Decoys.');

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
      targetKey: protectedAsset.exitId,
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_2.zones.assetBank).toEqual([ASSET_A]);
    expect(state.players.player_2.zones.discard).toEqual(expect.arrayContaining([DECOYS, ASSET_B]));
  });

  it('makes every banked Asset inactive after an active Battle copy is revealed', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSET_A];
    state.players.player_2.zones.assetBank = [ASSET_B];
    beginBattle(state, [played(SEQUESTRATION, 'player_1')], []);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;

    expect(bankedAssetUseAllowed(state, 'player_1')).toBe(false);
    expect(bankedAssetUseAllowed(state, 'player_2')).toBe(false);
    expect(state.battle?.bankedAssetUseProhibited).toEqual(['player_1', 'player_2']);
  });

  it('allows Capital Punishment to negate Sequestration before it suppresses Assets', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSET_A];
    state.players.player_2.zones.assetBank = [ASSET_B];
    beginBattle(
      state,
      [played(CAPITAL_PUNISHMENT, 'player_1')],
      [played(SEQUESTRATION, 'player_2')],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
      battleCardTargets: [{
        sourceCardId: CAPITAL_PUNISHMENT,
        sourceOwner: 'player_1',
        targetCardId: SEQUESTRATION,
        targetOwner: 'player_2',
      }],
    }).state;

    expect(state.battle?.defender.battleDrawPlayed[0].negated).toBe(true);
    expect(bankedAssetUseAllowed(state, 'player_1')).toBe(true);
    expect(bankedAssetUseAllowed(state, 'player_2')).toBe(true);
  });

  it('ignores canceled, negated, and virtual Battle copies', () => {
    for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      let state = game();
      state.players.player_1.zones.assetBank = [ASSET_A];
      beginBattle(state, [played(SEQUESTRATION, 'player_1', 'battle_draw', overrides)], []);
      state = applyGameAction(state, {
        type: 'resolve_battle_reveal', playerId: 'player_1',
      }).state;
      expect(bankedAssetUseAllowed(state, 'player_1')).toBe(true);
      expect(state.battle?.bankedAssetUseProhibited).toBeUndefined();
    }
  });
});
