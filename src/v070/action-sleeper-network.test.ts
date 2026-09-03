import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { v070BindingsForHost } from './bindings';
import {
  removeV070AssetForced,
} from './assets';
import { viewV070GameForPlayer } from './views';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const intelligenceStarter = 'intelligence-spymaster-mission-network';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'sleeper-network-action',
    seed: 'sleeper-network-action-seed',
    players: {
      A: { name: 'A', starterDeckId: diplomatStarter },
      B: { name: 'B', starterDeckId: intelligenceStarter },
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

function inject(
  state: V070GameState,
  cardId: string,
  zone: 'hand' | 'assetBank',
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

describe('v0.7.0 Sleeper Network Action', () => {
  test('requires one other Hand card before spending the Action', () => {
    const state = openingForB();
    state.players.B.zones.hand = [];
    const source = inject(
      state,
      'intelligence-sleeper-network',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires one other card in your Hand/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('banks and binds one chosen Hand card face down', () => {
    let state = openingForB();
    const source = inject(
      state,
      'intelligence-sleeper-network',
      'hand',
      'source',
    );
    const bound = inject(
      state,
      'neutral-rallying-cry',
      'hand',
      'bound',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.assetBank).toContain(source);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'sleeper_network_bind_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_sleeper_network_bind_target',
      playerId: 'B',
      targetInstanceId: bound,
    });

    expect(state.players.B.zones.hand).not.toContain(bound);
    expect(v070BindingsForHost(state, source)).toEqual([
      expect.objectContaining({
        cardInstanceId: bound,
        owner: 'B',
        faceUp: false,
        purpose: 'Sleeper Network',
      }),
    ]);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.players.B.zones.discardPile).not.toContain(source);

    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');
    const aBinding = aView.bindings.find(binding => binding.hostId === source);
    const bBinding = bView.bindings.find(binding => binding.hostId === source);
    expect(aBinding).not.toHaveProperty('card');
    expect(bBinding?.card?.instanceId).toBe(bound);
  });

  test('binding target is revalidated after the Asset is banked', () => {
    let state = openingForB();
    const source = inject(
      state,
      'intelligence-sleeper-network',
      'hand',
      'source',
    );
    const bound = inject(
      state,
      'neutral-rallying-cry',
      'hand',
      'bound',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const index = state.players.B.zones.hand.indexOf(bound);
    state.players.B.zones.hand.splice(index, 1);
    state.players.B.zones.discardPile.push(bound);

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_sleeper_network_bind_target',
      playerId: 'B',
      targetInstanceId: bound,
    })).toThrow(/still in your Hand/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'sleeper_network_bind_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
  });

  test('banking at the Asset limit uses the shared replacement choice first', () => {
    let state = openingForB();
    inject(state, 'neutral-counterintelligence', 'assetBank', 'replace');
    inject(state, 'neutral-fortifications', 'assetBank', 'keep-1');
    inject(state, 'neutral-fealty', 'assetBank', 'keep-2');
    const source = inject(
      state,
      'intelligence-sleeper-network',
      'hand',
      'source',
    );
    const bound = inject(
      state,
      'neutral-rallying-cry',
      'hand',
      'bound',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'pending_asset_bank_replacement',
      playerId: 'B',
      sourceActionInstanceId: source,
      purpose: 'Sleeper Network',
    }));

    const replacement = (
      state.pendingActionEffectChoice as {
        replacementInstanceIds: string[];
      }
    ).replacementInstanceIds[0];

    state = reduceV070TurnAction(state, {
      type: 'choose_pending_asset_bank_replacement',
      playerId: 'B',
      replaceAssetInstanceId: replacement,
    });

    expect(state.players.B.zones.assetBank).toContain(source);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'sleeper_network_bind_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_sleeper_network_bind_target',
      playerId: 'B',
      targetInstanceId: bound,
    });
    expect(v070BindingsForHost(state, source)).toHaveLength(1);
  });

  test('offers one optional face-down binding at the end of each later turn up to Territory capacity', () => {
    let state = openingForB();
    const source = inject(
      state,
      'intelligence-sleeper-network',
      'hand',
      'source',
    );
    const initialBound = inject(
      state,
      'neutral-rallying-cry',
      'hand',
      'initial-bound',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_sleeper_network_bind_target',
      playerId: 'B',
      targetInstanceId: initialBound,
    });

    state.turnNumber += 2;
    state.turnState!.phase = 'denouement';
    const laterBound = inject(
      state,
      'neutral-pathfinders',
      'hand',
      'later-bound',
    );

    state = reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId: 'B',
    });

    expect(state.pendingSleeperNetworkChoice).toEqual({
      kind: 'end_turn_bind',
      playerId: 'B',
      hostInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_sleeper_network_end_turn_bind',
      playerId: 'B',
      targetInstanceId: laterBound,
    });

    expect(v070BindingsForHost(state, source)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardInstanceId: initialBound,
          faceUp: false,
        }),
        expect.objectContaining({
          cardInstanceId: laterBound,
          faceUp: false,
        }),
      ]),
    );
    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(
      opponentView.bindings
        .filter(binding => binding.hostId === source)
        .every(binding => !('card' in binding)),
    ).toBe(true);
  });

  test('normal activation reveals the network and plays every currently legal bound Action without spending more Actions', () => {
    let state = openingForB();
    const source = inject(
      state,
      'intelligence-sleeper-network',
      'hand',
      'source',
    );
    const bound = inject(
      state,
      'neutral-rallying-cry',
      'hand',
      'bound',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_sleeper_network_bind_target',
      playerId: 'B',
      targetInstanceId: bound,
    });

    state.turnState!.actionsAvailable = 1;
    state = reduceV070TurnAction(state, {
      type: 'use_sleeper_network_asset',
      playerId: 'B',
      assetInstanceId: source,
    });

    expect(state.players.B.zones.graveyard).toContain(source);
    expect(state.pendingSleeperNetworkChoice).toMatchObject({
      kind: 'bound_action_queue',
      playerId: 'B',
      hostInstanceId: source,
      mode: 'activate',
      playedCount: 0,
    });
    expect(viewV070GameForPlayer(state, 'A').bindings).toEqual([
      expect.objectContaining({
        hostId: source,
        faceUp: true,
        card: {
          instanceId: bound,
          cardId: 'neutral-rallying-cry',
        },
      }),
    ]);

    state = reduceV070TurnAction(state, {
      type: 'resolve_sleeper_network_bound_action',
      playerId: 'B',
      targetInstanceId: bound,
    });

    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.players.B.zones.discardPile).toContain(bound);
    expect(state.pendingSleeperNetworkChoice).toBeNull();
    expect(v070BindingsForHost(state, source)).toEqual([]);
  });

  test('forced Removal reveals bound cards and immediately plays exactly one legal Action outside the normal Action phases', () => {
    let state = openingForB();
    const source = inject(
      state,
      'intelligence-sleeper-network',
      'hand',
      'source',
    );
    const bound = inject(
      state,
      'neutral-rallying-cry',
      'hand',
      'bound',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_sleeper_network_bind_target',
      playerId: 'B',
      targetInstanceId: bound,
    });

    state.turnState!.phase = 'capture';
    removeV070AssetForced(
      state,
      'B',
      source,
      'discard',
      'test forced Removal',
    );

    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingSleeperNetworkChoice).toMatchObject({
      kind: 'bound_action_queue',
      mode: 'removed',
      playedCount: 0,
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_sleeper_network_bound_action',
      playerId: 'B',
      targetInstanceId: bound,
    });

    expect(state.players.B.zones.discardPile).toContain(bound);
    expect(state.pendingSleeperNetworkChoice).toBeNull();
    expect(v070BindingsForHost(state, source)).toEqual([]);
  });
});
