import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-exfiltration';
import { initializeGame } from './initialize';
import { createV06StandardBoard } from './v06-board';

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

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'hand',
  extra: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled: false, ...extra };
}

function game(): GameState {
  const playerOne = {
    id: 'player_1',
    name: 'Attacker',
    factionId: 'intelligence',
    leaderName: 'Ranger',
    deck: ['a1', 'a2', 'a3'],
    territories: ['t1', 't2', 't3'],
  };
  const playerTwo = {
    id: 'player_2',
    name: 'Defender',
    factionId: 'intelligence',
    leaderName: 'Spymaster',
    deck: ['d1', 'd2', 'd3'],
    territories: ['t4', 't5', 't6'],
  };
  const state = initializeGame({
    id: 'intelligence-treason',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [playerOne, playerTwo],
  });
  const topology = createV06StandardBoard([playerOne, playerTwo]);
  state.board = topology.board;
  const origin = state.board.spaces.find((space) => space.index === 2)!;
  const location = state.board.spaces.find((space) => space.index === 3)!;
  for (const space of state.board.spaces) space.occupant = undefined;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'battle-1',
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  return state;
}

function treasonFromHand(owner: PlayerID): BattlePlayedCard {
  return played('intelligence-treason', owner, 'hand', { earlyEffectResolved: true });
}

function openPostReveal(state: GameState): GameState {
  return applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
}

describe('Treason', () => {
  it('reveals before the normal reveal and then opens a mandatory target choice', () => {
    let state = game();
    state.battle!.stage = 'normal_reveal';
    state.battle!.attacker.handCommit = played('intelligence-treason', 'player_1', 'hand', { faceDown: true });
    state.battle!.defender.handCommit = played('card-valor', 'player_2', 'hand', { faceDown: true });

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.attacker.handCommit).toMatchObject({
      cardId: 'intelligence-treason',
      faceDown: false,
      earlyEffectResolved: true,
    });
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'treason_battle_target',
      playerId: 'player_1',
      sourceKind: 'battle_card',
      options: ['select'],
      targetOptions: [expect.objectContaining({ targetKey: 'hand_commit', cardId: 'card-valor' })],
    });
  });

  it('negates and copies Valor before normal Battle effects resolve', () => {
    let state = game();
    state.battle!.attacker.handCommit = treasonFromHand('player_1');
    state.battle!.defender.handCommit = played('card-valor', 'player_2');

    state = openPostReveal(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'hand_commit',
    }).state;

    expect(state.battle?.defender.handCommit?.negated).toBe(true);
    expect(state.battle?.attacker.modifiers).toBe(2);

    state = openPostReveal(state);
    expect(state.battle?.attacker.modifiers).toBe(2);
    expect(state.battle?.defender.modifiers).toBe(0);
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
  });

  it('keeps duplicate target instances distinct', () => {
    let state = game();
    state.battle!.attacker.handCommit = treasonFromHand('player_1');
    state.battle!.defender.handCommit = played('card-valor', 'player_2');
    state.battle!.defender.battleDrawPlayed = [played('card-valor', 'player_2', 'battle_draw')];

    state = openPostReveal(state);
    const pending = state.pendingIntelligenceChoice;
    expect(pending?.kind).toBe('treason_battle_target');
    if (pending?.kind !== 'treason_battle_target') throw new Error('Expected Treason target choice.');
    expect(pending.targetOptions.map((target) => target.targetKey)).toEqual([
      'hand_commit',
      'battle_draw_played:0',
    ]);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'battle_draw_played:0',
    }).state;
    expect(state.battle?.defender.handCommit?.negated).not.toBe(true);
    expect(state.battle?.defender.battleDrawPlayed[0].negated).toBe(true);
  });

  it('allows a banked Treason to pass and remain banked for a later battle', () => {
    let state = game();
    state.players.player_1.zones.assetBank = ['intelligence-treason'];
    state.battle!.defender.handCommit = played('card-valor', 'player_2');

    state = openPostReveal(state);
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'treason_battle_target',
      sourceKind: 'asset',
      options: ['pass', 'select'],
    });

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;
    expect(state.players.player_1.zones.assetBank).toContain('intelligence-treason');
    expect(state.pendingIntelligenceChoice).toBeUndefined();

    state = openPostReveal(state);
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
    expect(state.pendingIntelligenceChoice).toBeUndefined();
  });

  it('discards a banked Treason when its copied effect is used', () => {
    let state = game();
    state.players.player_1.zones.assetBank = ['intelligence-treason'];
    state.battle!.defender.handCommit = played('card-valor', 'player_2');

    state = openPostReveal(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'hand_commit',
    }).state;

    expect(state.players.player_1.zones.assetBank).not.toContain('intelligence-treason');
    expect(state.players.player_1.zones.discard).toContain('intelligence-treason');
    expect(state.battle?.attacker.modifiers).toBe(2);
  });

  it('lets attacker Treason negate defender Subversion before it suppresses Assets', () => {
    let state = game();
    state.battle!.attacker.handCommit = treasonFromHand('player_1');
    state.battle!.defender.handCommit = played('intelligence-subversion', 'player_2');
    state.players.player_1.zones.assetBank = ['card-fortifications'];

    state = openPostReveal(state);
    expect(state.pendingIntelligenceChoice).toMatchObject({ kind: 'treason_battle_target' });
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'hand_commit',
    }).state;

    expect(state.battle?.defender.handCommit?.negated).toBe(true);
    expect(state.battle?.bankedAssetUseProhibited ?? []).not.toContain('player_1');
  });

  it('lets attacker Subversion suppress defender Treason Asset before its window', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');
    state.players.player_2.zones.assetBank = ['intelligence-treason'];
    state.battle!.defender.handCommit = played('card-valor', 'player_2');

    state = openPostReveal(state);

    expect(state.battle?.bankedAssetUseProhibited).toContain('player_2');
    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.players.player_2.zones.assetBank).toContain('intelligence-treason');
  });

  it('copies Attrition into battle aftermath when the Treason player wins', () => {
    let state = game();
    state.battle!.attacker.handCommit = treasonFromHand('player_1');
    state.battle!.defender.handCommit = played('card-attrition', 'player_2');
    state.battle!.defender.battleDrawPlayed = [played('defender-played', 'player_2', 'battle_draw')];
    state.battle!.defender.battleDraw = ['defender-unused'];

    state = openPostReveal(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'hand_commit',
    }).state;
    state = openPostReveal(state);
    state.battle!.attacker.diceRoll = 6;
    state.battle!.defender.diceRoll = 1;
    state.battle!.stage = 'resolution';
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.recentBattleResult?.winner).toBe('player_1');
    expect(state.players.player_2.zones.graveyard).toEqual(expect.arrayContaining([
      'defender-played',
      'defender-unused',
    ]));
  });

  it('copies Exfiltration into an additional retreat if the Treason player loses', () => {
    let state = game();
    state.battle!.attacker.handCommit = treasonFromHand('player_1');
    state.battle!.defender.handCommit = played('intelligence-exfiltration', 'player_2');

    state = openPostReveal(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'hand_commit',
    }).state;
    state = openPostReveal(state);
    state.battle!.attacker.diceRoll = 1;
    state.battle!.defender.diceRoll = 6;
    state.battle!.stage = 'resolution';
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.recentBattleResult?.loser).toBe('player_1');
    expect(state.players.player_1.occupiedSpaceId).toBe('space-2');
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'exfiltration_battle_withdraw',
      playerId: 'player_1',
      destinationId: 'player_1-before-gauntlet',
    });
  });

  it('copies Reconnaissance and ends the battle without a winner using the Treason source destination', () => {
    let state = game();
    state.battle!.attacker.handCommit = treasonFromHand('player_1');
    state.battle!.attacker.battleDrawPlayed = [played('attacker-other', 'player_1', 'battle_draw')];
    state.battle!.defender.handCommit = played('intelligence-reconnaissance', 'player_2', 'hand', {
      earlyEffectResolved: true,
    });

    state = openPostReveal(state);
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'hand_commit',
    }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'treason_reconnaissance_withdraw',
      playerId: 'player_1',
    });

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'withdraw',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.recentBattleResult).toBeUndefined();
    expect(state.players.player_1.zones.graveyard).toContain('intelligence-treason');
    expect(state.players.player_1.zones.discard).toContain('attacker-other');
    expect(state.players.player_2.zones.hand).toContain('intelligence-reconnaissance');
  });

  it('does not offer recursive, cancellation, expired early-reveal, or card-adding effects', () => {
    let state = game();
    state.battle!.attacker.handCommit = treasonFromHand('player_1');
    state.battle!.defender.handCommit = played('intelligence-assassins', 'player_2');
    state.battle!.defender.battleDrawPlayed = [
      played('intelligence-treason', 'player_2', 'battle_draw', { earlyEffectResolved: true }),
      played('card-embargo', 'player_2', 'battle_draw'),
      played('intelligence-operational-reassessment', 'player_2', 'battle_draw'),
      played('military-hold-the-line', 'player_2', 'battle_draw'),
    ];

    state = openPostReveal(state);

    expect(state.pendingIntelligenceChoice).toBeUndefined();
    expect(state.battle?.attacker.handCommit?.postRevealEffectResolved).toBe(true);
  });

  it('allows Operational Reassessment to introduce Treason after reveal', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-operational-reassessment', 'player_1');
    state.battle!.defender.handCommit = played('card-valor', 'player_2');
    state.players.player_1.zones.hand = ['intelligence-treason'];

    state = openPostReveal(state);
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'operational_reassessment_battle',
      eligibleCardIds: ['intelligence-treason'],
    });
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'intelligence-treason',
    }).state;

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'treason_battle_target',
      targetOptions: [expect.objectContaining({ cardId: 'card-valor' })],
    });
  });
});
