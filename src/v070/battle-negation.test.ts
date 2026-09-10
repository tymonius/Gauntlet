import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  hasV070BattleCardEffectApplied,
  isV070BattleCardEffectNegated,
  v070BattleCommitment,
} from './battle-effect-status';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';
import {
  V070_SABOTAGE_BATTLE_TEXT,
  V070_SABOTAGE_ID,
  V070_TYRANNY_BATTLE_TEXT,
  V070_TYRANNY_ID,
} from './battle-negation';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'battle-negation',
    seed: 'battle-negation-seed',
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
  const instanceId = `battle-negation-${owner}-${suffix}`;
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

describe('released v0.7.0 Tyranny and Sabotage authority', () => {
  test('locks both printed battle effects independently to the frozen release', () => {
    expect(V070_TYRANNY_BATTLE_TEXT).toBe(
      'Negate one opposing Gambit or Tactic that has not taken effect.',
    );
    expect(v070CanonicalContent.cardsById.get(V070_TYRANNY_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_TYRANNY_BATTLE_TEXT);

    expect(V070_SABOTAGE_BATTLE_TEXT).toBe(
      "Choose one opposing Gambit or Tactic at that stage that has not taken effect. Negate it and put it in its owner's Discard Pile immediately.",
    );
    expect(v070CanonicalContent.cardsById.get(V070_SABOTAGE_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_SABOTAGE_BATTLE_TEXT);
  });
});

describe('v0.7.0 Tyranny reveal interference', () => {
  test('negates the opposing same-stage card before its ordinary effect applies and leaves it committed', () => {
    let state = startBattle();
    const tyranny = injectCard(state, 'A', V070_TYRANNY_ID, 'tyranny');
    const target = injectCard(state, 'B', 'neutral-new-recruits', 'target');

    state = revealGambits(setGambits(state, tyranny, target));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(isV070BattleCardEffectNegated(state, target)).toBe(true);
    expect(hasV070BattleCardEffectApplied(state, tyranny)).toBe(true);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(v070BattleCommitment(state, target)).toEqual(
      expect.objectContaining({ instanceId: target, owner: 'B', role: 'gambit' }),
    );
    expect(state.players.B.zones.hand).not.toContain(target);
    expect(state.players.B.zones.discardPile).not.toContain(target);
  });

  test('multiple eligible opposing cards pause for the owner and block unrelated progress', () => {
    let state = startBattle();
    const tyranny = injectCard(state, 'A', V070_TYRANNY_ID, 'choice');
    const first = injectCard(state, 'B', 'neutral-new-recruits', 'first');
    const second = injectCard(state, 'B', 'diplomats-gunboat-diplomacy', 'second');

    state = setGambits(state, tyranny, first);
    state.battleRuntime!.participants.B.additionalGambits.push({
      instanceId: second,
      owner: 'B',
      role: 'gambit',
      faceUp: false,
    });
    state = revealGambits(state);

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'battle_negation',
        owner: 'A',
        sourceCardId: V070_TYRANNY_ID,
        role: 'gambit',
        candidateInstanceIds: expect.arrayContaining([first, second]),
      }),
    );
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/Tyranny or Sabotage/i);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_battle_negation',
      playerId: 'B',
      targetInstanceId: first,
    })).toThrow(/owner may choose/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_negation',
      playerId: 'A',
      targetInstanceId: first,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(isV070BattleCardEffectNegated(state, first)).toBe(true);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(2);
    expect(v070BattleCommitment(state, first)).not.toBeNull();
  });
});

describe('v0.7.0 Sabotage reveal interference', () => {
  test('negates the exact opposing Gambit and puts that physical card in its owner Discard Pile immediately', () => {
    let state = startBattle();
    const sabotage = injectCard(state, 'A', V070_SABOTAGE_ID, 'sabotage');
    const target = injectCard(state, 'B', 'neutral-new-recruits', 'target');

    state = revealGambits(setGambits(state, sabotage, target));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(isV070BattleCardEffectNegated(state, target)).toBe(true);
    expect(hasV070BattleCardEffectApplied(state, sabotage)).toBe(true);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(v070BattleCommitment(state, target)).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(target);
    expect(state.players.B.zones.graveyard).not.toContain(target);
    expect(state.events.some(event =>
      event.type === 'sabotage_battle_card_negated_and_discarded'
      && (event.payload as { targetInstanceId?: string }).targetInstanceId === target
    )).toBe(true);
  });

  test('as a Tactic, targets only an opposing Tactic at that stage and leaves an earlier Gambit alone', () => {
    let state = startBattle();
    const earlierGambit = injectCard(state, 'B', 'mystics-accursed-wager', 'earlier');
    state = revealGambits(setGambits(state, undefined, earlierGambit));
    expect(state.battleRuntime?.battleAccursedWagerInstanceIds).toContain(earlierGambit);

    const sabotage = injectCard(state, 'A', V070_SABOTAGE_ID, 'tactic');
    const targetTactic = injectCard(state, 'B', 'neutral-rallying-cry', 'tactic-target');
    state.battleRuntime!.participants.A.reserve.push(sabotage);
    state.battleRuntime!.participants.B.reserve.push(targetTactic);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A', cardInstanceId: sabotage,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B', cardInstanceId: targetTactic,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(isV070BattleCardEffectNegated(state, targetTactic)).toBe(true);
    expect(v070BattleCommitment(state, targetTactic)).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(targetTactic);
    expect(v070BattleCommitment(state, earlierGambit)?.instanceId).toBe(earlierGambit);
    expect(state.battleRuntime?.battleAccursedWagerInstanceIds).toContain(earlierGambit);
  });

  test('with multiple candidates, resolves the selected exact instance and lets the other ordinary effect continue', () => {
    let state = startBattle();
    const sabotage = injectCard(state, 'A', V070_SABOTAGE_ID, 'choice');
    const first = injectCard(state, 'B', 'neutral-new-recruits', 'first');
    const second = injectCard(state, 'B', 'diplomats-gunboat-diplomacy', 'second');

    state = setGambits(state, sabotage, first);
    state.battleRuntime!.participants.B.additionalGambits.push({
      instanceId: second,
      owner: 'B',
      role: 'gambit',
      faceUp: false,
    });
    state = revealGambits(state);

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_negation',
      playerId: 'A',
      targetInstanceId: second,
    });

    expect(v070BattleCommitment(state, second)).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(second);
    expect(v070BattleCommitment(state, first)).not.toBeNull();
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
  });
});
