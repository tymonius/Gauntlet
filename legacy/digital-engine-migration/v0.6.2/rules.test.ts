import { describe, expect, test } from 'vitest';
import { v062CanonicalContent } from '../content/v062';
import {
  acceptTerms,
  advanceFrontLine,
  advanceTurnPhase,
  applyBattleOutcome,
  applyMovementChoice,
  applyNormalCapture,
  beginActiveBattle,
  beginMovement,
  canTakeAction,
  controlsTerritory,
  createPendingBattle,
  createTurnState,
  defenderHasDefensiveEdge,
  grantAdditionalAction,
  refuseTerms,
  resolveBattleOutcome,
  resolveWithdrawal,
  takeAction,
  type FrontLineState,
} from './rules';

const content = v062CanonicalContent.content as typeof v062CanonicalContent.content & {
  turn: Record<string, unknown>;
  faction_rules: Record<string, any>;
  proposals: unknown[];
};

describe('v0.6.2 canonical content', () => {
  test('materializes the exact candidate pool structure', () => {
    expect(v062CanonicalContent.rulesVersion).toBe('v0.6.2-candidate');
    expect(content.cards).toHaveLength(128);
    expect(content.territories).toHaveLength(25);
    expect(content.proposals).toHaveLength(9);
    expect(content.cards.filter((card) => card.allegiance === 'Neutral')).toHaveLength(50);
    for (const faction of content.factions) {
      expect(content.cards.filter((card) => card.allegiance === faction.name)).toHaveLength(13);
    }
  });

  test('migrates Invasion and includes all six genuinely new titles', () => {
    const expected = [
      ['Invasion', 'Military', 4],
      ['Landslide', 'Neutral', 4],
      ['Détente', 'Diplomats', 3],
      ['Compound Interest', 'Financiers', 4],
      ['Extraordinary Rendition', 'Intelligence', 4],
      ["Nature's Altar", 'Mystics', 4],
      ['Martyrdom', 'Inquisition', 5],
    ] as const;

    for (const [name, allegiance, cost] of expected) {
      const card = content.cards.find((entry) => entry.name === name);
      expect(card, name).toBeDefined();
      expect(card?.allegiance).toBe(allegiance);
      expect(card?.cost).toBe(cost);
    }
    expect(content.cards.filter((card) => card.name === 'Invasion')).toHaveLength(1);
  });

  test('preserves adopted faction timing and scaling metadata', () => {
    expect(content.faction_rules.financiers.starting_capital).toBe(2);
    expect(content.faction_rules.financiers.faction_action_phase).toBe('Denouement');
    expect(content.faction_rules.intelligence.faction_action_phase).toBe('Denouement');
    expect(content.faction_rules.mystics.guardians_protection_values).toEqual({
      first_rite: 1,
      second_rite: 2,
      third_rite: 3,
      ritual: 4,
    });
    expect(content.faction_rules.inquisition.purge_phases).toEqual(['Opening', 'Denouement']);
  });
});

describe('turn and Action timing', () => {
  test('uses the six-phase turn sequence', () => {
    let state = createTurnState();
    const phases = [state.phase];
    for (let index = 0; index < 5; index += 1) {
      state = advanceTurnPhase(state);
      phases.push(state.phase);
    }
    expect(phases).toEqual(['capture', 'draw', 'opening', 'movement', 'denouement', 'cleanup']);
  });

  test('allows one normal Action in either Action phase', () => {
    let state = advanceTurnPhase(advanceTurnPhase(createTurnState()));
    expect(state.phase).toBe('opening');
    expect(canTakeAction(state)).toBe(true);
    state = takeAction(state);
    expect(canTakeAction(state)).toBe(false);
    state = advanceTurnPhase(advanceTurnPhase(state));
    expect(state.phase).toBe('denouement');
    expect(canTakeAction(state)).toBe(false);
  });

  test('additional Actions do not permit two Actions in one phase', () => {
    let state = advanceTurnPhase(advanceTurnPhase(grantAdditionalAction(createTurnState())));
    state = takeAction(state);
    expect(state.actionsAvailable).toBe(1);
    expect(canTakeAction(state)).toBe(false);
    state = advanceTurnPhase(advanceTurnPhase(state));
    expect(canTakeAction(state)).toBe(true);
    state = takeAction(state);
    expect(state.actionsAvailable).toBe(0);
  });
});

describe('Movement and pending battle', () => {
  test('creating a pending battle ends the sequence and loses unused movement', () => {
    let state = advanceTurnPhase(advanceTurnPhase(advanceTurnPhase(createTurnState())));
    state = beginMovement(state, 2);
    expect(state.movementRemaining).toBe(3);
    state = applyMovementChoice(state, 'advance', { createsPendingBattle: true });
    expect(state.pendingBattleCreated).toBe(true);
    expect(state.movementSequenceOpen).toBe(false);
    expect(state.movementRemaining).toBe(0);
  });

  test('Hold ends Movement without creating a battle', () => {
    let state = advanceTurnPhase(advanceTurnPhase(advanceTurnPhase(createTurnState())));
    state = beginMovement(state);
    state = applyMovementChoice(state, 'hold');
    expect(state.pendingBattleCreated).toBe(false);
    expect(state.movementSequenceOpen).toBe(false);
  });
});

describe('Front Line control and Capture', () => {
  const base: FrontLineState = {
    territoryCount: 6,
    control: { A: 2, B: 2 },
    position: { A: 3, B: 2 },
  };

  test('Position beyond the Front Line does not itself create control', () => {
    expect(controlsTerritory(base, 'A', 0)).toBe(true);
    expect(controlsTerritory(base, 'A', 1)).toBe(true);
    expect(controlsTerritory(base, 'A', 2)).toBe(false);
    expect(base.position.A).toBe(3);
  });

  test('normal Capture adds only the next contiguous Territory', () => {
    const captured = applyNormalCapture(base, 'A');
    expect(captured.control.A).toBe(3);
    expect(captured.control.B).toBe(2);
    expect(controlsTerritory(captured, 'A', 2)).toBe(true);
    expect(controlsTerritory(captured, 'A', 3)).toBe(false);
  });

  test('multi-Territory advances still stop when Position cannot support the next addition', () => {
    const state: FrontLineState = {
      ...base,
      position: { ...base.position, A: 2 },
    };
    const advanced = advanceFrontLine(state, 'A', 3);
    expect(advanced.control.A).toBe(3);
  });
});

describe('Terms, Onset, withdrawal, and battle outcomes', () => {
  const pending = () => createPendingBattle({
    territoryCount: 6,
    attacker: 'A',
    defender: 'B',
    attackerOrigin: 2,
    contestedPosition: 3,
    positions: { A: 3, B: 3 },
    defenderControlsContested: true,
  });

  test('accepted Terms prevent Onset and Aftermath', () => {
    const result = acceptTerms(pending());
    expect(result.stage).toBe('withdrawn');
    expect(result.termsAccepted).toBe(true);
    expect(result.completeNonResultAftermath).toBe(false);
    expect(result.clearCommittedCards).toBe(false);
    expect(result.winner).toBeNull();
  });

  test('refused Terms proceed through Onset to an active battle', () => {
    const onset = refuseTerms(pending());
    expect(onset.stage).toBe('onset');
    const active = beginActiveBattle(onset);
    expect(active.stage).toBe('active');
  });

  test('post-Onset withdrawal completes non-result Aftermath and clears cards', () => {
    const active = beginActiveBattle(refuseTerms(pending()));
    const result = resolveWithdrawal(active, ['A']);
    expect(result.stage).toBe('withdrawn');
    expect(result.completeNonResultAftermath).toBe(true);
    expect(result.clearCommittedCards).toBe(true);
    expect(result.winner).toBeNull();
    expect(result.positions.A).toBe(2);
  });

  test('defender-only withdrawal leaves the attacker occupying when applicable', () => {
    const result = resolveWithdrawal(pending(), ['B']);
    expect(result.positions.A).toBe(3);
    expect(result.positions.B).toBe(4);
    expect(result.occupier).toBe('A');
  });

  test('mutual withdrawal moves attacker first and creates no Occupation', () => {
    const result = resolveWithdrawal(pending(), ['A', 'B']);
    expect(result.positions).toEqual({ A: 2, B: 4 });
    expect(result.occupier).toBeNull();
  });

  test('Defensive Edge decides tied totals before any Tiebreak Roll', () => {
    const battle = pending();
    expect(defenderHasDefensiveEdge(battle)).toBe(true);
    expect(resolveBattleOutcome({
      attackerTotal: 8,
      defenderTotal: 8,
      defenderHasDefensiveEdge: true,
    })).toEqual({
      winner: 'B',
      loser: 'A',
      method: 'defensive_edge',
      tiebreakRounds: 0,
    });
  });

  test('a separate unmodified Tiebreak Roll resolves a remaining tie', () => {
    expect(resolveBattleOutcome({
      attackerTotal: 8,
      defenderTotal: 8,
      defenderHasDefensiveEdge: false,
      tiebreakRolls: [[3, 3], [6, 2]],
    })).toEqual({
      winner: 'A',
      loser: 'B',
      method: 'tiebreak_roll',
      tiebreakRounds: 2,
    });
  });

  test('a losing defender retreats and the attacker becomes occupier', () => {
    const active = beginActiveBattle(refuseTerms(pending()));
    const result = applyBattleOutcome(active, {
      winner: 'A',
      loser: 'B',
      method: 'total',
      tiebreakRounds: 0,
    });
    expect(result.stage).toBe('resolved');
    expect(result.winner).toBe('A');
    expect(result.loser).toBe('B');
    expect(result.positions).toEqual({ A: 3, B: 4 });
    expect(result.occupier).toBe('A');
    expect(result.clearCommittedCards).toBe(true);
  });
});
