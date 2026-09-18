import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { effectiveV070AssetLimit } from './assets';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'rearguard-battle-test',
    seed: 'rearguard-battle-seed',
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
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function startOrdinaryAttack(): V070GameState {
  let state = readyGame();
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
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone: 'hand' | 'assetBank',
): string {
  const instanceId = `rearguard-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function proceedToGambits(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: state.battle!.attacker,
  });
}

function revealGambits(
  state: V070GameState,
  aCard?: string,
  bCard?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aCard,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bCard,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function toOutcome(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

function resolveOutcome(
  state: V070GameState,
  aDie: number,
  bDie: number,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [aDie],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [bDie],
  });
}

describe('v0.7.0 Rearguard battle effect', () => {
  test('banks Rearguard in the Aftermath after its controller loses and retreats', () => {
    let state = startOrdinaryAttack();
    const rearguard = inject(
      state,
      'A',
      'military-rearguard',
      'loss',
      'hand',
    );

    state = proceedToGambits(state);
    state = revealGambits(state, rearguard);

    expect(state.battleRuntime?.battleCardAftermathAssetBanks)
      .toContainEqual({
        owner: 'A',
        sourceInstanceId: rearguard,
        sourceCardId: 'military-rearguard',
        condition: 'owner_loss_after_retreat',
      });
    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);

    state = toOutcome(state);
    const contestedPosition = state.battle!.contestedPosition;
    state = resolveOutcome(state, 1, 6);

    expect(state.battle?.loser).toBe('A');
    expect(state.battle?.positions.A).not.toBe(contestedPosition);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.assetBank).toContain(rearguard);
    expect(state.players.A.zones.graveyard).not.toContain(rearguard);
    expect(state.players.A.zones.discardPile).not.toContain(rearguard);
  });

  test('does not bank Rearguard when its controller wins', () => {
    let state = startOrdinaryAttack();
    const rearguard = inject(
      state,
      'A',
      'military-rearguard',
      'win',
      'hand',
    );

    state = proceedToGambits(state);
    state = revealGambits(state, rearguard);
    state = toOutcome(state);
    state = resolveOutcome(state, 6, 1);

    expect(state.battle?.winner).toBe('A');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.assetBank).not.toContain(rearguard);
    expect(state.players.A.zones.graveyard).toContain(rearguard);
  });

  test('at the Asset limit, Rearguard uses the controlled replacement choice after a loss and retreat', () => {
    let state = startOrdinaryAttack();
    const rearguard = inject(
      state,
      'A',
      'military-rearguard',
      'replacement',
      'hand',
    );
    const assetLimit = effectiveV070AssetLimit(state, 'A');
    const banked: string[] = [];
    for (let index = 0; index < assetLimit; index += 1) {
      banked.push(inject(
        state,
        'A',
        'neutral-foothold',
        `limit-${index}`,
        'assetBank',
      ));
    }
    const replacement = banked[0];

    state = proceedToGambits(state);
    state = revealGambits(state, rearguard);
    state = toOutcome(state);
    state = resolveOutcome(state, 1, 6);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toEqual(expect.objectContaining({
      playerId: 'A',
      candidateSourceInstanceIds: [rearguard],
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: rearguard,
      replaceAssetInstanceId: replacement,
    });

    expect(state.players.A.zones.assetBank).toContain(rearguard);
    expect(state.players.A.zones.assetBank).not.toContain(replacement);
    expect(state.players.A.zones.discardPile).toContain(replacement);
    expect(state.players.A.zones.removed).not.toContain(replacement);
  });
});
