import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  assertV070ForcedAssetChoicesSupported,
  discardV070AssetVoluntarily,
  removeV070AssetForced,
  replaceableV070AssetInstanceIds,
  voluntarilyDiscardableV070AssetInstanceIds,
} from './assets';
import { v070BindingsForHost } from './bindings';
import { viewV070GameForPlayer } from './views';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'reserve-force-rendition',
    seed: 'reserve-force-rendition-seed',
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
  owner: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'assetBank' | 'discardPile',
  suffix: string,
): string {
  const instanceId = `test-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

describe('v0.7.0 Reserve Force Action', () => {
  test('requires another Tactic-eligible card before spending the Action', () => {
    const state = openingForB();
    state.players.B.zones.hand = [];
    const source = inject(
      state,
      'B',
      'military-reserve-force',
      'hand',
      'source',
    );
    inject(state, 'B', 'neutral-rallying-cry', 'hand', 'ineligible');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires another Tactic-eligible card/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('banks, then binds one Tactic-eligible Hand card face down', () => {
    let state = openingForB();
    const source = inject(
      state,
      'B',
      'military-reserve-force',
      'hand',
      'source',
    );
    const tactic = inject(
      state,
      'B',
      'neutral-advance-guard',
      'hand',
      'tactic',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.assetBank).toContain(source);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'reserve_force_bind_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_reserve_force_bind_target',
      playerId: 'B',
      targetInstanceId: tactic,
    });

    expect(state.players.B.zones.hand).not.toContain(tactic);
    expect(v070BindingsForHost(state, source)).toEqual([
      expect.objectContaining({
        cardInstanceId: tactic,
        owner: 'B',
        faceUp: false,
        purpose: 'Reserve Force',
      }),
    ]);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();

    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');
    expect(aView.bindings[0]).not.toHaveProperty('card');
    expect(bView.bindings[0]?.card?.instanceId).toBe(tactic);
  });

  test('when Reserve Force leaves play, its bound Tactic goes to its owner Graveyard', () => {
    let state = openingForB();
    const source = inject(
      state,
      'B',
      'military-reserve-force',
      'hand',
      'source',
    );
    const tactic = inject(
      state,
      'B',
      'neutral-advance-guard',
      'hand',
      'tactic',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_reserve_force_bind_target',
      playerId: 'B',
      targetInstanceId: tactic,
    });

    discardV070AssetVoluntarily(state, 'B', source, 'test departure');

    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.B.zones.graveyard).toContain(tactic);
    expect(v070BindingsForHost(state, source)).toHaveLength(0);
  });

  test('forced Reserve Force removal is supported and preserves its Graveyard override', () => {
    let state = openingForB();
    const source = inject(
      state,
      'B',
      'military-reserve-force',
      'hand',
      'source',
    );
    const tactic = inject(
      state,
      'B',
      'neutral-advance-guard',
      'hand',
      'tactic',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_reserve_force_bind_target',
      playerId: 'B',
      targetInstanceId: tactic,
    });

    expect(() => assertV070ForcedAssetChoicesSupported(state, 'B')).not.toThrow();
    removeV070AssetForced(state, 'B', source, 'discard', 'test forced removal');

    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.B.zones.graveyard).toContain(tactic);
  });
});

describe('v0.7.0 Extraordinary Rendition Action', () => {
  test('banks, reveals the opponent Hand, and binds the chosen opposing card face up', () => {
    let state = openingForB();
    const source = inject(
      state,
      'B',
      'intelligence-extraordinary-rendition',
      'hand',
      'source',
    );
    const target = state.players.A.zones.hand[0];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.assetBank).toContain(source);
    const reveal = state.events.find(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Extraordinary Rendition'
    );
    expect(reveal?.visibility).toBe('public');
    expect((reveal?.payload as { instanceIds?: string[] })?.instanceIds)
      .toEqual(expect.arrayContaining(state.players.A.zones.hand));

    state = reduceV070TurnAction(state, {
      type: 'choose_extraordinary_rendition_bind_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(state.players.A.zones.hand).not.toContain(target);
    expect(v070BindingsForHost(state, source)).toEqual([
      expect.objectContaining({
        cardInstanceId: target,
        owner: 'A',
        faceUp: true,
        purpose: 'Extraordinary Rendition',
      }),
    ]);

    for (const viewer of ['A', 'B'] as const) {
      expect(viewV070GameForPlayer(state, viewer).bindings[0]?.card?.instanceId)
        .toBe(target);
    }
  });

  test('Rendition is the only voluntary discard or replacement while it remains banked', () => {
    let state = openingForB();
    const other = inject(
      state,
      'B',
      'neutral-counterintelligence',
      'assetBank',
      'other',
    );
    const source = inject(
      state,
      'B',
      'intelligence-extraordinary-rendition',
      'hand',
      'source',
    );
    const target = state.players.A.zones.hand[0];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_extraordinary_rendition_bind_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'B')).toEqual([source]);
    expect(replaceableV070AssetInstanceIds(state, 'B')).toEqual([source]);
    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'B')).not.toContain(other);
  });

  test('when Rendition leaves play, its opposing bound card goes to that owner Discard Pile', () => {
    let state = openingForB();
    const source = inject(
      state,
      'B',
      'intelligence-extraordinary-rendition',
      'hand',
      'source',
    );
    const target = state.players.A.zones.hand[0];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_extraordinary_rendition_bind_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    discardV070AssetVoluntarily(state, 'B', source, 'test departure');

    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.A.zones.discardPile).toContain(target);
    expect(state.players.A.zones.hand).not.toContain(target);
    expect(v070BindingsForHost(state, source)).toHaveLength(0);
  });

  test('forced Rendition removal is supported and releases its bound card by the shared default', () => {
    let state = openingForB();
    const source = inject(
      state,
      'B',
      'intelligence-extraordinary-rendition',
      'hand',
      'source',
    );
    const target = state.players.A.zones.hand[0];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_extraordinary_rendition_bind_target',
      playerId: 'B',
      targetInstanceId: target,
    });

    expect(() => assertV070ForcedAssetChoicesSupported(state, 'B')).not.toThrow();
    removeV070AssetForced(state, 'B', source, 'graveyard', 'test forced removal');

    expect(state.players.B.zones.graveyard).toContain(source);
    expect(state.players.A.zones.discardPile).toContain(target);
  });
});
