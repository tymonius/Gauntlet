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
    gameId: 'neutral-recovery-actions',
    seed: 'neutral-recovery-actions-seed',
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

function injectHandCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner: playerId };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function moveExistingCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  target: 'discardPile' | 'graveyard',
): string {
  const player = state.players[playerId];
  const instanceId = player.zones.drawPile.shift()
    ?? player.zones.hand.shift()
    ?? player.zones.discardPile.shift()
    ?? player.zones.graveyard.shift();
  if (!instanceId) throw new Error(`${playerId} has no card available to relocate.`);

  for (const zone of [
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones[target].push(instanceId);
  return instanceId;
}

function injectOpposingCensure(state: V070GameState): string {
  const instanceId = `test-A-${V070_SANCTIONS_CENSURE_ID}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: V070_SANCTIONS_CENSURE_ID,
    owner: 'A',
  };
  state.players.A.zones.assetBank.push(instanceId);
  associateV070Sanction(state, {
    instanceId,
    owner: 'A',
    opponent: 'B',
    kind: 'asset',
  });
  return instanceId;
}

describe('v0.7.0 Neutral recovery Actions', () => {
  test('Arcane Knowledge requires a Graveyard target before spending the Action', () => {
    const state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-arcane-knowledge', 'arcane');

    expect(state.players.B.zones.graveyard).toHaveLength(0);
    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one card in your Graveyard/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.pendingActionCard).toBeNull();
  });

  test('Arcane Knowledge moves the chosen Graveyard card to Discard, then discards itself', () => {
    let state = openingForB();
    const target = moveExistingCard(state, 'B', 'graveyard');
    const source = injectHandCard(state, 'B', 'neutral-arcane-knowledge', 'arcane');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'arcane_knowledge_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
    expect(state.players.B.zones.hand).not.toContain(source);
    expect(state.players.B.zones.discardPile).not.toContain(source);

    state = reduceV070TurnAction(state, {
      type: 'choose_recovery_action_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(state.players.B.zones.graveyard).not.toContain(target);
    expect(state.players.B.zones.discardPile).toContain(target);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
  });

  test('Contraband requires a pre-existing Discard target before spending the Action', () => {
    const state = openingForB();
    state.players.B.zones.drawPile.push(...state.players.B.zones.discardPile.splice(0));
    const source = injectHandCard(state, 'B', 'neutral-contraband', 'contraband');

    expect(state.players.B.zones.discardPile).toHaveLength(0);
    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one card in your Discard Pile/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('Contraband returns the chosen Discard card to Hand before the source card enters Discard', () => {
    let state = openingForB();
    const target = moveExistingCard(state, 'B', 'discardPile');
    const source = injectHandCard(state, 'B', 'neutral-contraband', 'contraband');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_recovery_action_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(state.players.B.zones.hand).toContain(target);
    expect(state.players.B.zones.discardPile).not.toContain(target);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.events.some(event =>
      event.type === 'discard_card_returned_to_hand'
      && (event.payload as { instanceId?: string })?.instanceId === target
    )).toBe(true);
  });

  test('an invalid recovery target leaves the pending choice intact', () => {
    let state = openingForB();
    moveExistingCard(state, 'B', 'graveyard');
    const invalid = state.players.B.zones.hand[0];
    const source = injectHandCard(state, 'B', 'neutral-arcane-knowledge', 'arcane');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_recovery_action_target',
      playerId: 'B',
      targetInstanceId: invalid,
    })).toThrow(/your Graveyard/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'arcane_knowledge_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
    expect(state.pendingActionCard?.instanceId).toBe(source);
  });

  test('Censure resolves before the recovery target window opens', () => {
    let state = openingForB();
    moveExistingCard(state, 'B', 'discardPile');
    const source = injectHandCard(state, 'B', 'neutral-contraband', 'contraband');
    const payment = injectHandCard(state, 'B', 'neutral-rallying-cry', 'payment');
    const censure = injectOpposingCensure(state);

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingSanctionChoices).toEqual([
      expect.objectContaining({
        kind: 'censure_action',
        sanctionInstanceId: censure,
        sourceActionInstanceId: source,
      }),
    ]);
    expect(state.pendingActionEffectChoice).toBeNull();

    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure,
      choice: 'discard',
      discardInstanceId: payment,
    });

    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'contraband_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
    expect(state.players.B.zones.discardPile).toContain(payment);

    state = reduceV070TurnAction(state, {
      type: 'choose_recovery_action_target',
      playerId: 'B',
      targetInstanceId: payment,
    });

    expect(state.players.B.zones.hand).toContain(payment);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
  });
});
