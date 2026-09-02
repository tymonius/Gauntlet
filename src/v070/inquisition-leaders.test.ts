import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';

type Starter =
  | 'inquisition-grand-inquisitor-final-judgment'
  | 'inquisition-witch-hunter-relentless-pursuit'
  | 'military-commandant-holdfast';

function readyGame(
  aStarter: Starter,
  bStarter: Starter,
  firstPlayer: 'A' | 'B' = 'A',
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'inquisition-leaders-test',
    seed: `inquisition-leaders-${aStarter}-${bStarter}-${firstPlayer}`,
    players: {
      A: { name: 'Alpha', starterDeckId: aStarter },
      B: { name: 'Bravo', starterDeckId: bStarter },
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
    value: firstPlayer === 'A' ? 6 : 1,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: firstPlayer === 'B' ? 6 : 1,
  });
}

function toOpening(
  state: V070GameState,
  playerId: 'A' | 'B',
): V070GameState {
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId,
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId,
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function activeABattle(
  aStarter: Starter,
  bStarter: Starter,
): V070GameState {
  let state = readyGame(aStarter, bStarter, 'A');
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';

  state = toOpening(state, 'A');
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

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone: 'hand' | 'discardPile' | 'assetBank',
): string {
  const instanceId = `inq-leader-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function advanceNoCardBattleToOutcome(
  state: V070GameState,
): V070GameState {
  const attacker = state.battle!.attacker;
  const defender = state.battle!.defender;
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: attacker,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: attacker,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: defender,
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: attacker,
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: attacker,
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: defender,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: attacker,
  });
}

function completeCleanupFor(
  state: V070GameState,
  playerId: 'A' | 'B',
): V070GameState {
  const hand = state.players[playerId].zones.hand;
  const excess = Math.max(0, hand.length - 3);
  return reduceV070TurnAction(state, {
    type: 'complete_cleanup',
    playerId,
    discardInstanceIds: hand.slice(0, excess),
  });
}

describe('v0.7.0 Inquisition Purge and leaders', () => {
  test('normal Purge uses one Action but preserves the other Action phase permission', () => {
    let state = readyGame(
      'inquisition-grand-inquisitor-final-judgment',
      'military-commandant-holdfast',
    );
    state = toOpening(state, 'A');
    state.players.A.inquisition!.conviction = 1;
    const purgeTarget = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'purge-top',
      'discardPile',
    );

    state = reduceV070TurnAction(state, {
      type: 'inquisition_purge',
      playerId: 'A',
      printedCost: 1,
      discardMode: 'top',
    });

    expect(state.players.B.zones.discardPile).not.toContain(purgeTarget);
    expect(state.players.B.zones.graveyard).toContain(purgeTarget);
    expect(state.players.A.inquisition?.purgeActionTurn)
      .toBe(state.turnNumber);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(1);

    state.players.A.inquisition!.conviction = 1;
    injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'second-purge',
      'discardPile',
    );
    expect(() => reduceV070TurnAction(state, {
      type: 'inquisition_purge',
      playerId: 'A',
      printedCost: 1,
      discardMode: 'top',
    })).toThrow(/only once per turn/);

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });
    const asset = injectCard(
      state,
      'A',
      'neutral-contingency-plan',
      'denouement-asset',
      'hand',
    );
    state = reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'A',
      cardInstanceId: asset,
    });

    expect(state.players.A.zones.assetBank).toContain(asset);
    expect(state.turnState?.actionsTaken.denouement).toBe(1);
  });

  test('Purge 3 spends Conviction and lets the opponent choose the Hand card', () => {
    let state = readyGame(
      'inquisition-grand-inquisitor-final-judgment',
      'military-commandant-holdfast',
    );
    state = toOpening(state, 'A');
    state.players.A.inquisition!.conviction = 3;
    const target = state.players.B.zones.hand[0];
    expect(target).toBeDefined();

    state = reduceV070TurnAction(state, {
      type: 'inquisition_purge',
      playerId: 'A',
      printedCost: 3,
    });

    expect(state.players.A.inquisition?.conviction).toBe(0);
    expect(state.pendingPurgeChoice).toEqual(
      expect.objectContaining({
        purgerId: 'A',
        opponentId: 'B',
        chooserId: 'B',
        printedCost: 3,
        kind: 'opponent_hand_discard',
      }),
    );

    state = reduceV070TurnAction(state, {
      type: 'resolve_inquisition_purge_hand_choice',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(state.pendingPurgeChoice).toBeNull();
    expect(state.players.B.zones.hand).not.toContain(target);
    expect(state.players.B.zones.graveyard).toContain(target);
  });

  test('Counterintelligence prevents the entire Purge 4 Hand-reveal effect', () => {
    let state = readyGame(
      'inquisition-grand-inquisitor-final-judgment',
      'military-commandant-holdfast',
    );
    state = toOpening(state, 'A');
    state.players.A.inquisition!.conviction = 4;
    const counterintelligence = injectCard(
      state,
      'B',
      'neutral-counterintelligence',
      'counterintelligence',
      'assetBank',
    );
    const handBefore = [...state.players.B.zones.hand];

    state = reduceV070TurnAction(state, {
      type: 'inquisition_purge',
      playerId: 'A',
      printedCost: 4,
    });

    expect(counterintelligence).toBeDefined();
    expect(state.players.A.inquisition?.conviction).toBe(0);
    expect(state.pendingPurgeChoice).toBeNull();
    expect(state.players.B.zones.hand).toEqual(handBefore);
    expect(state.events.some(event =>
      event.type === 'counterintelligence_prevented_reveal'
      && (event.payload as { purpose?: string })?.purpose
        === 'Inquisition Purge 4'
    )).toBe(true);
  });

  test('Grand Inquisitor gains normal Aftermath Conviction before Final Judgment and pays the discounted Purge cost', () => {
    let state = activeABattle(
      'inquisition-grand-inquisitor-final-judgment',
      'military-commandant-holdfast',
    );
    const opposingGambit = injectCard(
      state,
      'B',
      'neutral-new-recruits',
      'opposing-gambit',
      'hand',
    );
    const opposingAsset = injectCard(
      state,
      'B',
      'neutral-contingency-plan',
      'purge-asset',
      'assetBank',
    );

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: opposingGambit,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
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

    expect(state.battle?.winner).toBe('A');
    expect(state.players.A.inquisition?.conviction).toBe(0);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.B.zones.graveyard).toContain(opposingGambit);
    expect(state.players.A.inquisition?.conviction).toBe(1);
    expect(state.battleRuntime?.finalJudgmentWindowOpen).toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'use_grand_inquisitor_final_judgment',
      playerId: 'A',
      printedCost: 2,
      assetInstanceId: opposingAsset,
    });

    expect(state.players.A.inquisition?.conviction).toBe(0);
    expect(state.players.A.inquisition?.finalJudgmentUsedTurn)
      .toBe(state.turnNumber);
    expect(state.players.A.inquisition?.purgeActionTurn).toBeNull();
    expect(state.players.B.zones.assetBank).not.toContain(opposingAsset);
    expect(state.players.B.zones.graveyard).toContain(opposingAsset);
    expect(state.battle).toBeNull();
    expect(state.turnState?.phase).toBe('denouement');

    const normalGain = state.events.find(event =>
      event.type === 'inquisition_aftermath_conviction_triggered'
    );
    const discountedSpend = state.events.find(event =>
      event.type === 'conviction_changed'
      && (event.payload as { reason?: string })?.reason
        === 'Grand Inquisitor Final Judgment Purge 2'
    );
    expect(normalGain).toBeDefined();
    expect(discountedSpend).toBeDefined();
    expect(normalGain!.index).toBeLessThan(discountedSpend!.index);
  });

  test('Witch Hunter ends the defeated attacker turn, pursues into a new battle, then begins at Capture', () => {
    let state = activeABattle(
      'military-commandant-holdfast',
      'inquisition-witch-hunter-relentless-pursuit',
    );
    state.players.B.inquisition!.conviction = 2;
    state = advanceNoCardBattleToOutcome(state);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6],
    });
    expect(state.battle?.winner).toBe('B');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battleRuntime?.relentlessPursuitWindowOpen).toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'use_witch_hunter_relentless_pursuit',
      playerId: 'B',
    });

    expect(state.players.B.inquisition?.conviction).toBe(0);
    expect(state.players.B.inquisition?.relentlessPursuitUsedTurn)
      .toBe(state.turnNumber);
    expect(state.battle).toBeNull();
    expect(state.turnState?.phase).toBe('cleanup');
    expect(state.pendingRelentlessPursuit?.playerId).toBe('B');

    state = completeCleanupFor(state, 'A');
    expect(state.activePlayer).toBe('B');
    expect(state.turnState?.phase).toBe('capture');
    expect(state.turnState?.movementSequenceSource).toBe('effect');
    expect(state.turnState?.movementStepQueue[0]?.source)
      .toBe('Relentless Pursuit');
    expect(state.pendingRelentlessPursuit?.playerId).toBe('B');

    state.board.forEach(space => { space.blank = true; });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'advance',
    });

    expect(state.battle?.attacker).toBe('B');
    expect(state.battle?.defender).toBe('A');

    state = advanceNoCardBattleToOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'B',
    });

    expect(state.battle).toBeNull();
    expect(state.pendingRelentlessPursuit).toBeNull();
    expect(state.activePlayer).toBe('B');
    expect(state.turnState?.phase).toBe('capture');
    expect(state.events.some(event =>
      event.type === 'turn_started'
      && event.actor === 'B'
      && (event.payload as { turnNumber?: number })?.turnNumber
        === state.turnNumber
    )).toBe(true);
  });
});
