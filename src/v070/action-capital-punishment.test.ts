import { describe, expect, test } from 'vitest';
import {
  appendV070Event,
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'capital-punishment-action',
    seed: 'capital-punishment-action-seed',
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
  state.cardInstances[instanceId] = { instanceId, cardId, owner: playerId };
  state.players[playerId].zones[zone].push(instanceId);
  return instanceId;
}

function recordBattleOutcome(
  state: V070GameState,
  winner: 'A' | 'B',
): void {
  appendV070Event(state, {
    type: 'battle_outcome',
    visibility: 'public',
    payload: {
      winner,
      loser: winner === 'A' ? 'B' : 'A',
      method: 'total',
      tiebreakRounds: 0,
    },
  });
}

describe('v0.7.0 Capital Punishment Action', () => {
  test('requires a battle won by the active player during the current turn', () => {
    const state = openingForB();
    injectCard(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'asset',
    );
    const source = injectCard(
      state,
      'B',
      'neutral-capital-punishment',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/only if you won a battle this turn/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('an opponent battle win does not satisfy Capital Punishment', () => {
    const state = openingForB();
    recordBattleOutcome(state, 'A');
    injectCard(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'asset',
    );
    const source = injectCard(
      state,
      'B',
      'neutral-capital-punishment',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/only if you won a battle this turn/);
  });

  test('a win before the current turn-start boundary does not qualify', () => {
    const state = openingForB();
    recordBattleOutcome(state, 'B');
    state.turnNumber += 1;
    appendV070Event(state, {
      type: 'turn_started',
      actor: 'B',
      visibility: 'public',
      payload: {
        turnNumber: state.turnNumber,
        phase: state.turnState?.phase,
      },
    });
    injectCard(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'asset',
    );
    const source = injectCard(
      state,
      'B',
      'neutral-capital-punishment',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/only if you won a battle this turn/);
  });

  test('the active player chooses one opposing Asset and forces it to Graveyard as Removal', () => {
    let state = openingForB();
    recordBattleOutcome(state, 'B');
    const first = injectCard(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'first',
    );
    const second = injectCard(
      state,
      'A',
      'neutral-fortifications',
      'assetBank',
      'second',
    );
    const source = injectCard(
      state,
      'B',
      'neutral-capital-punishment',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'forced_asset_target',
      playerId: 'B',
      assetOwnerId: 'A',
      actionOwnerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'Capital Punishment',
      destination: 'graveyard',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_forced_asset_target',
      playerId: 'B',
      targetInstanceId: second,
    });

    expect(state.players.A.zones.assetBank).toContain(first);
    expect(state.players.A.zones.assetBank).not.toContain(second);
    expect(state.players.A.zones.graveyard).toContain(second);
    expect(state.players.A.zones.discardPile).not.toContain(second);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();

    expect(state.events.some(event =>
      event.type === 'asset_removed'
      && (event.payload as {
        instanceId?: string;
        destination?: string;
        removed?: boolean;
        reason?: string;
      })?.instanceId === second
      && (event.payload as { destination?: string })?.destination === 'graveyard'
      && (event.payload as { removed?: boolean })?.removed === true
      && (event.payload as { reason?: string })?.reason === 'Capital Punishment'
    )).toBe(true);
  });

  test('requires an opposing Asset even after a qualifying battle win', () => {
    const state = openingForB();
    recordBattleOutcome(state, 'B');
    const source = injectCard(
      state,
      'B',
      'neutral-capital-punishment',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/opponent to control at least one Asset/);

    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('Reserve Force is a legal Capital Punishment target once its bound lifecycle is represented', () => {
    let state = openingForB();
    recordBattleOutcome(state, 'B');
    injectCard(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'supported',
    );
    const reserveForce = injectCard(
      state,
      'A',
      'military-reserve-force',
      'assetBank',
      'reserve-force',
    );
    const source = injectCard(
      state,
      'B',
      'neutral-capital-punishment',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_forced_asset_target',
      playerId: 'B',
      targetInstanceId: reserveForce,
    });

    expect(state.players.A.zones.assetBank).not.toContain(reserveForce);
    expect(state.players.A.zones.graveyard).toContain(reserveForce);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
  });

  test('an invalid opposing Asset target leaves the choice pending', () => {
    let state = openingForB();
    recordBattleOutcome(state, 'B');
    injectCard(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'asset',
    );
    const invalid = injectCard(
      state,
      'B',
      'neutral-fortifications',
      'assetBank',
      'own-asset',
    );
    const source = injectCard(
      state,
      'B',
      'neutral-capital-punishment',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_forced_asset_target',
      playerId: 'B',
      targetInstanceId: invalid,
    })).toThrow(/Capital Punishment must choose one Asset controlled by the opponent/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'forced_asset_target',
      purpose: 'Capital Punishment',
    }));
    expect(state.pendingActionCard?.instanceId).toBe(source);
  });
});
