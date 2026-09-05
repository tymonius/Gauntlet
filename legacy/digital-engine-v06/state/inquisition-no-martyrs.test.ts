import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import { buildFinancierBattleAftermath } from './financier-battle-cards';
import {
  applyNoMartyrsOutcome,
  lossOrRetreatBenefitsSuppressed,
  NO_MARTYRS,
  openNextNoMartyrsAssetChoice,
} from './inquisition-no-martyrs';
import { initializeGame } from './initialize';
import { buildMilitaryAftermathChoices } from './military-interactions';
import { queueAccursedWagerAfterBattle } from './mystics-accursed-wager';
import { queuePathsOfShadowAfterBattle } from './mystics-paths-of-shadow';
import { toPrivateGameView, toPublicGameView } from './views';

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function played(cardId: string, owner: PlayerID, origin: 'hand' | 'battle_draw' | 'replayed' = 'battle_draw', extras: Partial<BattlePlayedCard> = {}): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    ...extras,
  };
}

function game(opponentFaction = 'military'): GameState {
  const opponentLeader = opponentFaction === 'financiers'
    ? 'Banker'
    : opponentFaction === 'mystics'
      ? 'Spirit Walker'
      : 'General';
  const state = initializeGame({
    id: `inquisition-no-martyrs-${opponentFaction}-test`,
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [NO_MARTYRS, NO_MARTYRS, 'inquisition-penance'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: opponentFaction,
        leaderName: opponentLeader,
        deck: ['card-valor', 'card-fortifications', 'card-attrition'],
        territories: ['t4', 't5', 't6'],
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

function battle(stage: BattleState['stage'] = 'dice'): BattleState {
  return {
    id: 'no-martyrs-battle',
    stage,
    location: 'space-3',
    attackerOrigin: 'space-2',
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: stage === 'resolution' ? ['before_battle_resolution'] : [],
  };
}

function recordResult(state: GameState, currentBattle: BattleState, suppression = true): void {
  state.recentBattleResult = {
    battleId: currentBattle.id,
    turn: state.turn,
    winner: 'player_1',
    loser: 'player_2',
    attacker: 'player_1',
    defender: 'player_2',
    location: currentBattle.location,
    attackerOrigin: currentBattle.attackerOrigin,
    retreatDirection: 1,
    lossRetreatEffectsSuppressedFor: suppression ? ['player_2'] : undefined,
  };
}

function placeBattle(state: GameState, originIndex: number, locationIndex: number): { originId: string; locationId: string } {
  for (const space of state.board.spaces) space.occupant = undefined;
  const origin = state.board.spaces.find((space) => space.index === originIndex)!;
  const location = state.board.spaces.find((space) => space.index === locationIndex)!;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  return { originId: origin.id, locationId: location.id };
}

describe('Inquisition No Martyrs', () => {
  it('banks as an Action', () => {
    let state = game();
    state.players.player_1.zones.hand = [NO_MARTYRS];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: NO_MARTYRS,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([]);
    expect(state.players.player_1.zones.assetBank).toEqual([NO_MARTYRS]);
    expect(state.players.player_1.zones.discard).toEqual([]);
  });

  it('offers each initially banked copy privately; passing preserves it and using discards it', () => {
    let state = game();
    state.phase = 'battle';
    state.battle = battle('dice');
    state.players.player_1.zones.assetBank = [NO_MARTYRS, NO_MARTYRS];

    expect(openNextNoMartyrsAssetChoice(state)).toBe(true);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'no_martyrs_asset',
      playerId: 'player_1',
      battleId: state.battle.id,
      copyNumber: 1,
    });
    expect(toPrivateGameView(state, 'player_1').pendingInquisitionChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingInquisitionChoice).toBeUndefined();
    expect('pendingInquisitionChoice' in toPublicGameView(state)).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'pass',
      cardId: NO_MARTYRS,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([NO_MARTYRS, NO_MARTYRS]);
    expect(state.pendingInquisitionChoice).toMatchObject({ kind: 'no_martyrs_asset', copyNumber: 2 });

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: NO_MARTYRS,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([NO_MARTYRS]);
    expect(state.players.player_1.zones.discard).toEqual([NO_MARTYRS]);
    expect(state.battle?.noMartyrsAssetProcessedCounts?.player_1).toBe(2);
    expect(state.battle?.noMartyrsAssetActivatedCounts?.player_1).toBe(1);
    expect(state.pendingInquisitionChoice).toBeUndefined();
  });

  it('does not offer a banked copy when Subversion prohibits Asset use', () => {
    const state = game();
    state.phase = 'battle';
    state.battle = battle('dice');
    state.battle.bankedAssetUseProhibited = ['player_1'];
    state.players.player_1.zones.assetBank = [NO_MARTYRS];

    expect(openNextNoMartyrsAssetChoice(state)).toBe(false);
    expect(state.pendingInquisitionChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([NO_MARTYRS]);
    expect(state.battle.noMartyrsAssetProcessedCounts?.player_1).toBe(0);
  });

  it('counts active physical Battle copies and activated Assets while ignoring canceled, negated, and virtual copies', () => {
    const state = game();
    const currentBattle = battle('resolution');
    currentBattle.attacker.handCommit = played(NO_MARTYRS, 'player_1', 'hand');
    currentBattle.attacker.battleDrawPlayed = [
      played(NO_MARTYRS, 'player_1'),
      played(NO_MARTYRS, 'player_1', 'battle_draw', { canceled: true }),
      played(NO_MARTYRS, 'player_1', 'battle_draw', { negated: true }),
      played(NO_MARTYRS, 'player_1', 'replayed', { virtual: true }),
    ];
    currentBattle.noMartyrsAssetActivatedCounts = { player_1: 1 };

    expect(applyNoMartyrsOutcome(state, currentBattle, 'player_1', 'player_2')).toBe(3);
    expect(currentBattle.lossRetreatEffectsSuppressedFor).toEqual(['player_2']);
    expect(currentBattle.additionalRetreatPositions?.player_2).toBe(3);
  });

  it('moves a defeated defender one extra position per active copy, stopping at the last valid open space', () => {
    let state = game();
    const { originId, locationId } = placeBattle(state, 2, 3);
    state.phase = 'battle';
    state.priorityPlayer = 'player_1';
    const currentBattle = battle('resolution');
    currentBattle.attackerOrigin = originId;
    currentBattle.location = locationId;
    currentBattle.attacker.handCommit = played(NO_MARTYRS, 'player_1', 'hand');
    currentBattle.attacker.battleDrawPlayed = [played(NO_MARTYRS, 'player_1')];
    currentBattle.attacker.diceRoll = 6;
    currentBattle.defender.diceRoll = 1;
    state.battle = currentBattle;

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_2.occupiedSpaceId).toBe(state.board.spaces.find((space) => space.index === 6)?.id);
    expect(state.recentBattleResult?.additionalRetreatPositions?.player_2).toBe(2);
    expect(state.recentBattleResult?.lossRetreatEffectsSuppressedFor).toEqual(['player_2']);

    let blocked = game();
    const placed = placeBattle(blocked, 2, 3);
    blocked.board.spaces.find((space) => space.index === 5)!.occupant = 'blocker';
    blocked.phase = 'battle';
    blocked.priorityPlayer = 'player_1';
    const blockedBattle = battle('resolution');
    blockedBattle.attackerOrigin = placed.originId;
    blockedBattle.location = placed.locationId;
    blockedBattle.attacker.handCommit = played(NO_MARTYRS, 'player_1', 'hand');
    blockedBattle.attacker.battleDrawPlayed = [played(NO_MARTYRS, 'player_1')];
    blockedBattle.attacker.diceRoll = 6;
    blockedBattle.defender.diceRoll = 1;
    blocked.battle = blockedBattle;

    blocked = applyGameAction(blocked, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(blocked.players.player_2.occupiedSpaceId).toBe(blocked.board.spaces.find((space) => space.index === 4)?.id);
  });

  it('suppresses Rearguard, Underwriting, and Paths of Shadow benefits', () => {
    const militaryState = game('military');
    const militaryBattle = battle('resolution');
    militaryBattle.defender.battleDrawPlayed = [played('military-rearguard', 'player_2')];
    militaryState.players.player_2.zones.discard = ['military-rearguard'];
    recordResult(militaryState, militaryBattle);
    militaryState.recentBattleResult!.battleHandCards = { player_2: ['military-rearguard'] };
    buildMilitaryAftermathChoices(militaryState, militaryBattle);
    expect(militaryState.players.player_2.zones.assetBank).not.toContain('military-rearguard');
    expect(militaryState.players.player_2.zones.discard).toContain('military-rearguard');

    const financierState = game('financiers');
    const financierBattle = battle('resolution');
    financierBattle.defender.battleDrawPlayed = [played('financiers-underwriting', 'player_2')];
    financierState.players.player_2.financiers!.subsidizeBonusThisBattle = 2;
    recordResult(financierState, financierBattle);
    buildFinancierBattleAftermath(financierState, financierBattle, 'player_1');
    expect(financierState.players.player_2.resources?.capital?.value).toBe(0);

    const mysticsState = game('mystics');
    const mysticsBattle = battle('resolution');
    mysticsBattle.defender.battleDrawPlayed = [played('mystics-paths-of-shadow', 'player_2')];
    recordResult(mysticsState, mysticsBattle);
    queuePathsOfShadowAfterBattle(mysticsState, mysticsBattle);
    expect(mysticsState.players.player_2.mystics?.pathsOfShadowBattleQueue).toBeUndefined();
    expect(lossOrRetreatBenefitsSuppressed(mysticsState, 'player_2', mysticsBattle.id)).toBe(true);
  });

  it('does not suppress harmful loss consequences such as Accursed Wager', () => {
    const state = game('mystics');
    const currentBattle = battle('resolution');
    currentBattle.defender.battleDrawPlayed = [played('mystics-accursed-wager', 'player_2')];
    state.players.player_2.zones.hand = ['card-valor'];
    recordResult(state, currentBattle);

    expect(queueAccursedWagerAfterBattle(state, currentBattle)).toBe(true);
    expect(state.pendingMysticsAftermath).toMatchObject({
      kind: 'accursed_wager',
      loserId: 'player_2',
      remaining: 1,
    });
  });

  it('does not suppress Hold the Line’s harmful immediate-capture consequence', () => {
    let state = game('military');
    const { originId, locationId } = placeBattle(state, 3, 4);
    const location = state.board.spaces.find((space) => space.id === locationId)!;
    location.controller = 'player_2';
    state.phase = 'battle';
    state.priorityPlayer = 'player_1';
    const currentBattle = battle('resolution');
    currentBattle.attackerOrigin = originId;
    currentBattle.location = locationId;
    currentBattle.effectsResolved = ['before_battle_resolution', 'hold_capture_if_lost:player_2'];
    currentBattle.attacker.handCommit = played(NO_MARTYRS, 'player_1', 'hand');
    currentBattle.defender.battleDrawPlayed = [played('military-hold-the-line', 'player_2')];
    currentBattle.attacker.diceRoll = 6;
    currentBattle.defender.diceRoll = 1;
    state.battle = currentBattle;

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.board.spaces.find((space) => space.id === locationId)?.controller).toBe('player_1');
    expect(state.recentBattleResult?.lossRetreatEffectsSuppressedFor).toEqual(['player_2']);
  });
});
