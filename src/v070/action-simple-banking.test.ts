import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  associateV070Sanction,
  V070_SANCTIONS_CENSURE_ID,
} from './sanctions';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'simple-banking-actions',
    seed: 'simple-banking-actions-seed',
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

const simpleBankingCards = [
  ['diplomats-detente', 'Détente'],
  ['financiers-compound-interest', 'Compound Interest'],
  ['financiers-war-bonds', 'War Bonds'],
  ['intelligence-regime-change', 'Regime Change'],
  ['military-high-command', 'High Command'],
  ['mystics-sacrifice-recovery', 'Reembodiment'],
] as const;

describe('v0.7.0 simple printed banking Actions', () => {
  test.each(simpleBankingCards)(
    '%s banks the pending physical Action card and resolves to Asset',
    (cardId, purpose) => {
      let state = openingForB();
      const source = injectCard(state, 'B', cardId, 'hand', 'source');

      state = reduceV070TurnAction(state, {
        type: 'play_action_card',
        playerId: 'B',
        cardInstanceId: source,
      });

      expect(state.players.B.zones.hand).not.toContain(source);
      expect(state.players.B.zones.assetBank).toContain(source);
      expect(state.players.B.zones.discardPile).not.toContain(source);
      expect(state.pendingActionCard).toBeNull();
      expect(state.pendingActionEffectChoice).toBeNull();
      expect(state.turnState?.actionsAvailable).toBe(0);
      expect(state.turnState?.actionsTaken.opening).toBe(1);

      expect(state.events.some(event =>
        event.type === 'asset_banked'
        && (event.payload as { instanceId?: string; purpose?: string })?.instanceId === source
        && (event.payload as { purpose?: string })?.purpose === purpose
      )).toBe(true);
      expect(state.events.some(event =>
        event.type === 'action_card_resolved'
        && (event.payload as { instanceId?: string; destination?: string })?.instanceId === source
        && (event.payload as { destination?: string })?.destination === 'asset'
      )).toBe(true);
    },
  );

  test('single-banked-copy restriction is checked before the Action is spent', () => {
    const state = openingForB();
    injectCard(
      state,
      'B',
      'diplomats-detente',
      'assetBank',
      'existing',
    );
    const source = injectCard(
      state,
      'B',
      'diplomats-detente',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/single-banked-copy restriction/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(0);
  });

  test('banking at the Asset limit opens a replacement choice and then banks the source', () => {
    let state = openingForB();
    const replace = injectCard(
      state,
      'B',
      'neutral-counterintelligence',
      'assetBank',
      'replace',
    );
    injectCard(state, 'B', 'neutral-fortifications', 'assetBank', 'keep-1');
    injectCard(state, 'B', 'neutral-fealty', 'assetBank', 'keep-2');
    const source = injectCard(
      state,
      'B',
      'military-high-command',
      'hand',
      'source',
    );

    expect(state.players.B.controlledTerritories).toHaveLength(3);
    expect(state.players.B.zones.assetBank).toHaveLength(3);

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'pending_asset_bank_replacement',
      playerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'High Command',
    }));
    expect(
      (state.pendingActionEffectChoice as {
        replacementInstanceIds?: string[];
      }).replacementInstanceIds,
    ).toContain(replace);
    expect(state.players.B.zones.assetBank).not.toContain(source);
    expect(state.players.B.zones.discardPile).not.toContain(source);

    state = reduceV070TurnAction(state, {
      type: 'choose_pending_asset_bank_replacement',
      playerId: 'B',
      replaceAssetInstanceId: replace,
    });

    expect(state.players.B.zones.assetBank).toHaveLength(3);
    expect(state.players.B.zones.assetBank).toContain(source);
    expect(state.players.B.zones.assetBank).not.toContain(replace);
    expect(state.players.B.zones.discardPile).toContain(replace);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
  });

  test('an invalid replacement leaves the pending banking choice intact', () => {
    let state = openingForB();
    injectCard(
      state,
      'B',
      'neutral-counterintelligence',
      'assetBank',
      'replace',
    );
    injectCard(state, 'B', 'neutral-fortifications', 'assetBank', 'keep-1');
    injectCard(state, 'B', 'neutral-fealty', 'assetBank', 'keep-2');
    const invalid = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'invalid',
    );
    const source = injectCard(
      state,
      'B',
      'financiers-war-bonds',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_pending_asset_bank_replacement',
      playerId: 'B',
      replaceAssetInstanceId: invalid,
    })).toThrow(/not a legal replacement/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'pending_asset_bank_replacement',
      sourceActionInstanceId: source,
    }));
    expect(state.pendingActionCard?.instanceId).toBe(source);
  });

  test('a full Asset Bank with no replaceable Asset makes the banking Action illegal before spending it', () => {
    const state = openingForB();
    injectCard(state, 'B', 'neutral-armistice', 'assetBank', 'locked-1');
    injectCard(state, 'B', 'neutral-armistice', 'assetBank', 'locked-2');
    injectCard(state, 'B', 'neutral-armistice', 'assetBank', 'locked-3');
    const source = injectCard(
      state,
      'B',
      'financiers-compound-interest',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires a replaceable Asset/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('Tariffs banks, draws two, grants one Action, but does not permit a second Opening Action', () => {
    let state = openingForB();
    const tariffs = injectCard(
      state,
      'B',
      'financiers-tariffs',
      'hand',
      'tariffs',
    );
    const anotherAction = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'another-action',
    );
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: tariffs,
    });

    expect(state.players.B.zones.assetBank).toContain(tariffs);
    expect(state.players.B.zones.discardPile).not.toContain(tariffs);
    expect(state.players.B.zones.hand.length).toBe(handBefore + 1);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(1);
    expect(state.events.some(event =>
      event.type === 'cards_drawn'
      && (event.payload as { purpose?: string; count?: number })?.purpose === 'Tariffs'
      && (event.payload as { count?: number })?.count === 2
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'additional_action_granted'
      && (event.payload as { purpose?: string; amount?: number })?.purpose === 'Tariffs'
      && (event.payload as { amount?: number })?.amount === 1
    )).toBe(true);

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: anotherAction,
    })).toThrow(/normal Action limit for opening has already been reached/);
  });

  test('Tariffs cannot be banked while another Tariffs is already banked', () => {
    const state = openingForB();
    injectCard(
      state,
      'B',
      'financiers-tariffs',
      'assetBank',
      'existing-tariffs',
    );
    const source = injectCard(
      state,
      'B',
      'financiers-tariffs',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/single-banked-copy restriction/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('Censure resolves before the printed banking Action enters the Asset Bank', () => {
    let state = openingForB();
    const censure = injectCard(
      state,
      'A',
      V070_SANCTIONS_CENSURE_ID,
      'assetBank',
      'censure',
    );
    associateV070Sanction(state, {
      instanceId: censure,
      owner: 'A',
      opponent: 'B',
      kind: 'asset',
    });
    const source = injectCard(
      state,
      'B',
      'military-high-command',
      'hand',
      'source',
    );
    const payment = state.players.B.zones.hand.find(id => id !== source)!;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingSanctionChoices).toHaveLength(1);
    expect(state.players.B.zones.assetBank).not.toContain(source);
    expect(state.players.B.zones.discardPile).not.toContain(source);

    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure,
      choice: 'discard',
      discardInstanceId: payment,
    });

    expect(state.players.B.zones.assetBank).toContain(source);
    expect(state.players.B.zones.discardPile).toContain(payment);
    expect(state.pendingActionCard).toBeNull();
  });
});
