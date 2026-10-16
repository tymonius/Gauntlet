import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import {
  V070_SHOCK_AND_AWE_ASSET_TEXT,
  V070_SHOCK_AND_AWE_BATTLE_TEXT,
  V070_SHOCK_AND_AWE_ID,
  assertV070ShockAndAweAuthority,
  prepareV070ShockAndAweBattleEffect,
  resolveV070ShockAndAweConsolidate,
} from './shock-and-awe-battle';
import { imposeV070VictoryResultRestrictions } from './victory-result-restrictions';

function startBattle(
  contestedController: 'A' | 'B' = 'B',
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'shock-and-awe-primers',
    seed: 'shock-and-awe-primers-seed',
    players: {
      A: {
        name: 'Attacker',
        starterDeckId: 'military-general-forward-doctrine',
      },
      B: {
        name: 'Defender',
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
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });
  state.players.A.position = 2;
  state.players.B.position = 3;
  for (const territory of state.board) {
    territory.occupant = null;
    territory.controller = territory.position <= 2 ? 'A' : 'B';
    territory.blank = true;
  }
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = contestedController;

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset', playerId: 'A',
  });
}

function addHandCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  tag: string,
): string {
  const instanceId = `shock-primer-${tag}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

describe('Shock and Awe preparation (not registered for live battle)', () => {
  test('locks exact frozen and current Asset/Gambit-Tactic text', () => {
    expect(V070_SHOCK_AND_AWE_ID).toBe('military-shock-and-awe');
    expect(V070_SHOCK_AND_AWE_ASSET_TEXT)
      .toContain('apply its Gambit/Tactic effect after Tactics are revealed');
    expect(V070_SHOCK_AND_AWE_BATTLE_TEXT)
      .toContain('Breakthrough — Opponent: Retreat +1');
    expect(V070_SHOCK_AND_AWE_BATTLE_TEXT)
      .toContain('Consolidate — Capture that Territory');
    expect(() => assertV070ShockAndAweAuthority()).not.toThrow();
  });

  test('only the attacker on an enemy-controlled Territory qualifies', () => {
    const defending = startBattle('B');
    const source = addHandCard(
      defending, 'B', V070_SHOCK_AND_AWE_ID, 'defending',
    );
    expect(prepareV070ShockAndAweBattleEffect(
      defending, 'B', source, 'tactic',
    )).toBe(false);
    expect(defending.battleRuntime?.shockAndAwePendingEffects)
      .toBeUndefined();

    const friendly = startBattle('A');
    const friendlySource = addHandCard(
      friendly, 'A', V070_SHOCK_AND_AWE_ID, 'friendly',
    );
    expect(prepareV070ShockAndAweBattleEffect(
      friendly, 'A', friendlySource, 'gambit',
    )).toBe(false);
    expect(friendly.battleRuntime?.additionalRetreatEffects)
      .toHaveLength(0);
  });

  test('prepares the optional extra Tactic from Hand and both Graveyard destinations', () => {
    const state = startBattle();
    const source = addHandCard(
      state, 'A', V070_SHOCK_AND_AWE_ID, 'source',
    );
    const eligible = addHandCard(
      state, 'A', 'neutral-rallying-cry', 'tactic',
    );
    addHandCard(
      state, 'A', 'diplomats-clemency', 'not-tactic',
    );

    expect(prepareV070ShockAndAweBattleEffect(
      state, 'A', source, 'gambit',
    )).toBe(true);
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'late_additional_tactic',
        owner: 'A',
        sourceInstanceId: source,
        sourceCardId: V070_SHOCK_AND_AWE_ID,
        candidateInstanceIds: expect.arrayContaining([eligible]),
        candidateZone: 'hand',
        chosenDestination: 'graveyard',
      }),
    );
    expect(state.battleRuntime?.additionalRetreatEffects).toEqual([
      expect.objectContaining({
        sourceInstanceId: source,
        targetPlayer: 'A',
        steps: 1,
      }),
    ]);
    expect(state.battleRuntime?.battleCardAftermathDestinationOverrides)
      .toContainEqual(expect.objectContaining({
        instanceId: source,
        destination: 'graveyard',
      }));
  });

  test('Consolidate captures the contiguous Territory, sets Command to two, and blocks later victory benefits', () => {
    const state = startBattle();
    const source = addHandCard(
      state, 'A', V070_SHOCK_AND_AWE_ID, 'consolidate',
    );
    prepareV070ShockAndAweBattleEffect(
      state, 'A', source, 'tactic',
    );
    state.battleRuntime!.stage = 'aftermath';
    state.battle!.winner = 'A';
    state.battle!.loser = 'B';
    state.players.A.military!.command = 0;

    const result = resolveV070ShockAndAweConsolidate(
      state, 'A', source,
    );
    expect(result.captured).toBe(true);
    expect(result.reachedOpponentEnd).toBe(false);
    expect(state.board[3].controller).toBe('A');
    expect(state.players.A.military!.command).toBe(2);
    expect(state.battleRuntime?.victoryResultRestrictions?.A)
      .toEqual(expect.objectContaining({
        noMovement: true,
        noCapture: true,
        noOrders: true,
      }));
    expect(state.battleRuntime?.shockAndAwePendingEffects)
      .toHaveLength(0);
  });

  test('Consolidate retains Command = 2 when another effect prevents its capture', () => {
    const state = startBattle();
    const source = addHandCard(
      state, 'A', V070_SHOCK_AND_AWE_ID, 'blocked-consolidate',
    );
    prepareV070ShockAndAweBattleEffect(
      state, 'A', source, 'tactic',
    );
    state.battleRuntime!.stage = 'aftermath';
    state.battle!.winner = 'A';
    state.battle!.loser = 'B';
    imposeV070VictoryResultRestrictions(state, 'A', 'prior', {
      noCapture: true,
    });
    state.players.A.military!.command = 0;

    const result = resolveV070ShockAndAweConsolidate(
      state, 'A', source,
    );
    expect(result.captured).toBe(false);
    expect(state.board[3].controller).toBe('B');
    expect(state.players.A.military!.command).toBe(2);
  });

  test('Consolidate registers final-territory victory rather than ending the battle prematurely', () => {
    const state = startBattle();
    const source = addHandCard(
      state, 'A', V070_SHOCK_AND_AWE_ID, 'final',
    );
    prepareV070ShockAndAweBattleEffect(
      state, 'A', source, 'gambit',
    );
    for (const territory of state.board) {
      territory.controller = 'A';
    }
    state.board[3].controller = 'B';
    state.battleRuntime!.stage = 'aftermath';
    state.battle!.winner = 'A';
    state.battle!.loser = 'B';

    expect(resolveV070ShockAndAweConsolidate(
      state, 'A', source,
    )).toEqual({ captured: true, reachedOpponentEnd: true });
    expect(state.battleRuntime?.pendingGameVictory).toEqual({
      winner: 'A', route: 'final_territory_capture',
    });
    expect(state.battle).not.toBeNull();
  });
});
