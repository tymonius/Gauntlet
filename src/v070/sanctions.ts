import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
  type V070SanctionAssociation,
} from './engine';
import {
  advanceV070TurnPhase,
  type PlayerId,
} from './rules';
import {
  bankV070AssetFromHand,
  openV070AssetLimitEnforcement,
} from './assets';
import {
  discardV070Overlay,
  placeV070OverlayFromHand,
} from './overlays';

export const V070_SANCTIONS_CENSURE_ID = 'diplomats-sanctions-censure';
export const V070_SANCTIONS_EMBARGO_ID = 'diplomats-sanctions-embargo';
export const V070_SANCTIONS_BLOCKADE_ID = 'diplomats-sanctions-blockade';

export type V070SanctionAction = {
  type: 'resolve_blockade_choice';
  playerId: PlayerId;
  sanctionInstanceId: string;
  choice: 'discard' | 'influence';
  discardInstanceId?: string;
};

export function reduceV070SanctionAction(
  state: V070GameState,
  action: V070SanctionAction,
): V070GameState {
  if (state.stage !== 'playing') {
    throw new V070GameActionError('Sanction actions require an active v0.7.0 game.');
  }

  const next = structuredClone(state) as V070GameState;
  resolveV070BlockadeChoice(
    next,
    action.playerId,
    action.sanctionInstanceId,
    action.choice,
    action.discardInstanceId,
  );

  if (next.pendingSanctionChoices.length === 0
    && !next.battle
    && next.turnState?.phase === 'movement'
    && !next.turnState.movementSequenceOpen) {
    next.turnState = advanceV070TurnPhase(next.turnState);
    appendV070Event(next, {
      type: 'turn_phase',
      actor: next.activePlayer ?? undefined,
      visibility: 'public',
      payload: {
        turnNumber: next.turnNumber,
        phase: next.turnState.phase,
      },
    });
  }

  return next;
}

export function useV070SanctionsBlockadeInAftermath(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceId: string,
  territoryPosition: number,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.stage !== 'aftermath') {
    throw new V070GameActionError('Sanctions: Blockade may be placed only during the Aftermath.');
  }

  const context = runtime.refusedTermsContext;
  if (!context || context.offerer !== diplomatId) {
    throw new V070GameActionError(
      'Sanctions: Blockade requires an Aftermath following refusal of that Diplomat’s Terms.',
    );
  }

  const instance = state.cardInstances[cardInstanceId];
  if (!instance
    || instance.owner !== diplomatId
    || instance.cardId !== V070_SANCTIONS_BLOCKADE_ID) {
    throw new V070GameActionError('Choose your Sanctions: Blockade from Hand.');
  }

  const territory = state.board.find(candidate => candidate.position === territoryPosition);
  if (!territory || territory.controller !== context.opponent) {
    throw new V070GameActionError(
      'Sanctions: Blockade must be placed on a Territory controlled by the refusing opponent.',
    );
  }

  placeV070OverlayFromHand(
    state,
    diplomatId,
    cardInstanceId,
    territoryPosition,
    'Sanctions: Blockade after refused Terms',
  );
  associateV070Sanction(state, {
    instanceId: cardInstanceId,
    owner: diplomatId,
    opponent: context.opponent,
    kind: 'overlay',
  });

  appendV070Event(state, {
    type: 'sanction_applied',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      instanceId: cardInstanceId,
      cardId: V070_SANCTIONS_BLOCKADE_ID,
      opponentId: context.opponent,
      kind: 'overlay',
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
    },
  });
}

export function useV070SanctionsCensureAfterRefusal(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceId: string,
  replaceAssetInstanceId?: string,
): void {
  const { opponentId } = requireRefusedTermsSanctionWindow(state, diplomatId);

  const instance = state.cardInstances[cardInstanceId];
  if (!instance
    || instance.owner !== diplomatId
    || instance.cardId !== V070_SANCTIONS_CENSURE_ID) {
    throw new V070GameActionError('Choose your Sanctions: Censure from Hand.');
  }

  bankV070AssetFromHand(state, diplomatId, cardInstanceId, {
    replaceAssetInstanceId,
    purpose: 'Sanctions: Censure after refused Terms',
    allowSpecialBanking: true,
  });

  associateV070Sanction(state, {
    instanceId: cardInstanceId,
    owner: diplomatId,
    opponent: opponentId,
    kind: 'asset',
  });

  appendV070Event(state, {
    type: 'sanction_applied',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      instanceId: cardInstanceId,
      cardId: V070_SANCTIONS_CENSURE_ID,
      opponentId,
      kind: 'asset',
    },
  });
}

export function useV070SanctionsEmbargoAfterRefusal(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceId: string,
  replaceAssetInstanceId?: string,
): void {
  const { opponentId } = requireRefusedTermsSanctionWindow(state, diplomatId);

  const instance = state.cardInstances[cardInstanceId];
  if (!instance
    || instance.owner !== diplomatId
    || instance.cardId !== V070_SANCTIONS_EMBARGO_ID) {
    throw new V070GameActionError('Choose your Sanctions: Embargo from Hand.');
  }

  bankV070AssetFromHand(state, diplomatId, cardInstanceId, {
    replaceAssetInstanceId,
    purpose: 'Sanctions: Embargo after refused Terms',
    allowSpecialBanking: true,
  });

  associateV070Sanction(state, {
    instanceId: cardInstanceId,
    owner: diplomatId,
    opponent: opponentId,
    kind: 'asset',
  });

  appendV070Event(state, {
    type: 'sanction_applied',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      instanceId: cardInstanceId,
      cardId: V070_SANCTIONS_EMBARGO_ID,
      opponentId,
      kind: 'asset',
    },
  });

  openV070AssetLimitEnforcement(
    state,
    opponentId,
    'Sanctions: Embargo reduced Asset limit',
    cardInstanceId,
  );
}

export function resolveV070BlockadeChoice(
  state: V070GameState,
  playerId: PlayerId,
  sanctionInstanceId: string,
  choice: 'discard' | 'influence',
  discardInstanceId?: string,
): void {
  const pending = state.pendingSanctionChoices[0];
  if (!pending
    || pending.kind !== 'blockade_movement'
    || pending.playerId !== playerId) {
    throw new V070GameActionError('No Sanctions: Blockade choice is pending for that player.');
  }
  if (pending.sanctionInstanceId !== sanctionInstanceId) {
    throw new V070GameActionError('Resolve Sanctions: Blockade choices in trigger order.');
  }

  const sanction = state.sanctions.find(candidate =>
    candidate.instanceId === sanctionInstanceId
    && candidate.opponent === playerId
    && candidate.kind === 'overlay'
  );
  if (!sanction
    || state.cardInstances[sanction.instanceId]?.cardId !== V070_SANCTIONS_BLOCKADE_ID) {
    throw new V070GameActionError('The pending Blockade Sanction is no longer in play.');
  }

  if (choice === 'discard') {
    if (!discardInstanceId) {
      throw new V070GameActionError('Sanctions: Blockade requires one chosen Hand discard.');
    }
    const hand = state.players[playerId].zones.hand;
    const index = hand.indexOf(discardInstanceId);
    if (index < 0) {
      throw new V070GameActionError('Sanctions: Blockade must discard a card from Hand.');
    }
    hand.splice(index, 1);
    state.players[playerId].zones.discardPile.push(discardInstanceId);

    appendV070Event(state, {
      type: 'card_discarded',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: discardInstanceId,
        cardId: state.cardInstances[discardInstanceId]?.cardId,
        purpose: 'Sanctions: Blockade',
      },
    });
  } else {
    if (discardInstanceId) {
      throw new V070GameActionError('The +1 Influence Blockade choice does not discard a Hand card.');
    }
    gainV070SanctionInfluence(state, sanction.owner, 1, 'Sanctions: Blockade');
  }

  state.pendingSanctionChoices.shift();
  appendV070Event(state, {
    type: 'blockade_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sanctionInstanceId,
      territoryInstanceId: pending.territoryInstanceId,
      movement: pending.movement,
      choice,
      discardedInstanceId: discardInstanceId ?? null,
    },
  });
}

export function expireV070BlockadesForControlLoss(
  state: V070GameState,
  territoryInstanceId: string,
  losingController: PlayerId,
): void {
  const expiring = state.sanctions.filter(sanction => {
    if (sanction.opponent !== losingController || sanction.kind !== 'overlay') return false;
    if (state.cardInstances[sanction.instanceId]?.cardId !== V070_SANCTIONS_BLOCKADE_ID) {
      return false;
    }
    return state.overlays.some(overlay =>
      overlay.instanceId === sanction.instanceId
      && overlay.territoryInstanceId === territoryInstanceId
    );
  });

  for (const sanction of expiring) {
    expireV070Sanction(state, sanction, 'associated_opponent_lost_territory_control');
  }
}

export function openV070CensureChoicesForActionPlay(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): number {
  const active = state.sanctions.filter(sanction =>
    sanction.opponent === playerId
    && sanction.kind === 'asset'
    && state.cardInstances[sanction.instanceId]?.cardId === V070_SANCTIONS_CENSURE_ID
    && state.players[sanction.owner].zones.assetBank.includes(sanction.instanceId)
    && state.sanctionTriggerTurns[sanction.instanceId] !== state.turnNumber
  );

  for (const sanction of active) {
    state.sanctionTriggerTurns[sanction.instanceId] = state.turnNumber;
    state.pendingSanctionChoices.push({
      kind: 'censure_action',
      playerId,
      sanctionInstanceId: sanction.instanceId,
      sourceActionInstanceId,
    });

    appendV070Event(state, {
      type: 'sanction_choice_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        kind: 'censure_action',
        sanctionInstanceId: sanction.instanceId,
        sourceActionInstanceId,
        owner: sanction.owner,
        opponent: sanction.opponent,
        turnNumber: state.turnNumber,
      },
    });
  }

  return active.length;
}

export function currentV070CensureChoice(
  state: V070GameState,
  playerId: PlayerId,
) {
  const pending = state.pendingSanctionChoices[0];
  if (!pending || pending.kind !== 'censure_action' || pending.playerId !== playerId) {
    throw new V070GameActionError('No Sanctions: Censure choice is pending for that player.');
  }
  return pending;
}

export function completeV070CensureChoice(
  state: V070GameState,
  playerId: PlayerId,
  sanctionInstanceId: string,
  choice: 'discard' | 'draw',
  discardedInstanceId?: string,
): void {
  const pending = currentV070CensureChoice(state, playerId);
  if (pending.sanctionInstanceId !== sanctionInstanceId) {
    throw new V070GameActionError('Resolve Sanctions: Censure choices in trigger order.');
  }

  state.pendingSanctionChoices.shift();
  appendV070Event(state, {
    type: 'censure_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sanctionInstanceId,
      sourceActionInstanceId: pending.sourceActionInstanceId,
      choice,
      discardedInstanceId: discardedInstanceId ?? null,
    },
  });
}

export function associateV070Sanction(
  state: V070GameState,
  association: V070SanctionAssociation,
): void {
  const duplicate = state.sanctions.find(
    existing => existing.instanceId === association.instanceId,
  );
  if (duplicate) {
    throw new V070GameActionError('That Sanction is already associated with an opponent.');
  }
  state.sanctions.push({ ...association });
}

export function expireV070SanctionsAfterAcceptance(
  state: V070GameState,
  owner: PlayerId,
  acceptingOpponent: PlayerId,
): void {
  const expiring = state.sanctions.filter(sanction =>
    sanction.owner === owner && sanction.opponent === acceptingOpponent
  );

  for (const sanction of expiring) {
    expireV070Sanction(state, sanction, 'associated_opponent_accepted_terms');
  }
}

export function sanctionForV070Instance(
  state: V070GameState,
  instanceId: string,
): V070SanctionAssociation | null {
  return state.sanctions.find(sanction => sanction.instanceId === instanceId) ?? null;
}

function gainV070SanctionInfluence(
  state: V070GameState,
  diplomatId: PlayerId,
  amount: number,
  reason: string,
): void {
  const diplomat = state.players[diplomatId].diplomats;
  if (!diplomat) {
    throw new V070GameActionError('Sanction Influence belongs to a Diplomat.');
  }
  const previous = diplomat.influence;
  diplomat.influence = Math.min(10, diplomat.influence + amount);

  appendV070Event(state, {
    type: 'influence_changed',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      delta: diplomat.influence - previous,
      balance: diplomat.influence,
      reason,
    },
  });
}

function requireRefusedTermsSanctionWindow(
  state: V070GameState,
  diplomatId: PlayerId,
): { opponentId: PlayerId } {
  const runtime = state.battleRuntime;
  if (!runtime) throw new V070GameActionError('Sanctions require an active battle.');
  const terms = runtime.terms;
  if (runtime.stage !== 'onset'
    || terms.stage !== 'refused'
    || terms.response !== 'refused'
    || terms.offerer !== diplomatId
    || terms.proposalChoice
    || terms.termsCardChoice
    || terms.politicalCapitalPending) {
    throw new V070GameActionError(
      'This Sanction is available after that Diplomat’s Terms are refused and refusal choices are resolved.',
    );
  }
  if (!terms.opponent) {
    throw new V070GameActionError('Refused Terms are missing their opponent.');
  }
  return { opponentId: terms.opponent };
}

function expireV070Sanction(
  state: V070GameState,
  sanction: V070SanctionAssociation,
  reason: string,
): void {
  const cardId = state.cardInstances[sanction.instanceId]?.cardId;
  if (!cardId) {
    throw new V070GameActionError(`Unknown Sanction instance ${sanction.instanceId}.`);
  }

  if (sanction.kind === 'asset') {
    const bank = state.players[sanction.owner].zones.assetBank;
    const index = bank.indexOf(sanction.instanceId);
    if (index < 0) {
      state.sanctions = state.sanctions.filter(
        existing => existing.instanceId !== sanction.instanceId,
      );
      return;
    }
    bank.splice(index, 1);
    state.players[sanction.owner].zones.discardPile.push(sanction.instanceId);
  } else {
    discardV070Overlay(state, sanction.instanceId, reason);
  }

  state.sanctions = state.sanctions.filter(
    existing => existing.instanceId !== sanction.instanceId,
  );
  delete state.sanctionTriggerTurns[sanction.instanceId];

  appendV070Event(state, {
    type: 'sanction_expired',
    actor: sanction.owner,
    visibility: 'public',
    payload: {
      instanceId: sanction.instanceId,
      cardId,
      opponentId: sanction.opponent,
      reason,
      destination: 'discard',
    },
  });
}
