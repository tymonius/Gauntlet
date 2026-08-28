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

export function useV070SanctionsEmbargoAfterRefusal(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceId: string,
  replaceAssetInstanceId?: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) throw new V070GameActionError('Sanctions: Embargo requires an active battle.');
  const terms = runtime.terms;
  if (runtime.stage !== 'onset'
    || terms.stage !== 'refused'
    || terms.response !== 'refused'
    || terms.offerer !== diplomatId
    || terms.proposalChoice
    || terms.termsCardChoice
    || terms.politicalCapitalPending) {
    throw new V070GameActionError(
      'Sanctions: Embargo is available after that Diplomat’s Terms are refused and refusal choices are resolved.',
    );
  }

  const opponentId = terms.opponent;
  if (!opponentId) throw new V070GameActionError('Refused Terms are missing their opponent.');

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
