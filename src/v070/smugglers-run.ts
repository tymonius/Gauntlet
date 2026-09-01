import {
  V070GameActionError,
  appendV070Event,
  type V070Binding,
  type V070BoardTerritory,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  bindV070CardFromPlayerZone,
  releaseV070BoundCardsForPurpose,
  v070BindingsForHost,
} from './bindings';
import {
  territoryAtV070Position,
  v070PrintedTerritoryEffectActive,
  type V070TerritoryEffectTiming,
} from './territories';

export const V070_SMUGGLERS_RUN_ID =
  'territory-smuggler-s-pass' as const;
export const V070_SMUGGLERS_RUN_BINDING_PURPOSE =
  "Smuggler's Run stash" as const;

export function v070SmugglersRunStashForTerritory(
  state: V070GameState,
  territoryInstanceId: string,
): V070Binding | null {
  const bindings = v070BindingsForHost(
    state,
    territoryInstanceId,
  ).filter(binding =>
    binding.purpose === V070_SMUGGLERS_RUN_BINDING_PURPOSE
  );

  if (bindings.length > 1) {
    throw new V070GameActionError(
      "Smuggler's Run cannot have more than one stashed card.",
    );
  }
  return bindings[0] ?? null;
}

export function v070ControlledSmugglersRunHere(
  state: V070GameState,
  playerId: PlayerId,
  timing: V070TerritoryEffectTiming,
): V070BoardTerritory | null {
  const position = state.players[playerId].position;
  if (position === null) return null;

  const territory = territoryAtV070Position(state, position);
  if (!territory
    || territory.territoryId !== V070_SMUGGLERS_RUN_ID
    || territory.controller !== playerId
    || !v070PrintedTerritoryEffectActive(
      state,
      territory,
      playerId,
      timing,
    )) {
    return null;
  }
  return territory;
}

export function stashV070SmugglersRunCard(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): void {
  const phase = state.turnState?.phase;
  if (phase !== 'opening' && phase !== 'denouement') {
    throw new V070GameActionError(
      "Smuggler's Run stash Action is legal only during Opening or Denouement.",
    );
  }

  const territory = v070ControlledSmugglersRunHere(
    state,
    playerId,
    phase,
  );
  if (!territory) {
    throw new V070GameActionError(
      "Smuggler's Run stash Action requires being there, controlling it, and its printed effect being active.",
    );
  }
  if (v070SmugglersRunStashForTerritory(
    state,
    territory.territoryInstanceId,
  )) {
    throw new V070GameActionError(
      "Only one card may be stashed beneath Smuggler's Run.",
    );
  }

  bindV070CardFromPlayerZone(state, {
    hostId: territory.territoryInstanceId,
    owner: playerId,
    cardInstanceId,
    sourceZone: 'hand',
    faceUp: false,
    purpose: V070_SMUGGLERS_RUN_BINDING_PURPOSE,
  });
  appendV070Event(state, {
    type: 'territory_effect_applied',
    actor: playerId,
    visibility: 'public',
    payload: {
      territoryId: V070_SMUGGLERS_RUN_ID,
      territoryInstanceId: territory.territoryInstanceId,
      effect: 'stash_card',
    },
  });
}

export function releaseV070SmugglersRunStashForUse(
  state: V070GameState,
  playerId: PlayerId,
  timing: 'opening' | 'denouement' | 'battle',
): string {
  const territory = v070ControlledSmugglersRunHere(
    state,
    playerId,
    timing,
  );
  if (!territory) {
    throw new V070GameActionError(
      "The stashing player must be at and control Smuggler's Run while its printed effect is active to use the stashed card.",
    );
  }

  const stash = v070SmugglersRunStashForTerritory(
    state,
    territory.territoryInstanceId,
  );
  if (!stash || stash.owner !== playerId) {
    throw new V070GameActionError(
      "This player has no card stashed beneath Smuggler's Run.",
    );
  }

  const released = releaseV070BoundCardsForPurpose(
    state,
    territory.territoryInstanceId,
    V070_SMUGGLERS_RUN_BINDING_PURPOSE,
    'hand',
    "Smuggler's Run use",
  );
  const cardInstanceId = released[0];
  if (!cardInstanceId) {
    throw new V070GameActionError(
      "Smuggler's Run could not release its stashed card.",
    );
  }
  return cardInstanceId;
}

export function returnV070SmugglersRunStashAtStartTurn(
  state: V070GameState,
  playerId: PlayerId,
  territoryInstanceId: string,
): string {
  if (state.turnState?.phase !== 'capture') {
    throw new V070GameActionError(
      "Smuggler's Run may return its stashed card only at the start of that player's turn.",
    );
  }

  const territory = state.board.find(candidate =>
    candidate.territoryInstanceId === territoryInstanceId
  );
  if (!territory
    || territory.territoryId !== V070_SMUGGLERS_RUN_ID
    || territory.controller !== playerId
    || !v070PrintedTerritoryEffectActive(
      state,
      territory,
      playerId,
      'start_turn',
    )) {
    throw new V070GameActionError(
      "Returning a Smuggler's Run stash requires controlling that Territory with its printed effect active at the start of your turn.",
    );
  }

  const stash = v070SmugglersRunStashForTerritory(
    state,
    territory.territoryInstanceId,
  );
  if (!stash || stash.owner !== playerId) {
    throw new V070GameActionError(
      "This player has no card stashed beneath that Smuggler's Run.",
    );
  }

  const released = releaseV070BoundCardsForPurpose(
    state,
    territory.territoryInstanceId,
    V070_SMUGGLERS_RUN_BINDING_PURPOSE,
    'hand',
    "Smuggler's Run start-turn return",
  );
  const cardInstanceId = released[0];
  if (!cardInstanceId) {
    throw new V070GameActionError(
      "Smuggler's Run could not return its stashed card.",
    );
  }
  return cardInstanceId;
}

export function discardV070SmugglersRunStashForControlLoss(
  state: V070GameState,
  territoryInstanceId: string,
  previousController: PlayerId,
): string | null {
  const territory = state.board.find(candidate =>
    candidate.territoryInstanceId === territoryInstanceId
  );
  if (!territory
    || territory.territoryId !== V070_SMUGGLERS_RUN_ID) {
    return null;
  }

  const stash = v070SmugglersRunStashForTerritory(
    state,
    territoryInstanceId,
  );
  if (!stash) return null;
  if (stash.owner !== previousController) {
    throw new V070GameActionError(
      "Smuggler's Run stash owner must match the controller who lost the Territory.",
    );
  }

  const released = releaseV070BoundCardsForPurpose(
    state,
    territoryInstanceId,
    V070_SMUGGLERS_RUN_BINDING_PURPOSE,
    'discard',
    "Smuggler's Run control loss",
  );
  return released[0] ?? null;
}
