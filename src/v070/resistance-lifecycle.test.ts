import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { effectiveV070AssetLimit } from './assets';
import { v070CanonicalContent } from '../content/v070';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'resistance-lifecycle-test',
    seed: 'resistance-lifecycle-seed',
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

function battleWithContestedController(
  controller: 'A' | 'B',
): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = controller;

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

function counterattackBattle(): V070GameState {
  return battleWithContestedController('A');
}

function ordinaryAttack(): V070GameState {
  return battleWithContestedController('B');
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone: 'hand' | 'assetBank',
): string {
  const instanceId = `resistance-${owner}-${suffix}-${cardId}`;
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

describe('v0.7.0 Resistance lifecycle', () => {
  test('banked Resistance gives +2 Reserve to its controller in a Counterattack regardless of battle role', () => {
    let state = counterattackBattle();
    inject(
      state,
      'B',
      'neutral-resistance',
      'defender-asset',
      'assetBank',
    );

    state = proceedToGambits(state);

    expect(state.battle?.attacker).toBe('A');
    expect(state.battle?.defender).toBe('B');
    expect(state.battleRuntime?.participants.A.reserveBonus).toBe(0);
    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(2);

    state = revealGambits(state);
    expect(state.battleRuntime?.participants.B.reserve).toHaveLength(
      v070CanonicalContent.content.battle.normal_reserve_size + 2,
    );
  });

  test('Counterattack prefix grants Advantage only in a Counterattack, while bank-on-win remains independent', () => {
    let state = ordinaryAttack();
    const resistance = inject(
      state,
      'A',
      'neutral-resistance',
      'ordinary-attack-gambit',
      'hand',
    );

    state = proceedToGambits(state);
    state = revealGambits(state, resistance);

    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
    expect(state.battleRuntime?.battleCardAftermathAssetBanks)
      .toContainEqual({
        owner: 'A',
        sourceInstanceId: resistance,
        sourceCardId: 'neutral-resistance',
        condition: 'owner_win',
      });

    state = toOutcome(state);
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

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.assetBank).toContain(resistance);
    expect(state.players.A.zones.graveyard).not.toContain(resistance);
    expect(state.players.A.zones.discardPile).not.toContain(resistance);
  });

  test('Resistance battle card gains Advantage in a Counterattack and clears normally after a loss', () => {
    let state = counterattackBattle();
    const resistance = inject(
      state,
      'A',
      'neutral-resistance',
      'losing-gambit',
      'hand',
    );

    state = proceedToGambits(state);
    state = revealGambits(state, resistance);
    expect(state.battleRuntime?.participants.A.advantage).toBe(1);

    state = toOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1, 1],
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

    expect(state.players.A.zones.assetBank).not.toContain(resistance);
    expect(state.players.A.zones.graveyard).toContain(resistance);
  });

  test('at the Asset limit, Resistance offers voluntary replacement and does not force Removed', () => {
    let state = counterattackBattle();
    const resistance = inject(
      state,
      'A',
      'neutral-resistance',
      'replacement-gambit',
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
    state = revealGambits(state, resistance);
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

    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toEqual(expect.objectContaining({
      playerId: 'A',
      candidateSourceInstanceIds: [resistance],
    }));
    expect(state.pendingAssetLimitChoice).toBeNull();

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: resistance,
      replaceAssetInstanceId: replacement,
    });

    expect(state.players.A.zones.assetBank).toContain(resistance);
    expect(state.players.A.zones.assetBank).not.toContain(replacement);
    expect(state.players.A.zones.discardPile).toContain(replacement);
    expect(state.players.A.zones.removed).not.toContain(replacement);
    expect(state.pendingAssetLimitChoice).toBeNull();
    expect(state.events.some(event =>
      event.type === 'asset_removed'
      && event.payload?.instanceId === replacement
    )).toBe(false);
  });

  test('a player may decline the optional at-limit replacement, leaving Resistance to clear normally', () => {
    let state = counterattackBattle();
    const resistance = inject(
      state,
      'A',
      'neutral-resistance',
      'decline-gambit',
      'hand',
    );
    const assetLimit = effectiveV070AssetLimit(state, 'A');
    for (let index = 0; index < assetLimit; index += 1) {
      inject(
        state,
        'A',
        'neutral-foothold',
        `decline-limit-${index}`,
        'assetBank',
      );
    }

    state = proceedToGambits(state);
    state = revealGambits(state, resistance);
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
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: resistance,
    });

    expect(state.players.A.zones.assetBank).not.toContain(resistance);
    expect(state.players.A.zones.graveyard).toContain(resistance);
    expect(state.events.some(event =>
      event.type === 'resistance_battle_bank_declined'
    )).toBe(true);
  });
});
