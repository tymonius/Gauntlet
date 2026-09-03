import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  reduceV070BattleAction,
} from './battle-engine';
import { isV070AssetActive } from './asset-face-state';
import { v070CanonicalContent } from '../content/v070';
import { effectiveV070AssetLimit } from './assets';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'counterattack-cards-test',
    seed: 'counterattack-cards-seed',
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

function counterattackBattle(): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'A';

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
  const instanceId =
    `counterattack-${owner}-${suffix}-${cardId}`;
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

describe('v0.7.0 Counterattack cards', () => {
  test('Illegal Occupation Asset suppresses the occupier\'s Assets only while the occupation persists', () => {
    const state = readyGame();
    const illegalOccupation = inject(
      state,
      'A',
      'neutral-illegal-occupation',
      'asset',
      'assetBank',
    );
    const opponentAsset = inject(
      state,
      'B',
      'neutral-contingency-plan',
      'opponent-asset',
      'assetBank',
    );

    state.players.B.position = 3;
    state.board[3].controller = 'A';
    state.board[3].occupant = 'B';

    expect(isV070AssetActive(state, illegalOccupation)).toBe(true);
    expect(isV070AssetActive(state, opponentAsset)).toBe(false);

    state.board[3].controller = 'B';
    expect(isV070AssetActive(state, opponentAsset)).toBe(true);
  });

  test('Resistance Asset gives +2 Reserve when the battle is a Counterattack', () => {
    let state = counterattackBattle();
    inject(
      state,
      'A',
      'neutral-resistance',
      'asset',
      'assetBank',
    );

    state = proceedToGambits(state);
    expect(state.battleRuntime?.counterattackAtOnset).toBe(true);
    expect(state.battleRuntime?.participants.A.reserveBonus).toBe(2);
    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(0);

    state = revealGambits(state);
    expect(state.battleRuntime?.participants.A.reserve).toHaveLength(
      v070CanonicalContent.content.battle.normal_reserve_size + 2,
    );
  });

  test('Foothold battle effect and banked Asset both reward a defending Counterattack win', () => {
    let state = counterattackBattle();
    const footholdGambit = inject(
      state,
      'B',
      'neutral-foothold',
      'gambit',
      'hand',
    );
    const footholdAsset = inject(
      state,
      'B',
      'neutral-foothold',
      'asset',
      'assetBank',
    );

    state = proceedToGambits(state);
    state = revealGambits(state, undefined, footholdGambit);
    expect(state.battleRuntime?.participants.B.advantage).toBe(1);

    state = toOutcome(state);
    const handBeforeOutcome = state.players.B.zones.hand.length;
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6, 1],
    });

    expect(state.battle?.winner).toBe('B');
    expect(state.players.B.zones.hand).toHaveLength(
      handBeforeOutcome + 1,
    );

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battleRuntime?.footholdAssetWindowPlayer).toBe('B');
    expect(state.battleRuntime?.aftermathCardsCleared).toBe(false);
    expect(() => reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    })).toThrow(/pending Foothold Asset opportunity/);

    const handBeforeAsset = state.players.B.zones.hand.length;
    state = reduceV070BattleAction(state, {
      type: 'use_foothold_asset',
      playerId: 'B',
      assetInstanceId: footholdAsset,
    });

    expect(state.battleRuntime?.footholdAssetWindowPlayer).toBeNull();
    expect(state.players.B.zones.assetBank).not.toContain(footholdAsset);
    expect(state.players.B.zones.discardPile).toContain(footholdAsset);
    expect(state.players.B.zones.hand).toHaveLength(
      handBeforeAsset + 2,
    );
  });

  test('Illegal Occupation battle effect disables opposing Assets and grants Advantage only in a Counterattack', () => {
    let state = counterattackBattle();
    const illegalOccupation = inject(
      state,
      'A',
      'neutral-illegal-occupation',
      'gambit',
      'hand',
    );
    const defenderAsset = inject(
      state,
      'B',
      'neutral-contingency-plan',
      'defender-asset',
      'assetBank',
    );

    state = proceedToGambits(state);
    expect(isV070AssetActive(state, defenderAsset)).toBe(true);

    state = revealGambits(
      state,
      illegalOccupation,
      undefined,
    );

    expect(state.battleRuntime?.participants.A.advantage).toBe(1);
    expect(state.battleRuntime?.assetInactivePlayers).toContain('B');
    expect(isV070AssetActive(state, defenderAsset)).toBe(false);
  });

  test('Resistance battle card banks itself on a win and uses normal Asset-limit enforcement', () => {
    let state = counterattackBattle();
    const resistance = inject(
      state,
      'A',
      'neutral-resistance',
      'gambit',
      'hand',
    );

    // Fill A's current effective Asset limit so Resistance must
    // open the shared enforcement choice when it banks itself.
    const assetLimit = effectiveV070AssetLimit(state, 'A');
    for (let index = 0; index < assetLimit; index += 1) {
      inject(
        state,
        'A',
        'neutral-foothold',
        `limit-${index}`,
        'assetBank',
      );
    }
    expect(state.players.A.zones.assetBank).toHaveLength(assetLimit);

    state = proceedToGambits(state);
    state = revealGambits(state, resistance, undefined);
    expect(state.battleRuntime?.participants.A.advantage).toBe(1);

    state = toOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6, 1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    expect(state.battle?.winner).toBe('A');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.assetBank).toContain(resistance);
    expect(state.players.A.zones.graveyard).not.toContain(resistance);
    expect(state.players.A.zones.discardPile).not.toContain(resistance);
    expect(state.pendingAssetLimitChoice).toEqual(
      expect.objectContaining({
        playerId: 'A',
        excess: 1,
        sourceInstanceId: resistance,
      }),
    );
    expect(state.battleRuntime?.aftermathCardsCleared).toBe(true);
    expect(state.battle).not.toBeNull();
  });
});
