import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  bankV070AssetFromHand,
  bankableV070AssetInstanceIds,
  effectiveV070AssetLimit,
  inherentBankActionV070AssetInstanceIds,
  voluntarilyDiscardableV070AssetInstanceIds,
} from './assets';
import {
  associateV070Sanction,
  V070_SANCTIONS_CENSURE_ID,
} from './sanctions';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'asset-actions-test',
    seed: 'asset-actions-seed',
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
    value: 1,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 6,
  });

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'B' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'B' });
  expect(state.turnState?.phase).toBe('opening');
  return state;
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

describe('v0.7.0 shared Asset Actions', () => {
  test('the inherent Bank Action spends one Action and banks an ordinary Asset from Hand', () => {
    let state = openingForB();
    const asset = injectCard(
      state,
      'B',
      'neutral-counterintelligence',
      'hand',
      'ordinary',
    );

    expect(inherentBankActionV070AssetInstanceIds(state, 'B')).toContain(asset);

    state = reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'B',
      cardInstanceId: asset,
    });

    expect(state.players.B.zones.hand).not.toContain(asset);
    expect(state.players.B.zones.assetBank).toContain(asset);
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.turnState?.actionsTaken.opening).toBe(1);
    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.events.some(event =>
      event.type === 'asset_banked'
      && (event.payload as { instanceId?: string; turnNumber?: number })?.instanceId === asset
      && (event.payload as { turnNumber?: number })?.turnNumber === state.turnNumber
    )).toBe(true);
  });

  test('a printed special banking Action overrides inherent Bank without narrowing direct-effect bankability', () => {
    const state = openingForB();
    const tariffs = injectCard(
      state,
      'B',
      'financiers-tariffs',
      'hand',
      'tariffs',
    );

    expect(bankableV070AssetInstanceIds(state, 'B')).toContain(tariffs);
    expect(inherentBankActionV070AssetInstanceIds(state, 'B')).not.toContain(tariffs);

    expect(() => reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'B',
      cardInstanceId: tariffs,
    })).toThrow(/printed special banking Action/);

    expect(state.players.B.zones.hand).toContain(tariffs);
    expect(state.players.B.zones.assetBank).not.toContain(tariffs);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(0);
  });

  test('banking at the Asset limit may replace one legal Asset as part of the same Action', () => {
    let state = openingForB();
    const replace = injectCard(state, 'B', 'neutral-counterintelligence', 'assetBank', 'replace');
    injectCard(state, 'B', 'neutral-fortifications', 'assetBank', 'keep-1');
    injectCard(state, 'B', 'neutral-attrition', 'assetBank', 'keep-2');
    const incoming = injectCard(state, 'B', 'neutral-fealty', 'hand', 'incoming');

    expect(effectiveV070AssetLimit(state, 'B')).toBe(3);
    expect(state.players.B.zones.assetBank).toHaveLength(3);

    expect(() => reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'B',
      cardInstanceId: incoming,
    })).toThrow(/requires choosing a replaceable Asset/);

    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.players.B.zones.hand).toContain(incoming);

    state = reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'B',
      cardInstanceId: incoming,
      replaceAssetInstanceId: replace,
    });

    expect(state.players.B.zones.assetBank).toHaveLength(3);
    expect(state.players.B.zones.assetBank).toContain(incoming);
    expect(state.players.B.zones.assetBank).not.toContain(replace);
    expect(state.players.B.zones.discardPile).toContain(replace);
    expect(state.turnState?.actionsAvailable).toBe(0);
  });

  test('discarding an Asset is a voluntary Action, not Removal, and clears Sanction association', () => {
    let state = openingForB();
    const censure = injectCard(
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
      type: 'discard_asset',
      playerId: 'B',
      assetInstanceId: censure,
    });

    expect(state.players.B.zones.assetBank).not.toContain(censure);
    expect(state.players.B.zones.discardPile).toContain(censure);
    expect(state.sanctions).toHaveLength(0);
    expect(state.players.B.zones.removed).not.toContain(censure);
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.events.some(event =>
      event.type === 'asset_discarded'
      && (event.payload as { instanceId?: string; removed?: boolean })?.instanceId === censure
      && (event.payload as { removed?: boolean })?.removed === false
    )).toBe(true);
  });

  test('Armistice cannot use the normal voluntary discard Action', () => {
    const state = openingForB();
    const armistice = injectCard(
      state,
      'B',
      'neutral-armistice',
      'assetBank',
      'armistice',
    );

    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'B')).not.toContain(armistice);

    expect(() => reduceV070TurnAction(state, {
      type: 'discard_asset',
      playerId: 'B',
      assetInstanceId: armistice,
    })).toThrow(/cannot be voluntarily discarded now/);

    expect(state.players.B.zones.assetBank).toContain(armistice);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('Tariffs cannot leave voluntarily on its banking turn but can on a later turn', () => {
    const state = openingForB();
    const tariffs = injectCard(
      state,
      'B',
      'financiers-tariffs',
      'hand',
      'tariffs-turn',
    );

    bankV070AssetFromHand(state, 'B', tariffs, {
      purpose: 'test printed banking effect',
    });

    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'B')).not.toContain(tariffs);

    state.turnNumber += 1;
    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'B')).toContain(tariffs);
  });

  test('inherent banking and Asset discard do not trigger Sanctions: Censure', () => {
    let state = openingForB();
    state.turnState!.actionsAvailable = 2;

    const censure = injectCard(
      state,
      'A',
      V070_SANCTIONS_CENSURE_ID,
      'assetBank',
      'opposing-censure',
    );
    associateV070Sanction(state, {
      instanceId: censure,
      owner: 'A',
      opponent: 'B',
      kind: 'asset',
    });

    const asset = injectCard(
      state,
      'B',
      'neutral-counterintelligence',
      'hand',
      'censure-proof',
    );

    state = reduceV070TurnAction(state, {
      type: 'bank_asset',
      playerId: 'B',
      cardInstanceId: asset,
    });

    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.sanctionTriggerTurns[censure]).toBeUndefined();

    state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'B' });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'hold',
    });
    expect(state.turnState?.phase).toBe('denouement');

    state = reduceV070TurnAction(state, {
      type: 'discard_asset',
      playerId: 'B',
      assetInstanceId: asset,
    });

    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.sanctionTriggerTurns[censure]).toBeUndefined();
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.turnState?.actionsTaken).toEqual({ opening: 1, denouement: 1 });
  });
});
