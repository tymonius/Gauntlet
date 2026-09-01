import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { v070BindingsForHost } from './bindings';
import { reduceV070TurnAction } from './turn-engine';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForMilitaryB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'conscription-action',
    seed: 'conscription-action-seed',
    players: {
      A: { name: 'A', starterDeckId: diplomatStarter },
      B: { name: 'B', starterDeckId: militaryStarter },
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
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'B',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'B',
  });
  expect(state.turnState?.phase).toBe('opening');
  expect(state.turnState?.actionsAvailable).toBe(1);
  return state;
}

function inject(
  state: V070GameState,
  cardId: string,
  zone: 'hand' | 'drawPile' | 'discardPile' | 'assetBank',
  suffix: string,
): string {
  const instanceId = `test-B-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'B',
  };
  state.players.B.zones[zone].push(instanceId);
  return instanceId;
}

describe('v0.7.0 Conscription Action', () => {
  test('draws one, then may immediately play a banking Action without spending another Action', () => {
    let state = openingForMilitaryB();
    state.players.B.zones.hand = [];
    state.players.B.zones.drawPile = [];

    const source = inject(
      state,
      'neutral-conscription',
      'hand',
      'source',
    );
    const highCommand = inject(
      state,
      'military-high-command',
      'hand',
      'high-command',
    );
    const drawn = inject(
      state,
      'neutral-rallying-cry',
      'drawPile',
      'drawn',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toContain(drawn);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'conscription_banking_action',
      playerId: 'B',
      sourceActionInstanceId: source,
      candidateInstanceIds: [highCommand],
    });
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.turnState?.actionsTaken.opening).toBe(1);

    state = reduceV070TurnAction(state, {
      type: 'resolve_conscription_banking_action',
      playerId: 'B',
      targetInstanceId: highCommand,
    });

    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.B.zones.assetBank).toContain(highCommand);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.turnState?.actionsTaken.opening).toBe(1);

    const freePlay = state.events.find(event =>
      event.type === 'action_card_played'
      && (event.payload as { instanceId?: string })?.instanceId === highCommand
    );
    expect(freePlay?.payload).toEqual(expect.objectContaining({
      cardId: 'military-high-command',
      actionSpent: false,
      source: 'Conscription',
      sourceActionInstanceId: source,
    }));
  });

  test('the optional immediate play may be declined', () => {
    let state = openingForMilitaryB();
    state.players.B.zones.hand = [];
    state.players.B.zones.drawPile = [];

    const source = inject(
      state,
      'neutral-conscription',
      'hand',
      'source',
    );
    inject(
      state,
      'military-high-command',
      'hand',
      'high-command',
    );
    inject(
      state,
      'neutral-rallying-cry',
      'drawPile',
      'drawn',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_conscription_banking_action',
      playerId: 'B',
    });

    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.B.zones.assetBank).toEqual([]);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
  });

  test('if the drawn card is a legal banking Action, it can be the immediate play', () => {
    let state = openingForMilitaryB();
    state.players.B.zones.hand = [];
    state.players.B.zones.drawPile = [];

    const source = inject(
      state,
      'neutral-conscription',
      'hand',
      'source',
    );
    const drawnHighCommand = inject(
      state,
      'military-high-command',
      'drawPile',
      'drawn-high-command',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toContain(drawnHighCommand);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'conscription_banking_action',
      playerId: 'B',
      sourceActionInstanceId: source,
      candidateInstanceIds: [drawnHighCommand],
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_conscription_banking_action',
      playerId: 'B',
      targetInstanceId: drawnHighCommand,
    });
    expect(state.players.B.zones.assetBank).toContain(drawnHighCommand);
  });

  test('with no legal banking Action in Hand after the draw, Conscription resolves automatically', () => {
    let state = openingForMilitaryB();
    state.players.B.zones.hand = [];
    state.players.B.zones.drawPile = [];

    const source = inject(
      state,
      'neutral-conscription',
      'hand',
      'source',
    );
    const ordinary = inject(
      state,
      'neutral-rallying-cry',
      'hand',
      'ordinary',
    );
    const drawn = inject(
      state,
      'neutral-forced-march',
      'drawPile',
      'drawn',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toEqual(
      expect.arrayContaining([ordinary, drawn]),
    );
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
  });

  test('candidate filtering uses the target card normal legality, including single-banked-copy restrictions', () => {
    let state = openingForMilitaryB();
    state.players.B.zones.hand = [];
    state.players.B.zones.drawPile = [];

    const source = inject(
      state,
      'neutral-conscription',
      'hand',
      'source',
    );
    const duplicate = inject(
      state,
      'military-high-command',
      'hand',
      'duplicate-high-command',
    );
    inject(
      state,
      'military-high-command',
      'assetBank',
      'already-banked',
    );
    inject(
      state,
      'neutral-rallying-cry',
      'drawPile',
      'drawn',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.hand).toContain(duplicate);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(source);
  });

  test('special banking Actions continue through their normal nested choices', () => {
    let state = openingForMilitaryB();
    state.players.B.zones.hand = [];
    state.players.B.zones.drawPile = [];

    const source = inject(
      state,
      'neutral-conscription',
      'hand',
      'source',
    );
    const reserveForce = inject(
      state,
      'military-reserve-force',
      'hand',
      'reserve-force',
    );
    const tactic = inject(
      state,
      'neutral-rallying-cry',
      'hand',
      'tactic',
    );
    inject(
      state,
      'neutral-rallying-cry',
      'drawPile',
      'drawn',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    expect(
      (state.pendingActionEffectChoice as {
        candidateInstanceIds?: string[];
      })?.candidateInstanceIds,
    ).toContain(reserveForce);

    state = reduceV070TurnAction(state, {
      type: 'resolve_conscription_banking_action',
      playerId: 'B',
      targetInstanceId: reserveForce,
    });

    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.B.zones.assetBank).toContain(reserveForce);
    expect(state.pendingActionCard).toEqual(expect.objectContaining({
      instanceId: reserveForce,
      cardId: 'military-reserve-force',
    }));
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'reserve_force_bind_target',
      playerId: 'B',
      sourceActionInstanceId: reserveForce,
    });
    expect(state.turnState?.actionsTaken.opening).toBe(1);

    state = reduceV070TurnAction(state, {
      type: 'choose_reserve_force_bind_target',
      playerId: 'B',
      targetInstanceId: tactic,
    });

    expect(v070BindingsForHost(state, reserveForce)).toEqual([
      expect.objectContaining({
        cardInstanceId: tactic,
        purpose: 'Reserve Force',
      }),
    ]);
    expect(state.pendingActionCard).toBeNull();
  });

  test('a candidate that stops being legal remains rejected without consuming the Conscription choice', () => {
    let state = openingForMilitaryB();
    state.players.B.zones.hand = [];
    state.players.B.zones.drawPile = [];

    const source = inject(
      state,
      'neutral-conscription',
      'hand',
      'source',
    );
    const highCommand = inject(
      state,
      'military-high-command',
      'hand',
      'high-command',
    );
    inject(
      state,
      'neutral-rallying-cry',
      'drawPile',
      'drawn',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const index = state.players.B.zones.hand.indexOf(highCommand);
    state.players.B.zones.hand.splice(index, 1);
    state.players.B.zones.discardPile.push(highCommand);

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_conscription_banking_action',
      playerId: 'B',
      targetInstanceId: highCommand,
    })).toThrow(/currently legal Hand card/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'conscription_banking_action',
      sourceActionInstanceId: source,
    }));
    expect(state.pendingActionCard).toEqual(expect.objectContaining({
      instanceId: source,
    }));
  });

  test('candidate card identities are private while the public event exposes only the count', () => {
    let state = openingForMilitaryB();
    state.players.B.zones.hand = [];
    state.players.B.zones.drawPile = [];

    const source = inject(
      state,
      'neutral-conscription',
      'hand',
      'source',
    );
    const highCommand = inject(
      state,
      'military-high-command',
      'hand',
      'high-command',
    );
    inject(
      state,
      'neutral-rallying-cry',
      'drawPile',
      'drawn',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const publicChoice = [...state.events].reverse().find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { kind?: string })?.kind ===
        'conscription_banking_action'
    );
    expect(publicChoice?.visibility).toBe('public');
    expect(publicChoice?.payload).toEqual(expect.objectContaining({
      candidateCount: 1,
    }));
    expect(publicChoice?.payload).not.toHaveProperty('targetInstanceIds');

    const privateOptions = [...state.events].reverse().find(event =>
      event.type === 'action_effect_choice_options'
      && (event.payload as { kind?: string })?.kind ===
        'conscription_banking_action'
    );
    expect(privateOptions?.visibility).toBe('B');
    expect(
      (privateOptions?.payload as { targetInstanceIds?: string[] })
        ?.targetInstanceIds,
    ).toEqual([highCommand]);
  });
});
