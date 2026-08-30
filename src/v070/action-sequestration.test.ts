import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';

const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'sequestration',
    seed: 'sequestration-seed',
    players: {
      A: { name: 'A', starterDeckId: militaryStarter },
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
  owner: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'assetBank',
  suffix: string,
): string {
  const instanceId = `sequestration-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

describe('v0.7.0 Sequestration Action', () => {
  test('collects both keep choices before discarding either player’s Assets', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'neutral-sequestration',
      'hand',
      'source',
    );
    const aKeep = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'a-keep',
    );
    const aDiscard = inject(
      state,
      'A',
      'neutral-fortifications',
      'assetBank',
      'a-discard',
    );
    const bKeep = inject(
      state,
      'B',
      'neutral-counterintelligence',
      'assetBank',
      'b-keep',
    );
    const bDiscard = inject(
      state,
      'B',
      'neutral-fortifications',
      'assetBank',
      'b-discard',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'sequestration_keep_asset',
      playerId: 'A',
      sourceActionInstanceId: source,
    }));

    state = reduceV070TurnAction(state, {
      type: 'choose_sequestration_keep_asset',
      playerId: 'A',
      targetInstanceId: aKeep,
    });

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'sequestration_keep_asset',
      playerId: 'B',
      sourceActionInstanceId: source,
      keepers: expect.objectContaining({ A: aKeep }),
    }));
    expect(state.players.A.zones.assetBank).toEqual(
      expect.arrayContaining([aKeep, aDiscard]),
    );
    expect(state.players.B.zones.assetBank).toEqual(
      expect.arrayContaining([bKeep, bDiscard]),
    );

    state = reduceV070TurnAction(state, {
      type: 'choose_sequestration_keep_asset',
      playerId: 'B',
      targetInstanceId: bKeep,
    });

    expect(state.players.A.zones.assetBank).toEqual([aKeep]);
    expect(state.players.B.zones.assetBank).toEqual([bKeep]);
    expect(state.players.A.zones.discardPile).toContain(aDiscard);
    expect(state.players.B.zones.discardPile).toContain(bDiscard);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
  });

  test('Extraordinary Rendition cannot be kept when another Asset must be discarded', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'neutral-sequestration',
      'hand',
      'source',
    );
    const rendition = inject(
      state,
      'A',
      'intelligence-extraordinary-rendition',
      'assetBank',
      'rendition',
    );
    const other = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'other',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.players.A.zones.assetBank).toEqual([other]);
    expect(state.players.A.zones.discardPile).toContain(rendition);
    expect(state.events.some(event =>
      event.type === 'sequestration_asset_kept'
      && (event.payload as { instanceId?: string })?.instanceId === other
    )).toBe(true);
  });

  test('forced Sequestration discard bypasses Armistice voluntary-discard protection without causing Removal', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'neutral-sequestration',
      'hand',
      'source',
    );
    const armistice = inject(
      state,
      'A',
      'neutral-armistice',
      'assetBank',
      'armistice',
    );
    const keep = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'keep',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_sequestration_keep_asset',
      playerId: 'A',
      targetInstanceId: keep,
    });

    expect(state.players.A.zones.assetBank).toEqual([keep]);
    expect(state.players.A.zones.discardPile).toContain(armistice);
    expect(state.events.some(event =>
      event.type === 'asset_discarded'
      && (event.payload as {
        instanceId?: string;
        removed?: boolean;
        reason?: string;
      })?.instanceId === armistice
      && (event.payload as { removed?: boolean })?.removed === false
      && (event.payload as { reason?: string })?.reason === 'Sequestration'
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'asset_removed'
      && (event.payload as { instanceId?: string })?.instanceId === armistice
    )).toBe(false);
  });

  test('an invalid keep target leaves Sequestration pending', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'neutral-sequestration',
      'hand',
      'source',
    );
    const first = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'first',
    );
    const second = inject(
      state,
      'A',
      'neutral-fortifications',
      'assetBank',
      'second',
    );
    const invalid = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'hand',
      'invalid',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_sequestration_keep_asset',
      playerId: 'A',
      targetInstanceId: invalid,
    })).toThrow(/must keep one currently legal Asset/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'sequestration_keep_asset',
      playerId: 'A',
    }));
    expect(state.players.A.zones.assetBank).toEqual(
      expect.arrayContaining([first, second]),
    );
  });

  test('with zero or one Asset per player, Sequestration resolves without unnecessary choices', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'neutral-sequestration',
      'hand',
      'source',
    );
    const lone = inject(
      state,
      'B',
      'neutral-counterintelligence',
      'assetBank',
      'lone',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.players.B.zones.assetBank).toEqual([lone]);
    expect(state.players.A.zones.discardPile).toContain(source);
  });
});
