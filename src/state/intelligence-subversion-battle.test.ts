import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-exfiltration';
import { initializeGame } from './initialize';
import { applySubversionBattleRestrictions, bankedAssetUseAllowed } from './intelligence-subversion-battle';
import { openMilitaryAfterRevealWindows } from './military-timing';

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

function played(cardId: string, owner: PlayerID, origin: 'hand' | 'battle_draw' = 'hand'): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled: false };
}

function game(options: { defenderFaction?: 'military' | 'intelligence' } = {}): GameState {
  const defenderFaction = options.defenderFaction ?? 'intelligence';
  const state = initializeGame({
    id: 'intelligence-subversion-battle',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Attacker', factionId: 'intelligence', leaderName: 'Ranger', deck: ['a1', 'a2', 'a3'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Defender', factionId: defenderFaction, leaderName: defenderFaction === 'military' ? 'General' : 'Spymaster', deck: ['d1', 'd2', 'd3'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const origin = state.board.spaces.find((space) => space.kind === 'territory' && space.index === 2)
    ?? state.board.spaces.filter((space) => space.kind === 'territory')[1];
  const location = state.board.spaces.find((space) => space.kind === 'territory' && space.index === 3)
    ?? state.board.spaces.filter((space) => space.kind === 'territory')[2];
  for (const space of state.board.spaces) space.occupant = undefined;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  location.controller = 'player_2';
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

describe('Subversion Battle effect', () => {
  it('prevents the opposing passive Fortifications Asset from resolving', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.bankedAssetUseProhibited).toContain('player_2');
    expect(state.battle?.defender.modifiers).toBe(0);
    expect(state.players.player_2.zones.assetBank).toContain('card-fortifications');
    expect(bankedAssetUseAllowed(state, 'player_2')).toBe(false);
  });

  it('does not suppress the Subversion player’s own banked Asset', () => {
    let state = game();
    state.battle!.defender.handCommit = played('intelligence-subversion', 'player_2');
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.bankedAssetUseProhibited).toContain('player_1');
    expect(state.battle?.bankedAssetUseProhibited).not.toContain('player_2');
    expect(state.battle?.defender.modifiers).toBe(1);
  });

  it('allows both Subversions to prohibit both players’ banked Assets', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');
    state.battle!.defender.handCommit = played('intelligence-subversion', 'player_2');
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.bankedAssetUseProhibited).toEqual(expect.arrayContaining(['player_1', 'player_2']));
    expect(state.battle?.defender.modifiers).toBe(0);
  });

  it('does not apply a negated Subversion', () => {
    let state = game();
    state.battle!.attacker.handCommit = {
      ...played('intelligence-subversion', 'player_1'),
      negated: true,
    };
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.bankedAssetUseProhibited ?? []).not.toContain('player_2');
    expect(state.battle?.defender.modifiers).toBe(1);
  });

  it('prevents post-reveal Reserve Force from deploying a banked stored card', () => {
    const state = game({ defenderFaction: 'military' });
    state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');
    state.players.player_2.zones.assetBank = ['military-reserve-force'];
    state.players.player_2.military!.storedCards['military-reserve-force'] = 'card-valor';

    applySubversionBattleRestrictions(state);
    openMilitaryAfterRevealWindows(state);

    expect(state.battle?.bankedAssetUseProhibited).toContain('player_2');
    expect(state.pendingMilitaryTimingChoice).toBeUndefined();
    expect(state.players.player_2.zones.assetBank).toContain('military-reserve-force');
  });

  it('does not retroactively undo a Military Asset activated before reveal', () => {
    const state = game({ defenderFaction: 'military' });
    state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');
    state.battle!.effectsResolved.push('active:military-hold-the-line:player_2');
    state.players.player_2.zones.assetBank = [];
    state.players.player_2.zones.deck = ['card-valor', 'card-attrition'];

    applySubversionBattleRestrictions(state);
    openMilitaryAfterRevealWindows(state);

    expect(state.pendingMilitaryTimingChoice).toMatchObject({
      kind: 'hold_the_line_after_reveal',
      playerId: 'player_2',
    });
  });

  it('applies when Operational Reassessment replaces itself with Subversion', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-operational-reassessment', 'player_1');
    state.players.player_1.zones.hand = ['intelligence-subversion'];
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'operational_reassessment_battle',
      eligibleCardIds: ['intelligence-subversion'],
    });

    state = applyGameAction(state, {
      type: 'resolve_intelligence_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'intelligence-subversion',
    }).state;
    expect(state.battle?.bankedAssetUseProhibited).toContain('player_2');

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(state.battle?.defender.modifiers).toBe(0);
  });

  it('suppresses an opposing Attrition Asset during after-battle resolution', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');
    state.battle!.attacker.battleDrawPlayed = [played('attacker-battle-card', 'player_1', 'battle_draw')];
    state.players.player_2.zones.assetBank = ['card-attrition'];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    state.battle!.attacker.diceRoll = 1;
    state.battle!.defender.diceRoll = 6;
    state.battle!.stage = 'resolution';
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.recentBattleResult?.winner).toBe('player_2');
    expect(state.players.player_1.zones.discard).toContain('attacker-battle-card');
    expect(state.players.player_1.zones.graveyard).not.toContain('attacker-battle-card');
    expect(state.players.player_2.zones.assetBank).toContain('card-attrition');
  });

  it('does not undo an Intercepted Orders prohibition that resolved before Subversion was revealed', () => {
    let state = game();
    state.battle!.attacker.handCommit = played('intelligence-subversion', 'player_1');
    state.battle!.blockedBattleDrawCards = { player_1: ['already-prohibited'] };

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.bankedAssetUseProhibited).toContain('player_2');
    expect(state.battle?.blockedBattleDrawCards?.player_1).toEqual(['already-prohibited']);
  });
});
