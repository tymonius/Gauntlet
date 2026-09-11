import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { v070InitialReserveSnapshot } from './battle-aftermath-deferred';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'attrition-battle',
    seed: 'attrition-battle-seed',
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

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening', playerId: 'A',
  });
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
  const instanceId = `attrition-${owner}-${suffix}`;
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

function chooseNoTacticsAndReveal(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics', playerId: 'A',
  });
}

function resolveDice(
  state: V070GameState,
  a: number,
  b: number,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'A', values: [a],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'B', values: [b],
  });
}

describe('v0.7.0 Attrition battle effect', () => {
  test('a winning Attrition owner puts the opponent initial Reserve in the Graveyard', () => {
    let state = startBattle();
    const attrition = injectCard(
      state,
      'A',
      'neutral-attrition',
      'winning-gambit',
    );
    state = setGambits(state, attrition);
    const initialReserve = v070InitialReserveSnapshot(state, 'B');
    expect(initialReserve).toHaveLength(3);

    state = revealGambits(state);
    const tactic = initialReserve[0];
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B', cardInstanceId: tactic,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });
    state = resolveDice(state, 6, 1);

    expect(state.battleRuntime?.battleCardAftermathDestinationOverrides)
      .toEqual(expect.arrayContaining(initialReserve.map(instanceId =>
        expect.objectContaining({
          sourceCardId: 'neutral-attrition',
          playerId: 'B',
          instanceId,
          destination: 'graveyard',
        })
      )));

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath', playerId: 'A',
    });
    for (const instanceId of initialReserve) {
      expect(state.players.B.zones.graveyard).toContain(instanceId);
      expect(state.players.B.zones.discardPile).not.toContain(instanceId);
    }
  });

  test('Training Grounds redraw does not change which cards count as the initial Reserve', () => {
    let state = startBattle();
    const attrition = injectCard(
      state,
      'A',
      'neutral-attrition',
      'training-grounds',
    );
    state = setGambits(state, attrition);
    const initialReserve = v070InitialReserveSnapshot(state, 'B');
    state = revealGambits(state);

    for (let index = 0; index < 4; index += 1) {
      const replacement = injectCard(
        state,
        'B',
        'neutral-rallying-cry',
        `replacement-${index}`,
      );
      state.players.B.zones.drawPile.unshift(replacement);
    }
    state.battleRuntime!.trainingGroundsRedrawPlayer = 'B';
    state.battleRuntime!.trainingGroundsRedrawResolved = false;
    state = reduceV070BattleAction(state, {
      type: 'resolve_training_grounds_redraw',
      playerId: 'B',
      use: true,
    });
    const replacementReserve = [
      ...state.battleRuntime!.participants.B.reserve,
    ];
    expect(replacementReserve).not.toEqual(initialReserve);
    expect(v070InitialReserveSnapshot(state, 'B')).toEqual(initialReserve);

    state = chooseNoTacticsAndReveal(state);
    state = resolveDice(state, 6, 1);

    for (const instanceId of initialReserve) {
      expect(state.players.B.zones.graveyard).toContain(instanceId);
      expect(state.players.B.zones.discardPile).not.toContain(instanceId);
    }

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath', playerId: 'A',
    });
    for (const instanceId of replacementReserve) {
      expect(state.players.B.zones.discardPile).toContain(instanceId);
      expect(state.players.B.zones.graveyard).not.toContain(instanceId);
    }
  });

  test('Attrition does not change the opponent Reserve destinations when its owner loses', () => {
    let state = startBattle();
    const attrition = injectCard(
      state,
      'A',
      'neutral-attrition',
      'losing-gambit',
    );
    state = setGambits(state, attrition);
    const initialReserve = v070InitialReserveSnapshot(state, 'B');
    state = chooseNoTacticsAndReveal(revealGambits(state));
    state = resolveDice(state, 1, 6);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath', playerId: 'A',
    });

    for (const instanceId of initialReserve) {
      expect(state.players.B.zones.discardPile).toContain(instanceId);
      expect(state.players.B.zones.graveyard).not.toContain(instanceId);
    }
  });

  test('Tactic Attrition uses the same initial Reserve snapshot', () => {
    let state = startBattle();
    state = revealGambits(setGambits(state));
    const initialReserve = v070InitialReserveSnapshot(state, 'B');
    const attrition = injectCard(
      state,
      'A',
      'neutral-attrition',
      'tactic',
    );
    state.battleRuntime!.participants.A.reserve.push(attrition);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A', cardInstanceId: attrition,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });
    state = resolveDice(state, 6, 1);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath', playerId: 'A',
    });

    for (const instanceId of initialReserve) {
      expect(state.players.B.zones.graveyard).toContain(instanceId);
    }
  });

  test('immediate Last Stand cleanup still reconciles Attrition destinations', () => {
    let state = startBattle();
    const attrition = injectCard(
      state,
      'A',
      'neutral-attrition',
      'last-stand',
    );
    state = setGambits(state, attrition);
    const initialReserve = v070InitialReserveSnapshot(state, 'B');
    state = chooseNoTacticsAndReveal(revealGambits(state));

    const battle = state.battle!;
    battle.lastStand = true;
    battle.defenderControlsContested = false;
    battle.attackerOrigin = 5;
    battle.contestedPosition = 6;
    battle.positions = { A: 6, B: 6 };
    state.players.A.position = 6;
    state.players.B.position = 6;

    state = resolveDice(state, 6, 1);

    expect(state.stage).toBe('ended');
    expect(state.battle).toBeNull();
    for (const instanceId of initialReserve) {
      expect(state.players.B.zones.graveyard).toContain(instanceId);
      expect(state.players.B.zones.discardPile).not.toContain(instanceId);
    }
  });
});
