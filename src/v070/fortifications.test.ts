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
  zone?: 'hand' | 'assetBank',
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

function proceedToGambitReveal(
  state: V070GameState,
  gambitA?: string,
  gambitB?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: gambitA,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: gambitB,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function passAllTactics(state: V070GameState): V070GameState {
  while (state.battleRuntime?.stage === 'choose_tactics') {
    for (const playerId of ['A', 'B'] as const) {
      const participant = state.battleRuntime?.participants[playerId];
      if (!participant
        || participant.tacticChoicesMade >= participant.tacticLimit) {
        continue;
      }
      state = reduceV070BattleAction(state, {
        type: 'choose_tactic',
        playerId,
      });
      if (state.battleRuntime?.stage !== 'choose_tactics') break;
    }
  }
  return state;
}

describe('v0.7.0 Fortifications', () => {
  test('does not create an Onset decision and applies its defending Asset after Gambits reveal', () => {
    let state = activeBattle();
    const fortifications = inject(
      state,
      'B',
      'neutral-fortifications',
      'passive',
      'assetBank',
    );

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('set_gambits');

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(2);
    expect(state.players.B.zones.assetBank).toContain(fortifications);
    expect(state.battleRuntime?.fortificationsAssetTacticLimitResolved)
      .toBe(true);
  });

  test('the defending player can make two Tactic choices after Fortifications applies', () => {
    let state = activeBattle();
    inject(
      state,
      'B',
      'neutral-fortifications',
      'two-tactics',
      'assetBank',
    );
    state = proceedToGambitReveal(state);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.B.tacticChoicesMade).toBe(1);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    expect(state.battleRuntime?.participants.B.tacticChoicesMade).toBe(2);
    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
  });

  test('an attacker-owned Fortifications Asset does not increase the attacker Tactic limit', () => {
    let state = activeBattle();
    inject(
      state,
      'A',
      'neutral-fortifications',
      'attacker-asset',
      'assetBank',
    );

    state = proceedToGambitReveal(state);

    expect(state.battleRuntime?.participants.A.tacticLimit).toBe(1);
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(1);
  });

  test('battle Subversion prevents the defending Fortifications Asset from applying', () => {
    let state = activeBattle();
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'battle-subversion',
      'hand',
    );
    const fortifications = inject(
      state,
      'B',
      'neutral-fortifications',
      'prohibited',
      'assetBank',
    );

    state = proceedToGambitReveal(state, subversion);

    expect(state.battleRuntime?.assetUseProhibitedPlayers).toContain('B');
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(1);
    expect(state.battleRuntime?.pendingSubversionAssetBattle).toBeNull();
    expect(state.players.B.zones.assetBank).toContain(fortifications);
  });

  test('reactive Subversion may pass, leaving Fortifications banked and allowing its effect', () => {
    let state = activeBattle();
    const fortifications = inject(
      state,
      'B',
      'neutral-fortifications',
      'reaction-pass',
      'assetBank',
    );
    inject(
      state,
      'A',
      'intelligence-subversion',
      'reaction-pass',
      'assetBank',
    );

    state = proceedToGambitReveal(state);
    expect(state.battleRuntime?.pendingSubversionAssetBattle).toMatchObject({
      playerId: 'A',
      targetOwner: 'B',
      targetAssetInstanceId: fortifications,
    });
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(1);

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'pass',
    });

    expect(state.battleRuntime?.pendingSubversionAssetBattle).toBeNull();
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(2);
    expect(state.players.B.zones.assetBank).toContain(fortifications);
  });

  test('reactive Subversion negates and discards a physical Fortifications Asset', () => {
    let state = activeBattle();
    const fortifications = inject(
      state,
      'B',
      'neutral-fortifications',
      'reaction-use',
      'assetBank',
    );
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'reaction-use',
      'assetBank',
    );

    state = proceedToGambitReveal(state);
    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.players.A.zones.graveyard).toContain(subversion);
    expect(state.players.B.zones.assetBank).not.toContain(fortifications);
    expect(state.players.B.zones.discardPile).toContain(fortifications);
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(1);
    expect(state.battleRuntime?.fortificationsAssetTacticLimitResolved)
      .toBe(true);
  });

  test('after one copy is negated, another physical Fortifications can still apply', () => {
    let state = activeBattle();
    const first = inject(
      state,
      'B',
      'neutral-fortifications',
      'first-copy',
      'assetBank',
    );
    const second = inject(
      state,
      'B',
      'neutral-fortifications',
      'second-copy',
      'assetBank',
    );
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'one-reaction',
      'assetBank',
    );

    state = proceedToGambitReveal(state);
    expect(state.battleRuntime?.pendingSubversionAssetBattle
      ?.targetAssetInstanceId).toBe(first);

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.players.B.zones.discardPile).toContain(first);
    expect(state.players.B.zones.assetBank).toContain(second);
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(2);
    expect(state.battleRuntime?.pendingSubversionAssetBattle).toBeNull();
  });

  test('the Gambit/Tactic effect gives +1 Battle Total only to the defender', () => {
    let defenderState = activeBattle();
    defenderState.battleRuntime = createV070BattleRuntime();
    const defenderSource = inject(
      defenderState,
      'B',
      'neutral-fortifications',
      'defender-card',
    );
    applyV070FortificationsGambitTacticEffect(
      defenderState,
      'B',
      defenderSource,
    );

    expect(defenderState.battleRuntime.participants.B.battleModifier).toBe(1);
    expect(defenderState.battleRuntime.fortificationsRetreatSourceInstanceIds)
      .toEqual([defenderSource]);

    const attackerState = activeBattle();
    attackerState.battleRuntime = createV070BattleRuntime();
    const attackerSource = inject(
      attackerState,
      'A',
      'neutral-fortifications',
      'attacker-card',
    );
    applyV070FortificationsGambitTacticEffect(
      attackerState,
      'A',
      attackerSource,
    );

    expect(attackerState.battleRuntime.participants.A.battleModifier).toBe(0);
    expect(attackerState.battleRuntime.fortificationsRetreatSourceInstanceIds)
      .toEqual([]);
  });

  test('a losing defender receives the optional extra move after normal retreat through the battle facade', () => {
    let state = activeBattle();
    const fortifications = inject(
      state,
      'B',
      'neutral-fortifications',
      'battle-card',
      'hand',
    );

    state = proceedToGambitReveal(state, undefined, fortifications);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    state = passAllTactics(state);
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });

    expect(state.battle).toMatchObject({
      winner: 'A',
      loser: 'B',
      stage: 'resolved',
    });
    expect(state.battle?.positions.B).toBe(4);
    expect(state.battleRuntime?.pendingFortificationsRetreat).toEqual({
      playerId: 'B',
      sourceInstanceId: fortifications,
    });

    const attackerView = viewV070GameForPlayer(state, 'A');
    const defenderView = viewV070GameForPlayer(state, 'B');
    expect(attackerView.battleRuntime?.pendingFortificationsRetreat)
      .toEqual({ playerId: 'B', sourceInstanceId: fortifications });
    expect(defenderView.battleRuntime?.pendingFortificationsRetreat)
      .toEqual({ playerId: 'B', sourceInstanceId: fortifications });
    expect(attackerView.battleRuntime)
      .not.toHaveProperty('fortificationsRetreatSourceInstanceIds');

    state = reduceV070BattleAction(state, {
      type: 'resolve_fortifications_retreat',
      playerId: 'B',
      use: true,
    });
    expect(state.battle?.positions.B).toBe(5);
    expect(state.battleRuntime?.pendingFortificationsRetreat).toBeNull();
  });

  test('declining the optional Fortifications move leaves the normal retreat unchanged', () => {
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
    expect(resolveV070FortificationsRetreatChoice(state, 'B', false))
      .toBe(false);
    expect(state.battle.positions.B).toBe(4);
    expect(state.battleRuntime.pendingFortificationsRetreat).toBeNull();
  });

  test('multiple revealed Fortifications grant serial optional extra moves', () => {
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
    expect(state.battleRuntime.pendingFortificationsRetreat?.sourceInstanceId)
      .toBe(first);

    expect(resolveV070FortificationsRetreatChoice(state, 'B', true)).toBe(true);
    expect(state.battle.positions.B).toBe(4);
    expect(state.battleRuntime.pendingFortificationsRetreat?.sourceInstanceId)
      .toBe(second);

    expect(resolveV070FortificationsRetreatChoice(state, 'B', true)).toBe(false);
    expect(state.battle.positions.B).toBe(5);
    expect(state.battleRuntime.pendingFortificationsRetreat).toBeNull();
  });
});
