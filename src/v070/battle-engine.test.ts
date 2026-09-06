import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  cardEligibleForV070BattleRole,
  reduceV070BattleAction,
  requiredV070BattleDice,
  selectV070BattleDie,
} from './battle-engine';
import { v070BattleEffectHandler } from './battle-effects';
import { viewV070GameForPlayer } from './views';

const input = {
  gameId: 'battle-test',
  seed: 'battle-seed',
  players: {
    A: { name: 'Alpha', starterDeckId: 'military-general-forward-doctrine' },
    B: { name: 'Bravo', starterDeckId: 'intelligence-ranger-field-operations' },
  },
} as const;

function readyGame(): V070GameState {
  let state = createV070StarterGame(input);
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
    value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
  return state;
}

function activeBattle(): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => { space.occupant = null; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  // Keep the generic battle-envelope fixture free of printed Territory effects.
  state.board[3].blank = true;

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  return state;
}

function noCardBattleAtOutcome(): V070GameState {
  let state = activeBattle();
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
  return state;
}

function moveInstanceToHand(
  state: V070GameState,
  playerId: 'A' | 'B',
  instanceId: string,
): void {
  const player = state.players[playerId];
  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones.hand.push(instanceId);
}

function firstUnsupportedEligibleInstance(
  state: V070GameState,
  playerId: 'A' | 'B',
  role: 'gambit' | 'tactic',
): string {
  const instance = Object.values(state.cardInstances).find(item =>
    item.owner === playerId
    && cardEligibleForV070BattleRole(item.cardId, role)
    && !v070BattleEffectHandler(item.cardId),
  );
  if (!instance) throw new Error(`Fixture has no unsupported ${role}-eligible card for ${playerId}.`);
  return instance.instanceId;
}

function firstEligibleInstance(
  state: V070GameState,
  playerId: 'A' | 'B',
  role: 'gambit' | 'tactic',
): string {
  const instance = Object.values(state.cardInstances).find(item =>
    item.owner === playerId && cardEligibleForV070BattleRole(item.cardId, role),
  );
  if (!instance) throw new Error(`Fixture has no ${role}-eligible card for ${playerId}.`);
  return instance.instanceId;
}

describe('v0.7.0 battle envelope', () => {
  test('proceeds from Onset into the exact Gambit / Reserve / Tactic sequence', () => {
    let state = activeBattle();
    expect(state.battle?.stage).toBe('onset');
    expect(state.battleRuntime).toBeNull();

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    expect(state.battle?.stage).toBe('active');
    expect(state.battleRuntime?.stage).toBe('set_gambits');

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });

    expect(state.battleRuntime?.stage).toBe('reveal_gambits');
    expect(state.battleRuntime?.participants.A.reserve).toHaveLength(3);
    expect(state.battleRuntime?.participants.B.reserve).toHaveLength(3);

    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('choose_tactics');

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    expect(state.battleRuntime?.stage).toBe('reveal_tactics');

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('outcome');
  });

  test('uses one normal d6 plus numerical modifier as the ordinary battle total', () => {
    let state = noCardBattleAtOutcome();

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [5],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [2],
    });

    expect(state.battleRuntime?.participants.A.selectedBattleDie).toBe(5);
    expect(state.battleRuntime?.participants.A.battleTotal).toBe(5);
    expect(state.battleRuntime?.participants.B.battleTotal).toBe(2);
    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battle).toMatchObject({
      winner: 'A',
      loser: 'B',
      stage: 'resolved',
    });
  });

  test('advantage and disadvantage change dice count and selection, not the numeric modifier', () => {
    let state = noCardBattleAtOutcome();
    state.battleRuntime!.participants.A.advantage = 2;
    state.battleRuntime!.participants.A.disadvantage = 1;

    expect(requiredV070BattleDice(state.battleRuntime!, 'A')).toBe(2);

    state.battleRuntime!.participants.A.battleDice = [2, 6];
    expect(selectV070BattleDie(state.battleRuntime!, 'A')).toBe(6);

    state.battleRuntime!.participants.A.battleModifier = 3;
    state.battleRuntime!.participants.A.battleDice = [];
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [2, 6],
    });

    expect(state.battleRuntime?.participants.A.selectedBattleDie).toBe(6);
    expect(state.battleRuntime?.participants.A.battleTotal).toBe(9);
  });

  test('Defensive Edge resolves tied battle totals before a Tiebreak Roll', () => {
    let state = noCardBattleAtOutcome();

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [4],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [4],
    });

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battle).toMatchObject({
      winner: 'B',
      loser: 'A',
    });
  });

  test('an unresolved tie without Defensive Edge uses separate unmodified Tiebreak rounds', () => {
    let state = noCardBattleAtOutcome();
    state.battle!.defensiveEdgeRemoved = true;

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [3],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [3],
    });
    expect(state.battleRuntime?.stage).toBe('tiebreak');

    state = reduceV070BattleAction(state, {
      type: 'submit_tiebreak_roll',
      playerId: 'A',
      value: 2,
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_tiebreak_roll',
      playerId: 'B',
      value: 2,
    });
    expect(state.battleRuntime?.stage).toBe('tiebreak');

    state = reduceV070BattleAction(state, {
      type: 'submit_tiebreak_roll',
      playerId: 'A',
      value: 6,
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_tiebreak_roll',
      playerId: 'B',
      value: 1,
    });

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battle).toMatchObject({
      winner: 'A',
      loser: 'B',
    });
  });

  test('Aftermath moves the loser, clears battle zones, and resumes at Denouement', () => {
    let state = noCardBattleAtOutcome();
    const reserveA = [...state.battleRuntime!.participants.A.reserve];
    const reserveB = [...state.battleRuntime!.participants.B.reserve];

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
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battle).toBeNull();
    expect(state.battleRuntime).toBeNull();
    expect(state.players.A.position).toBe(3);
    expect(state.players.B.position).toBe(4);
    expect(state.board[3].occupant).toBe('A');
    expect(state.board[4].occupant).toBe('B');
    expect(state.players.A.zones.discardPile).toEqual(expect.arrayContaining(reserveA));
    expect(state.players.B.zones.discardPile).toEqual(expect.arrayContaining(reserveB));
    expect(state.turnState?.phase).toBe('denouement');
  });

  test('a face-down Gambit is private until reveal', () => {
    let state = activeBattle();
    const gambit = firstEligibleInstance(state, 'A', 'gambit');
    moveInstanceToHand(state, 'A', gambit);

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: gambit,
    });

    const ownView = viewV070GameForPlayer(state, 'A');
    const opponentView = viewV070GameForPlayer(state, 'B');

    expect(ownView.battleRuntime?.participants.A.gambit)
      .toEqual({
        instanceId: gambit,
        cardId: state.cardInstances[gambit].cardId,
      });
    expect(opponentView.battleRuntime?.participants.A.gambit)
      .toEqual({ set: true, faceUp: false });
    expect(JSON.stringify(opponentView)).not.toContain(gambit);
  });

  test('revealing an unimplemented current Gambit effect halts explicitly instead of treating it as blank', () => {
    let state = activeBattle();
    const gambit = firstUnsupportedEligibleInstance(state, 'A', 'gambit');
    moveInstanceToHand(state, 'A', gambit);

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: gambit,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('halted');
    expect(state.battleRuntime?.unsupportedEffects).not.toHaveLength(0);
    expect(state.battleRuntime?.unsupportedEffects[0]).toMatchObject({
      owner: 'A',
      instanceId: gambit,
      cardId: state.cardInstances[gambit].cardId,
      role: 'gambit',
      encounteredAt: 'reveal_gambits',
    });
  });

  test('role eligibility comes from the released v0.7.0 effect headings', () => {
    const gambitTactic = v070CanonicalContent.content.cards.find(card =>
      card.effects.some(effect => effect.label === 'Gambit/Tactic'),
    );
    const actionOnly = v070CanonicalContent.cardsById.get('neutral-phantom-passage');

    expect(gambitTactic).toBeDefined();
    expect(cardEligibleForV070BattleRole(gambitTactic!.id, 'gambit')).toBe(true);
    expect(cardEligibleForV070BattleRole(gambitTactic!.id, 'tactic')).toBe(true);
    expect(cardEligibleForV070BattleRole(actionOnly!.id, 'gambit')).toBe(false);
    expect(cardEligibleForV070BattleRole(actionOnly!.id, 'tactic')).toBe(false);
  });
});
