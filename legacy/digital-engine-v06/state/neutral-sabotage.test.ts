import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { bankedAssetCardUseAllowed } from './banked-assets';
import { initializeGame } from './initialize';
import { SABOTAGE } from './neutral-sabotage';

const ASSET = 'neutral-entrenchment';
const VALOR = 'card-valor';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-sabotage-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1', name: 'Saboteur', factionId: 'intelligence', leaderName: 'Ranger',
        deck: ['p1-draw'], territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2', name: 'Opponent', factionId: 'military', leaderName: 'General',
        deck: ['p2-draw'], territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.phase = 'action_before_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.zones.hand = [SABOTAGE];
  return state;
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled: false, ...overrides };
}

function participant(
  playerId: PlayerID,
  cards: BattlePlayedCard[],
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
    battleDrawPlayLimit: 3,
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
    id: 'sabotage-battle',
    stage: 'dice',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function playAction(state: GameState, cardId = ASSET): GameState {
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: SABOTAGE,
    targets: [{ kind: 'card', owner: 'player_2', cardId }],
  }).state;
}

describe('Neutral Sabotage', () => {
  it('registers both canonical forms and requires an Action target', () => {
    expect(getCardPlayRule(SABOTAGE)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: true,
    });
  });

  it('turns exactly one opposing face-up Asset copy face down', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ASSET, ASSET];

    state = playAction(state);

    expect(state.players.player_2.faceDownAssets).toEqual([ASSET]);
    expect(bankedAssetCardUseAllowed(state, 'player_2', ASSET)).toBe(true);
    expect(state.neutralSabotageAssetSuppressions).toHaveLength(1);
    expect(state.players.player_1.zones.discard).toContain(SABOTAGE);
  });

  it('rejects own, unbanked, and fully face-down targets', () => {
    const own = game();
    own.players.player_1.zones.assetBank = [ASSET];
    expect(() => applyGameAction(own, {
      type: 'play_action_card', playerId: 'player_1', cardId: SABOTAGE,
      targets: [{ kind: 'card', owner: 'player_1', cardId: ASSET }],
    })).toThrow('opposing Asset');

    const unbanked = game();
    expect(() => playAction(unbanked)).toThrow('face-up opposing Asset');

    const faceDown = game();
    faceDown.players.player_2.zones.assetBank = [ASSET];
    faceDown.players.player_2.faceDownAssets = [ASSET];
    expect(() => playAction(faceDown)).toThrow('face-up opposing Asset');
  });

  it("restores the Asset at the start of the source player's next turn, not the target's", () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ASSET];
    state = playAction(state);
    expect(bankedAssetCardUseAllowed(state, 'player_2', ASSET)).toBe(false);

    state.turn += 1;
    state.phase = 'turn_start';
    state.activePlayer = 'player_2';
    state.priorityPlayer = 'player_2';
    state = applyGameAction(state, { type: 'draw_card', playerId: 'player_2' }).state;
    expect(bankedAssetCardUseAllowed(state, 'player_2', ASSET)).toBe(false);

    state.turn += 1;
    state.phase = 'turn_start';
    state.activePlayer = 'player_1';
    state.priorityPlayer = 'player_1';
    state = applyGameAction(state, { type: 'draw_card', playerId: 'player_1' }).state;
    expect(state.players.player_2.faceDownAssets).toBeUndefined();
    expect(bankedAssetCardUseAllowed(state, 'player_2', ASSET)).toBe(true);
    expect(state.neutralSabotageAssetSuppressions).toBeUndefined();
  });

  it('clears stale suppression when the targeted Asset leaves play', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [ASSET];
    state = playAction(state);
    state.players.player_2.zones.assetBank = [];
    state.players.player_2.zones.discard = [ASSET];

    state = applyGameAction(state, { type: 'draw_card', playerId: 'player_1' }).state;
    expect(state.players.player_2.faceDownAssets).toBeUndefined();
    expect(state.neutralSabotageAssetSuppressions).toBeUndefined();
  });

  it('immediately cancels a hand commitment into its owner\'s Discard Pile before modifiers', () => {
    let state = game();
    beginBattle(state, [played(SABOTAGE, 'player_1', 'hand')], [played(VALOR, 'player_2', 'hand')]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
      battleCardTargets: [{
        sourceCardId: SABOTAGE,
        sourceOwner: 'player_1',
        targetCardId: VALOR,
        targetOwner: 'player_2',
      }],
    }).state;

    expect(state.battle?.defender.handCommit).toBeUndefined();
    expect(state.players.player_2.zones.discard).toContain(VALOR);
    expect(state.players.player_2.zones.graveyard).not.toContain(VALOR);
    expect(state.battle?.defender.modifiers).toBe(0);
    expect(state.battle?.resolvedCancellations).toEqual([
      expect.objectContaining({ cardId: VALOR, destination: 'discard', immediate: true }),
    ]);
  });

  it('immediately cancels a Battle Hand card and ignores canceled Sabotage copies', () => {
    let state = game();
    beginBattle(state, [played(SABOTAGE, 'player_1')], [played(VALOR, 'player_2')]);
    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
      battleCardTargets: [{ sourceCardId: SABOTAGE, sourceOwner: 'player_1', targetCardId: VALOR, targetOwner: 'player_2' }],
    }).state;
    expect(state.battle?.defender.battleDrawPlayed).toEqual([]);
    expect(state.players.player_2.zones.discard).toContain(VALOR);

    const canceled = game();
    beginBattle(canceled, [played(SABOTAGE, 'player_1', 'battle_draw', { canceled: true })], [played(VALOR, 'player_2')]);
    const resolved = applyGameAction(canceled, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(resolved.battle?.defender.battleDrawPlayed).toHaveLength(1);
    expect(resolved.battle?.defender.modifiers).toBe(2);
  });
});
