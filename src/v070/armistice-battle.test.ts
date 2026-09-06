import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { isV070BattleCardEffectNegated } from './battle-effect-status';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'armistice-battle',
    seed: 'armistice-battle-seed',
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
  const instanceId = `armistice-${owner}-${suffix}`;
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

describe('v0.7.0 Armistice battle effect', () => {
  test('Gambit Armistice withdraws the attacker and overrides other battle-card destinations before their effects apply', () => {
    let state = startBattle();
    const armistice = injectCard(state, 'A', 'neutral-armistice', 'gambit');
    const opposing = injectCard(state, 'B', 'diplomats-gunboat-diplomacy', 'ordinary');

    state = revealGambits(setGambits(state, armistice, opposing));

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battle?.stage).toBe('ended');
    expect(state.battle?.endReason).toBe('withdrawal');
    expect(state.battle?.winner).toBeNull();
    expect(state.battle?.loser).toBeNull();
    expect(state.battle?.positions.A).toBe(2);
    expect(state.battle?.positions.B).toBe(3);
    expect(state.players.A.zones.graveyard).toContain(armistice);
    expect(state.players.B.zones.discardPile).toContain(opposing);
    expect(state.battleRuntime?.participants.A.gambit).toBeNull();
    expect(state.battleRuntime?.participants.B.gambit).toBeNull();
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(state.events.some(event =>
      event.type === 'armistice_battle_resolved'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId === armistice
    )).toBe(true);
  });

  test('defender Armistice still makes the attacker withdraw', () => {
    let state = startBattle();
    const ordinary = injectCard(state, 'A', 'neutral-rallying-cry', 'attacker-card');
    const armistice = injectCard(state, 'B', 'neutral-armistice', 'defender-card');

    state = revealGambits(setGambits(state, ordinary, armistice));

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battle?.endReason).toBe('withdrawal');
    expect(state.battle?.positions.A).toBe(2);
    expect(state.battle?.positions.B).toBe(3);
    expect(state.players.A.zones.discardPile).toContain(ordinary);
    expect(state.players.B.zones.graveyard).toContain(armistice);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
  });

  test('Tactic Armistice leaves ordinary Reserve cards for the late-withdrawal Aftermath to clear', () => {
    let state = startBattle();
    state = revealGambits(setGambits(state));
    expect(state.battleRuntime?.stage).toBe('choose_tactics');

    const armistice = injectCard(state, 'A', 'neutral-armistice', 'tactic');
    const opposing = injectCard(state, 'B', 'neutral-rallying-cry', 'tactic-other');
    state.battleRuntime!.participants.A.reserve.push(armistice);
    state.battleRuntime!.participants.B.reserve.push(opposing);
    const untouchedReserve = state.battleRuntime!.participants.A.reserve
      .find(instanceId => instanceId !== armistice)!;

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A', cardInstanceId: armistice,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B', cardInstanceId: opposing,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.players.A.zones.graveyard).toContain(armistice);
    expect(state.players.B.zones.discardPile).toContain(opposing);
    expect(state.battleRuntime?.participants.A.reserve).toContain(untouchedReserve);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath', playerId: 'A',
    });

    expect(state.battle).toBeNull();
    expect(state.players.A.zones.discardPile).toContain(untouchedReserve);
  });

  test('an earlier attacker interference can negate defender Armistice before it withdraws the attacker', () => {
    let state = startBattle();
    const assassins = injectCard(state, 'A', 'intelligence-assassins', 'first-interference');
    const armistice = injectCard(state, 'B', 'neutral-armistice', 'would-withdraw');

    state = revealGambits(setGambits(state, assassins, armistice));

    expect(isV070BattleCardEffectNegated(state, armistice)).toBe(true);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battle?.stage).toBe('active');
    expect(state.battle?.endReason).toBeNull();
    expect(state.battle?.positions.A).toBe(3);
    expect(state.players.B.zones.graveyard).not.toContain(armistice);
    expect(state.battleRuntime?.participants.B.gambit?.instanceId).toBe(armistice);
  });
});
