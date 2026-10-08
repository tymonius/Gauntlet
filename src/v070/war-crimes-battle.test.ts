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
  V070_WAR_CRIMES_BATTLE_TEXT,
  V070_WAR_CRIMES_ID,
} from './war-crimes-battle';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'war-crimes-battle',
    seed: 'war-crimes-battle-seed',
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

function setAndRevealNoGambits(
  state: V070GameState,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function tacticFromReserve(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
): string {
  const instanceId =
    state.battleRuntime!.participants[owner].reserve[0]!;
  state.cardInstances[instanceId].cardId = cardId;
  return instanceId;
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

function resolveBattle(
  state: V070GameState,
  winner: 'A' | 'B',
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [winner === 'A' ? 6 : 1],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [winner === 'B' ? 6 : 1],
  });
}

function openWarCrimesChoice(
  state: V070GameState,
  owner: 'A' | 'B',
  sourceInstanceId: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'complete_aftermath',
    playerId: 'A',
  });
  expect(
    state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
  ).toEqual(expect.objectContaining({
    playerId: owner,
    candidateSourceInstanceIds: expect.arrayContaining([
      sourceInstanceId,
    ]),
  }));
  return state;
}

describe('War Crimes battle effect', () => {
  test('binds exact unchanged battle authority and registers the battle surface', () => {
    expect(V070_WAR_CRIMES_BATTLE_TEXT).toBe(
      'In the Aftermath, if you win, you may apply the same effect and put this card in your Graveyard.',
    );
    for (const content of [
      v070CanonicalContent,
      currentCanonicalContent,
    ]) {
      const card = content.cardsById.get(V070_WAR_CRIMES_ID);
      expect(card?.effects.find(
        effect => effect.label === 'Gambit/Tactic',
      )?.text).toBe(V070_WAR_CRIMES_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(
      V070_WAR_CRIMES_ID,
    )?.expectedText).toBe(V070_WAR_CRIMES_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_WAR_CRIMES_ID);
  });

  test('on a win, War Crimes may graveyard opposing Tactics, add one Retreat step, graveyard itself, and bind later victory benefits', () => {
    let state = setAndRevealNoGambits(startBattle());
    const warCrimes = tacticFromReserve(
      state,
      'A',
      V070_WAR_CRIMES_ID,
    );
    const opposingTactic = tacticFromReserve(
      state,
      'B',
      'neutral-rallying-cry',
    );
    state = chooseAndRevealTactics(
      state,
      warCrimes,
      opposingTactic,
    );

    state.players.A.military!.command = 2;
    state = resolveBattle(state, 'A');
    expect(state.battle?.positions.B).toBe(4);

    state = openWarCrimesChoice(state, 'A', warCrimes);
    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: warCrimes,
    });

    expect(state.players.B.position).toBe(5);
    expect(state.players.B.zones.graveyard).toContain(opposingTactic);
    expect(state.players.B.zones.discardPile)
      .not.toContain(opposingTactic);
    expect(state.players.A.zones.graveyard).toContain(warCrimes);
    expect(state.players.A.zones.discardPile).not.toContain(warCrimes);
    expect(state.events.some(event =>
      event.type === 'military_order_window_opened'
      && (event.payload as { order?: string } | undefined)
        ?.order === 'Rout'
    )).toBe(false);
    expect(state.battle).toBeNull();
  });

  test('declining War Crimes preserves normal Tactic destinations and normal Retreat distance', () => {
    let state = setAndRevealNoGambits(startBattle());
    const warCrimes = tacticFromReserve(
      state,
      'A',
      V070_WAR_CRIMES_ID,
    );
    const opposingTactic = tacticFromReserve(
      state,
      'B',
      'neutral-rallying-cry',
    );
    state = chooseAndRevealTactics(
      state,
      warCrimes,
      opposingTactic,
    );
    state = resolveBattle(state, 'A');
    expect(state.battle?.positions.B).toBe(4);

    state = openWarCrimesChoice(state, 'A', warCrimes);
    state = reduceV070BattleAction(state, {
      type: 'pass_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: warCrimes,
    });

    expect(state.players.B.position).toBe(4);
    expect(state.players.B.zones.discardPile).toContain(opposingTactic);
    expect(state.players.B.zones.graveyard)
      .not.toContain(opposingTactic);
    expect(state.players.A.zones.discardPile).toContain(warCrimes);
    expect(state.players.A.zones.graveyard).not.toContain(warCrimes);
  });

  test('a victory Order already used makes War Crimes unavailable under the conflicting-benefits rule', () => {
    let state = setAndRevealNoGambits(startBattle());
    const attackingTactic = tacticFromReserve(
      state,
      'A',
      'neutral-rallying-cry',
    );
    const warCrimes = tacticFromReserve(
      state,
      'B',
      V070_WAR_CRIMES_ID,
    );
    state = chooseAndRevealTactics(
      state,
      attackingTactic,
      warCrimes,
    );

    state.players.B.military!.command = 1;
    state = resolveBattle(state, 'B');
    state = reduceV070BattleAction(state, {
      type: 'use_commandant_repel',
      playerId: 'B',
    });
    expect(state.battle?.positions.A).toBe(1);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toBeFalsy();
    expect(state.players.A.zones.discardPile).toContain(attackingTactic);
    expect(state.players.B.zones.discardPile).toContain(warCrimes);
    expect(state.players.B.zones.graveyard).not.toContain(warCrimes);
  });
});
