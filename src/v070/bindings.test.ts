import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  type V070GameState,
} from './engine';
import {
  bindV070CardFromPlayerZone,
  isV070CardBound,
  releaseV070BoundCards,
  v070BindingsForHost,
} from './bindings';
import { viewV070GameForPlayer } from './views';

function game(): V070GameState {
  return createV070StarterGame({
    gameId: 'bindings-core',
    seed: 'bindings-core-seed',
    players: {
      A: {
        name: 'A',
        starterDeckId: 'diplomats-ambassador-open-channels',
      },
      B: {
        name: 'B',
        starterDeckId: 'military-commandant-holdfast',
      },
    },
  });
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  zone: 'hand' | 'discardPile' | 'graveyard',
  suffix: string,
): string {
  const instanceId = `binding-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: 'neutral-rallying-cry',
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

describe('v0.7.0 bound-card core', () => {
  test('binding sequence numbers remain monotonic after release', () => {
    const state = game();
    const first = inject(state, 'A', 'hand', 'sequence-first');
    const second = inject(state, 'A', 'hand', 'sequence-second');

    const initial = bindV070CardFromPlayerZone(state, {
      hostId: 'sequence-host-1',
      owner: 'A',
      cardInstanceId: first,
      sourceZone: 'hand',
      faceUp: false,
      purpose: 'sequence test',
    });
    releaseV070BoundCards(
      state,
      'sequence-host-1',
      'discard',
      'sequence release',
    );
    const rebound = bindV070CardFromPlayerZone(state, {
      hostId: 'sequence-host-2',
      owner: 'A',
      cardInstanceId: second,
      sourceZone: 'hand',
      faceUp: false,
      purpose: 'sequence test',
    });

    expect(rebound.sequence).toBeGreaterThan(initial.sequence);
    expect(state.nextBindingSequence).toBe(rebound.sequence + 1);
  });

  test('binding removes a card from its normal zone and records stable host order', () => {
    const state = game();
    const first = inject(state, 'A', 'hand', 'first');
    const second = inject(state, 'A', 'discardPile', 'second');

    const a = bindV070CardFromPlayerZone(state, {
      hostId: 'host-1',
      owner: 'A',
      cardInstanceId: first,
      sourceZone: 'hand',
      faceUp: false,
      purpose: 'test binding',
    });
    const b = bindV070CardFromPlayerZone(state, {
      hostId: 'host-1',
      owner: 'A',
      cardInstanceId: second,
      sourceZone: 'discardPile',
      faceUp: true,
      purpose: 'test binding',
    });

    expect(state.players.A.zones.hand).not.toContain(first);
    expect(state.players.A.zones.discardPile).not.toContain(second);
    expect(isV070CardBound(state, first)).toBe(true);
    expect(isV070CardBound(state, second)).toBe(true);
    expect(a.sequence).toBeLessThan(b.sequence);
    expect(v070BindingsForHost(state, 'host-1').map(x => x.cardInstanceId))
      .toEqual([first, second]);
  });

  test('a card cannot be bound twice or from a zone it no longer occupies', () => {
    const state = game();
    const card = inject(state, 'A', 'hand', 'duplicate');

    bindV070CardFromPlayerZone(state, {
      hostId: 'host-1',
      owner: 'A',
      cardInstanceId: card,
      sourceZone: 'hand',
      faceUp: false,
      purpose: 'first binding',
    });

    expect(() => bindV070CardFromPlayerZone(state, {
      hostId: 'host-2',
      owner: 'A',
      cardInstanceId: card,
      sourceZone: 'hand',
      faceUp: true,
      purpose: 'second binding',
    })).toThrow(/already bound/);

    const other = inject(state, 'A', 'graveyard', 'wrong-zone');
    expect(() => bindV070CardFromPlayerZone(state, {
      hostId: 'host-3',
      owner: 'A',
      cardInstanceId: other,
      sourceZone: 'hand',
      faceUp: true,
      purpose: 'wrong zone',
    })).toThrow(/not in its owner’s hand/);
  });

  test('face-up bound identities are public while face-down identities are owner-only', () => {
    const state = game();
    const hidden = inject(state, 'A', 'hand', 'hidden');
    const publicCard = inject(state, 'B', 'graveyard', 'public');

    bindV070CardFromPlayerZone(state, {
      hostId: 'hidden-host',
      owner: 'A',
      cardInstanceId: hidden,
      sourceZone: 'hand',
      faceUp: false,
      purpose: 'hidden binding',
    });
    bindV070CardFromPlayerZone(state, {
      hostId: 'public-host',
      owner: 'B',
      cardInstanceId: publicCard,
      sourceZone: 'graveyard',
      faceUp: true,
      purpose: 'public binding',
    });

    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');

    expect(aView.bindings.find(binding => binding.hostId === 'hidden-host'))
      .toEqual(expect.objectContaining({
        hostId: 'hidden-host',
        owner: 'A',
        faceUp: false,
        card: {
          instanceId: hidden,
          cardId: 'neutral-rallying-cry',
        },
      }));
    expect(bView.bindings.find(binding => binding.hostId === 'hidden-host'))
      .toEqual(expect.objectContaining({
        hostId: 'hidden-host',
        owner: 'A',
        faceUp: false,
      }));
    expect(bView.bindings.find(binding => binding.hostId === 'hidden-host'))
      .not.toHaveProperty('card');

    for (const view of [aView, bView]) {
      expect(view.bindings.find(binding => binding.hostId === 'public-host'))
        .toEqual(expect.objectContaining({
          faceUp: true,
          card: {
            instanceId: publicCard,
            cardId: 'neutral-rallying-cry',
          },
        }));
    }

    const publicHiddenEvent = bView.events.find(event =>
      event.type === 'card_bound'
      && (event.payload as { hostId?: string })?.hostId === 'hidden-host'
    );
    expect(publicHiddenEvent?.payload).not.toHaveProperty('cardInstanceId');
    expect(bView.events.some(event =>
      event.type === 'bound_card_identity'
      && (event.payload as { hostId?: string })?.hostId === 'hidden-host'
    )).toBe(false);
    expect(aView.events.some(event =>
      event.type === 'bound_card_identity'
      && (event.payload as { cardInstanceId?: string })?.cardInstanceId === hidden
    )).toBe(true);
  });

  test('release moves every host-bound card to the instructed public zone in binding order', () => {
    const state = game();
    const first = inject(state, 'A', 'hand', 'release-first');
    const second = inject(state, 'B', 'discardPile', 'release-second');

    bindV070CardFromPlayerZone(state, {
      hostId: 'host-release',
      owner: 'A',
      cardInstanceId: first,
      sourceZone: 'hand',
      faceUp: false,
      purpose: 'release test',
    });
    bindV070CardFromPlayerZone(state, {
      hostId: 'host-release',
      owner: 'B',
      cardInstanceId: second,
      sourceZone: 'discardPile',
      faceUp: true,
      purpose: 'release test',
    });

    expect(releaseV070BoundCards(
      state,
      'host-release',
      'graveyard',
      'host left play',
    )).toEqual([first, second]);

    expect(state.bindings).toHaveLength(0);
    expect(state.players.A.zones.graveyard).toContain(first);
    expect(state.players.B.zones.graveyard).toContain(second);

    const releases = state.events.filter(event =>
      event.type === 'bound_card_released'
      && (event.payload as { hostId?: string })?.hostId === 'host-release'
    );
    expect(releases).toHaveLength(2);
    expect(releases.every(event =>
      (event.payload as { cardInstanceId?: string })?.cardInstanceId
    )).toBe(true);
  });

  test('a face-down card released to Hand keeps its identity private', () => {
    const state = game();
    const card = inject(state, 'A', 'graveyard', 'return-hidden');

    bindV070CardFromPlayerZone(state, {
      hostId: 'return-host',
      owner: 'A',
      cardInstanceId: card,
      sourceZone: 'graveyard',
      faceUp: false,
      purpose: 'private return',
    });
    releaseV070BoundCards(
      state,
      'return-host',
      'hand',
      'private return',
    );

    expect(state.players.A.zones.hand).toContain(card);

    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');
    const publicRelease = bView.events.find(event =>
      event.type === 'bound_card_released'
      && (event.payload as { hostId?: string })?.hostId === 'return-host'
    );

    expect(publicRelease?.payload).not.toHaveProperty('cardInstanceId');
    expect(aView.events.some(event =>
      event.type === 'bound_card_release_identity'
      && (event.payload as { cardInstanceId?: string })?.cardInstanceId === card
    )).toBe(true);
    expect(bView.events.some(event =>
      event.type === 'bound_card_release_identity'
    )).toBe(false);
  });
});
