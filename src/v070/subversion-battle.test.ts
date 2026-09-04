import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  isV070AssetActive,
  isV070AssetUsable,
  v070AssetUseProhibitedDuringBattle,
} from './asset-face-state';

function readyGame(
  aStarter = 'military-general-forward-doctrine',
  bStarter = 'military-commandant-holdfast',
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'subversion-battle-test',
    seed: 'subversion-battle-seed',
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

function activeBattle(
  controller: 'A' | 'B',
  aStarter?: string,
  bStarter?: string,
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

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone: 'hand' | 'assetBank',
): string {
  const instanceId = `subversion-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function toGambits(state: V070GameState): V070GameState {
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

describe('v0.7.0 Subversion battle Asset-use restriction', () => {
  test('prohibits opposing Asset use without making those Assets inactive', () => {
    let state = activeBattle('B');
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'single',
      'hand',
    );
    const opposingAsset = inject(
      state,
      'B',
      'neutral-foothold',
      'opposing-asset',
      'assetBank',
    );

    expect(isV070AssetActive(state, opposingAsset)).toBe(true);
    expect(isV070AssetUsable(state, opposingAsset)).toBe(true);

    state = revealGambits(toGambits(state), subversion);

    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(state.battleRuntime?.assetUseProhibitedPlayers).toEqual(['B']);
    expect(state.battleRuntime?.assetInactivePlayers).not.toContain('B');
    expect(v070AssetUseProhibitedDuringBattle(state, 'B')).toBe(true);
    expect(isV070AssetActive(state, opposingAsset)).toBe(true);
    expect(isV070AssetUsable(state, opposingAsset)).toBe(false);
  });

  test('mutual Subversion prohibits both players from using Assets', () => {
    let state = activeBattle('B');
    const aSubversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'mutual-a',
      'hand',
    );
    const bSubversion = inject(
      state,
      'B',
      'intelligence-subversion',
      'mutual-b',
      'hand',
    );

    state = revealGambits(toGambits(state), aSubversion, bSubversion);

    expect(new Set(state.battleRuntime?.assetUseProhibitedPlayers))
      .toEqual(new Set(['A', 'B']));
  });

  test('does not retroactively undo a banked Resistance effect that resolved during Onset', () => {
    let state = activeBattle('A');
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'after-onset',
      'hand',
    );
    inject(
      state,
      'B',
      'neutral-resistance',
      'onset-resistance',
      'assetBank',
    );

    state = toGambits(state);
    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(2);

    state = revealGambits(state, subversion);

    expect(state.battleRuntime?.assetUseProhibitedPlayers).toContain('B');
    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(2);
  });

  test('stops a prohibited Illegal Occupation Asset from continuously suppressing the opponent after reveal', () => {
    let state = activeBattle('A');
    const subversion = inject(
      state,
      'B',
      'intelligence-subversion',
      'illegal-occupation-counter',
      'hand',
    );
    const illegalOccupation = inject(
      state,
      'A',
      'neutral-illegal-occupation',
      'source',
      'assetBank',
    );
    const bAsset = inject(
      state,
      'B',
      'neutral-foothold',
      'suppressed-target',
      'assetBank',
    );

    expect(isV070AssetActive(state, illegalOccupation)).toBe(true);
    expect(isV070AssetActive(state, bAsset)).toBe(false);

    state = revealGambits(toGambits(state), undefined, subversion);

    expect(v070AssetUseProhibitedDuringBattle(state, 'A')).toBe(true);
    expect(isV070AssetActive(state, illegalOccupation)).toBe(true);
    expect(isV070AssetUsable(state, illegalOccupation)).toBe(false);
    expect(isV070AssetActive(state, bAsset)).toBe(true);
  });

  test('prevents a post-reveal Foothold Asset window from opening', () => {
    let state = activeBattle('A');
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'foothold-block',
      'hand',
    );
    const foothold = inject(
      state,
      'B',
      'neutral-foothold',
      'blocked-foothold',
      'assetBank',
    );

    state = revealGambits(toGambits(state), subversion);
    state = toOutcome(state);
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
    expect(state.battleRuntime?.footholdAssetWindowPlayer).toBeNull();
    expect(state.players.B.zones.assetBank).toContain(foothold);
    expect(isV070AssetActive(state, foothold)).toBe(true);
    expect(isV070AssetUsable(state, foothold)).toBe(false);
  });

  test('prevents Safe Conduct after reveal and does not count the failed attempt as Asset use', () => {
    let state = activeBattle(
      'B',
      'diplomats-ambassador-open-channels',
      'military-commandant-holdfast',
    );
    const safeConduct = inject(
      state,
      'A',
      'diplomats-safe-conduct',
      'safe-conduct',
      'assetBank',
    );
    const subversion = inject(
      state,
      'B',
      'intelligence-subversion',
      'safe-conduct-block',
      'hand',
    );

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'open-channels',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });
    state = toGambits(state);
    state = revealGambits(state, undefined, subversion);
    state = toOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'use_leverage',
      playerId: 'A',
      bonus: 0,
    });
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

    expect(state.battleRuntime?.stage).toBe('loss_replacement');
    expect(() => reduceV070BattleAction(state, {
      type: 'use_safe_conduct',
      playerId: 'A',
      cardInstanceId: safeConduct,
    })).toThrow(/Subversion prevents/);
    expect(state.players.A.zones.assetBank).toContain(safeConduct);
    expect(state.players.A.intelligence?.missionBattleAssetUsed).toBeFalsy();
  });
});
