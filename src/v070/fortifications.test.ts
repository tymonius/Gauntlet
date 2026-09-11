import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  applyV070FortificationsGambitTacticEffect,
  openV070FortificationsRetreatChoice,
  resolveV070FortificationsRetreatChoice,
} from './fortifications';
import { createV070BattleRuntime } from './battle-types';
import { viewV070GameForPlayer } from './views';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'fortifications-test',
    seed: 'fortifications-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: 'military-general-forward-doctrine' },
      B: { name: 'Bravo', starterDeckId: 'military-commandant-holdfast' },
    },
  });
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });
}

function activeBattle(): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  return reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone?: 'hand' | 'assetBank',
): string {
  const instanceId = `fortifications-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  if (zone) state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function revealGambits(
  state: V070GameState,
  gambitA?: string,
  gambitB?: string,
): V070GameState {
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A', cardInstanceId: gambitA,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B', cardInstanceId: gambitB,
  });
  return reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
}

function passAllTactics(state: V070GameState): V070GameState {
  while (state.battleRuntime?.stage === 'choose_tactics') {
    for (const playerId of ['A', 'B'] as const) {
      const p = state.battleRuntime?.participants[playerId];
      if (!p || p.tacticChoicesMade >= p.tacticLimit) continue;
      state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId });
      if (state.battleRuntime?.stage !== 'choose_tactics') break;
    }
  }
  return state;
}

describe('v0.7.0 Fortifications', () => {
  test('applies the defending passive after Gambits reveal, not during Onset', () => {
    let state = activeBattle();
    const card = inject(state, 'B', 'neutral-fortifications', 'passive', 'assetBank');
    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
    expect(state.battleRuntime?.stage).toBe('set_gambits');
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(2);
    expect(state.players.B.zones.assetBank).toContain(card);
    expect(state.battleRuntime?.fortificationsAssetTacticLimitResolved).toBe(true);
  });

  test('allows the defender two Tactic choices', () => {
    let state = activeBattle();
    inject(state, 'B', 'neutral-fortifications', 'two-tactics', 'assetBank');
    state = revealGambits(state);
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
    expect(state.battleRuntime?.participants.B.tacticChoicesMade).toBe(2);
    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
  });

  test('does not apply an attacker-owned Fortifications Asset', () => {
    let state = activeBattle();
    inject(state, 'A', 'neutral-fortifications', 'attacker', 'assetBank');
    state = revealGambits(state);
    expect(state.battleRuntime?.participants.A.tacticLimit).toBe(1);
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(1);
  });

  test('battle Subversion prohibits the passive Fortifications effect', () => {
    let state = activeBattle();
    const subversion = inject(state, 'A', 'intelligence-subversion', 'battle', 'hand');
    const fortifications = inject(state, 'B', 'neutral-fortifications', 'blocked', 'assetBank');
    state = revealGambits(state, subversion);
    expect(state.battleRuntime?.assetUseProhibitedPlayers).toContain('B');
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(1);
    expect(state.battleRuntime?.pendingSubversionAssetBattle).toBeNull();
    expect(state.players.B.zones.assetBank).toContain(fortifications);
  });

  test('reactive Subversion pass resumes Fortifications without consuming it', () => {
    let state = activeBattle();
    const fortifications = inject(state, 'B', 'neutral-fortifications', 'pass', 'assetBank');
    inject(state, 'A', 'intelligence-subversion', 'pass', 'assetBank');
    state = revealGambits(state);
    expect(state.battleRuntime?.pendingSubversionAssetBattle).toMatchObject({
      playerId: 'A', targetOwner: 'B', targetAssetInstanceId: fortifications,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset', playerId: 'A', choice: 'pass',
    });
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(2);
    expect(state.players.B.zones.assetBank).toContain(fortifications);
  });

  test('reactive Subversion negates and discards one physical Fortifications', () => {
    let state = activeBattle();
    const fortifications = inject(state, 'B', 'neutral-fortifications', 'use', 'assetBank');
    const subversion = inject(state, 'A', 'intelligence-subversion', 'use', 'assetBank');
    state = revealGambits(state);
    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset', playerId: 'A', choice: 'use',
      subversionInstanceId: subversion,
    });
    expect(state.players.A.zones.graveyard).toContain(subversion);
    expect(state.players.B.zones.discardPile).toContain(fortifications);
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(1);
    expect(state.battleRuntime?.fortificationsAssetTacticLimitResolved).toBe(true);
  });

  test('a second Fortifications can apply after the first physical copy is negated', () => {
    let state = activeBattle();
    const first = inject(state, 'B', 'neutral-fortifications', 'first', 'assetBank');
    const second = inject(state, 'B', 'neutral-fortifications', 'second', 'assetBank');
    const subversion = inject(state, 'A', 'intelligence-subversion', 'single', 'assetBank');
    state = revealGambits(state);
    expect(state.battleRuntime?.pendingSubversionAssetBattle?.targetAssetInstanceId).toBe(first);
    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset', playerId: 'A', choice: 'use',
      subversionInstanceId: subversion,
    });
    expect(state.players.B.zones.discardPile).toContain(first);
    expect(state.players.B.zones.assetBank).toContain(second);
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(2);
  });

  test('Gambit/Tactic grants +1 and retreat permission only to the defender', () => {
    const defender = activeBattle();
    defender.battleRuntime = createV070BattleRuntime();
    const defenderSource = inject(defender, 'B', 'neutral-fortifications', 'defender-card');
    applyV070FortificationsGambitTacticEffect(defender, 'B', defenderSource);
    expect(defender.battleRuntime.participants.B.battleModifier).toBe(1);
    expect(defender.battleRuntime.fortificationsRetreatSourceInstanceIds).toEqual([defenderSource]);

    const attacker = activeBattle();
    attacker.battleRuntime = createV070BattleRuntime();
    const attackerSource = inject(attacker, 'A', 'neutral-fortifications', 'attacker-card');
    applyV070FortificationsGambitTacticEffect(attacker, 'A', attackerSource);
    expect(attacker.battleRuntime.participants.A.battleModifier).toBe(0);
    expect(attacker.battleRuntime.fortificationsRetreatSourceInstanceIds).toEqual([]);
  });

  test('opens the optional extra move after the normal retreat through the battle facade', () => {
    let state = activeBattle();
    const fortifications = inject(state, 'B', 'neutral-fortifications', 'battle-card', 'hand');
    state = revealGambits(state, undefined, fortifications);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    state = passAllTactics(state);
    state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'A', values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'B', values: [1],
    });
    expect(state.battle).toMatchObject({ winner: 'A', loser: 'B', stage: 'resolved' });
    expect(state.battle?.positions.B).toBe(4);
    expect(state.battleRuntime?.pendingFortificationsRetreat).toEqual({
      playerId: 'B', sourceInstanceId: fortifications,
    });
    for (const viewer of ['A', 'B'] as const) {
      const view = viewV070GameForPlayer(state, viewer);
      expect(view.battleRuntime?.pendingFortificationsRetreat).toEqual({
        playerId: 'B', sourceInstanceId: fortifications,
      });
      expect(view.battleRuntime).not.toHaveProperty('fortificationsRetreatSourceInstanceIds');
    }
    state = reduceV070BattleAction(state, {
      type: 'resolve_fortifications_retreat', playerId: 'B', use: true,
    });
    expect(state.battle?.positions.B).toBe(5);
    expect(state.battleRuntime?.pendingFortificationsRetreat).toBeNull();
  });

  test('may decline the optional extra move', () => {
    const state = activeBattle();
    state.battleRuntime = createV070BattleRuntime();
    state.battleRuntime.stage = 'aftermath';
    state.battle!.stage = 'resolved';
    state.battle!.winner = 'A';
    state.battle!.loser = 'B';
    state.battle!.positions.B = 4;
    const source = inject(state, 'B', 'neutral-fortifications', 'decline');
    state.battleRuntime.fortificationsRetreatSourceInstanceIds = [source];
    expect(openV070FortificationsRetreatChoice(state)).toBe(true);
    expect(resolveV070FortificationsRetreatChoice(state, 'B', false)).toBe(false);
    expect(state.battle?.positions.B).toBe(4);
    expect(state.battleRuntime.pendingFortificationsRetreat).toBeNull();
  });

  test('multiple revealed copies grant serial optional moves', () => {
    const state = activeBattle();
    state.battleRuntime = createV070BattleRuntime();
    state.battleRuntime.stage = 'aftermath';
    state.battle!.stage = 'resolved';
    state.battle!.winner = 'A';
    state.battle!.loser = 'B';
    state.battle!.positions.B = 3;
    const first = inject(state, 'B', 'neutral-fortifications', 'retreat-one');
    const second = inject(state, 'B', 'neutral-fortifications', 'retreat-two');
    state.battleRuntime.fortificationsRetreatSourceInstanceIds = [first, second];
    expect(openV070FortificationsRetreatChoice(state)).toBe(true);
    expect(state.battleRuntime.pendingFortificationsRetreat?.sourceInstanceId).toBe(first);
    expect(resolveV070FortificationsRetreatChoice(state, 'B', true)).toBe(true);
    expect(state.battle?.positions.B).toBe(4);
    expect(state.battleRuntime.pendingFortificationsRetreat?.sourceInstanceId).toBe(second);
    expect(resolveV070FortificationsRetreatChoice(state, 'B', true)).toBe(false);
    expect(state.battle?.positions.B).toBe(5);
  });
});
