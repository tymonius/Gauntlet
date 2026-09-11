import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_BROTHERS_IN_ARMS_ID = 'military-brothers-in-arms' as const;

const brothersInArmsCard = v070CanonicalContent.cardsById.get(
  V070_BROTHERS_IN_ARMS_ID,
);
const brothersInArmsBattleEffect = brothersInArmsCard?.effects.find(
  effect => effect.label === 'Tactic',
);
if (!brothersInArmsBattleEffect) {
  throw new Error(
    'Released v0.7.0 Brothers in Arms is missing its Tactic effect.',
  );
}

export const V070_BROTHERS_IN_ARMS_BATTLE_TEXT =
  brothersInArmsBattleEffect.text;

export interface V070BrothersInArmsAdditionalTacticRuntime {
  playerId: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    pendingBrothersInArmsAdditionalTactic?:
      V070BrothersInArmsAdditionalTacticRuntime | null;
  }
}

export function pendingV070BrothersInArmsAdditionalTactic(
  state: V070GameState,
): V070BrothersInArmsAdditionalTacticRuntime | null {
  return state.battleRuntime?.pendingBrothersInArmsAdditionalTactic ?? null;
}

export function openV070BrothersInArmsAdditionalTacticChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceInstanceId: string,
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Brothers in Arms requires an active battle runtime.',
    );
  }
  if (runtime.pendingBrothersInArmsAdditionalTactic) {
    throw new V070GameActionError(
      'Resolve the pending Brothers in Arms additional Tactic choice first.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.cardId !== V070_BROTHERS_IN_ARMS_ID
    || state.cardInstances[sourceInstanceId]?.owner !== playerId) {
    throw new V070GameActionError(
      'Brothers in Arms source does not match the chosen Tactic.',
    );
  }

  const participant = runtime.participants[playerId];
  const chosenAsTactic = participant.tactic?.instanceId === sourceInstanceId
    || participant.additionalTactics.some(
      commitment => commitment.instanceId === sourceInstanceId,
    );
  if (!chosenAsTactic) {
    throw new V070GameActionError(
      'Brothers in Arms must be chosen as a Tactic before using its additional Tactic permission.',
    );
  }

  // The printed condition is "if you did not set a Gambit." Any committed
  // Gambit, including an additional one, means that condition is false.
  if (participant.gambit || participant.additionalGambits.length > 0) {
    appendV070Event(state, {
      type: 'brothers_in_arms_additional_tactic_inapplicable',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_BROTHERS_IN_ARMS_ID,
        reason: 'gambit_set',
      },
    });
    return false;
  }

  const candidates = eligibleHandTactics(state, playerId);
  if (candidates.length === 0) {
    appendV070Event(state, {
      type: 'brothers_in_arms_additional_tactic_unavailable',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_BROTHERS_IN_ARMS_ID,
        reason: 'no_eligible_hand_tactic',
      },
    });
    return false;
  }

  runtime.pendingBrothersInArmsAdditionalTactic = {
    playerId,
    sourceInstanceId,
    candidateInstanceIds: candidates,
  };
  appendV070Event(state, {
    type: 'brothers_in_arms_additional_tactic_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_BROTHERS_IN_ARMS_ID,
      candidateCount: candidates.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'brothers_in_arms_additional_tactic_choice_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      sourceInstanceId,
      candidateInstanceIds: [...candidates],
    },
  });
  return true;
}

export function resolveV070BrothersInArmsAdditionalTacticChoice(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId?: string,
): void {
  const runtime = state.battleRuntime;
  const pending = pendingV070BrothersInArmsAdditionalTactic(state);
  if (!runtime || !pending) {
    throw new V070GameActionError(
      'There is no pending Brothers in Arms additional Tactic choice.',
    );
  }
  if (pending.playerId !== playerId) {
    throw new V070GameActionError(
      'Only the Brothers in Arms controller may choose its additional Tactic.',
    );
  }

  runtime.pendingBrothersInArmsAdditionalTactic = null;
  if (cardInstanceId === undefined) {
    appendV070Event(state, {
      type: 'brothers_in_arms_additional_tactic_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_BROTHERS_IN_ARMS_ID,
      },
    });
    return;
  }

  const currentCandidates = eligibleHandTactics(state, playerId);
  if (!pending.candidateInstanceIds.includes(cardInstanceId)
    || !currentCandidates.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'Brothers in Arms must choose an eligible Tactic from Hand.',
    );
  }

  const hand = state.players[playerId].zones.hand;
  const handIndex = hand.indexOf(cardInstanceId);
  if (handIndex < 0) {
    throw new V070GameActionError(
      'The additional Brothers in Arms Tactic is no longer in Hand.',
    );
  }
  hand.splice(handIndex, 1);

  const faceUp = runtime.stage !== 'choose_tactics'
    && runtime.stage !== 'reveal_tactics';
  runtime.participants[playerId].additionalTactics.push({
    instanceId: cardInstanceId,
    owner: playerId,
    role: 'tactic',
    faceUp,
  });
  runtime.battleCardAftermathDestinationOverrides.push({
    sourceCardId: V070_BROTHERS_IN_ARMS_ID,
    playerId,
    instanceId: cardInstanceId,
    destination: 'graveyard',
  });

  appendV070Event(state, {
    type: 'brothers_in_arms_additional_tactic_chosen',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_BROTHERS_IN_ARMS_ID,
      faceUp,
    },
  });
  appendV070Event(state, {
    type: 'brothers_in_arms_additional_tactic_identity',
    actor: playerId,
    visibility: faceUp ? 'public' : playerId,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      targetInstanceId: cardInstanceId,
      targetCardId: state.cardInstances[cardInstanceId]?.cardId ?? null,
    },
  });

  // Brothers in Arms can itself be the additional Tactic, so its printed
  // choice-time permission may chain while the player continues to have no
  // Gambit. Each permission remains optional and resolves independently.
  if (state.cardInstances[cardInstanceId]?.cardId === V070_BROTHERS_IN_ARMS_ID) {
    openV070BrothersInArmsAdditionalTacticChoice(
      state,
      playerId,
      cardInstanceId,
    );
  }
}

function eligibleHandTactics(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return state.players[playerId].zones.hand.filter(instanceId => {
    const cardId = state.cardInstances[instanceId]?.cardId;
    const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
    return Boolean(card?.effects.some(effect =>
      effect.label === 'Tactic' || effect.label === 'Gambit/Tactic'
    ));
  });
}
