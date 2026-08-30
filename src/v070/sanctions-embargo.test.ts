import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  effectiveV070AssetLimit,
} from './assets';
import {
  associateV070Sanction,
  V070_SANCTIONS_EMBARGO_ID,
} from './sanctions';
import { viewV070GameForPlayer } from './views';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function activeBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'sanctions-embargo-test',
    seed: 'sanctions-embargo-seed',
    players: {
      A: { name: 'Diplomat', starterDeckId: diplomatStarter },
      B: { name: 'Opponent', starterDeckId: militaryStarter },
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
  state.board.forEach(territory => { territory.occupant = null; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function injectCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'assetBank',
  suffix: string,
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: playerId,
  };
  state.players[playerId].zones[zone].push(instanceId);
  return instanceId;
}

function refuseTerms(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'offer_terms',
    playerId: 'A',
    proposalId: 'de-escalation',
  });
  return reduceV070BattleAction(state, {
    type: 'respond_to_terms',
    playerId: 'B',
    response: 'refuse',
  });
}

describe('v0.7.0 Sanctions: Embargo and shared Asset limits', () => {
  test('Embargo associates with the refusing opponent and forces immediate over-limit Removal', () => {
    let state = activeBattle();
    const embargo = injectCard(state, 'A', V070_SANCTIONS_EMBARGO_ID, 'hand', 'embargo');
    const removable = injectCard(state, 'B', 'neutral-counterintelligence', 'assetBank', 'asset-1');
    injectCard(state, 'B', 'neutral-fortifications', 'assetBank', 'asset-2');
    injectCard(state, 'B', 'neutral-supplies', 'assetBank', 'asset-3');

    expect(effectiveV070AssetLimit(state, 'B')).toBe(3);
    state = refuseTerms(state);
    state = reduceV070BattleAction(state, {
      type: 'use_sanctions_embargo',
      playerId: 'A',
      cardInstanceId: embargo,
    });

    expect(state.players.A.zones.assetBank).toContain(embargo);
    expect(state.sanctions).toEqual([{
      instanceId: embargo,
      owner: 'A',
      opponent: 'B',
      kind: 'asset',
    }]);
    expect(effectiveV070AssetLimit(state, 'B')).toBe(2);
    expect(state.pendingAssetLimitChoice).toEqual(expect.objectContaining({
      playerId: 'B',
      effectiveLimit: 2,
      excess: 1,
      sourceInstanceId: embargo,
    }));

    const view = viewV070GameForPlayer(state, 'B');
    expect(view.players.B.assetLimit).toBe(2);
    expect(view.sanctions).toEqual(state.sanctions);
    expect(view.pendingAssetLimitChoice).toEqual(state.pendingAssetLimitChoice);

    expect(() => reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    })).toThrow(/Asset-limit Removal/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_asset_limit_removal',
      playerId: 'B',
      instanceIds: [removable],
    });

    expect(state.players.B.zones.assetBank).not.toContain(removable);
    expect(state.players.B.zones.discardPile).toContain(removable);
    expect(state.players.B.zones.removed).not.toContain(removable);
    expect(state.pendingAssetLimitChoice).toBeNull();
    expect(state.events.some(event =>
      event.type === 'asset_removed'
      && (event.payload as { instanceId?: string; removed?: boolean; destination?: string })
        ?.instanceId === removable
      && (event.payload as { removed?: boolean }).removed === true
      && (event.payload as { destination?: string }).destination === 'discard'
    )).toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('set_gambits');
  });

  test('multiple Embargoes stack and each new reduction enforces the new effective limit', () => {
    let state = activeBattle();
    const embargo1 = injectCard(state, 'A', V070_SANCTIONS_EMBARGO_ID, 'hand', 'embargo-1');
    const embargo2 = injectCard(state, 'A', V070_SANCTIONS_EMBARGO_ID, 'hand', 'embargo-2');
    const asset1 = injectCard(state, 'B', 'neutral-counterintelligence', 'assetBank', 'asset-1');
    const asset2 = injectCard(state, 'B', 'neutral-fortifications', 'assetBank', 'asset-2');
    injectCard(state, 'B', 'neutral-supplies', 'assetBank', 'asset-3');

    state = refuseTerms(state);
    state = reduceV070BattleAction(state, {
      type: 'use_sanctions_embargo',
      playerId: 'A',
      cardInstanceId: embargo1,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_asset_limit_removal',
      playerId: 'B',
      instanceIds: [asset1],
    });

    expect(effectiveV070AssetLimit(state, 'B')).toBe(2);
    expect(state.players.B.zones.assetBank).toHaveLength(2);

    state = reduceV070BattleAction(state, {
      type: 'use_sanctions_embargo',
      playerId: 'A',
      cardInstanceId: embargo2,
    });
    expect(effectiveV070AssetLimit(state, 'B')).toBe(1);
    expect(state.pendingAssetLimitChoice?.excess).toBe(1);

    state = reduceV070BattleAction(state, {
      type: 'resolve_asset_limit_removal',
      playerId: 'B',
      instanceIds: [asset2],
    });

    expect(state.players.B.zones.assetBank).toHaveLength(1);
    expect(state.sanctions.map(sanction => sanction.instanceId)).toEqual([
      embargo1,
      embargo2,
    ]);
  });

  test('banking Embargo at the Diplomat Asset limit uses the shared replacement procedure', () => {
    let state = activeBattle();
    const embargo = injectCard(state, 'A', V070_SANCTIONS_EMBARGO_ID, 'hand', 'embargo');
    const replace = injectCard(state, 'A', 'neutral-counterintelligence', 'assetBank', 'asset-1');
    injectCard(state, 'A', 'neutral-fortifications', 'assetBank', 'asset-2');
    injectCard(state, 'A', 'neutral-supplies', 'assetBank', 'asset-3');

    state = refuseTerms(state);

    expect(() => reduceV070BattleAction(state, {
      type: 'use_sanctions_embargo',
      playerId: 'A',
      cardInstanceId: embargo,
    })).toThrow(/requires choosing a replaceable Asset/);

    state = reduceV070BattleAction(state, {
      type: 'use_sanctions_embargo',
      playerId: 'A',
      cardInstanceId: embargo,
      replaceAssetInstanceId: replace,
    });

    expect(state.players.A.zones.assetBank).toContain(embargo);
    expect(state.players.A.zones.assetBank).not.toContain(replace);
    expect(state.players.A.zones.discardPile).toContain(replace);
    expect(state.sanctions).toEqual([
      expect.objectContaining({ instanceId: embargo, opponent: 'B' }),
    ]);
  });

  test('an associated Embargo expires to its owner Discard Pile after that opponent accepts later Terms', () => {
    let state = activeBattle();
    const embargo = injectCard(state, 'A', V070_SANCTIONS_EMBARGO_ID, 'assetBank', 'embargo');
    associateV070Sanction(state, {
      instanceId: embargo,
      owner: 'A',
      opponent: 'B',
      kind: 'asset',
    });

    expect(effectiveV070AssetLimit(state, 'B')).toBe(2);

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.players.A.zones.assetBank).not.toContain(embargo);
    expect(state.players.A.zones.discardPile).toContain(embargo);
    expect(state.sanctions).toHaveLength(0);
    expect(effectiveV070AssetLimit(state, 'B')).toBe(3);
    expect(state.events.some(event =>
      event.type === 'sanction_expired'
      && (event.payload as { instanceId?: string })?.instanceId === embargo
    )).toBe(true);
  });

  test('unsupported Removal-trigger lifecycle is rejected only when that Asset is actually chosen', () => {
    let state = activeBattle();
    const embargo = injectCard(state, 'A', V070_SANCTIONS_EMBARGO_ID, 'hand', 'embargo');
    const reserveForce = injectCard(state, 'B', 'military-reserve-force', 'assetBank', 'reserve-force');
    const safe = injectCard(state, 'B', 'neutral-counterintelligence', 'assetBank', 'safe');
    injectCard(state, 'B', 'neutral-fortifications', 'assetBank', 'other');

    state = refuseTerms(state);
    state = reduceV070BattleAction(state, {
      type: 'use_sanctions_embargo',
      playerId: 'A',
      cardInstanceId: embargo,
    });

    expect(state.pendingAssetLimitChoice?.excess).toBe(1);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_asset_limit_removal',
      playerId: 'B',
      instanceIds: [reserveForce],
    })).toThrow(/unsupported until its bound-card lifecycle|Forced Asset Removal/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_asset_limit_removal',
      playerId: 'B',
      instanceIds: [safe],
    });
    expect(state.pendingAssetLimitChoice).toBeNull();
    expect(state.players.B.zones.assetBank).toContain(reserveForce);
  });
});
