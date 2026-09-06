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
    gameId: 'palisade-wall-battle',
    seed: 'palisade-wall-battle-seed',
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
  const instanceId = `palisade-${owner}-${suffix}`;
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

describe('v0.7.0 Palisade Wall battle effect', () => {
  test('defender interference negates an opposing Gambit before its ordinary effect applies', () => {
    let state = startBattle();
    const ordinary = injectCard(state, 'A', 'neutral-new-recruits', 'ordinary');
    const palisade = injectCard(state, 'B', 'neutral-palisade-wall', 'interference');
    state.players.A.zones.hand.push(ordinary);
    state.players.B.zones.hand.push(palisade);

    state = revealGambits(setGambits(state, ordinary, palisade));

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
    expect(isV070BattleCardEffectNegated(state, ordinary)).toBe(true);
    expect(hasV070BattleCardEffectApplied(state, ordinary)).toBe(false);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.events.some(event =>
      event.type === 'battle_card_effect_skipped_negated'
      && (event.payload as { instanceId?: string }).instanceId === ordinary
    )).toBe(true);
  });

  test('defender gains Advantage when there is no eligible opposing Gambit', () => {
    let state = startBattle();
    const palisade = injectCard(state, 'B', 'neutral-palisade-wall', 'fallback');
    state.players.B.zones.hand.push(palisade);

    state = revealGambits(setGambits(state, undefined, palisade));

    expect(state.battleRuntime?.participants.B.advantage).toBe(1);
    expect(hasV070BattleCardEffectApplied(state, palisade)).toBe(true);
  });

  test('Palisade Wall has no battle effect when its owner is the attacker', () => {
    let state = startBattle();
    const palisade = injectCard(state, 'A', 'neutral-palisade-wall', 'attacker');
    const ordinary = injectCard(state, 'B', 'neutral-new-recruits', 'defender-ordinary');
    state.players.A.zones.hand.push(palisade);
    state.players.B.zones.hand.push(ordinary);

    state = revealGambits(setGambits(state, palisade, ordinary));

    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    expect(isV070BattleCardEffectNegated(state, ordinary)).toBe(false);
    expect(hasV070BattleCardEffectApplied(state, palisade)).toBe(true);
  });

  test('multiple eligible opposing Gambits pause every ordinary effect until the defender chooses one', () => {
    let state = startBattle();
    const first = injectCard(state, 'A', 'neutral-new-recruits', 'choice-first');
    const second = injectCard(state, 'A', 'neutral-rallying-cry', 'choice-second');
    const palisade = injectCard(state, 'B', 'neutral-palisade-wall', 'choice');
    state.players.A.zones.hand.push(first, second);
    state.players.B.zones.hand.push(palisade);

    state = setGambits(state, first, palisade);
    state.players.A.zones.hand = state.players.A.zones.hand.filter(
      instanceId => instanceId !== second,
    );
    state.battleRuntime!.participants.A.additionalGambits.push({
      instanceId: second,
      owner: 'A',
      role: 'gambit',
      faceUp: false,
    });

    state = revealGambits(state);

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'palisade_wall',
        owner: 'B',
        candidateInstanceIds: expect.arrayContaining([first, second]),
      }),
    );
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A',
    })).toThrow(/Palisade Wall/);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_palisade_wall_battle',
      playerId: 'A',
      targetInstanceId: first,
    })).toThrow(/Palisade Wall owner/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_palisade_wall_battle',
      playerId: 'B',
      targetInstanceId: first,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(isV070BattleCardEffectNegated(state, first)).toBe(true);
    expect(isV070BattleCardEffectNegated(state, second)).toBe(false);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
  });

  test('as a Tactic, Palisade Wall may negate an earlier delayed Gambit that has not taken effect', () => {
    let state = startBattle();
    const wager = injectCard(state, 'A', 'mystics-accursed-wager', 'delayed-gambit');
    state.players.A.zones.hand.push(wager);

    state = revealGambits(setGambits(state, wager));
    expect(state.battleRuntime?.battleAccursedWagerInstanceIds).toContain(wager);
    expect(hasV070BattleCardEffectApplied(state, wager)).toBe(false);

    const palisade = injectCard(state, 'B', 'neutral-palisade-wall', 'tactic');
    state.battleRuntime!.participants.B.reserve.push(palisade);
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B', cardInstanceId: palisade,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });

    expect(isV070BattleCardEffectNegated(state, wager)).toBe(true);
    expect(state.battleRuntime?.battleAccursedWagerInstanceIds).not.toContain(wager);
    expect(state.battleRuntime?.participants.B.advantage).toBe(0);
    expect(state.battleRuntime?.stage).toBe('outcome');
  });
});
