import { describe, expect, test } from 'vitest';
import {
  advanceV070TurnPhase,
  applyV070MovementChoice,
  beginEffectGrantedV070Movement,
  beginNormalV070Movement,
  createV070TurnState,
  currentV070MovementStep,
  queueNormalV070MovementStep,
  type V070TurnState,
} from './rules';

function openingState(): V070TurnState {
  let state = createV070TurnState();
  state = advanceV070TurnPhase(state); // capture -> draw
  state = advanceV070TurnPhase(state); // draw -> opening
  expect(state.phase).toBe('opening');
  return state;
}

describe('v0.7.0 movement-step grant core', () => {
  test('normal movement is first and queued Opening bonuses follow in grant order', () => {
    let state = openingState();
    state = queueNormalV070MovementStep(state, {
      source: 'Advance Guard',
      choiceRestriction: 'any',
      battleRestriction: 'allowed_no_gambit',
    });
    state = queueNormalV070MovementStep(state, {
      source: 'Invasion',
      choiceRestriction: 'advance_only',
      battleRestriction: 'allowed',
    });

    state = advanceV070TurnPhase(state);
    expect(state.phase).toBe('movement');
    state = beginNormalV070Movement(state);

    expect(state.movementRemaining).toBe(3);
    expect(state.movementStepQueue.map(step => step.source)).toEqual([
      'normal',
      'Advance Guard',
      'Invasion',
    ]);
    expect(currentV070MovementStep(state)).toEqual({
      source: 'normal',
      choiceRestriction: 'any',
      battleRestriction: 'allowed',
    });

    state = applyV070MovementChoice(state, 'fall_back');
    expect(state.movementRemaining).toBe(2);
    expect(currentV070MovementStep(state)?.source).toBe('Advance Guard');

    state = applyV070MovementChoice(state, 'advance');
    expect(state.movementRemaining).toBe(1);
    expect(currentV070MovementStep(state)).toEqual({
      source: 'Invasion',
      choiceRestriction: 'advance_only',
      battleRestriction: 'allowed',
    });
  });

  test('legacy numeric additional movement remains unrestricted before queued restricted steps', () => {
    let state = openingState();
    state = queueNormalV070MovementStep(state, {
      source: 'Forced March',
      choiceRestriction: 'any',
      battleRestriction: 'prohibited',
    });

    state = beginNormalV070Movement(
      advanceV070TurnPhase(state),
      1,
    );

    expect(state.movementStepQueue).toEqual([
      {
        source: 'normal',
        choiceRestriction: 'any',
        battleRestriction: 'allowed',
      },
      {
        source: 'normal_additional',
        choiceRestriction: 'any',
        battleRestriction: 'allowed',
      },
      {
        source: 'Forced March',
        choiceRestriction: 'any',
        battleRestriction: 'prohibited',
      },
    ]);
    expect(state.movementRemaining).toBe(state.movementStepQueue.length);
  });

  test('advance-only extra movement rejects Fall Back without consuming the step', () => {
    let state = openingState();
    state = queueNormalV070MovementStep(state, {
      source: 'Invasion',
      choiceRestriction: 'advance_only',
      battleRestriction: 'allowed',
    });
    state = beginNormalV070Movement(advanceV070TurnPhase(state));
    state = applyV070MovementChoice(state, 'advance');

    expect(() => applyV070MovementChoice(state, 'fall_back'))
      .toThrow(/may only be used to Advance/);
    expect(state.movementRemaining).toBe(1);
    expect(currentV070MovementStep(state)?.source).toBe('Invasion');
  });

  test('a battle-prohibited extra step cannot initiate a battle', () => {
    let state = openingState();
    state = queueNormalV070MovementStep(state, {
      source: 'Forced March',
      choiceRestriction: 'any',
      battleRestriction: 'prohibited',
    });
    state = beginNormalV070Movement(advanceV070TurnPhase(state));
    state = applyV070MovementChoice(state, 'advance');

    expect(currentV070MovementStep(state)?.source).toBe('Forced March');
    expect(() => applyV070MovementChoice(
      state,
      'advance',
      { initiatesBattle: true },
    )).toThrow(/cannot initiate a battle/);
    expect(state.movementRemaining).toBe(1);
  });

  test('allowed-no-gambit is exposed on the current step and still permits battle onset', () => {
    let state = openingState();
    state = queueNormalV070MovementStep(state, {
      source: 'Advance Guard',
      choiceRestriction: 'any',
      battleRestriction: 'allowed_no_gambit',
    });
    state = beginNormalV070Movement(advanceV070TurnPhase(state));
    state = applyV070MovementChoice(state, 'advance');

    expect(currentV070MovementStep(state)).toEqual({
      source: 'Advance Guard',
      choiceRestriction: 'any',
      battleRestriction: 'allowed_no_gambit',
    });

    state = applyV070MovementChoice(
      state,
      'advance',
      { initiatesBattle: true },
    );
    expect(state.battleInitiated).toBe(true);
    expect(state.movementRemaining).toBe(0);
    expect(state.movementSequenceOpen).toBe(false);
    expect(state.movementStepQueue).toEqual([]);
  });

  test('Hold closes the whole sequence and discards unused queued movement', () => {
    let state = openingState();
    state = queueNormalV070MovementStep(state, {
      source: 'Advance Guard',
      choiceRestriction: 'any',
      battleRestriction: 'allowed_no_gambit',
    });
    state = beginNormalV070Movement(advanceV070TurnPhase(state));

    state = applyV070MovementChoice(state, 'hold');

    expect(state.movementRemaining).toBe(0);
    expect(state.movementSequenceOpen).toBe(false);
    expect(state.movementSequenceSource).toBeNull();
    expect(state.movementStepQueue).toEqual([]);
  });

  test('effect-granted movement creates its own restricted step sequence outside Movement', () => {
    let state = openingState();
    state = advanceV070TurnPhase(state); // movement
    state = advanceV070TurnPhase(state); // denouement
    expect(state.phase).toBe('denouement');

    state = beginEffectGrantedV070Movement(state, 2, {
      source: 'test effect',
      choiceRestriction: 'advance_only',
      battleRestriction: 'prohibited',
    });

    expect(state.movementSequenceSource).toBe('effect');
    expect(state.movementRemaining).toBe(2);
    expect(state.movementStepQueue).toEqual([
      {
        source: 'test effect',
        choiceRestriction: 'advance_only',
        battleRestriction: 'prohibited',
      },
      {
        source: 'test effect',
        choiceRestriction: 'advance_only',
        battleRestriction: 'prohibited',
      },
    ]);

    state = applyV070MovementChoice(state, 'advance');
    expect(state.movementRemaining).toBe(1);
    expect(currentV070MovementStep(state)?.source).toBe('test effect');
  });

  test('leaving Movement clears unused normal grants and active steps', () => {
    let state = openingState();
    state = queueNormalV070MovementStep(state, {
      source: 'unused',
      choiceRestriction: 'any',
      battleRestriction: 'allowed',
    });
    state = beginNormalV070Movement(advanceV070TurnPhase(state));
    expect(state.pendingNormalMovementSteps).toEqual([]);
    expect(state.movementStepQueue.length).toBe(2);

    state = advanceV070TurnPhase(state);
    expect(state.phase).toBe('denouement');
    expect(state.pendingNormalMovementSteps).toEqual([]);
    expect(state.movementStepQueue).toEqual([]);
    expect(state.movementRemaining).toBe(0);
  });
});
