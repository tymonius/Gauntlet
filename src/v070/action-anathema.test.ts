import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'anathema-action',
    seed: 'anathema-action-seed',
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
  zone: 'hand' | 'discardPile' | 'assetBank',
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

describe('v0.7.0 Anathema Action', () => {
  test('requires an opponent Discard target before spending the Action', () => {
    const state = openingForB();
    state.players.A.zones.discardPile = [];
    const source = injectCard(
      state,
      'B',
      'inquisition-anathema',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one card in the opponent’s Discard Pile/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('moves the chosen opposing Discard card to Graveyard, then banks Anathema', () => {
    let state = openingForB();
    const target = state.players.A.zones.discardPile[0];
    const source = injectCard(
      state,
      'B',
      'inquisition-anathema',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'anathema_target',
      playerId: 'B',
      opponentId: 'A',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_anathema_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(state.players.A.zones.discardPile).not.toContain(target);
    expect(state.players.A.zones.graveyard).toContain(target);
    expect(state.players.B.zones.assetBank).toContain(source);
    expect(state.players.B.zones.discardPile).not.toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();

    const graveyardIndex = state.events.findIndex(event =>
      event.type === 'card_graveyarded'
      && (event.payload as { purpose?: string; instanceId?: string })?.purpose === 'Anathema'
      && (event.payload as { instanceId?: string })?.instanceId === target
    );
    const bankIndex = state.events.findIndex(event =>
      event.type === 'asset_banked'
      && (event.payload as { purpose?: string; instanceId?: string })?.purpose === 'Anathema'
      && (event.payload as { instanceId?: string })?.instanceId === source
    );
    expect(graveyardIndex).toBeGreaterThanOrEqual(0);
    expect(bankIndex).toBeGreaterThan(graveyardIndex);

    expect(state.events.some(event =>
      event.type === 'action_card_resolved'
      && (event.payload as { destination?: string; instanceId?: string })?.destination === 'asset'
      && (event.payload as { instanceId?: string })?.instanceId === source
    )).toBe(true);
  });

  test('invalid opponent Discard target leaves Anathema pending and unbanked', () => {
    let state = openingForB();
    const invalid = state.players.A.zones.drawPile[0];
    const source = injectCard(
      state,
      'B',
      'inquisition-anathema',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_anathema_target',
      playerId: 'B',
      targetInstanceId: invalid,
    })).toThrow(/must choose a card in the opponent’s Discard Pile/);

    expect(state.players.B.zones.assetBank).not.toContain(source);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'anathema_target',
      sourceActionInstanceId: source,
    }));
  });

  test('at the Asset limit, the target clause resolves before the banking replacement choice', () => {
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
    const target = state.players.A.zones.discardPile[0];
    const source = injectCard(
      state,
      'B',
      'inquisition-anathema',
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
    state = reduceV070TurnAction(state, {
      type: 'choose_anathema_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(state.players.A.zones.graveyard).toContain(target);
    expect(state.players.A.zones.discardPile).not.toContain(target);
    expect(state.players.B.zones.assetBank).not.toContain(source);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'pending_asset_bank_replacement',
      playerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'Anathema',
      replacementInstanceIds: expect.arrayContaining([replace]),
    }));

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

  test('invalid replacement does not reverse the already-resolved Graveyard move', () => {
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
    const target = state.players.A.zones.discardPile[0];
    const source = injectCard(
      state,
      'B',
      'inquisition-anathema',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_anathema_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_pending_asset_bank_replacement',
      playerId: 'B',
      replaceAssetInstanceId: invalid,
    })).toThrow(/not a legal replacement/);

    expect(state.players.A.zones.graveyard).toContain(target);
    expect(state.players.A.zones.discardPile).not.toContain(target);
    expect(state.players.B.zones.assetBank).not.toContain(source);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'pending_asset_bank_replacement',
      purpose: 'Anathema',
      sourceActionInstanceId: source,
    }));
  });

  test('an unreplaceable full Asset Bank makes Anathema illegal before its target moves', () => {
    const state = openingForB();
    injectCard(state, 'B', 'neutral-armistice', 'assetBank', 'locked-1');
    injectCard(state, 'B', 'neutral-armistice', 'assetBank', 'locked-2');
    injectCard(state, 'B', 'neutral-armistice', 'assetBank', 'locked-3');
    const target = state.players.A.zones.discardPile[0];
    const source = injectCard(
      state,
      'B',
      'inquisition-anathema',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires a replaceable Asset/);

    expect(state.players.A.zones.discardPile).toContain(target);
    expect(state.players.A.zones.graveyard).not.toContain(target);
    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });
});
