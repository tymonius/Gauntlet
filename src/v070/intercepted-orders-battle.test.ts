import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  INTERCEPTED_ORDERS_NEXT_TACTIC_TEXT,
  interceptedOrdersTacticTargets,
  interceptedOrdersReplacementCandidates,
  revealInterceptedOrdersOpposingReserve,
  returnInterceptedOrdersTactic,
  chooseInterceptedOrdersReplacement,
} from './intercepted-orders-battle';

function enterBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'intercepted-orders-next-release',
    seed: 'intercepted-orders-next-release-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: 'intelligence-spymaster-shadow-network' },
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
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset', playerId: 'A',
  });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });
  expect(state.battleRuntime?.stage).toBe('choose_tactics');
  return state;
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  label: string,
): string {
  const instanceId = `intercepted-${owner}-${label}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function prepare(
  attackerSource: boolean,
  extraTarget = false,
): {
  state: V070GameState;
  source: string;
  target: string;
  otherTarget?: string;
  replacement: string;
} {
  let state = enterBattle();
  const owner = attackerSource ? 'A' : 'B';
  const opponent = attackerSource ? 'B' : 'A';
  const source = inject(state, owner, 'intelligence-intercepted-orders', 'source');
  const target = inject(state, opponent, 'neutral-rallying-cry', 'target');
  const replacement = inject(state, opponent, 'neutral-new-recruits', 'replacement');
  state.battleRuntime!.participants[owner].reserve.push(source);
  state.battleRuntime!.participants[opponent].reserve.push(target, replacement);

  const choices = attackerSource
    ? [source, target]
    : [target, source];
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'A', cardInstanceId: choices[0],
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'B', cardInstanceId: choices[1],
  });
  expect(state.battleRuntime?.stage).toBe('reveal_tactics');

  let otherTarget: string | undefined;
  if (extraTarget) {
    otherTarget = inject(
      state, opponent, 'neutral-disruption', 'extra-target',
    );
    state.battleRuntime!.participants[opponent].additionalTactics.push({
      instanceId: otherTarget,
      owner: opponent,
      role: 'tactic',
      faceUp: true,
    });
  }
  return { state, source, target, otherTarget, replacement };
}

describe('future Intercepted Orders Tactic implementation primitives', () => {
  test('matches approved wording, without the deleted timing or reveal phrases', () => {
    expect(INTERCEPTED_ORDERS_NEXT_TACTIC_TEXT).toBe(
      "Reveal the opponent's Reserve. Return 1 opposing Tactic to that Reserve; it cannot be chosen again this battle. The opponent may choose 1 eligible replacement from the Reserve.",
    );
    expect(INTERCEPTED_ORDERS_NEXT_TACTIC_TEXT).not.toMatch(
      /After Tactics are chosen|each opposing face-down Tactic|immediately/,
    );
  });

  test.each([true, false])(
    'opposing Tactic exists by normal reveal for attackerSource=%s',
    attackerSource => {
      const { state, source, target, replacement } = prepare(attackerSource);
      const owner = attackerSource ? 'A' : 'B';
      const opponent = attackerSource ? 'B' : 'A';
      expect(interceptedOrdersTacticTargets(state, owner)).toEqual([target]);
      const exposed = revealInterceptedOrdersOpposingReserve(
        state, owner, source,
      );
      expect(exposed).toContain(replacement);
      expect(exposed).not.toContain(target);
      const hiddenEvent = state.events.find(event =>
        event.type === 'intercepted_orders_reserve_identity'
      );
      expect(hiddenEvent?.visibility).toBe(owner);
      expect((hiddenEvent?.payload as { cardInstanceIds: string[] })
        .cardInstanceIds).toContain(replacement);
      expect(state.battleRuntime!.participants[opponent].tactic?.instanceId)
        .toBe(target);
    },
  );

  test('returns the chosen normal Tactic, bans it and excludes it from replacements', () => {
    const { state, source, target, replacement } = prepare(true);
    const decision = returnInterceptedOrdersTactic(
      state, 'A', source, target,
    );
    expect(decision.slot).toEqual({ kind: 'normal' });
    expect(state.battleRuntime!.participants.B.tactic).toBeNull();
    expect(state.battleRuntime!.participants.B.reserve).toContain(target);
    expect(state.battleRuntime!.interceptedOrdersBarredInstanceIds)
      .toContain(target);
    expect(decision.replacementCandidateInstanceIds).toContain(replacement);
    expect(decision.replacementCandidateInstanceIds).not.toContain(target);
    expect(() => chooseInterceptedOrdersReplacement(
      state, decision, target,
    )).toThrow(/returned card is barred|Replacement must/i);

    const chosen = chooseInterceptedOrdersReplacement(state, decision, replacement);
    expect(chosen).toEqual(expect.objectContaining({
      instanceId: replacement, role: 'tactic', faceUp: true, owner: 'B',
    }));
    expect(state.battleRuntime!.participants.B.tactic?.instanceId)
      .toBe(replacement);
    expect(state.battleRuntime!.participants.B.reserve).not.toContain(replacement);
  });

  test('a second opposing Tactic is selectable; only the chosen one returns', () => {
    const { state, source, target, otherTarget } = prepare(true, true);
    expect(interceptedOrdersTacticTargets(state, 'A'))
      .toEqual([target, otherTarget]);
    const decision = returnInterceptedOrdersTactic(
      state, 'A', source, otherTarget!,
    );
    expect(decision.slot).toEqual({ kind: 'additional', index: 0 });
    expect(state.battleRuntime!.participants.B.tactic?.instanceId).toBe(target);
    expect(state.battleRuntime!.participants.B.additionalTactics).toEqual([]);
    chooseInterceptedOrdersReplacement(state, decision);
    expect(state.battleRuntime!.participants.B.tactic?.instanceId).toBe(target);
  });

  test('without opposing Tactics, the Reserve is still revealed', () => {
    const { state, source, target, replacement } = prepare(true);
    state.battleRuntime!.participants.B.tactic = null;
    state.battleRuntime!.participants.B.reserve.push(target);
    expect(interceptedOrdersTacticTargets(state, 'A')).toEqual([]);
    expect(revealInterceptedOrdersOpposingReserve(state, 'A', source))
      .toEqual(expect.arrayContaining([replacement, target]));
  });

  test('rejects attempt to return a Reserve card rather than a committed Tactic', () => {
    const { state, source, replacement } = prepare(true);
    expect(() => returnInterceptedOrdersTactic(
      state, 'A', source, replacement,
    )).toThrow(/currently committed opposing Tactic/);
  });

  test('excludes same-battle Disruption banned replacements', () => {
    const { state, target, replacement } = prepare(true);
    state.battleRuntime!.disruptionProhibitedInstanceIds = [replacement];
    expect(interceptedOrdersReplacementCandidates(state, 'B'))
      .not.toContain(replacement);
    expect(interceptedOrdersReplacementCandidates(state, 'B'))
      .not.toContain(target);
  });
});
