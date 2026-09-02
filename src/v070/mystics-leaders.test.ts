import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { createV070TurnState } from './rules';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  beginV070MysticRite,
  beginV070MysticRitual,
} from './mystics';
import { viewV070GameForPlayer } from './views';

type Starter =
  | 'mystics-alchemist-first-principles'
  | 'mystics-spirit-walker-unbroken-circle'
  | 'military-commandant-holdfast';

function readyGame(
  aStarter: Starter = 'mystics-alchemist-first-principles',
  bStarter: Starter = 'military-commandant-holdfast',
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'mystics-leaders-test',
    seed: `mystics-leaders-${aStarter}-${bStarter}`,
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
    value: 6,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function toDenouement(state: V070GameState): V070GameState {
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'hold',
  });
  expect(state.turnState?.phase).toBe('denouement');
  return state;
}

function activeBattle(
  aStarter: Starter = 'mystics-alchemist-first-principles',
  bStarter: Starter = 'military-commandant-holdfast',
): V070GameState {
  let state = readyGame(aStarter, bStarter);
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  expect(state.battle?.attacker).toBe('A');
  return state;
}

function noCardBattleAtOutcome(state: V070GameState): V070GameState {
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

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone: 'hand' | 'discardPile' | 'graveyard',
): string {
  const instanceId = `mystics-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function setCompletedRites(
  state: V070GameState,
  playerId: 'A' | 'B',
  count: number,
): void {
  const mystics = state.players[playerId].mystics!;
  const ids = ['echoes', 'blood', 'crossing'] as const;
  ids.forEach((riteId, index) => {
    mystics.rites[riteId].status =
      index < count ? 'completed' : 'incomplete';
    mystics.rites[riteId].completedTurn =
      index < count ? Math.max(0, state.turnNumber - 1) : null;
    mystics.rites[riteId].begunTurn = null;
  });
}

describe('v0.7.0 Mystics progression and leaders', () => {
  test('initializes public Rite, Ritual, and leader state only for Mystics', () => {
    const state = readyGame();
    const mystics = state.players.A.mystics;

    expect(mystics).not.toBeNull();
    expect(mystics?.rites.echoes.status).toBe('incomplete');
    expect(mystics?.rites.blood.status).toBe('incomplete');
    expect(mystics?.rites.crossing.status).toBe('incomplete');
    expect(mystics?.ritual.active).toBe(false);
    expect(state.players.B.mystics).toBeNull();
    expect(viewV070GameForPlayer(state, 'B').players.A.mystics)
      .toEqual(mystics);
  });

  test('Alchemist begins Rite of Blood and Materia Prima draws immediately outside battle', () => {
    let state = toDenouement(readyGame());
    const cost = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'blood-cost',
      'hand',
    );
    const handBefore = state.players.A.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'mystics_begin_rite',
      playerId: 'A',
      riteId: 'blood',
      bloodCostInstanceId: cost,
    });

    expect(state.players.A.mystics?.rites.blood.status).toBe('begun');
    expect(state.players.A.zones.graveyard).toContain(cost);
    expect(state.players.A.mystics?.materiaPrimaUsedTurn)
      .toBe(state.turnNumber);
    expect(state.players.A.zones.hand).toHaveLength(handBefore);
    expect(state.events.some(event =>
      event.type === 'mystic_materia_prima_resolved'
    )).toBe(true);
  });

  test('Rite of Echoes completes only after the matching battle-card effect is applied', () => {
    let state = activeBattle();
    const boundGraveyard = injectCard(
      state,
      'A',
      'neutral-new-recruits',
      'echoes-graveyard',
      'graveyard',
    );
    const boundHand = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'echoes-bound',
      'hand',
    );
    const completing = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'echoes-completing',
      'hand',
    );

    const currentTurn = state.turnNumber;
    state.turnNumber -= 1;
    beginV070MysticRite(state, 'A', 'echoes', {
      echoesGraveyardInstanceId: boundGraveyard,
      echoesHandInstanceId: boundHand,
    });
    state.turnNumber = currentTurn;

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: completing,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.players.A.mystics?.rites.echoes.status)
      .toBe('completed');
    expect(state.players.A.zones.discardPile).toContain(boundGraveyard);
    expect(state.players.A.zones.graveyard).toContain(boundHand);
    expect(state.bindings.some(binding =>
      binding.hostId === 'mystics:rite:A:echoes'
    )).toBe(false);
  });

  test('Rite of Blood completes on a later-turn win with no Gambit or Tactic', () => {
    let state = activeBattle();
    const rite = state.players.A.mystics!.rites.blood;
    rite.status = 'begun';
    rite.begunTurn = state.turnNumber - 1;

    state = noCardBattleAtOutcome(state);
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

    expect(state.players.A.mystics?.rites.blood.status)
      .toBe('completed');
    expect(state.players.A.mystics?.riteCompletedTurn)
      .toBe(state.turnNumber);
  });

  test('Rite of Crossing records an occupation win and completes after the next Capture step', () => {
    let state = activeBattle();
    const arcaneCost = injectCard(
      state,
      'A',
      'mystics-fate-s-toll',
      'crossing-cost',
      'hand',
    );

    state = noCardBattleAtOutcome(state);
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
    expect(state.players.A.mystics?.crossingEligibilityTurn)
      .toBe(state.turnNumber);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.turnState?.phase).toBe('denouement');

    state = reduceV070TurnAction(state, {
      type: 'mystics_begin_rite',
      playerId: 'A',
      riteId: 'crossing',
      crossingCostInstanceId: arcaneCost,
    });
    const territoryInstanceId =
      state.players.A.mystics?.rites.crossing.territoryInstanceId;
    expect(territoryInstanceId).toBeTruthy();

    state.turnNumber += 2;
    state.activePlayer = 'A';
    state.turnState = createV070TurnState();

    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'A',
    });

    expect(state.players.A.mystics?.rites.crossing.status)
      .toBe('completed');
    expect(state.board.find(territory =>
      territory.territoryInstanceId === territoryInstanceId
    )?.controller).toBe('A');
  });

  test('Invocation opens after an Arcane Action resolves and moves one Graveyard card to Discard once per turn', () => {
    let state = toDenouement(readyGame());
    setCompletedRites(state, 'A', 1);
    const target = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'invocation-target',
      'graveyard',
    );
    const source = injectCard(
      state,
      'A',
      'mystics-accursed-wager',
      'invocation-source',
      'hand',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.players.A.mystics?.invocationPending)
      .toEqual(expect.objectContaining({
        sourceInstanceId: source,
        sourceCardId: 'mystics-accursed-wager',
        duringBattle: false,
      }));
    expect(() => reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId: 'A',
    })).toThrow(/pending Mystics Invocation/);

    state = reduceV070TurnAction(state, {
      type: 'use_mystic_invocation',
      playerId: 'A',
      targetInstanceId: target,
    });

    expect(state.players.A.zones.graveyard).not.toContain(target);
    expect(state.players.A.zones.discardPile).toContain(target);
    expect(state.players.A.mystics?.invocationUsedTurn)
      .toBe(state.turnNumber);
    expect(state.players.A.mystics?.invocationPending).toBeNull();
  });

  test('Transmutation adds card value and Alchemist Materia Prima waits until after battle Aftermath', () => {
    let state = activeBattle();
    setCompletedRites(state, 'A', 2);
    const sacrifice = injectCard(
      state,
      'A',
      'mystics-paths-of-shadow',
      'transmutation',
      'hand',
    );
    const handBefore = state.players.A.zones.hand.length;

    state = noCardBattleAtOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'use_mystic_transmutation',
      playerId: 'A',
      cardInstanceId: sacrifice,
    });

    expect(state.battleRuntime?.participants.A.battleModifier).toBe(3);
    expect(state.players.A.zones.graveyard).toContain(sacrifice);
    expect(state.players.A.mystics?.materiaPrimaPendingDraw).toBe(true);
    expect(state.players.A.zones.hand).toHaveLength(handBefore - 1);

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

    expect(state.players.A.mystics?.materiaPrimaPendingDraw).toBe(false);
    expect(state.players.A.zones.hand).toHaveLength(handBefore);
    const aftermath = state.events.find(event =>
      event.type === 'battle_aftermath_complete'
    );
    const materia = state.events.find(event =>
      event.type === 'mystic_materia_prima_resolved'
    );
    expect(aftermath).toBeDefined();
    expect(materia).toBeDefined();
    expect(aftermath!.index).toBeLessThan(materia!.index);
  });

  test('Spirit Walker Guardians preserves an interruptible Rite using the completed-Rite value threshold', () => {
    let state = activeBattle(
      'military-commandant-holdfast',
      'mystics-spirit-walker-unbroken-circle',
    );
    const mystics = state.players.B.mystics!;
    mystics.rites.echoes.status = 'begun';
    mystics.rites.echoes.begunTurn = state.turnNumber - 1;
    mystics.rites.echoes.completedTurn = null;
    mystics.rites.blood.status = 'completed';
    mystics.rites.blood.begunTurn = null;
    mystics.rites.blood.completedTurn = state.turnNumber - 2;
    mystics.rites.crossing.status = 'completed';
    mystics.rites.crossing.begunTurn = null;
    mystics.rites.crossing.completedTurn = state.turnNumber - 2;

    const tooSmall = injectCard(
      state,
      'B',
      'mystics-fate-s-toll',
      'guardians-small',
      'hand',
    );
    const valid = injectCard(
      state,
      'B',
      'mystics-paths-of-shadow',
      'guardians-valid',
      'hand',
    );

    state = noCardBattleAtOutcome(state);
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

    expect(state.battleRuntime?.guardiansWindowOpen).toBe(true);
    expect(() => reduceV070BattleAction(state, {
      type: 'use_guardians_of_the_circle',
      playerId: 'B',
      cardInstanceId: tooSmall,
    })).toThrow(/value 3 or greater/);

    state = reduceV070BattleAction(state, {
      type: 'use_guardians_of_the_circle',
      playerId: 'B',
      cardInstanceId: valid,
    });

    expect(state.players.B.mystics?.rites.echoes.status).toBe('begun');
    expect(state.players.B.zones.graveyard).toContain(valid);
    expect(state.players.B.mystics?.guardiansUsedTurn)
      .toBe(state.turnNumber);
    expect(state.battleRuntime?.guardiansWindowOpen).toBe(false);
  });

  test('Ritual binds three Arcane zones and Convergence converts an initiated win into Ritual victory', () => {
    let state = activeBattle();
    setCompletedRites(state, 'A', 3);
    const hand = injectCard(
      state,
      'A',
      'mystics-fate-s-toll',
      'ritual-hand',
      'hand',
    );
    const discard = injectCard(
      state,
      'A',
      'mystics-dark-omens',
      'ritual-discard',
      'discardPile',
    );
    const graveyard = injectCard(
      state,
      'A',
      'mystics-soul-for-soul',
      'ritual-graveyard',
      'graveyard',
    );

    beginV070MysticRitual(state, 'A', {
      handInstanceId: hand,
      discardInstanceId: discard,
      graveyardInstanceId: graveyard,
    });

    state = noCardBattleAtOutcome(state);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(3);

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

    expect(state.battleRuntime?.pendingGameVictory).toEqual({
      winner: 'A',
      route: 'ritual_of_ascension',
    });
    expect(state.players.A.mystics?.ritual.active).toBe(false);
    expect(state.players.A.zones.graveyard).toEqual(
      expect.arrayContaining([hand, discard, graveyard]),
    );

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.stage).toBe('ended');
    expect(state.winner).toBe('A');
    expect(state.events.some(event =>
      event.type === 'game_won'
      && (event.payload as { route?: string })?.route
        === 'ritual_of_ascension'
    )).toBe(true);
  });
});
