import { describe, expect, test } from 'vitest';
import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import {
  V070_PATHS_OF_SHADOW_BATTLE_TEXT,
  V070_PATHS_OF_SHADOW_ID,
} from './paths-of-shadow-battle';
import {
  v070NormalBattleRetreatApplied,
  v070PlayerRetreatedInBattle,
} from './retreat-step';
import { V070_REARGUARD_ID } from './rearguard';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'paths-of-shadow-battle',
    seed: 'paths-of-shadow-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-general-forward-doctrine',
      },
      B: {
        name: 'Bravo',
        starterDeckId: 'military-commandant-holdfast',
      },
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
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
    space.controller = space.position <= 2 ? 'A' : 'B';
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
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

function injectHand(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `paths-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function setAndRevealGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aGambit,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bGambit,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function chooseAndRevealTactics(
  state: V070GameState,
  aTactic?: string,
  bTactic?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: aTactic,
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
    cardInstanceId: bTactic,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

function loseAsB(
  state: V070GameState,
  bDice: readonly number[] = [1],
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [6],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: bDice,
  });
}

describe('Paths of Shadow battle effect', () => {
  test('binds exact unchanged frozen/current authority and registers the surface', () => {
    expect(V070_PATHS_OF_SHADOW_BATTLE_TEXT).toBe(
      'In the Aftermath, if you lose, you may move to any Territory you control instead of retreating normally.',
    );
    for (const content of [
      v070CanonicalContent,
      currentCanonicalContent,
    ]) {
      expect(content.cardsById.get(V070_PATHS_OF_SHADOW_ID)
        ?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(V070_PATHS_OF_SHADOW_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(
      V070_PATHS_OF_SHADOW_ID,
    )?.expectedText).toBe(V070_PATHS_OF_SHADOW_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_PATHS_OF_SHADOW_ID);
  });

  test('opens the replacement before normal retreat and moves directly to a controlled Territory', () => {
    let state = startBattle();
    const paths = injectHand(
      state,
      'B',
      V070_PATHS_OF_SHADOW_ID,
      'direct-replacement',
    );
    state = setAndRevealGambits(state, undefined, paths);
    state = chooseAndRevealTactics(state);
    state = loseAsB(state);

    expect(state.battleRuntime?.stage).toBe('loss_replacement');
    expect(state.battleRuntime?.pendingPathsOfShadowBattleChoice)
      .toEqual(expect.objectContaining({
        playerId: 'B',
        sourceInstanceIds: [paths],
        candidatePositions: expect.arrayContaining([4, 5]),
      }));
    expect(state.battle?.winner).toBeNull();
    expect(state.battle?.loser).toBeNull();
    expect(state.battle?.positions.B).toBe(3);
    expect(state.battleRuntime?.normalRetreatStepObserved)
      .not.toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'resolve_paths_of_shadow_battle',
      playerId: 'B',
      territoryPosition: 5,
    });

    expect(state.battle?.winner).toBe('A');
    expect(state.battle?.loser).toBe('B');
    expect(state.battle?.positions.B).toBe(5);
    expect(v070NormalBattleRetreatApplied(state)).toBe(false);
    expect(v070PlayerRetreatedInBattle(state, 'B')).toBe(false);
    expect(state.events.some(event =>
      event.type === 'paths_of_shadow_battle_movement'
      && (
        event.payload as { from?: number; to?: number } | undefined
      )?.from === 3
      && (
        event.payload as { from?: number; to?: number } | undefined
      )?.to === 5
    )).toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.players.B.position).toBe(5);
    expect(state.players.B.zones.graveyard).toContain(paths);
  });

  test('declining Paths falls through to the normal retreat', () => {
    let state = startBattle();
    const paths = injectHand(
      state,
      'B',
      V070_PATHS_OF_SHADOW_ID,
      'decline',
    );
    state = setAndRevealGambits(state, undefined, paths);
    state = chooseAndRevealTactics(state);
    state = loseAsB(state);

    state = reduceV070BattleAction(state, {
      type: 'resolve_paths_of_shadow_battle',
      playerId: 'B',
    });

    expect(state.battle?.winner).toBe('A');
    expect(state.battle?.loser).toBe('B');
    expect(state.battle?.positions.B).toBe(4);
    expect(v070NormalBattleRetreatApplied(state)).toBe(true);
    expect(v070PlayerRetreatedInBattle(state, 'B')).toBe(true);
  });

  test('replacing the normal retreat also replaces Retreat +1 modifiers attached to it', () => {
    let state = startBattle();
    const courtMartial = injectHand(
      state,
      'A',
      'neutral-court-martial',
      'court-martial',
    );
    state = setAndRevealGambits(state, courtMartial);

    const paths =
      state.battleRuntime!.participants.B.reserve[0];
    state.cardInstances[paths].cardId =
      V070_PATHS_OF_SHADOW_ID;

    state = chooseAndRevealTactics(
      state,
      undefined,
      paths,
    );
    expect(state.battleRuntime?.participants.B.disadvantage).toBe(1);
    expect(state.battleRuntime?.additionalRetreatEffects)
      .toContainEqual(expect.objectContaining({
        sourceInstanceId: courtMartial,
        targetPlayer: 'B',
        steps: 1,
      }));

    state = loseAsB(state, [1, 2]);
    state = reduceV070BattleAction(state, {
      type: 'resolve_paths_of_shadow_battle',
      playerId: 'B',
      territoryPosition: 5,
    });

    expect(state.battle?.positions.B).toBe(5);
    expect(v070NormalBattleRetreatApplied(state)).toBe(false);
    expect(v070PlayerRetreatedInBattle(state, 'B')).toBe(false);
  });

  test('lose-and-retreat effects do not treat Paths movement as a retreat', () => {
    let state = startBattle();
    const paths = injectHand(
      state,
      'B',
      V070_PATHS_OF_SHADOW_ID,
      'with-rearguard',
    );
    state = setAndRevealGambits(state, undefined, paths);

    const rearguard =
      state.battleRuntime!.participants.B.reserve[0];
    state.cardInstances[rearguard].cardId = V070_REARGUARD_ID;

    state = chooseAndRevealTactics(
      state,
      undefined,
      rearguard,
    );
    state = loseAsB(state);
    state = reduceV070BattleAction(state, {
      type: 'resolve_paths_of_shadow_battle',
      playerId: 'B',
      territoryPosition: 5,
    });

    expect(v070PlayerRetreatedInBattle(state, 'B')).toBe(false);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.B.zones.assetBank).not.toContain(rearguard);
    expect(state.players.B.zones.discardPile).toContain(rearguard);
  });

  test('revalidates the controlled destination when the choice resolves', () => {
    let state = startBattle();
    const paths = injectHand(
      state,
      'B',
      V070_PATHS_OF_SHADOW_ID,
      'revalidate',
    );
    state = setAndRevealGambits(state, undefined, paths);
    state = chooseAndRevealTactics(state);
    state = loseAsB(state);

    expect(
      state.battleRuntime?.pendingPathsOfShadowBattleChoice
        ?.candidatePositions,
    ).toContain(5);

    state.board[5].controller = 'A';

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_paths_of_shadow_battle',
      playerId: 'B',
      territoryPosition: 5,
    })).toThrow(/currently legal Territory you control/i);
    expect(state.battle?.winner).toBeNull();
    expect(state.battle?.positions.B).toBe(3);
  });
});
