import {
  V070GameActionError,
  appendV070Event,
  type V070Binding,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export type V070BindablePlayerZone =
  | 'hand'
  | 'discardPile'
  | 'graveyard'
  | 'treasury';
export type V070BindingReleaseDestination = 'discard' | 'graveyard' | 'hand';

export interface BindV070CardFromPlayerZoneInput {
  hostId: string;
  owner: PlayerId;
  cardInstanceId: string;
  sourceZone: V070BindablePlayerZone;
  faceUp: boolean;
  purpose: string;
}

export function v070BindingsForHost(
  state: V070GameState,
  hostId: string,
): V070Binding[] {
  return state.bindings
    .filter(binding => binding.hostId === hostId)
    .sort((a, b) => a.sequence - b.sequence)
    .map(binding => structuredClone(binding));
}

export function isV070CardBound(
  state: V070GameState,
  cardInstanceId: string,
): boolean {
  return state.bindings.some(binding =>
    binding.cardInstanceId === cardInstanceId
  );
}

export function bindV070CardFromPlayerZone(
  state: V070GameState,
  input: BindV070CardFromPlayerZoneInput,
): V070Binding {
  if (!input.hostId.trim()) {
    throw new V070GameActionError('A bound card requires a host.');
  }
  if (!input.purpose.trim()) {
    throw new V070GameActionError('A bound card requires a binding purpose.');
  }
  if (isV070CardBound(state, input.cardInstanceId)) {
    throw new V070GameActionError('That card is already bound.');
  }

  const instance = state.cardInstances[input.cardInstanceId];
  if (!instance || instance.owner !== input.owner) {
    throw new V070GameActionError(
      'A bound card must be a known card owned by the stated player.',
    );
  }

  const zone = input.sourceZone === 'treasury'
    ? state.players[input.owner].financiers?.treasury
    : state.players[input.owner].zones[input.sourceZone];
  if (!zone) {
    throw new V070GameActionError(
      'Treasury-sourced binding requires the card owner to be a Financier.',
    );
  }
  const index = zone.indexOf(input.cardInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      `The card to bind is not in its owner’s ${input.sourceZone}.`,
    );
  }

  zone.splice(index, 1);
  const binding: V070Binding = {
    hostId: input.hostId,
    cardInstanceId: input.cardInstanceId,
    owner: input.owner,
    faceUp: input.faceUp,
    purpose: input.purpose,
    sequence: state.nextBindingSequence,
  };
  state.nextBindingSequence += 1;
  state.bindings.push(binding);

  appendV070Event(state, {
    type: 'card_bound',
    actor: input.owner,
    visibility: 'public',
    payload: {
      hostId: input.hostId,
      owner: input.owner,
      faceUp: input.faceUp,
      purpose: input.purpose,
      sequence: binding.sequence,
      ...(input.faceUp
        ? {
            cardInstanceId: input.cardInstanceId,
            cardId: instance.cardId,
          }
        : {}),
    },
  });

  if (!input.faceUp) {
    appendV070Event(state, {
      type: 'bound_card_identity',
      actor: input.owner,
      visibility: input.owner,
      payload: {
        hostId: input.hostId,
        cardInstanceId: input.cardInstanceId,
        cardId: instance.cardId,
        purpose: input.purpose,
        sequence: binding.sequence,
      },
    });
  }

  return structuredClone(binding);
}

export function releaseV070BoundCards(
  state: V070GameState,
  hostId: string,
  destination: V070BindingReleaseDestination,
  purpose: string,
): string[] {
  const bindings = v070BindingsForHost(state, hostId);
  if (bindings.length === 0) return [];

  const released = new Set(bindings.map(binding => binding.cardInstanceId));
  state.bindings = state.bindings.filter(binding =>
    !released.has(binding.cardInstanceId)
  );

  for (const binding of bindings) {
    const player = state.players[binding.owner];
    if (destination === 'discard') {
      player.zones.discardPile.push(binding.cardInstanceId);
    } else if (destination === 'graveyard') {
      player.zones.graveyard.push(binding.cardInstanceId);
    } else {
      player.zones.hand.push(binding.cardInstanceId);
    }

    const instance = state.cardInstances[binding.cardInstanceId];
    if (!instance) {
      throw new V070GameActionError(
        `Unknown bound card instance ${binding.cardInstanceId}.`,
      );
    }

    const identityIsPublic = destination !== 'hand' || binding.faceUp;
    appendV070Event(state, {
      type: 'bound_card_released',
      actor: binding.owner,
      visibility: 'public',
      payload: {
        hostId,
        owner: binding.owner,
        destination,
        purpose,
        sequence: binding.sequence,
        ...(identityIsPublic
          ? {
              cardInstanceId: binding.cardInstanceId,
              cardId: instance.cardId,
            }
          : {}),
      },
    });

    if (!identityIsPublic) {
      appendV070Event(state, {
        type: 'bound_card_release_identity',
        actor: binding.owner,
        visibility: binding.owner,
        payload: {
          hostId,
          destination,
          purpose,
          sequence: binding.sequence,
          cardInstanceId: binding.cardInstanceId,
          cardId: instance.cardId,
        },
      });
    }
  }

  return bindings.map(binding => binding.cardInstanceId);
}
