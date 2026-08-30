import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  bankableV070AssetInstanceIds,
  inherentBankActionV070AssetInstanceIds,
  voluntarilyDiscardableV070AssetInstanceIds,
} from './assets';
import {
  associateV070Sanction,
  V070_SANCTIONS_CENSURE_ID,
  V070_SANCTIONS_EMBARGO_ID,
} from './sanctions';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingGame(
  aStarter = militaryStarter,
  bStarter = diplomatStarter,
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'asset-action-test',
    seed: 'asset-action-seed',
    players: {
      A: { name: 'Active', starterDeckId: aStarter },
      B: { name: 'Opponent', starterDeckId: bStarter },
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
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function inject(
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

describe('v0.7.0 inherent Bank and Asset-discard Actions', () => {
  test('ordinary Asset banking spends one Action and moves the physical card from Hand to Asset Bank', () => {
    let state = openingGame();
    const asset = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'hand',
      'bank',
    );

    expect(inherentBankActionV070AssetInstanceIds(state, 'A')).toContain(asset);

    state = reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'A',
      cardInstanceId: asset,
    });

    expect(state.players.A.zones.hand).not.toContain(asset);
    expect(state.players.A.zones.assetBank).toContain(asset);
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.turnState?.actionsTaken.opening).toBe(1);
    expect(state.pendingActionCard).toBeNull();
    expect(state.events.some(event =>
      event.type === 'asset_bank_action_taken'
      && (event.payload as { instanceId?: string })?.instanceId === asset
    )).toBe(true);
  });

  test('printed special banking Actions override the inherent Bank Action while remaining bankable by direct effects', () => {
    const state = openingGame(diplomatStarter, militaryStarter);
    const detente = inject(
      state,
      'A',
      'diplomats-detente',
      'hand',
      'detente',
    );

    expect(bankableV070AssetInstanceIds(state, 'A')).toContain(detente);
    expect(inherentBankActionV070AssetInstanceIds(state, 'A')).not.toContain(detente);

    expect(() => reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'A',
      cardInstanceId: detente,
    })).toThrow(/printed banking Action.*overrides the inherent Bank/i);

    expect(state.players.A.zones.hand).toContain(detente);
    expect(state.players.A.zones.assetBank).not.toContain(detente);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(0);
  });

  test('banking at the effective Asset limit may replace one legal Asset as part of the same Action', () => {
    let state = openingGame();
    const replace = inject(state, 'A', 'neutral-counterintelligence', 'assetBank', 'old-1');
    inject(state, 'A', 'neutral-fealty', 'assetBank', 'old-2');
    inject(state, 'A', 'neutral-fortifications', 'assetBank', 'old-3');
    const incoming = inject(state, 'A', 'neutral-supplies', 'hand', 'incoming');

    expect(state.players.A.controlledTerritories).toHaveLength(3);
    expect(state.players.A.zones.assetBank).toHaveLength(3);

    expect(() => reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'A',
      cardInstanceId: incoming,
    })).toThrow(/requires choosing a replaceable Asset/);

    state = reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'A',
      cardInstanceId: incoming,
      replaceAssetInstanceId: replace,
    });

    expect(state.players.A.zones.assetBank).toHaveLength(3);
    expect(state.players.A.zones.assetBank).toContain(incoming);
    expect(state.players.A.zones.assetBank).not.toContain(replace);
    expect(state.players.A.zones.discardPile).toContain(replace);
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.events.some(event =>
      event.type === 'asset_replaced'
      && (event.payload as { instanceId?: string })?.instanceId === replace
    )).toBe(true);
  });

  test('discarding a controlled Asset spends one Action and is voluntary discard, not Removal', () => {
    let state = openingGame();
    const asset = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'discard',
    );

    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'A')).toContain(asset);

    state = reduceV070TurnAction(state, {
      type: 'discard_asset',
      playerId: 'A',
      assetInstanceId: asset,
    });

    expect(state.players.A.zones.assetBank).not.toContain(asset);
    expect(state.players.A.zones.discardPile).toContain(asset);
    expect(state.players.A.zones.removed).not.toContain(asset);
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.events.some(event =>
      event.type === 'asset_discarded'
      && (event.payload as { instanceId?: string; removed?: boolean })
        ?.instanceId === asset
      && (event.payload as { removed?: boolean }).removed === false
    )).toBe(true);
  });

  test('an Asset that forbids voluntary discard cannot be discarded for the normal Asset Action', () => {
    const state = openingGame();
    const armistice = inject(
      state,
      'A',
      'neutral-armistice',
      'assetBank',
      'armistice',
    );

    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'A')).not.toContain(armistice);

    expect(() => reduceV070TurnAction(state, {
      type: 'discard_asset',
      playerId: 'A',
      assetInstanceId: armistice,
    })).toThrow(/cannot be voluntarily discarded now/);

    expect(state.players.A.zones.assetBank).toContain(armistice);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('voluntarily discarding a Sanction Asset clears its opponent association', () => {
    let state = openingGame(diplomatStarter, militaryStarter);
    const embargo = inject(
      state,
      'A',
      V070_SANCTIONS_EMBARGO_ID,
      'assetBank',
      'embargo',
    );
    associateV070Sanction(state, {
      instanceId: embargo,
      owner: 'A',
      opponent: 'B',
      kind: 'asset',
    });

    state = reduceV070TurnAction(state, {
      type: 'discard_asset',
      playerId: 'A',
      assetInstanceId: embargo,
    });

    expect(state.sanctions.some(sanction => sanction.instanceId === embargo)).toBe(false);
    expect(state.players.A.zones.discardPile).toContain(embargo);
  });

  test('inherent Bank and Asset-discard Actions do not trigger Censure because no card is played for its printed Action effect', () => {
    let state = openingGame();
    const bankTarget = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'hand',
      'censure-bank',
    );
    const censure = inject(
      state,
      'B',
      V070_SANCTIONS_CENSURE_ID,
      'assetBank',
      'censure',
    );
    associateV070Sanction(state, {
      instanceId: censure,
      owner: 'B',
      opponent: 'A',
      kind: 'asset',
    });

    state = reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'A',
      cardInstanceId: bankTarget,
    });

    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.sanctionTriggerTurns[censure]).toBeUndefined();
  });
});
