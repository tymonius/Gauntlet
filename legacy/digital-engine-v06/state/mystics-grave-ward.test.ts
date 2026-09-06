import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, BattleState, GameState, PlayerID } from '../types/v06';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import {
  captureGraveyardSnapshot,
  openNextGraveWardChoice,
  queueGraveWardBattleEffects,
  registerGraveyardEntries,
  resolveGraveWardBattleChoice,
} from './mystics-grave-ward';
import { initializeGame } from './initialize';
import { isSubversionAssetChoice } from './intelligence-subversion-asset';
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

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw',
  canceled = false,
): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled };
}

function game(opponentFaction: 'military' | 'intelligence' = 'military'): GameState {
  const state = initializeGame({
    id: 'mystics-grave-ward-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName: 'Spirit Walker',
        deck: ['mystics-grave-ward', 'card-valor', 'card-fortifications'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: opponentFaction,
        leaderName: opponentFaction === 'intelligence' ? 'Ranger' : 'General',
        deck: ['intelligence-subversion', 'card-valor', 'card-fortifications'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_after_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function resolvedBattle(): BattleState {
  return {
    id: 'grave-ward-battle',
    stage: 'resolution',
    location: 'space-4',
    attackerOrigin: 'space-3',
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function recordResult(
  state: GameState,
  battle: BattleState,
  handCommittedCards: string[],
): void {
  state.recentBattleResult = {
    battleId: battle.id,
    turn: state.turn,
    winner: 'player_1',
    loser: 'player_2',
    attacker: 'player_1',
    defender: 'player_2',
    location: battle.location,
    attackerOrigin: battle.attackerOrigin,
    retreatDirection: 1,
    handCommittedCards: { player_1: handCommittedCards, player_2: [] },
  };
  state.phase = 'action_after_movement';
}

function queueEntry(
  state: GameState,
  cardId = 'sacrificed-card',
  assetCount = 1,
  battleId?: string,
): void {
  state.players.player_1.zones.assetBank = Array(assetCount).fill('mystics-grave-ward');
  const before = captureGraveyardSnapshot(state);
  state.players.player_1.zones.graveyard.push(cardId);
  registerGraveyardEntries(state, before, battleId);
  openNextGraveWardChoice(state);
}

describe('Grave Ward Asset effect', () => {
  it('banks normally through its Action effect', () => {
    let state = game();
    state.phase = 'action_before_movement';
    state.players.player_1.zones.hand = ['mystics-grave-ward'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-grave-ward',
    }).state;

    expect(state.players.player_1.zones.assetBank).toContain('mystics-grave-ward');
    expect(state.players.player_1.zones.hand).not.toContain('mystics-grave-ward');
  });

  it('detects a Rite sacrifice and opens a private response', () => {
    let state = game();
    state.players.player_1.zones.assetBank = ['mystics-grave-ward'];
    state.players.player_1.zones.hand = ['rite-cost'];

    state = applyGameAction(state, {
      type: 'begin_mystic_rite',
      playerId: 'player_1',
      riteId: 'rite_of_blood',
      cardId: 'rite-cost',
    }).state;

    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'grave_ward_asset',
      playerId: 'player_1',
      cardId: 'rite-cost',
      triggersRemaining: 1,
    });
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'use_mystic_grave_ward_asset', choice: 'pass' }),
      expect.objectContaining({ type: 'use_mystic_grave_ward_asset', choice: 'use' }),
    ]));
  });

  it('uses Grave Ward to move the entered card to Discard and discards the Asset', () => {
    let state = game();
    queueEntry(state);
    const entryId = state.pendingMysticsChoice?.kind === 'grave_ward_asset'
      ? state.pendingMysticsChoice.entryId
      : '';

    state = applyGameAction(state, {
      type: 'use_mystic_grave_ward_asset',
      playerId: 'player_1',
      choice: 'use',
      entryId,
    }).state;

    expect(state.players.player_1.zones.graveyard).not.toContain('sacrificed-card');
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([
      'mystics-grave-ward',
      'sacrificed-card',
    ]));
    expect(state.players.player_1.zones.assetBank).not.toContain('mystics-grave-ward');
    expect(state.pendingMysticsChoice).toBeUndefined();
  });

  it('offers duplicate banked copies sequentially when the player passes', () => {
    let state = game();
    queueEntry(state, 'sacrificed-card', 2);
    const firstEntryId = state.pendingMysticsChoice?.kind === 'grave_ward_asset'
      ? state.pendingMysticsChoice.entryId
      : '';

    state = applyGameAction(state, {
      type: 'use_mystic_grave_ward_asset',
      playerId: 'player_1',
      choice: 'pass',
      entryId: firstEntryId,
    }).state;

    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'grave_ward_asset',
      entryId: firstEntryId,
      triggersRemaining: 1,
    });

    state = applyGameAction(state, {
      type: 'use_mystic_grave_ward_asset',
      playerId: 'player_1',
      choice: 'pass',
      entryId: firstEntryId,
    }).state;

    expect(state.pendingMysticsChoice).toBeUndefined();
    expect(state.players.player_1.zones.graveyard).toContain('sacrificed-card');
    expect(state.players.player_1.zones.assetBank).toEqual([
      'mystics-grave-ward',
      'mystics-grave-ward',
    ]);
  });

  it('uses multiset entry detection for duplicate card titles', () => {
    const state = game();
    state.players.player_1.zones.assetBank = ['mystics-grave-ward'];
    state.players.player_1.zones.graveyard = ['duplicate-card'];
    const before = captureGraveyardSnapshot(state);
    state.players.player_1.zones.graveyard.push('duplicate-card');

    expect(registerGraveyardEntries(state, before)).toBe(1);
    expect(state.players.player_1.mystics?.graveWardEntries).toHaveLength(1);
    expect(state.players.player_1.mystics?.graveWardEntries?.[0].cardId).toBe('duplicate-card');
  });

  it('retains queued entries until an existing aftermath window clears', () => {
    const state = game();
    state.players.player_1.zones.assetBank = ['mystics-grave-ward'];
    const before = captureGraveyardSnapshot(state);
    state.players.player_1.zones.graveyard.push('queued-card');
    registerGraveyardEntries(state, before);
    state.pendingLeaderAbilityWindow = {
      playerId: 'player_1',
      timing: 'after_battle',
      battleId: 'battle-1',
    };

    expect(openNextGraveWardChoice(state)).toBe(false);
    expect(state.players.player_1.mystics?.graveWardEntries).toHaveLength(1);
    state.pendingLeaderAbilityWindow = undefined;
    expect(openNextGraveWardChoice(state)).toBe(true);
  });
});

describe('Grave Ward and Subversion', () => {
  function subversionGame(): GameState {
    const state = game('intelligence');
    state.players.player_2.zones.assetBank = ['intelligence-subversion'];
    state.players.player_2.intelligence!.activeMission = {
      faceDown: true,
      kind: 'normal',
      cardId: 'intelligence-subversion',
      startedTurn: state.turn,
      startedLogIndex: 0,
      requirementSatisfied: false,
      evidence: [],
    };
    queueEntry(state, 'battle-entry', 1, 'battle-evidence');
    return state;
  }

  it('allows Grave Ward to resolve after Subversion passes and records Asset evidence', () => {
    let state = subversionGame();
    const entryId = state.pendingMysticsChoice?.kind === 'grave_ward_asset'
      ? state.pendingMysticsChoice.entryId
      : '';

    state = applyGameAction(state, {
      type: 'use_mystic_grave_ward_asset',
      playerId: 'player_1',
      choice: 'use',
      entryId,
    }).state;
    expect(isSubversionAssetChoice(state.pendingIntelligenceChoice)).toBe(true);

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'pass',
    }).state;

    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([
      'mystics-grave-ward',
      'battle-entry',
    ]));
    expect(state.players.player_2.zones.assetBank).toContain('intelligence-subversion');
    expect(state.players.player_2.intelligence?.activeMission?.evidence).toContain(
      'subversion:asset:battle-evidence:player_1:mystics-grave-ward',
    );
  });

  it('lets Subversion negate Grave Ward, discard it, and leave the target in Graveyard', () => {
    let state = subversionGame();
    const entryId = state.pendingMysticsChoice?.kind === 'grave_ward_asset'
      ? state.pendingMysticsChoice.entryId
      : '';

    state = applyGameAction(state, {
      type: 'use_mystic_grave_ward_asset',
      playerId: 'player_1',
      choice: 'use',
      entryId,
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_2',
      choice: 'use',
    }).state;

    expect(state.players.player_1.zones.graveyard).toContain('battle-entry');
    expect(state.players.player_1.zones.discard).toContain('mystics-grave-ward');
    expect(state.players.player_2.zones.graveyard).toContain('intelligence-subversion');
    expect(state.pendingMysticsChoice).toBeUndefined();
    expect(state.players.player_2.intelligence?.activeMission?.evidence).toEqual(expect.arrayContaining([
      'subversion:asset:battle-evidence:player_1:mystics-grave-ward',
      'subversion:asset:battle-evidence:player_2:intelligence-subversion',
    ]));
  });
});

describe('Grave Ward Battle effect', () => {
  it('excludes a hand-committed Grave Ward itself and moves another commitment', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.attacker.handCommit = played('mystics-grave-ward', 'player_1', 'hand');
    state.players.player_1.zones.graveyard = ['mystics-grave-ward', 'other-commitment'];
    recordResult(state, battle, ['mystics-grave-ward', 'other-commitment']);

    expect(queueGraveWardBattleEffects(state, battle)).toBe(1);
    expect(openNextGraveWardChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'grave_ward_battle',
      handOptions: ['other-commitment'],
    });

    resolveGraveWardBattleChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'other-commitment',
    });

    expect(state.players.player_1.zones.discard).toContain('other-commitment');
    expect(state.players.player_1.zones.graveyard).toContain('mystics-grave-ward');
  });

  it('allows a Battle Hand Grave Ward to choose a hand-committed Grave Ward', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.attacker.handCommit = played('mystics-grave-ward', 'player_1', 'hand');
    battle.attacker.battleDrawPlayed = [played('mystics-grave-ward', 'player_1', 'battle_draw')];
    state.players.player_1.zones.graveyard = ['mystics-grave-ward'];
    recordResult(state, battle, ['mystics-grave-ward']);

    queueGraveWardBattleEffects(state, battle);
    openNextGraveWardChoice(state);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'grave_ward_battle',
      sourceKey: 'player_1:battle_draw:0',
      handOptions: ['mystics-grave-ward'],
    });
  });

  it('resolves multiple active copies sequentially and ignores canceled copies', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.attacker.handCommit = played('mystics-grave-ward', 'player_1', 'hand', true);
    battle.attacker.battleDrawPlayed = [
      played('mystics-grave-ward', 'player_1', 'battle_draw'),
      played('mystics-grave-ward', 'player_1', 'battle_draw'),
    ];
    state.players.player_1.zones.graveyard = ['commit-a', 'commit-b'];
    recordResult(state, battle, ['commit-a', 'commit-b']);

    expect(queueGraveWardBattleEffects(state, battle)).toBe(2);
    openNextGraveWardChoice(state);
    resolveGraveWardBattleChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'commit-a',
    });
    expect(openNextGraveWardChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'grave_ward_battle',
      handOptions: ['commit-b'],
    });
  });

  it('auto-skips when no eligible committed card remains in Graveyard', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.attacker.handCommit = played('mystics-grave-ward', 'player_1', 'hand');
    state.players.player_1.zones.graveyard = ['mystics-grave-ward'];
    recordResult(state, battle, ['mystics-grave-ward']);

    queueGraveWardBattleEffects(state, battle);
    expect(openNextGraveWardChoice(state)).toBe(false);
    expect(state.pendingMysticsChoice).toBeUndefined();
  });
});
