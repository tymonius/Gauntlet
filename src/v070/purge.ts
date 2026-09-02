import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import { removeV070AssetForced } from './assets';
import {
  spendV070Conviction,
  v070Conviction,
} from './inquisition';
import type { PlayerId } from './rules';
import { preventV070OpposingHandReveal } from './counterintelligence';

export type V070PurgePrintedCost = 1 | 2 | 3 | 4;
export type V070PurgeSource = 'normal' | 'final_judgment';

export interface V070PurgeOptions {
  discardMode?: 'top' | 'combined';
  targetInstanceIds?: readonly string[];
  assetInstanceId?: string;
}

export interface V070PurgeStartResult {
  pendingChoice: boolean;
  paidCost: number;
}

export function v070PurgePaidCost(
  printedCost: V070PurgePrintedCost,
  source: V070PurgeSource,
): number {
  return source === 'final_judgment'
    ? Math.max(1, printedCost - 1)
    : printedCost;
}

export function v070AnyPurgeAvailable(
  state: V070GameState,
  purgerId: PlayerId,
  source: V070PurgeSource,
): boolean {
  const opponentId = otherPlayer(purgerId);
  const availableConviction = v070Conviction(state, purgerId);
  const opponent = state.players[opponentId];

  if (opponent.zones.discardPile.length > 0
    && availableConviction >= v070PurgePaidCost(1, source)) {
    return true;
  }
  if (opponent.zones.assetBank.length > 0
    && availableConviction >= v070PurgePaidCost(2, source)) {
    return true;
  }
  if (opponent.zones.hand.length > 0
    && availableConviction >= v070PurgePaidCost(3, source)) {
    return true;
  }
  return opponent.zones.hand.length > 0
    && availableConviction >= v070PurgePaidCost(4, source);
}

export function startV070Purge(
  state: V070GameState,
  purgerId: PlayerId,
  printedCost: V070PurgePrintedCost,
  source: V070PurgeSource,
  options: V070PurgeOptions = {},
): V070PurgeStartResult {
  if (state.pendingPurgeChoice) {
    throw new V070GameActionError(
      'Resolve the pending Purge choice before starting another Purge.',
    );
  }
  requireInquisitionPlayer(state, purgerId);
  const opponentId = otherPlayer(purgerId);
  const paidCost = v070PurgePaidCost(printedCost, source);

  validatePurgeTarget(
    state,
    purgerId,
    opponentId,
    printedCost,
    options,
  );
  spendV070Conviction(
    state,
    purgerId,
    paidCost,
    source === 'final_judgment'
      ? `Grand Inquisitor Final Judgment Purge ${printedCost}`
      : `Inquisition Purge ${printedCost}`,
  );

  appendV070Event(state, {
    type: 'purge_started',
    actor: purgerId,
    visibility: 'public',
    payload: {
      printedCost,
      paidCost,
      source,
      opponentId,
    },
  });

  switch (printedCost) {
    case 1:
      resolveCostOnePurge(
        state,
        purgerId,
        opponentId,
        options,
        source,
        paidCost,
      );
      return { pendingChoice: false, paidCost };
    case 2:
      resolveCostTwoPurge(
        state,
        purgerId,
        opponentId,
        options.assetInstanceId!,
        source,
        paidCost,
      );
      return { pendingChoice: false, paidCost };
    case 3:
      state.pendingPurgeChoice = {
        purgerId,
        opponentId,
        printedCost,
        paidCost,
        source,
        chooserId: opponentId,
        kind: 'opponent_hand_discard',
      };
      appendPendingChoiceEvent(state);
      return { pendingChoice: true, paidCost };
    case 4:
      if (!revealOpponentHand(state, purgerId, opponentId)) {
        appendV070Event(state, {
          type: 'purge_resolved',
          actor: purgerId,
          visibility: 'public',
          payload: {
            printedCost,
            paidCost,
            source,
            opponentId,
            targetInstanceIds: [],
            preventedBy: 'Counterintelligence',
          },
        });
        return { pendingChoice: false, paidCost };
      }
      state.pendingPurgeChoice = {
        purgerId,
        opponentId,
        printedCost,
        paidCost,
        source,
        chooserId: purgerId,
        kind: 'revealed_hand_target',
      };
      appendPendingChoiceEvent(state);
      return { pendingChoice: true, paidCost };
  }
}

export function resolveV070PurgeHandChoice(
  state: V070GameState,
  chooserId: PlayerId,
  targetInstanceId: string,
): void {
  const pending = state.pendingPurgeChoice;
  if (!pending) {
    throw new V070GameActionError('There is no pending Purge hand choice.');
  }
  if (pending.chooserId !== chooserId) {
    throw new V070GameActionError(
      'That player does not choose the pending Purge card.',
    );
  }

  const hand = state.players[pending.opponentId].zones.hand;
  const index = hand.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'The pending Purge choice must select a card from the opponent’s Hand.',
    );
  }

  hand.splice(index, 1);
  state.players[pending.opponentId].zones.graveyard.push(targetInstanceId);
  state.pendingPurgeChoice = null;

  appendV070Event(state, {
    type: 'purge_resolved',
    actor: pending.purgerId,
    visibility: 'public',
    payload: {
      printedCost: pending.printedCost,
      paidCost: pending.paidCost,
      source: pending.source,
      opponentId: pending.opponentId,
      targetInstanceIds: [targetInstanceId],
      choiceBy: chooserId,
    },
  });
}

function validatePurgeTarget(
  state: V070GameState,
  purgerId: PlayerId,
  opponentId: PlayerId,
  printedCost: V070PurgePrintedCost,
  options: V070PurgeOptions,
): void {
  const opponent = state.players[opponentId];

  if (v070Conviction(state, purgerId) < 1) {
    throw new V070GameActionError('Purge requires available Conviction.');
  }

  if (printedCost === 1) {
    if (opponent.zones.discardPile.length === 0) {
      throw new V070GameActionError(
        'Purge 1 requires at least one card in the opponent’s Discard Pile.',
      );
    }
    if (options.discardMode !== 'top'
      && options.discardMode !== 'combined') {
      throw new V070GameActionError(
        'Purge 1 must choose the top-card or combined-value mode.',
      );
    }
    if (options.discardMode === 'top') {
      if ((options.targetInstanceIds?.length ?? 0) > 0) {
        throw new V070GameActionError(
          'Top-card Purge does not choose discard targets.',
        );
      }
      return;
    }

    const targets = [...(options.targetInstanceIds ?? [])];
    if (targets.length < 1 || targets.length > 2
      || new Set(targets).size !== targets.length) {
      throw new V070GameActionError(
        'Combined-value Purge must choose one or two different Discard Pile cards.',
      );
    }
    if (!targets.every(instanceId =>
      opponent.zones.discardPile.includes(instanceId)
    )) {
      throw new V070GameActionError(
        'Combined-value Purge targets must be in the opponent’s Discard Pile.',
      );
    }
    const combinedValue = targets.reduce(
      (sum, instanceId) => sum + cardValue(state, instanceId),
      0,
    );
    if (combinedValue > 2) {
      throw new V070GameActionError(
        'Combined-value Purge may move cards with total value 2 or less.',
      );
    }
    return;
  }

  if (printedCost === 2) {
    const instanceId = options.assetInstanceId;
    if (!instanceId
      || !opponent.zones.assetBank.includes(instanceId)) {
      throw new V070GameActionError(
        'Purge 2 must choose one opposing banked Asset.',
      );
    }
    return;
  }

  if (opponent.zones.hand.length === 0) {
    throw new V070GameActionError(
      `Purge ${printedCost} requires at least one card in the opponent’s Hand.`,
    );
  }
}

function resolveCostOnePurge(
  state: V070GameState,
  purgerId: PlayerId,
  opponentId: PlayerId,
  options: V070PurgeOptions,
  source: V070PurgeSource,
  paidCost: number,
): void {
  const discard = state.players[opponentId].zones.discardPile;
  const targetInstanceIds = options.discardMode === 'top'
    ? [discard[discard.length - 1]]
    : [...(options.targetInstanceIds ?? [])];

  for (const instanceId of targetInstanceIds) {
    const index = discard.indexOf(instanceId);
    if (index < 0) {
      throw new V070GameActionError(
        'A selected Purge card left the opponent’s Discard Pile.',
      );
    }
    discard.splice(index, 1);
    state.players[opponentId].zones.graveyard.push(instanceId);
  }

  appendResolvedEvent(
    state,
    purgerId,
    opponentId,
    1,
    paidCost,
    source,
    targetInstanceIds,
  );
}

function resolveCostTwoPurge(
  state: V070GameState,
  purgerId: PlayerId,
  opponentId: PlayerId,
  assetInstanceId: string,
  source: V070PurgeSource,
  paidCost: number,
): void {
  removeV070AssetForced(
    state,
    opponentId,
    assetInstanceId,
    'graveyard',
    source === 'final_judgment'
      ? 'Grand Inquisitor Final Judgment Purge'
      : 'Inquisition Purge 2',
  );
  appendResolvedEvent(
    state,
    purgerId,
    opponentId,
    2,
    paidCost,
    source,
    [assetInstanceId],
  );
}

function revealOpponentHand(
  state: V070GameState,
  purgerId: PlayerId,
  opponentId: PlayerId,
): boolean {
  if (preventV070OpposingHandReveal(
    state,
    purgerId,
    opponentId,
    'Inquisition Purge 4',
  )) {
    return false;
  }

  const cards = state.players[opponentId].zones.hand.map(instanceId => ({
    instanceId,
    cardId: state.cardInstances[instanceId]?.cardId,
  }));
  appendV070Event(state, {
    type: 'hand_revealed',
    actor: purgerId,
    visibility: 'public',
    payload: {
      owner: opponentId,
      purpose: 'Inquisition Purge 4',
      cards,
      instanceIds: cards.map(card => card.instanceId),
    },
  });
  return true;
}

function appendPendingChoiceEvent(state: V070GameState): void {
  const pending = state.pendingPurgeChoice!;
  appendV070Event(state, {
    type: 'purge_choice_pending',
    actor: pending.chooserId,
    visibility: 'public',
    payload: {
      printedCost: pending.printedCost,
      paidCost: pending.paidCost,
      source: pending.source,
      chooserId: pending.chooserId,
      opponentId: pending.opponentId,
      kind: pending.kind,
      candidateCount: state.players[pending.opponentId].zones.hand.length,
    },
  });
}

function appendResolvedEvent(
  state: V070GameState,
  purgerId: PlayerId,
  opponentId: PlayerId,
  printedCost: V070PurgePrintedCost,
  paidCost: number,
  source: V070PurgeSource,
  targetInstanceIds: readonly string[],
): void {
  appendV070Event(state, {
    type: 'purge_resolved',
    actor: purgerId,
    visibility: 'public',
    payload: {
      printedCost,
      paidCost,
      source,
      opponentId,
      targetInstanceIds: [...targetInstanceIds],
    },
  });
}

function cardValue(
  state: V070GameState,
  instanceId: string,
): number {
  const cardId = state.cardInstances[instanceId]?.cardId;
  const card = cardId
    ? v070CanonicalContent.cardsById.get(cardId)
    : undefined;
  if (!card) {
    throw new V070GameActionError(
      'Purge value calculation requires a known card instance.',
    );
  }
  return card.cost;
}

function requireInquisitionPlayer(
  state: V070GameState,
  playerId: PlayerId,
): void {
  if (!state.players[playerId]?.inquisition) {
    throw new V070GameActionError(
      `${playerId} is not using the Inquisition faction.`,
    );
  }
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}
