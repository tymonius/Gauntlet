import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  revealV070BattleCommitmentEarly,
  v070BattleEarlyRevealRecords,
} from './battle-early-reveal';
import { registerV070DeepCoverBattleEffect } from './deep-cover-battle';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'deep-cover-battle',
    seed: 'deep-cover-battle-seed',
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
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });

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

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `deep-cover-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function setGambits(
  state: V070GameState,
  a?: string,
  b?: string,
): V070GameState {
  if (a) state.players.A.zones.hand.push(a);
  if (b) state.players.B.zones.hand.push(b);
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A', cardInstanceId: a,
  });
  return reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B', cardInstanceId: b,
  });
}

function revealGambits(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });
}

describe('v0.7.0 Deep Cover battle effect', () => {
  test('an opposing effect revealing Deep Cover itself early grants Advantage at normal reveal', () => {
    let state = startBattle();
    const deepCover = injectCard(
      state,
      'A',
      'intelligence-deep-cover',
      'gambit-opposing-effect',
    );
    state = setGambits(state, deepCover);

    expect(revealV070BattleCommitmentEarly(state, {
      targetInstanceId: deepCover,
      sourceKind: 'effect',
      sourceController: 'B',
      sourceId: 'test-opposing-effect',
    })).toBe(true);

    state = revealGambits(state);
    expect(state.battleRuntime?.participants.A.advantage).toBe(1);
    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(state.events.some(event =>
      event.type === 'deep_cover_battle_advantage_gained'
    )).toBe(true);
  });

  test('a rule-driven early face-up reveal does not satisfy Deep Cover', () => {
    let state = startBattle();
    const deepCover = injectCard(
      state,
      'A',
      'intelligence-deep-cover',
      'gambit-rule',
    );
    state = setGambits(state, deepCover);

    revealV070BattleCommitmentEarly(state, {
      targetInstanceId: deepCover,
      sourceKind: 'rule',
      sourceId: 'Watchtower',
    });
    state = revealGambits(state);

    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
  });

  test('your own effect revealing a battle card early does not satisfy Deep Cover', () => {
    let state = startBattle();
    const deepCover = injectCard(
      state,
      'A',
      'intelligence-deep-cover',
      'gambit-own-effect',
    );
    state = setGambits(state, deepCover);

    revealV070BattleCommitmentEarly(state, {
      targetInstanceId: deepCover,
      sourceKind: 'effect',
      sourceController: 'A',
      sourceId: 'test-own-effect',
    });
    state = revealGambits(state);

    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
  });

  test('a normally revealed Gambit does not create early-reveal provenance', () => {
    let state = startBattle();
    const deepCover = injectCard(
      state,
      'A',
      'intelligence-deep-cover',
      'normal-gambit',
    );
    state = setGambits(state, deepCover);
    state = revealGambits(state);

    expect(v070BattleEarlyRevealRecords(state)).toEqual([]);
    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
  });

  test('an opposing effect revealing a Tactic early satisfies a Tactic Deep Cover', () => {
    let state = startBattle();
    state = setGambits(state);
    state = revealGambits(state);

    const deepCover = injectCard(
      state,
      'A',
      'intelligence-deep-cover',
      'tactic-opposing-effect',
    );
    state.battleRuntime!.participants.A.reserve.push(deepCover);
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A', cardInstanceId: deepCover,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B',
    });

    expect(revealV070BattleCommitmentEarly(state, {
      targetInstanceId: deepCover,
      sourceKind: 'effect',
      sourceController: 'B',
      sourceId: 'test-opposing-effect',
    })).toBe(true);
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });

    expect(state.battleRuntime?.participants.A.advantage).toBe(1);
  });

  test('multiple qualifying early reveals still grant only one Advantage per Deep Cover resolution', () => {
    const state = startBattle();
    const deepCover = injectCard(
      state,
      'A',
      'intelligence-deep-cover',
      'multiple-reveals',
    );
    state.battleRuntime!.participants.A.gambit = {
      instanceId: deepCover,
      owner: 'A',
      role: 'gambit',
      faceUp: false,
    };
    const second = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'second-target',
    );
    state.battleRuntime!.participants.A.additionalGambits.push({
      instanceId: second,
      owner: 'A',
      role: 'gambit',
      faceUp: false,
    });

    revealV070BattleCommitmentEarly(state, {
      targetInstanceId: deepCover,
      sourceKind: 'effect',
      sourceController: 'B',
      sourceId: 'effect-one',
    });
    revealV070BattleCommitmentEarly(state, {
      targetInstanceId: second,
      sourceKind: 'effect',
      sourceController: 'B',
      sourceId: 'effect-two',
    });

    registerV070DeepCoverBattleEffect(state, 'A', deepCover);
    expect(state.battleRuntime!.participants.A.advantage).toBe(1);
    expect(v070BattleEarlyRevealRecords(state)).toHaveLength(2);
  });

  test('the early-reveal primitive refuses to rewrite an already face-up card provenance', () => {
    let state = startBattle();
    const deepCover = injectCard(
      state,
      'A',
      'intelligence-deep-cover',
      'no-rewrite',
    );
    state = setGambits(state, deepCover);

    expect(revealV070BattleCommitmentEarly(state, {
      targetInstanceId: deepCover,
      sourceKind: 'rule',
      sourceId: 'Watchtower',
    })).toBe(true);
    expect(revealV070BattleCommitmentEarly(state, {
      targetInstanceId: deepCover,
      sourceKind: 'effect',
      sourceController: 'B',
      sourceId: 'later-effect',
    })).toBe(false);

    expect(v070BattleEarlyRevealRecords(state)).toEqual([
      expect.objectContaining({
        instanceId: deepCover,
        sourceKind: 'rule',
      }),
    ]);
  });
});
