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
    gameId: 'capital-punishment-battle',
    seed: 'capital-punishment-battle-seed',
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
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'A', value: 6 });
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'B', value: 1 });
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
  state = reduceV070TurnAction(state, { type: 'choose_movement', playerId: 'A', choice: 'advance' });
  return reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
}

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `capital-punishment-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function setGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A', cardInstanceId: aGambit });
  return reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B', cardInstanceId: bGambit });
}

function revealGambits(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
}

describe('v0.7.0 Capital Punishment battle effect', () => {
  test('negates an opposing Gambit before its ordinary effect applies', () => {
    let state = startBattle();
    const punishment = injectCard(state, 'A', 'neutral-capital-punishment', 'gambit-source');
    const ordinary = injectCard(state, 'B', 'neutral-new-recruits', 'gambit-target');
    state.players.A.zones.hand.push(punishment);
    state.players.B.zones.hand.push(ordinary);

    state = revealGambits(setGambits(state, punishment, ordinary));

    expect(isV070BattleCardEffectNegated(state, ordinary)).toBe(true);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(hasV070BattleCardEffectApplied(state, punishment)).toBe(true);
  });

  test('with multiple targets, owner chooses and ordinary effects remain paused', () => {
    let state = startBattle();
    const punishment = injectCard(state, 'A', 'neutral-capital-punishment', 'choice-source');
    const first = injectCard(state, 'B', 'neutral-new-recruits', 'choice-first');
    const second = injectCard(state, 'B', 'neutral-rallying-cry', 'choice-second');
    state.players.A.zones.hand.push(punishment);
    state.players.B.zones.hand.push(first, second);
    state = setGambits(state, punishment, first);
    state.players.B.zones.hand = state.players.B.zones.hand.filter(id => id !== second);
    state.battleRuntime!.participants.B.additionalGambits.push({
      instanceId: second, owner: 'B', role: 'gambit', faceUp: false,
    });

    state = revealGambits(state);
    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('capital_punishment');
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_capital_punishment_battle',
      playerId: 'B',
      targetInstanceId: first,
    })).toThrow(/Capital Punishment owner/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_capital_punishment_battle',
      playerId: 'A',
      targetInstanceId: first,
    });
    expect(isV070BattleCardEffectNegated(state, first)).toBe(true);
    expect(isV070BattleCardEffectNegated(state, second)).toBe(false);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
  });

  test('no eligible opposing battle card resolves without a target', () => {
    let state = startBattle();
    const punishment = injectCard(state, 'A', 'neutral-capital-punishment', 'no-target');
    state.players.A.zones.hand.push(punishment);

    state = revealGambits(setGambits(state, punishment));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(hasV070BattleCardEffectApplied(state, punishment)).toBe(true);
    expect(state.events.some(event =>
      event.type === 'capital_punishment_battle_no_eligible_target'
    )).toBe(true);
  });

  test('winning owner sends a negated opposing Tactic to its Graveyard in the Aftermath', () => {
    let state = startBattle();
    state = revealGambits(setGambits(state));
    const punishment = injectCard(state, 'A', 'neutral-capital-punishment', 'tactic-source-win');
    const target = injectCard(state, 'B', 'neutral-new-recruits', 'tactic-target-win');
    state.battleRuntime!.participants.A.reserve.push(punishment);
    state.battleRuntime!.participants.B.reserve.push(target);
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A', cardInstanceId: punishment });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B', cardInstanceId: target });
    state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });

    expect(isV070BattleCardEffectNegated(state, target)).toBe(true);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    state = reduceV070BattleAction(state, { type: 'submit_battle_dice', playerId: 'A', values: [6] });
    state = reduceV070BattleAction(state, { type: 'submit_battle_dice', playerId: 'B', values: [1] });

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battleRuntime?.battleCardAftermathDestinationOverrides).toContainEqual(
      expect.objectContaining({
        sourceCardId: 'neutral-capital-punishment',
        playerId: 'B',
        instanceId: target,
        destination: 'graveyard',
      }),
    );

    state = reduceV070BattleAction(state, { type: 'complete_aftermath', playerId: 'A' });
    expect(state.players.B.zones.graveyard).toContain(target);
    expect(state.players.B.zones.discardPile).not.toContain(target);
  });

  test('if the Capital Punishment owner loses, a negated opposing Tactic keeps its normal destination', () => {
    let state = startBattle();
    state = revealGambits(setGambits(state));
    const punishment = injectCard(state, 'A', 'neutral-capital-punishment', 'tactic-source-loss');
    const target = injectCard(state, 'B', 'neutral-new-recruits', 'tactic-target-loss');
    state.battleRuntime!.participants.A.reserve.push(punishment);
    state.battleRuntime!.participants.B.reserve.push(target);
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A', cardInstanceId: punishment });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B', cardInstanceId: target });
    state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'submit_battle_dice', playerId: 'A', values: [1] });
    state = reduceV070BattleAction(state, { type: 'submit_battle_dice', playerId: 'B', values: [6] });

    expect(state.battleRuntime?.battleCardAftermathDestinationOverrides.some(
      override => override.instanceId === target
    )).toBe(false);
    state = reduceV070BattleAction(state, { type: 'complete_aftermath', playerId: 'A' });
    expect(state.players.B.zones.discardPile).toContain(target);
    expect(state.players.B.zones.graveyard).not.toContain(target);
  });
});
