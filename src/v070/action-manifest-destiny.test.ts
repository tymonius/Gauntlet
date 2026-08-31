import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { effectiveV070AssetLimit } from './assets';
import { reduceV070TurnAction } from './turn-engine';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'manifest-destiny-action',
    seed: 'manifest-destiny-action-seed',
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

describe('v0.7.0 Manifest Destiny Action', () => {
  test('rejects the Action before spending it without at least one removable Asset', () => {
    const state = openingForB();
    state.players.B.zones.hand = [];
    const source = inject(
      state,
      'neutral-manifest-destiny',
      'hand',
      'source',
    );
    inject(state, 'neutral-rallying-cry', 'hand', 'one');
    inject(state, 'neutral-forced-march', 'hand', 'two');
    inject(state, 'neutral-fealty', 'hand', 'three');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one Asset/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('rejects the Action before spending it when fewer than three other cards can be sacrificed', () => {
    const state = openingForB();
    state.players.B.zones.hand = [];
    const source = inject(
      state,
      'neutral-manifest-destiny',
      'hand',
      'source',
    );
    inject(state, 'neutral-rallying-cry', 'hand', 'only-hand');
    inject(state, 'neutral-fealty', 'assetBank', 'only-asset');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/at least three other cards/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('sacrifices all other Hand cards plus selected Assets, then makes the physical card a blank Territory at the player end', () => {
    let state = openingForB();
    state.players.B.zones.hand = [];
    const source = inject(
      state,
      'neutral-manifest-destiny',
      'hand',
      'source',
    );
    const handOne = inject(
      state,
      'neutral-rallying-cry',
      'hand',
      'hand-one',
    );
    const handTwo = inject(
      state,
      'neutral-forced-march',
      'hand',
      'hand-two',
    );
    const asset = inject(
      state,
      'neutral-fealty',
      'assetBank',
      'asset',
    );
    const boardBefore = state.board.length;
    const deedCountBefore = state.deeds.length;
    const assetLimitBefore = effectiveV070AssetLimit(state, 'B');
    const bPositionBefore = state.players.B.position;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'manifest_destiny_sacrifice',
      playerId: 'B',
      sourceActionInstanceId: source,
      minimumAssetCount: 1,
      candidateAssetInstanceIds: expect.arrayContaining([asset]),
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_manifest_destiny_sacrifice',
      playerId: 'B',
      assetInstanceIds: [asset],
    });

    expect(state.players.B.zones.hand).not.toContain(handOne);
    expect(state.players.B.zones.hand).not.toContain(handTwo);
    expect(state.players.B.zones.assetBank).not.toContain(asset);
    expect(state.players.B.zones.graveyard).toEqual(
      expect.arrayContaining([handOne, handTwo, asset]),
    );

    expect(state.board).toHaveLength(boardBefore + 1);
    const inserted = state.board.at(-1)!;
    expect(inserted).toEqual(expect.objectContaining({
      territoryInstanceId: source,
      territoryId: 'neutral-manifest-destiny',
      position: boardBefore,
      contributedBy: 'B',
      controller: 'B',
      occupant: null,
      blank: true,
    }));
    expect(state.deeds).toHaveLength(deedCountBefore + 1);
    expect(state.deeds).toContainEqual({
      territoryInstanceId: source,
      owner: null,
    });
    expect(effectiveV070AssetLimit(state, 'B')).toBe(assetLimitBefore + 1);
    expect(state.players.B.position).toBe(bPositionBefore);

    expect(state.players.B.zones.discardPile).not.toContain(source);
    expect(state.players.B.zones.graveyard).not.toContain(source);
    expect(state.players.B.zones.assetBank).not.toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.events.some(event =>
      event.type === 'action_card_resolved'
      && (event.payload as { instanceId?: string; destination?: string })
        ?.instanceId === source
      && (event.payload as { destination?: string })?.destination ===
        'territory'
    )).toBe(true);
  });

  test('with an empty other Hand, exactly three selected Assets satisfy the minimum-three sacrifice', () => {
    let state = openingForB();
    state.players.B.zones.hand = [];
    state.players.B.zones.assetBank = [];
    const source = inject(
      state,
      'neutral-manifest-destiny',
      'hand',
      'source',
    );
    const a = inject(state, 'neutral-fealty', 'assetBank', 'a');
    const b = inject(state, 'neutral-counterintelligence', 'assetBank', 'b');
    const c = inject(state, 'neutral-fortifications', 'assetBank', 'c');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'manifest_destiny_sacrifice',
      minimumAssetCount: 3,
    }));

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_manifest_destiny_sacrifice',
      playerId: 'B',
      assetInstanceIds: [a, b],
    })).toThrow(/requires at least 3 selected Assets/);

    state = reduceV070TurnAction(state, {
      type: 'resolve_manifest_destiny_sacrifice',
      playerId: 'B',
      assetInstanceIds: [a, b, c],
    });

    expect(state.board.at(-1)?.territoryInstanceId).toBe(source);
    expect(state.players.B.zones.graveyard).toEqual(
      expect.arrayContaining([a, b, c]),
    );
  });

  test('duplicate or stale Asset selections are rejected without consuming the pending choice', () => {
    let state = openingForB();
    state.players.B.zones.hand = [];
    state.players.B.zones.assetBank = [];
    const source = inject(
      state,
      'neutral-manifest-destiny',
      'hand',
      'source',
    );
    inject(state, 'neutral-rallying-cry', 'hand', 'one');
    inject(state, 'neutral-forced-march', 'hand', 'two');
    const asset = inject(state, 'neutral-fealty', 'assetBank', 'asset');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_manifest_destiny_sacrifice',
      playerId: 'B',
      assetInstanceIds: [asset, asset],
    })).toThrow(/same Asset twice/);

    const index = state.players.B.zones.assetBank.indexOf(asset);
    state.players.B.zones.assetBank.splice(index, 1);
    state.players.B.zones.discardPile.push(asset);

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_manifest_destiny_sacrifice',
      playerId: 'B',
      assetInstanceIds: [asset],
    })).toThrow(/currently leave play/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'manifest_destiny_sacrifice',
      sourceActionInstanceId: source,
    }));
  });

});
