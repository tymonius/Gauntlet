import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';
import {
  hasV070BattleCardEffectApplied,
  isV070BattleCardEffectNegated,
} from './battle-effect-status';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'assassins-battle',
    seed: 'assassins-battle-seed',
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
  const instanceId = `assassins-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function setGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A', cardInstanceId: aGambit,
  });
  return reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B', cardInstanceId: bGambit,
  });
}

function revealGambits(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });
}

describe('v0.7.0 Assassins battle effect', () => {
  test('negates one opposing Gambit before its ordinary effect applies', () => {
    let state = startBattle();
    const assassins = injectCard(state, 'A', 'intelligence-assassins', 'interference');
    const ordinary = injectCard(state, 'B', 'neutral-new-recruits', 'ordinary');
    state.players.A.zones.hand.push(assassins);
    state.players.B.zones.hand.push(ordinary);

    state = revealGambits(setGambits(state, assassins, ordinary));

    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(isV070BattleCardEffectNegated(state, ordinary)).toBe(true);
    expect(hasV070BattleCardEffectApplied(state, assassins)).toBe(true);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
  });

  test('if the opponent set no Gambit, that opponent gains Disadvantage', () => {
    let state = startBattle();
    const assassins = injectCard(state, 'A', 'intelligence-assassins', 'fallback');
    state.players.A.zones.hand.push(assassins);

    state = revealGambits(setGambits(state, assassins));

    expect(state.battleRuntime?.participants.B.disadvantage).toBe(1);
    expect(state.events.some(event =>
      event.type === 'assassins_battle_disadvantage_applied'
    )).toBe(true);
  });

  test('an opposing Gambit that already took effect prevents the no-Gambit fallback', () => {
    let state = startBattle();
    const ordinary = injectCard(state, 'B', 'neutral-new-recruits', 'already-applied');
    state.players.B.zones.hand.push(ordinary);

    state = revealGambits(setGambits(state, undefined, ordinary));
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    expect(hasV070BattleCardEffectApplied(state, ordinary)).toBe(true);

    const assassins = injectCard(state, 'A', 'intelligence-assassins', 'late-tactic');
    state.battleRuntime!.participants.A.reserve.push(assassins);
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A', cardInstanceId: assassins,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });

    expect(state.battleRuntime?.participants.B.disadvantage).toBe(0);
    expect(isV070BattleCardEffectNegated(state, ordinary)).toBe(false);
    expect(state.events.some(event =>
      event.type === 'assassins_battle_no_eligible_gambit'
    )).toBe(true);
  });

  test('multiple eligible opposing Gambits pause ordinary effects until the owner chooses one', () => {
    let state = startBattle();
    const assassins = injectCard(state, 'A', 'intelligence-assassins', 'choice');
    const first = injectCard(state, 'B', 'neutral-new-recruits', 'choice-first');
    const second = injectCard(state, 'B', 'neutral-rallying-cry', 'choice-second');
    state.players.A.zones.hand.push(assassins);
    state.players.B.zones.hand.push(first, second);

    state = setGambits(state, assassins, first);
    state.players.B.zones.hand = state.players.B.zones.hand.filter(
      instanceId => instanceId !== second,
    );
    state.battleRuntime!.participants.B.additionalGambits.push({
      instanceId: second,
      owner: 'B',
      role: 'gambit',
      faceUp: false,
    });

    state = revealGambits(state);

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'assassins',
        owner: 'A',
        candidateInstanceIds: expect.arrayContaining([first, second]),
      }),
    );
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A',
    })).toThrow(/Assassins/);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_assassins_battle',
      playerId: 'B',
      targetInstanceId: first,
    })).toThrow(/Assassins owner/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_assassins_battle',
      playerId: 'A',
      targetInstanceId: first,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(isV070BattleCardEffectNegated(state, first)).toBe(true);
    expect(isV070BattleCardEffectNegated(state, second)).toBe(false);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
  });

  test('as a Tactic, can negate an earlier delayed Gambit that has not taken effect', () => {
    let state = startBattle();
    const wager = injectCard(state, 'B', 'mystics-accursed-wager', 'delayed');
    state.players.B.zones.hand.push(wager);

    state = revealGambits(setGambits(state, undefined, wager));
    expect(state.battleRuntime?.battleAccursedWagerInstanceIds).toContain(wager);
    expect(hasV070BattleCardEffectApplied(state, wager)).toBe(false);

    const assassins = injectCard(state, 'A', 'intelligence-assassins', 'tactic');
    state.battleRuntime!.participants.A.reserve.push(assassins);
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A', cardInstanceId: assassins,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });

    expect(isV070BattleCardEffectNegated(state, wager)).toBe(true);
    expect(state.battleRuntime?.battleAccursedWagerInstanceIds).not.toContain(wager);
    expect(state.battleRuntime?.participants.B.disadvantage).toBe(0);
    expect(state.battleRuntime?.stage).toBe('outcome');
  });
});
