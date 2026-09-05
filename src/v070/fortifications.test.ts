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
  openNextV070FortificationsPostTacticsEffect,
  resolveV070FortificationsCaptureAfterRetreat,
} from './fortifications';
import { createV070BattleRuntime } from './battle-types';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'fortifications-test',
    seed: 'fortifications-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-general-forward-doctrine',
      },
      B: {
        name: 'Bravo',
        starterDeckId: 'military-commandant-holdfast',
      },
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
    type: 'roll_first_player',
    playerId: 'A',
    value: 6,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function activeBattle(controller: 'A' | 'B' = 'B'): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = controller;

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone?: 'hand' | 'assetBank' | 'drawPile',
): string {
  const instanceId = `fortifications-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  if (zone) state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function openFortificationsOnset(
  state: V070GameState,
): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: state.battle!.attacker,
  });
}

function proceedWithEmptyGambits(
  state: V070GameState,
): V070GameState {
  if (state.battleRuntime?.stage === 'onset') {
    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: state.battle!.attacker,
    });
  }
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

describe('v0.7.0 Fortifications', () => {
  test('opens the optional banked Asset window for the defending controller', () => {
    let state = activeBattle('B');
    const fortifications = inject(
      state,
      'B',
      'neutral-fortifications',
      'asset-window',
      'assetBank',
    );

    state = openFortificationsOnset(state);

    expect(state.battleRuntime?.stage).toBe('onset');
    expect(state.battleRuntime?.pendingFortificationsAssetOnset).toEqual({
      playerId: 'B',
      candidateAssetInstanceIds: [fortifications],
    });
  });

  test('passing leaves Fortifications banked and waits for the attacker to proceed from Onset', () => {
    let state = activeBattle('B');
    const fortifications = inject(
      state,
      'B',
      'neutral-fortifications',
      'pass',
      'assetBank',
    );

    state = openFortificationsOnset(state);
    state = reduceV070BattleAction(state, {
      type: 'pass_fortifications_asset',
      playerId: 'B',
    });

    expect(state.players.B.zones.assetBank).toContain(fortifications);
    expect(state.players.B.zones.graveyard).not.toContain(fortifications);
    expect(state.battleRuntime?.fortificationsAssetOnsetResolved).toBe(true);
    expect(state.battleRuntime?.pendingFortificationsAssetOnset).toBeNull();
    expect(state.battleRuntime?.stage).toBe('onset');

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('set_gambits');
  });

  test('using the Asset moves it to the Graveyard, schedules the effect, and remains in Onset', () => {
    let state = activeBattle('B');
    const fortifications = inject(
      state,
      'B',
      'neutral-fortifications',
      'use',
      'assetBank',
    );

    state = openFortificationsOnset(state);
    state = reduceV070BattleAction(state, {
      type: 'use_fortifications_asset',
      playerId: 'B',
      assetInstanceId: fortifications,
    });

    expect(state.players.B.zones.assetBank).not.toContain(fortifications);
    expect(state.players.B.zones.graveyard).toContain(fortifications);
    expect(state.battleRuntime?.fortificationsScheduledEffects).toContainEqual({
      owner: 'B',
      sourceInstanceId: fortifications,
      sourceKind: 'asset',
    });
    expect(state.battleRuntime?.stage).toBe('onset');

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('set_gambits');
  });

  test('reactive Subversion can negate the banked Fortifications use before it applies', () => {
    let state = activeBattle('B');
    const fortifications = inject(
      state,
      'B',
      'neutral-fortifications',
      'subverted',
      'assetBank',
    );
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'reaction',
      'assetBank',
    );

    state = openFortificationsOnset(state);
    state = reduceV070BattleAction(state, {
      type: 'use_fortifications_asset',
      playerId: 'B',
      assetInstanceId: fortifications,
    });

    expect(state.battleRuntime?.pendingSubversionAssetBattle?.playerId)
      .toBe('A');
    expect(state.players.B.zones.assetBank).toContain(fortifications);

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.players.A.zones.graveyard).toContain(subversion);
    expect(state.players.B.zones.discardPile).toContain(fortifications);
    expect(state.players.B.zones.graveyard).not.toContain(fortifications);
    expect(state.battleRuntime?.fortificationsScheduledEffects).toEqual([]);
    expect(state.battleRuntime?.stage).toBe('onset');
  });

  test('resolves +2 Reserve after ordinary Tactics reveal and adds one chosen Tactic face up', () => {
    let state = activeBattle('B');
    const fortifications = inject(
      state,
      'B',
      'neutral-fortifications',
      'post-reveal',
      'assetBank',
    );
    const lateOne = inject(
      state,
      'B',
      'neutral-new-recruits',
      'late-one',
    );
    const lateTwo = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'late-two',
    );

    state = openFortificationsOnset(state);
    state = reduceV070BattleAction(state, {
      type: 'use_fortifications_asset',
      playerId: 'B',
      assetInstanceId: fortifications,
    });
    state = proceedWithEmptyGambits(state);

    const reserve = state.battleRuntime!.participants.B.reserve;
    const originalReserve = [...reserve];
    const tail = state.players.B.zones.drawPile;
    state.players.B.zones.drawPile = [lateOne, lateTwo, ...tail];

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(state.battleRuntime?.pendingFortificationsPostTactics?.drawnInstanceIds)
      .toEqual([lateOne, lateTwo]);
    expect(state.battleRuntime?.participants.B.reserve)
      .toEqual([...originalReserve, lateOne, lateTwo]);

    state = reduceV070BattleAction(state, {
      type: 'resolve_fortifications_tactic',
      playerId: 'B',
      tacticInstanceId: lateOne,
    });

    expect(state.battleRuntime?.participants.B.reserve).not.toContain(lateOne);
    expect(state.battleRuntime?.participants.B.additionalTactics)
      .toContainEqual({
        instanceId: lateOne,
        owner: 'B',
        role: 'tactic',
        faceUp: true,
      });
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
  });

  test('Fortifications selected as the late additional Tactic schedules a second post-reveal effect', () => {
    let state = activeBattle('B');
    state.battleRuntime = createV070BattleRuntime();
    state.battleRuntime.stage = 'outcome';
    const source = inject(state, 'B', 'neutral-fortifications', 'source');
    const chained = inject(state, 'B', 'neutral-fortifications', 'chained');
    const filler = inject(state, 'B', 'neutral-new-recruits', 'filler');
    state.players.B.zones.drawPile = [chained, filler, ...state.players.B.zones.drawPile];

    applyV070FortificationsGambitTacticEffect(state, 'B', source);
    expect(openNextV070FortificationsPostTacticsEffect(state)).toBe(true);
    expect(state.battleRuntime.pendingFortificationsPostTactics
      ?.candidateTacticInstanceIds).toContain(chained);

    state = reduceV070BattleAction(state, {
      type: 'resolve_fortifications_tactic',
      playerId: 'B',
      tacticInstanceId: chained,
    });

    expect(state.battleRuntime?.fortificationsScheduledEffects)
      .toContainEqual({
        owner: 'B',
        sourceInstanceId: chained,
        sourceKind: 'battle_card',
      });
    expect(state.battleRuntime?.pendingFortificationsPostTactics
      ?.sourceInstanceId).toBe(chained);
  });

  test('opens the same post-reveal decision window even when the hidden cards contain no legal Tactic', () => {
    const state = activeBattle('B');
    state.battleRuntime = createV070BattleRuntime();
    state.battleRuntime.stage = 'outcome';
    const source = inject(state, 'B', 'neutral-fortifications', 'privacy-source');
    const first = inject(state, 'B', 'not-a-real-tactic-card', 'privacy-one');
    const second = inject(state, 'B', 'also-not-a-real-tactic-card', 'privacy-two');
    state.players.B.zones.drawPile = [first, second, ...state.players.B.zones.drawPile];

    applyV070FortificationsGambitTacticEffect(state, 'B', source);
    expect(openNextV070FortificationsPostTacticsEffect(state)).toBe(true);
    expect(state.battleRuntime.pendingFortificationsPostTactics).toEqual({
      playerId: 'B',
      sourceInstanceId: source,
      drawnInstanceIds: [first, second],
      candidateTacticInstanceIds: [],
    });
  });

  test('a losing defender schedules one immediate capture even from multiple Fortifications', () => {
    const state = activeBattle('B');
    state.battleRuntime = createV070BattleRuntime();
    state.battleRuntime.stage = 'aftermath';
    state.battle!.stage = 'resolved';
    state.battle!.winner = 'A';
    state.battle!.loser = 'B';
    state.battle!.positions.B = 4;
    const contested = state.battle!.contestedPosition;
    const first = inject(state, 'B', 'neutral-fortifications', 'capture-one');
    const second = inject(state, 'B', 'neutral-fortifications', 'capture-two');
    state.battleRuntime.fortificationsCaptureEffects = [
      { owner: 'B', sourceInstanceId: first, territoryPosition: contested },
      { owner: 'B', sourceInstanceId: second, territoryPosition: contested },
    ];
    const before = state.board.filter(space => space.controller === 'A').length;

    resolveV070FortificationsCaptureAfterRetreat(state, 'A');

    const after = state.board.filter(space => space.controller === 'A').length;
    expect(after - before).toBe(1);
    expect(state.board.find(space => space.position === contested)?.controller)
      .toBe('A');
  });
});