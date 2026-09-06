import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'disruption-battle',
    seed: 'disruption-battle-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: 'financiers-banker-sound-investment' },
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

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
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
  const instanceId = `disruption-${owner}-${suffix}`;
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

describe('v0.7.0 Disruption battle effect', () => {
  test('Gambit Disruption negates an opposing Gambit, returns it to Hand, and bars that instance for this battle', () => {
    let state = startBattle();
    const disruption = injectCard(state, 'A', 'neutral-disruption', 'gambit');
    const target = injectCard(state, 'B', 'neutral-new-recruits', 'target');

    state = revealGambits(setGambits(state, disruption, target));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.B.zones.hand).toContain(target);
    expect(state.battleRuntime?.participants.B.gambit).toBeNull();
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(state.battleRuntime?.disruptionProhibitedInstanceIds).toContain(target);
    expect(() => reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: target,
    })).toThrow(/Disruption cannot be set or chosen again|returned by Disruption/i);
  });

  test('multiple eligible same-stage Gambits pause for the Disruption owner to choose', () => {
    let state = startBattle();
    const disruption = injectCard(state, 'A', 'neutral-disruption', 'choice');
    const first = injectCard(state, 'B', 'neutral-new-recruits', 'first');
    const second = injectCard(state, 'B', 'diplomats-gunboat-diplomacy', 'second');

    state = setGambits(state, disruption, first);
    state.battleRuntime!.participants.B.additionalGambits.push({
      instanceId: second,
      owner: 'B',
      role: 'gambit',
      faceUp: false,
    });
    state = revealGambits(state);

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'disruption',
        owner: 'A',
        role: 'gambit',
        candidateInstanceIds: expect.arrayContaining([first, second]),
      }),
    );
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_disruption_battle',
      playerId: 'B',
      targetInstanceId: first,
    })).toThrow(/Disruption owner/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_disruption_battle',
      playerId: 'A',
      targetInstanceId: first,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.B.zones.hand).toContain(first);
    expect(state.battleRuntime?.participants.B.additionalGambits)
      .toContainEqual(expect.objectContaining({ instanceId: second }));
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(2);
  });

  test('Tactic Disruption targets only Tactics at that stage, not an earlier unapplied Gambit', () => {
    let state = startBattle();
    const delayedGambit = injectCard(state, 'B', 'mystics-accursed-wager', 'delayed');
    state = revealGambits(setGambits(state, undefined, delayedGambit));
    expect(state.battleRuntime?.battleAccursedWagerInstanceIds).toContain(delayedGambit);

    const disruption = injectCard(state, 'A', 'neutral-disruption', 'tactic');
    const targetTactic = injectCard(state, 'B', 'neutral-rallying-cry', 'tactic-target');
    state.battleRuntime!.participants.A.reserve.push(disruption);
    state.battleRuntime!.participants.B.reserve.push(targetTactic);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A', cardInstanceId: disruption,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B', cardInstanceId: targetTactic,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(state.battleRuntime?.participants.B.reserve).toContain(targetTactic);
    expect(state.battleRuntime?.participants.B.tactic).toBeNull();
    expect(state.battleRuntime?.participants.B.gambit?.instanceId).toBe(delayedGambit);
    expect(state.battleRuntime?.battleAccursedWagerInstanceIds).toContain(delayedGambit);
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
      cardInstanceId: targetTactic,
    })).toThrow(/returned by Disruption/i);
  });

  test('Disruption resolves as far as able when the opponent has no card at that reveal stage', () => {
    let state = startBattle();
    const disruption = injectCard(state, 'A', 'neutral-disruption', 'none');

    state = revealGambits(setGambits(state, disruption));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.events.some(event =>
      event.type === 'disruption_battle_no_eligible_target'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId === disruption
    )).toBe(true);
  });

  test('a pending Disruption choice blocks unrelated battle progress', () => {
    let state = startBattle();
    const disruption = injectCard(state, 'A', 'neutral-disruption', 'block');
    const first = injectCard(state, 'B', 'neutral-new-recruits', 'block-first');
    const second = injectCard(state, 'B', 'diplomats-gunboat-diplomacy', 'block-second');

    state = setGambits(state, disruption, first);
    state.battleRuntime!.participants.B.additionalGambits.push({
      instanceId: second,
      owner: 'B',
      role: 'gambit',
      faceUp: false,
    });
    state = revealGambits(state);

    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/pending Disruption/i);
  });
});
