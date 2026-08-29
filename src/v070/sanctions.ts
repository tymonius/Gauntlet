import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
  type V070SanctionAssociation,
} from './engine';
import type { PlayerId } from './rules';
import {
  bankV070AssetFromHand,
  openV070AssetLimitEnforcement,
} from './assets';

export const V070_SANCTIONS_CENSURE_ID = 'diplomats-sanctions-censure';
export const V070_SANCTIONS_EMBARGO_ID = 'diplomats-sanctions-embargo';
export const V070_SANCTIONS_BLOCKADE_ID = 'diplomats-sanctions-blockade';

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
    throw new V070GameActionError(
      'Overlay Sanction expiration is unsupported until Sanctions: Blockade is integrated.',
    );
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
