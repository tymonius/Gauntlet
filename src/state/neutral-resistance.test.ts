import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import {
  applyResistanceAssetBattleHandDraw,
  applyResistanceBattleEffects,
  RESISTANCE,
} from './neutral-resistance';
import { toPrivateGameView } from './views';

const FORTIFICATIONS = 'neutral-fortifications';
const VALOR = 'neutral-valor';
const RALLYING_CRY = 'neutral-rallying-cry';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-resistance-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Counterattacker',
        factionId: 'military',
        leaderName: 'General',
        deck: [RESISTANCE, RESISTANCE, FORTIFICATIONS, VALOR, RALLYING_CRY],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Occupier',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: [RALLYING_CRY, FORTIFICATIONS, VALOR],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  return state;
}

function participant(playerId: PlayerID, diceRoll?: number): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    initialBattleHand: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
    diceRoll,
  };
}

function played(origin: 'hand' | 'battle_draw', options: Partial<BattlePlayedCard> = {}): BattlePlayedCard {
  return {
    cardId: RESISTANCE,
    owner: 'player_1',
    origin,
    faceDown: false,
    canceled: false,
    ...options,
  };
}

function placeForBattle(
  state: GameState,
  counterattack: boolean,
): { originId: string; locationId: string } {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.index === (counterattack ? 2 : 3))!;
  const location = state.board.spaces.find((space) => space.index === (counterattack ? 3 : 4))!;
  origin.occupant = 'player_1';
  location.kind = 'territory';
  location.controller = counterattack ? 'player_1' : 'player_2';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  return { originId: origin.id, locationId: location.id };
}

function setupBattle(state: GameState, counterattack = true): BattleState {
  const { originId, locationId } = placeForBattle(state, counterattack);
  return {
    id: 'resistance-battle',
    stage: 'hand_commit',
    location: locationId,
    attackerOrigin: originId,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function resolutionBattle(
  state: GameState,
  sources: BattlePlayedCard[],
  options: { counterattack?: boolean; attackerRoll?: number; defenderRoll?: number } = {},
): BattleState {
  const counterattack = options.counterattack ?? true;
  const battle = setupBattle(state, counterattack);
  battle.stage = 'resolution';
  battle.effectsResolved = ['before_battle_resolution'];
  battle.attacker.diceRoll = options.attackerRoll ?? 6;
  battle.defender.diceRoll = options.defenderRoll ?? 1;
  battle.attacker.handCommit = sources.find((card) => card.origin === 'hand');
  battle.attacker.battleDrawPlayed = sources.filter((card) => card.origin !== 'hand');
  return battle;
}

function resolveBattle(state: GameState): GameState {
  state.phase = 'battle';
  return applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
}

describe('Neutral Resistance', () => {
  it('registers both forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(RESISTANCE)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
      requiresTarget: false,
    });

    let state = game();
    state.players.player_1.zones.hand = [RESISTANCE];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: RESISTANCE,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([RESISTANCE]);
  });

  it('draws two additional initial Battle Hand cards per active Asset copy during a counterattack', () => {
    const state = game();
    state.players.player_1.zones.assetBank = [RESISTANCE, RESISTANCE];
    state.battle = setupBattle(state, true);

    expect(applyResistanceAssetBattleHandDraw(state)).toBe(4);
    expect(state.battle.attacker.battleDrawCount).toBe(7);
    expect(applyResistanceAssetBattleHandDraw(state)).toBe(0);

    const ordinary = game();
    ordinary.players.player_1.zones.assetBank = [RESISTANCE];
    ordinary.battle = setupBattle(ordinary, false);
    expect(applyResistanceAssetBattleHandDraw(ordinary)).toBe(0);
    expect(ordinary.battle.attacker.battleDrawCount).toBe(3);
  });

  it('honors face-down, prohibited, and Sedition-suppressed Asset copies', () => {
    const faceDown = game();
    faceDown.players.player_1.zones.assetBank = [RESISTANCE, RESISTANCE];
    faceDown.players.player_1.faceDownAssets = [RESISTANCE];
    faceDown.battle = setupBattle(faceDown, true);
    expect(applyResistanceAssetBattleHandDraw(faceDown)).toBe(2);

    const prohibited = game();
    prohibited.players.player_1.zones.assetBank = [RESISTANCE];
    prohibited.battle = { ...setupBattle(prohibited, true), bankedAssetUseProhibited: ['player_1'] };
    expect(applyResistanceAssetBattleHandDraw(prohibited)).toBe(0);

    const sedition = game();
    sedition.players.player_1.zones.assetBank = [RESISTANCE, RESISTANCE];
    sedition.battle = {
      ...setupBattle(sedition, true),
      seditionInactiveAssets: { player_1: [RESISTANCE] },
    };
    expect(applyResistanceAssetBattleHandDraw(sedition)).toBe(2);
  });

  it('grants one advantage per active attacking Battle copy only during a counterattack', () => {
    const state = game();
    state.battle = setupBattle(state, true);
    state.battle.stage = 'dice';
    state.battle.attacker.handCommit = played('hand');
    state.battle.attacker.battleDrawPlayed = [played('battle_draw')];
    expect(applyResistanceBattleEffects(state)).toBe(2);
    expect(state.battle.attacker.advantage).toBe(2);

    const ordinary = game();
    ordinary.battle = setupBattle(ordinary, false);
    ordinary.battle.stage = 'dice';
    ordinary.battle.attacker.handCommit = played('hand');
    expect(applyResistanceBattleEffects(ordinary)).toBe(0);
    expect(ordinary.battle.attacker.advantage ?? 0).toBe(0);
  });

  it('automatically banks a winning hand or Battle-Hand copy when capacity is available', () => {
    let hand = game();
    hand.battle = resolutionBattle(hand, [played('hand')]);
    hand = resolveBattle(hand);
    expect(hand.players.player_1.zones.assetBank).toContain(RESISTANCE);
    expect(hand.players.player_1.zones.removed).not.toContain(RESISTANCE);
    expect(hand.players.player_1.zones.graveyard).not.toContain(RESISTANCE);

    let drawn = game();
    drawn.battle = resolutionBattle(drawn, [played('battle_draw')]);
    drawn = resolveBattle(drawn);
    expect(drawn.players.player_1.zones.assetBank).toContain(RESISTANCE);
    expect(drawn.players.player_1.zones.discard).not.toContain(RESISTANCE);
  });

  it('offers pass when the Asset Bank is full and restores the normal destination', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [FORTIFICATIONS, VALOR, RALLYING_CRY];
    state.battle = resolutionBattle(state, [played('hand')]);
    state = resolveBattle(state);

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'resistance_battle',
      playerId: 'player_1',
      options: ['pass', 'select_card'],
    });
    expect(state.players.player_1.zones.removed).toContain(RESISTANCE);
    expect(toPrivateGameView(state, 'player_1').pendingNeutralChoice?.kind).toBe('resistance_battle');

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;
    expect(state.players.player_1.zones.graveyard).toContain(RESISTANCE);
    expect(state.players.player_1.zones.assetBank).toEqual([FORTIFICATIONS, VALOR, RALLYING_CRY]);
  });

  it('may discard one existing Asset to bank Resistance when full', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [FORTIFICATIONS, VALOR, RALLYING_CRY];
    state.battle = resolutionBattle(state, [played('battle_draw')]);
    state = resolveBattle(state);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: VALOR,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([FORTIFICATIONS, RALLYING_CRY, RESISTANCE]);
    expect(state.players.player_1.zones.discard).toContain(VALOR);
    expect(state.players.player_1.zones.discard).not.toContain(RESISTANCE);
  });

  it('processes multiple winning copies sequentially', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [FORTIFICATIONS, VALOR];
    state.battle = resolutionBattle(state, [played('hand'), played('battle_draw')]);
    state = resolveBattle(state);

    expect(state.players.player_1.zones.assetBank).toEqual([FORTIFICATIONS, VALOR, RESISTANCE]);
    expect(state.pendingNeutralChoice?.kind).toBe('resistance_battle');
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: FORTIFICATIONS,
    }).state;
    expect(state.players.player_1.zones.assetBank.filter((card) => card === RESISTANCE)).toHaveLength(2);
    expect(state.players.player_1.zones.discard).toContain(FORTIFICATIONS);
  });

  it('does not bank inactive copies, lost counterattacks, or ordinary attacks', () => {
    let inactive = game();
    inactive.battle = resolutionBattle(inactive, [
      played('hand', { canceled: true }),
      played('battle_draw', { negated: true }),
      played('battle_draw', { virtual: true }),
    ]);
    inactive = resolveBattle(inactive);
    expect(inactive.players.player_1.zones.assetBank).not.toContain(RESISTANCE);

    let lost = game();
    lost.battle = resolutionBattle(lost, [played('hand')], { attackerRoll: 1, defenderRoll: 6 });
    lost = resolveBattle(lost);
    expect(lost.players.player_1.zones.assetBank).not.toContain(RESISTANCE);
    expect(lost.players.player_1.zones.graveyard).toContain(RESISTANCE);

    let ordinary = game();
    ordinary.battle = resolutionBattle(ordinary, [played('battle_draw')], { counterattack: false });
    ordinary = resolveBattle(ordinary);
    expect(ordinary.players.player_1.zones.assetBank).not.toContain(RESISTANCE);
    expect(ordinary.players.player_1.zones.discard).toContain(RESISTANCE);
  });
});
