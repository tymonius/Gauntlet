import {
  v070CanonicalContent,
  type V070CanonicalCard,
  type V070CanonicalProposal,
} from '../content/v070';
import {
  advanceV070TurnPhase,
  endV070OnsetWithoutBattle,
  resolveV070Withdrawal,
  type PlayerId,
  type V070BattleOutcome,
} from './rules';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import { drawV070Cards } from './turn-engine';
import { advanceV070FrontLine } from './front-line';
import type { V070ProposalChoiceKind } from './battle-types';

export const V070_EXECUTABLE_PROPOSAL_IDS = [
  'de-escalation',
  'orderly-withdrawal',
  'capitulation',
  'open-channels',
  'mutual-disarmament',
  'prisoner-exchange',
  'rebuilding-pact',
  'ultimatum',
  'diplomatic-recognition',
] as const;

const INFLUENCE_MAXIMUM = 10;

export function initializeV070TermsWindow(state: V070GameState): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  if (runtime.terms.stage !== 'closed'
    || runtime.terms.offerer
    || runtime.terms.priorityPlayer) {
    return;
  }

  const attackerIsDiplomat = isDiplomat(state, battle.attacker);
  const defenderIsDiplomat = isDiplomat(state, battle.defender);
  if (!attackerIsDiplomat && !defenderIsDiplomat) return;

  runtime.terms.stage = 'opportunity';
  runtime.terms.priorityPlayer = attackerIsDiplomat ? battle.attacker : battle.defender;

  appendV070Event(state, {
    type: 'terms_opportunity',
    actor: runtime.terms.priorityPlayer,
    visibility: 'public',
    payload: { playerId: runtime.terms.priorityPlayer },
  });
}

export function eligibleV070Proposals(
  state: V070GameState,
  diplomatId: PlayerId,
): string[] {
  const diplomat = requireDiplomat(state, diplomatId);
  const battle = requireBattle(state);
  const opponentId = otherPlayer(diplomatId);

  return [...v070CanonicalContent.proposalsById.values()]
    .filter(proposal => proposal.stake <= diplomat.influence)
    .filter(proposal => proposalRequirementMet(state, diplomatId, opponentId, battle.attacker, proposal))
    .map(proposal => proposal.id);
}

export function passV070Terms(state: V070GameState, playerId: PlayerId): void {
  const battle = requireBattle(state);
  const terms = requireRuntime(state).terms;
  if (terms.stage !== 'opportunity' || terms.priorityPlayer !== playerId) {
    throw new V070GameActionError('That player does not currently have the Terms opportunity.');
  }

  appendV070Event(state, {
    type: 'terms_passed',
    actor: playerId,
    visibility: 'public',
  });

  if (playerId === battle.attacker && isDiplomat(state, battle.defender)) {
    terms.priorityPlayer = battle.defender;
    appendV070Event(state, {
      type: 'terms_opportunity',
      actor: battle.defender,
      visibility: 'public',
      payload: { playerId: battle.defender },
    });
    return;
  }

  terms.stage = 'closed';
  terms.priorityPlayer = null;
}

export function offerV070Terms(
  state: V070GameState,
  diplomatId: PlayerId,
  proposalId: string,
): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  if (terms.stage !== 'opportunity' || terms.priorityPlayer !== diplomatId) {
    throw new V070GameActionError('Terms may be offered only by the player with the current Terms opportunity.');
  }

  const proposal = v070CanonicalContent.proposalsById.get(proposalId);
  if (!proposal || !eligibleV070Proposals(state, diplomatId).includes(proposalId)) {
    throw new V070GameActionError('That Proposal is not eligible to be offered now.');
  }

  const opponentId = otherPlayer(diplomatId);
  changeInfluence(state, diplomatId, -proposal.stake, `Stake for ${proposal.name}`);

  terms.stage = 'response';
  terms.priorityPlayer = opponentId;
  terms.offerer = diplomatId;
  terms.opponent = opponentId;
  terms.proposalId = proposalId;
  terms.offeredProposalIds = [proposalId];
  terms.ratifiedAtOffer = requireDiplomat(state, diplomatId).ratifiedProposals.includes(proposalId)
    ? [proposalId]
    : [];
  terms.diplomaticLatitudeInstanceId = null;
  terms.response = null;
  terms.stake = proposal.stake;
  terms.leverageResolved = false;
  terms.leverageBonus = 0;
  terms.leverageCost = 0;
  terms.politicalCapitalPending = false;
  terms.acceptingPlayer = null;
  terms.proposalChoice = null;
  terms.deferredAfterPoliticalCapital = null;

  appendV070Event(state, {
    type: 'terms_offered',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      proposalId,
      proposalName: proposal.name,
      stake: proposal.stake,
    },
  });
}

export function useV070DiplomaticLatitude(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceId: string,
  secondProposalId: string,
): void {
  const terms = requireRuntime(state).terms;
  if (terms.stage !== 'response' || terms.offerer !== diplomatId) {
    throw new V070GameActionError('Diplomatic Latitude is available only after you offer Terms and before the response.');
  }
  if (terms.diplomaticLatitudeInstanceId) {
    throw new V070GameActionError('Diplomatic Latitude already modified these Terms.');
  }
  requireCardInZone(state, diplomatId, 'hand', cardInstanceId, 'diplomats-diplomatic-latitude');

  const first = requireProposal(terms.proposalId);
  const second = requireProposal(secondProposalId);
  if (second.id === first.id || second.stake !== first.stake) {
    throw new V070GameActionError('Diplomatic Latitude requires a different eligible Proposal with the same Stake.');
  }
  const battle = requireBattle(state);
  if (!proposalRequirementMet(state, diplomatId, otherPlayer(diplomatId), battle.attacker, second)) {
    throw new V070GameActionError('The second Proposal does not meet its released Requirement.');
  }

  terms.diplomaticLatitudeInstanceId = cardInstanceId;
  terms.offeredProposalIds = [first.id, second.id];
  if (requireDiplomat(state, diplomatId).ratifiedProposals.includes(second.id)) {
    terms.ratifiedAtOffer.push(second.id);
  }

  appendV070Event(state, {
    type: 'diplomatic_latitude_used',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      cardInstanceId,
      proposalIds: [...terms.offeredProposalIds],
      stake: terms.stake,
    },
  });
}

export function useV070PlenipotentiaryAfterRefusal(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  if (terms.response !== 'refused' || terms.offerer !== diplomatId) {
    throw new V070GameActionError('Plenipotentiary may be used only after that Diplomat’s Terms are refused.');
  }
  if (terms.proposalChoice?.kind === 'diplomatic_latitude_refused') {
    throw new V070GameActionError('Choose the refused Diplomatic Latitude Proposal before using Plenipotentiary.');
  }

  const diplomat = requireDiplomat(state, diplomatId);
  const proposal = requireProposal(terms.proposalId);
  if (diplomat.ratifiedProposals.includes(proposal.id)) {
    throw new V070GameActionError('Plenipotentiary requires an unratified refused Proposal.');
  }
  requireCardInZone(state, diplomatId, 'assetBank', cardInstanceId, 'diplomats-plenipotentiary');

  const cost = diplomat.ratifiedProposals.length + 1;
  if (cost > diplomat.influence) {
    throw new V070GameActionError(`Plenipotentiary requires ${cost} available Influence.`);
  }

  const assetIndex = state.players[diplomatId].zones.assetBank.indexOf(cardInstanceId);
  state.players[diplomatId].zones.assetBank.splice(assetIndex, 1);
  state.players[diplomatId].zones.graveyard.push(cardInstanceId);
  changeInfluence(state, diplomatId, -cost, 'Plenipotentiary');
  ratifyProposal(state, diplomatId, proposal.id, 0, 'plenipotentiary');

  appendV070Event(state, {
    type: 'plenipotentiary_used',
    actor: diplomatId,
    visibility: 'public',
    payload: { proposalId: proposal.id, influenceCost: cost, cardInstanceId },
  });
}

export function useV070NeutralObserversAfterRefusal(
  state: V070GameState,
  diplomatId: PlayerId,
  assetInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  if (runtime.stage !== 'onset'
    || terms.stage !== 'refused'
    || terms.response !== 'refused'
    || terms.offerer !== diplomatId
    || terms.proposalChoice
    || terms.termsCardChoice) {
    throw new V070GameActionError(
      'Neutral Observers is available only after that Diplomat’s refused Terms and before Gambits are set.',
    );
  }

  requireCardInZone(
    state,
    diplomatId,
    'assetBank',
    assetInstanceId,
    'diplomats-neutral-observers',
  );

  const opponentId = requireTermsPlayer(terms.opponent);
  const bank = state.players[diplomatId].zones.assetBank;
  bank.splice(bank.indexOf(assetInstanceId), 1);
  state.players[diplomatId].zones.discardPile.push(assetInstanceId);

  runtime.gambitOrderOverride = {
    source: 'neutral_observers',
    firstPlayer: opponentId,
    secondPlayer: diplomatId,
    nextPlayer: opponentId,
    firstCommitmentFaceUp: true,
  };

  appendV070Event(state, {
    type: 'neutral_observers_used',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      assetInstanceId,
      firstPlayer: opponentId,
      secondPlayer: diplomatId,
    },
  });
}

export function useV070DiplomaticDivination(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceId: string,
  prediction: 'accept' | 'refuse',
): void {
  const terms = requireBeforeTermsResponse(state, diplomatId);
  removeHandCardToTerms(state, diplomatId, cardInstanceId, 'diplomats-diplomatic-divination');
  terms.termsCards.diplomaticDivinations.push({ instanceId: cardInstanceId, prediction });

  appendV070Event(state, {
    type: 'diplomatic_divination_used',
    actor: diplomatId,
    visibility: 'public',
    payload: { cardInstanceId, prediction },
  });
}

export function useV070TradeConcessions(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceId: string,
): void {
  const terms = requireBeforeTermsResponse(state, diplomatId);
  removeHandCardToTerms(state, diplomatId, cardInstanceId, 'diplomats-trade-concessions');
  terms.termsCards.tradeConcessionsInstanceIds.push(cardInstanceId);

  appendV070Event(state, {
    type: 'trade_concessions_revealed',
    actor: diplomatId,
    visibility: 'public',
    payload: { cardInstanceId },
  });
}

export function useV070GoodFaith(
  state: V070GameState,
  diplomatId: PlayerId,
  assetInstanceId: string,
): void {
  const terms = requireBeforeTermsResponse(state, diplomatId);
  requireCardInZone(state, diplomatId, 'assetBank', assetInstanceId, 'diplomats-good-faith');

  const bank = state.players[diplomatId].zones.assetBank;
  bank.splice(bank.indexOf(assetInstanceId), 1);
  state.players[diplomatId].zones.discardPile.push(assetInstanceId);
  drawIntoHand(state, diplomatId, 1, 'Good Faith');

  beginTermsCardChoice(state, 'good_faith_set_aside', diplomatId, assetInstanceId);
  appendV070Event(state, {
    type: 'good_faith_used',
    actor: diplomatId,
    visibility: 'public',
    payload: { assetInstanceId },
  });

  // The printed "then" matters: the card drawn above is now a legal card to
  // reveal and set aside in the pending Good Faith choice.
  terms.priorityPlayer = diplomatId;
}

export function useV070NonbindingResolution(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceId: string,
): void {
  const terms = requireBeforeTermsResponse(state, diplomatId);
  removeHandCardToTerms(state, diplomatId, cardInstanceId, 'diplomats-nonbinding-resolution');
  terms.termsCards.nonbindingResolutionInstanceIds.push(cardInstanceId);

  appendV070Event(state, {
    type: 'nonbinding_resolution_revealed',
    actor: diplomatId,
    visibility: 'public',
    payload: { cardInstanceId },
  });
}

export function useV070GunboatDiplomacy(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceId: string,
): void {
  const terms = requireBeforeTermsResponse(state, diplomatId);
  requireCardInZone(state, diplomatId, 'hand', cardInstanceId, 'diplomats-gunboat-diplomacy');
  if (terms.termsCards.gunboatDiplomacyInstanceIds.includes(cardInstanceId)) {
    throw new V070GameActionError('That Gunboat Diplomacy has already been revealed for these Terms.');
  }
  terms.termsCards.gunboatDiplomacyInstanceIds.push(cardInstanceId);

  appendV070Event(state, {
    type: 'gunboat_diplomacy_revealed',
    actor: diplomatId,
    visibility: 'public',
    payload: { cardInstanceId },
  });
}

export function resolveV070TermsCardChoice(
  state: V070GameState,
  playerId: PlayerId,
  choice?: 'ratify' | 'decline_ratification' | 'draw_two' | 'bank_asset',
  cardInstanceId?: string,
  replaceAssetInstanceId?: string,
): void {
  const terms = requireRuntime(state).terms;
  const pending = terms.termsCardChoice;
  if (terms.stage !== 'terms_card_choice' || !pending || pending.playerId !== playerId) {
    throw new V070GameActionError('No Terms-card choice is pending for that player.');
  }

  switch (pending.kind) {
    case 'good_faith_set_aside': {
      if (!cardInstanceId) throw new V070GameActionError('Good Faith requires one card from Hand.');
      const player = state.players[playerId];
      const index = player.zones.hand.indexOf(cardInstanceId);
      if (index < 0) throw new V070GameActionError('Good Faith must set aside a card from Hand.');
      player.zones.hand.splice(index, 1);
      terms.termsCards.goodFaithSetAsideInstanceIds.push(cardInstanceId);

      appendV070Event(state, {
        type: 'good_faith_card_set_aside',
        actor: playerId,
        visibility: 'public',
        payload: {
          cardInstanceId,
          cardId: state.cardInstances[cardInstanceId]?.cardId,
        },
      });

      terms.termsCardChoice = null;
      terms.stage = 'response';
      terms.priorityPlayer = requireTermsPlayer(terms.opponent);
      return;
    }

    case 'nonbinding_resolution': {
      if (choice !== 'ratify' && choice !== 'decline_ratification') {
        throw new V070GameActionError('Nonbinding Resolution requires ratify or decline_ratification.');
      }
      const diplomatId = requireTermsPlayer(terms.offerer);
      const proposal = requireProposal(terms.proposalId);
      const source = pending.sourceInstanceId;
      if (!source) throw new V070GameActionError('Nonbinding Resolution source is missing.');

      const sourceIndex = terms.termsCards.nonbindingResolutionInstanceIds.indexOf(source);
      if (sourceIndex < 0) throw new V070GameActionError('Nonbinding Resolution is no longer pending.');
      terms.termsCards.nonbindingResolutionInstanceIds.splice(sourceIndex, 1);
      terms.termsCards.resolvedNonbindingResolutionInstanceIds.push(source);
      terms.termsCardChoice = null;

      if (choice === 'ratify') {
        terms.termsCards.nonbindingSuppressRatification = false;
        terms.termsCards.acceptedNewlyRatified = ratifyProposal(
          state,
          diplomatId,
          proposal.id,
          1,
          'accepted',
        );
        terms.termsCards.acceptedRatificationComplete = true;
      } else {
        terms.termsCards.nonbindingSuppressRatification = true;
        changeInfluence(state, diplomatId, 2, 'Nonbinding Resolution');
      }

      appendV070Event(state, {
        type: 'nonbinding_resolution_resolved',
        actor: playerId,
        visibility: 'public',
        payload: { proposalId: proposal.id, choice, sourceInstanceId: source },
      });

      settleAcceptedTerms(state, diplomatId, requireTermsPlayer(terms.acceptingPlayer), proposal);
      return;
    }

    case 'trade_concessions': {
      if (choice !== 'draw_two' && choice !== 'bank_asset') {
        throw new V070GameActionError('Trade Concessions requires draw_two or bank_asset.');
      }
      const diplomatId = requireTermsPlayer(terms.offerer);
      const source = pending.sourceInstanceId;
      if (!source) throw new V070GameActionError('Trade Concessions source is missing.');

      if (choice === 'draw_two') {
        drawIntoHand(state, playerId, 2, 'Trade Concessions');
      } else {
        if (!cardInstanceId) {
          throw new V070GameActionError('Choose an eligible Asset from Hand to bank.');
        }
        bankOptionalAssetFromHand(
          state,
          playerId,
          cardInstanceId,
          replaceAssetInstanceId,
          'Trade Concessions',
        );
      }

      const sourceIndex = terms.termsCards.tradeConcessionsInstanceIds.indexOf(source);
      if (sourceIndex < 0) throw new V070GameActionError('Trade Concessions is no longer pending.');
      terms.termsCards.tradeConcessionsInstanceIds.splice(sourceIndex, 1);
      state.players[diplomatId].zones.discardPile.push(source);
      drawIntoHand(state, diplomatId, 1, 'Trade Concessions');
      terms.termsCardChoice = null;

      appendV070Event(state, {
        type: 'trade_concessions_resolved',
        actor: playerId,
        visibility: 'public',
        payload: { choice, sourceInstanceId: source },
      });

      finishAcceptedTermsAfterCardEffects(state);
      return;
    }
  }
}

export function respondToV070Terms(
  state: V070GameState,
  playerId: PlayerId,
  response: 'accept' | 'refuse',
): void {
  const terms = requireRuntime(state).terms;
  if (terms.stage !== 'response' || terms.priorityPlayer !== playerId || terms.opponent !== playerId) {
    throw new V070GameActionError('No Terms response is pending for that player.');
  }
  const offerer = requireTermsPlayer(terms.offerer);
  terms.response = response === 'accept' ? 'accepted' : 'refused';
  resolveV070DivinationsAfterResponse(state, offerer, response);

  if (response === 'accept') {
    terms.acceptingPlayer = playerId;
    terms.priorityPlayer = null;
    appendV070Event(state, {
      type: 'terms_accepted',
      actor: playerId,
      visibility: 'public',
      payload: { proposalIds: [...terms.offeredProposalIds] },
    });

    if (terms.diplomaticLatitudeInstanceId) {
      beginProposalChoice(state, 'diplomatic_latitude_accepted', playerId, 'single', false);
      return;
    }

    continueAcceptedTerms(state, offerer, playerId);
    return;
  }

  terms.priorityPlayer = null;
  appendV070Event(state, {
    type: 'terms_refused',
    actor: playerId,
    visibility: 'public',
    payload: { proposalIds: [...terms.offeredProposalIds] },
  });

  if (terms.diplomaticLatitudeInstanceId) {
    beginProposalChoice(state, 'diplomatic_latitude_refused', offerer, 'single', false);
    return;
  }

  continueRefusedTerms(state, offerer, playerId);
}

export function resolveV070ProposalChoice(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId?: string,
  replaceAssetInstanceId?: string,
  proposalId?: string,
): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  const choice = terms.proposalChoice;
  if (terms.stage !== 'proposal_choice' || !choice || choice.playerId !== playerId) {
    throw new V070GameActionError('No Proposal card choice is pending for that player.');
  }

  switch (choice.kind) {
    case 'diplomatic_latitude_accepted': {
      selectLatitudeProposal(state, proposalId);
      const offerer = requireTermsPlayer(terms.offerer);
      const acceptingPlayer = requireTermsPlayer(terms.acceptingPlayer);
      continueAcceptedTerms(state, offerer, acceptingPlayer);
      return;
    }

    case 'diplomatic_latitude_refused': {
      selectLatitudeProposal(state, proposalId);
      const offerer = requireTermsPlayer(terms.offerer);
      const refusingPlayer = requireTermsPlayer(terms.opponent);
      const latitudeInstanceId = terms.diplomaticLatitudeInstanceId;
      if (!latitudeInstanceId) throw new V070GameActionError('Diplomatic Latitude state is missing.');
      discardSpecificHandCard(state, offerer, latitudeInstanceId, 'Diplomatic Latitude refused effect');
      terms.diplomaticLatitudeInstanceId = null;
      continueRefusedTerms(state, offerer, refusingPlayer);
      return;
    }

    case 'mutual_disarmament_accepted':
      discardRequiredHandCard(state, playerId, cardInstanceId, 'Mutual Disarmament accepted effect');
      if (choice.stage === 'diplomat') {
        beginProposalChoice(state, 'mutual_disarmament_accepted', otherPlayer(playerId), 'opponent', false);
        return;
      }
      finishMutualDisarmamentAccepted(state);
      return;

    case 'mutual_disarmament_refused':
      if (cardInstanceId) {
        discardOptionalHandCard(state, playerId, cardInstanceId, 'Mutual Disarmament refused effect');
        runtime.participants[playerId].reserveBonus += 1;
        appendV070Event(state, {
          type: 'proposal_reserve_bonus',
          actor: playerId,
          visibility: 'public',
          payload: { proposalId: 'mutual-disarmament', amount: 1 },
        });
      } else if (!choice.optional) {
        throw new V070GameActionError('Mutual Disarmament requires a Hand discard.');
      }
      resumeRefusedTerms(runtime);
      return;

    case 'prisoner_exchange_accepted':
      moveOptionalGraveyardCardToDiscard(state, playerId, cardInstanceId, 'Prisoner Exchange accepted effect');
      if (choice.stage === 'diplomat') {
        beginProposalChoice(state, 'prisoner_exchange_accepted', otherPlayer(playerId), 'opponent', true);
        return;
      }
      finishBothWithdrawAcceptedTerms(state);
      return;

    case 'prisoner_exchange_refused':
      moveOptionalGraveyardCardToDiscard(state, playerId, cardInstanceId, 'Prisoner Exchange refused-loss effect');
      closeTerms(runtime);
      return;

    case 'rebuilding_pact_accepted':
      bankOptionalAssetFromHand(state, playerId, cardInstanceId, replaceAssetInstanceId, 'Rebuilding Pact accepted effect');
      if (choice.stage === 'diplomat') {
        beginProposalChoice(state, 'rebuilding_pact_accepted', otherPlayer(playerId), 'opponent', true);
        return;
      }
      finishBothWithdrawAcceptedTerms(state);
      return;

    case 'rebuilding_pact_refused':
      bankOptionalAssetFromHand(state, playerId, cardInstanceId, replaceAssetInstanceId, 'Rebuilding Pact refused Aftermath effect');
      closeTerms(runtime);
      return;
  }
}

export function v070TermsReadyForGambits(state: V070GameState): boolean {
  const terms = requireRuntime(state).terms;
  return terms.stage === 'closed' || terms.stage === 'refused';
}

export function v070LeverageRequiresDecision(state: V070GameState): boolean {
  const runtime = requireRuntime(state);
  return runtime.terms.stage === 'refused' && !runtime.terms.leverageResolved;
}

export function v070ProposalChoicePending(state: V070GameState): boolean {
  return Boolean(state.battleRuntime?.terms.proposalChoice);
}

export function applyV070Leverage(
  state: V070GameState,
  diplomatId: PlayerId,
  bonus: number,
): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  if (runtime.stage !== 'outcome' || terms.stage !== 'refused' || terms.offerer !== diplomatId) {
    throw new V070GameActionError('Leverage is available only before dice after that Diplomat’s refused Terms.');
  }
  if (terms.leverageResolved) {
    throw new V070GameActionError('Leverage has already been resolved for this battle.');
  }
  if (runtime.participants.A.battleDice.length > 0 || runtime.participants.B.battleDice.length > 0) {
    throw new V070GameActionError('Leverage must be resolved before any battle dice are rolled.');
  }
  if (!Number.isInteger(bonus) || bonus < 0) {
    throw new V070GameActionError('Leverage bonus must be a nonnegative integer.');
  }

  const cost = triangularCost(bonus);
  const diplomat = requireDiplomat(state, diplomatId);
  if (cost > diplomat.influence) {
    throw new V070GameActionError(`Leverage +${bonus} costs ${cost} Influence, but only ${diplomat.influence} is available.`);
  }

  if (cost > 0) changeInfluence(state, diplomatId, -cost, 'Leverage');
  runtime.participants[diplomatId].battleModifier += bonus;
  terms.leverageResolved = true;
  terms.leverageBonus = bonus;
  terms.leverageCost = cost;

  appendV070Event(state, {
    type: 'leverage_resolved',
    actor: diplomatId,
    visibility: 'public',
    payload: { bonus, cost },
  });
}

export function settleV070RefusedTermsOutcome(
  state: V070GameState,
  outcome: V070BattleOutcome,
): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  if (terms.stage !== 'refused') return;

  const diplomatId = requireTermsPlayer(terms.offerer);
  const proposal = requireProposal(terms.proposalId);

  if (outcome.winner === diplomatId) {
    changeInfluence(state, diplomatId, terms.stake, 'Return imposed Stake');
    const reward = proposal.id === 'diplomatic-recognition' ? 0 : 2;
    ratifyProposal(state, diplomatId, proposal.id, reward, 'imposed');

    if (proposal.id === 'diplomatic-recognition') {
      const advance = advanceV070FrontLine(state, diplomatId, 1, 'diplomatic_recognition_refused_win');
      if (advance.reachedOpponentEnd) {
        endGameFromFrontLine(state, diplomatId, 'diplomatic_recognition');
        return;
      }
    }

    if (proposal.id === 'rebuilding-pact') {
      beginProposalChoice(state, 'rebuilding_pact_refused', diplomatId, 'single', true);
      return;
    }

    closeTerms(runtime);
    return;
  }

  if (proposal.id === 'capitulation') {
    drawIntoHand(state, diplomatId, 2, 'Capitulation refused-loss effect');
  }

  const deferredChoice = refusedLossChoiceFor(proposal.id);
  const player = state.players[diplomatId];
  if (player.leaderId === 'senator'
    && terms.stake > 0
    && player.diplomats?.politicalCapitalUsedTurn !== state.turnNumber) {
    terms.stage = 'political_capital';
    terms.politicalCapitalPending = true;
    terms.deferredAfterPoliticalCapital = deferredChoice;
    appendV070Event(state, {
      type: 'political_capital_pending',
      actor: diplomatId,
      visibility: 'public',
      payload: {
        lostStake: terms.stake,
        maximumCards: Math.min(terms.stake, player.zones.hand.length),
      },
    });
    return;
  }

  if (deferredChoice) {
    beginProposalChoice(state, deferredChoice, diplomatId, 'single', true);
    return;
  }

  closeTerms(runtime);
}

export function settleV070RefusedTermsWithoutWinner(
  state: V070GameState,
): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  if (terms.stage !== 'refused') return;

  const diplomatId = requireTermsPlayer(terms.offerer);
  const proposal = requireProposal(terms.proposalId);

  changeInfluence(state, diplomatId, terms.stake, 'Return no-winner Stake');

  appendV070Event(state, {
    type: 'refused_terms_no_winner',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      proposalId: proposal.id,
      stakeReturned: terms.stake,
    },
  });

  if (proposal.id === 'rebuilding-pact') {
    beginProposalChoice(state, 'rebuilding_pact_refused', diplomatId, 'single', true);
    return;
  }

  closeTerms(runtime);
}

export function resolveV070PoliticalCapital(
  state: V070GameState,
  diplomatId: PlayerId,
  cardInstanceIds: readonly string[],
): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  if (runtime.stage !== 'aftermath'
    || terms.stage !== 'political_capital'
    || !terms.politicalCapitalPending
    || terms.offerer !== diplomatId) {
    throw new V070GameActionError('Political Capital is not pending for that player.');
  }

  if (new Set(cardInstanceIds).size !== cardInstanceIds.length
    || cardInstanceIds.length > terms.stake) {
    throw new V070GameActionError('Political Capital may use at most one Hand card per staked Influence.');
  }

  const player = state.players[diplomatId];
  for (const instanceId of cardInstanceIds) {
    if (!player.zones.hand.includes(instanceId)) {
      throw new V070GameActionError('Political Capital cards must come from the Diplomat’s Hand.');
    }
  }

  for (const instanceId of cardInstanceIds) {
    player.zones.hand.splice(player.zones.hand.indexOf(instanceId), 1);
    player.zones.graveyard.push(instanceId);
  }
  if (cardInstanceIds.length > 0) {
    changeInfluence(state, diplomatId, cardInstanceIds.length, 'Political Capital');
  }

  const diplomat = requireDiplomat(state, diplomatId);
  diplomat.politicalCapitalUsedTurn = state.turnNumber;

  appendV070Event(state, {
    type: 'political_capital_resolved',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      cardsCommitted: cardInstanceIds.length,
      stakeLost: terms.stake - cardInstanceIds.length,
    },
  });

  const deferred = terms.deferredAfterPoliticalCapital;
  terms.politicalCapitalPending = false;
  terms.deferredAfterPoliticalCapital = null;
  if (deferred) {
    beginProposalChoice(state, deferred, diplomatId, 'single', true);
    return;
  }

  closeTerms(runtime);
}

export function v070PoliticalCapitalPending(state: V070GameState): boolean {
  return Boolean(state.battleRuntime?.terms.politicalCapitalPending);
}

export function bankableV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const player = state.players[playerId];
  const replaceable = replaceableV070AssetInstanceIds(state, playerId);
  const hasCapacity = player.zones.assetBank.length < player.controlledTerritories.length;

  return player.zones.hand.filter(instanceId => {
    const card = canonicalCardForInstance(state, instanceId);
    if (!cardHasAssetEffect(card)) return false;
    if (violatesSingleBankedCopy(state, playerId, card)) return false;
    return hasCapacity || replaceable.length > 0;
  });
}

function continueAcceptedTerms(
  state: V070GameState,
  diplomatId: PlayerId,
  acceptingPlayer: PlayerId,
): void {
  const proposal = requireProposal(requireRuntime(state).terms.proposalId);
  if (beginAcceptedProposalChoice(state, diplomatId, proposal)) return;
  resolveAcceptedProposal(state, diplomatId, acceptingPlayer, proposal);
}

function continueRefusedTerms(
  state: V070GameState,
  diplomatId: PlayerId,
  refusingPlayer: PlayerId,
): void {
  const terms = requireRuntime(state).terms;
  terms.stage = 'refused';
  terms.priorityPlayer = null;
  terms.proposalChoice = null;
  resolveV070RefusedTermsCards(state, diplomatId);
  const proposal = requireProposal(terms.proposalId);
  applyRefusedProposalImmediate(state, diplomatId, refusingPlayer, proposal);
}

function selectLatitudeProposal(state: V070GameState, proposalId: string | undefined): void {
  const terms = requireRuntime(state).terms;
  if (!proposalId || !terms.offeredProposalIds.includes(proposalId)) {
    throw new V070GameActionError('Choose one of the two Proposals offered through Diplomatic Latitude.');
  }
  const chooser = terms.priorityPlayer;
  terms.proposalId = proposalId;
  terms.proposalChoice = null;
  terms.priorityPlayer = null;
  appendV070Event(state, {
    type: 'diplomatic_latitude_selected',
    actor: chooser ?? undefined,
    visibility: 'public',
    payload: { proposalId },
  });
}

function beginAcceptedProposalChoice(
  state: V070GameState,
  diplomatId: PlayerId,
  proposal: V070CanonicalProposal,
): boolean {
  switch (proposal.id) {
    case 'mutual-disarmament':
      beginProposalChoice(state, 'mutual_disarmament_accepted', diplomatId, 'diplomat', false);
      return true;
    case 'prisoner-exchange':
      beginProposalChoice(state, 'prisoner_exchange_accepted', diplomatId, 'diplomat', true);
      return true;
    case 'rebuilding-pact':
      beginProposalChoice(state, 'rebuilding_pact_accepted', diplomatId, 'diplomat', true);
      return true;
    default:
      return false;
  }
}

function resolveAcceptedProposal(
  state: V070GameState,
  diplomatId: PlayerId,
  acceptingPlayer: PlayerId,
  proposal: V070CanonicalProposal,
): void {
  const battle = requireBattle(state);

  switch (proposal.id) {
    case 'de-escalation':
      applyAcceptedWithdrawal(state, [battle.attacker, battle.defender]);
      drawIntoHand(state, acceptingPlayer, 1, 'De-escalation accepted effect');
      break;
    case 'orderly-withdrawal':
      applyAcceptedWithdrawal(state, [diplomatId]);
      drawIntoHand(state, acceptingPlayer, 1, 'Orderly Withdrawal accepted effect');
      break;
    case 'capitulation':
      applyAcceptedWithdrawal(state, [diplomatId]);
      drawIntoHand(state, acceptingPlayer, 1, 'Capitulation accepted effect');
      break;
    case 'open-channels':
      revealBothHands(state);
      applyAcceptedWithdrawal(state, [battle.attacker, battle.defender]);
      drawIntoHand(state, acceptingPlayer, 1, 'Open Channels accepted effect');
      break;
    case 'ultimatum':
      applyAcceptedWithdrawal(state, [acceptingPlayer]);
      break;
    case 'diplomatic-recognition': {
      const advance = advanceV070FrontLine(state, diplomatId, 1, 'diplomatic_recognition_accepted');
      if (advance.reachedOpponentEnd) {
        endGameFromFrontLine(state, diplomatId, 'diplomatic_recognition');
        return;
      }
      applyAcceptedWithdrawal(state, [acceptingPlayer]);
      drawIntoHand(state, acceptingPlayer, 2, 'Diplomatic Recognition accepted effect');
      break;
    }
    default:
      throw new V070GameActionError(`${proposal.name} accepted effect requires its Proposal choice window.`);
  }

  settleAcceptedTerms(state, diplomatId, acceptingPlayer, proposal);
}

function applyRefusedProposalImmediate(
  state: V070GameState,
  diplomatId: PlayerId,
  refusingPlayer: PlayerId,
  proposal: V070CanonicalProposal,
): void {
  const runtime = requireRuntime(state);

  switch (proposal.id) {
    case 'de-escalation':
      drawIntoHand(state, diplomatId, 1, 'De-escalation refused effect');
      break;
    case 'orderly-withdrawal':
    case 'ultimatum':
      runtime.participants[diplomatId].battleModifier += 1;
      break;
    case 'capitulation':
    case 'prisoner-exchange':
    case 'rebuilding-pact':
    case 'diplomatic-recognition':
      break;
    case 'open-channels':
      revealHandTo(state, refusingPlayer, diplomatId);
      runtime.participants[diplomatId].reserveBonus += 1;
      break;
    case 'mutual-disarmament':
      beginProposalChoice(state, 'mutual_disarmament_refused', diplomatId, 'single', true);
      break;
  }
}

function finishMutualDisarmamentAccepted(state: V070GameState): void {
  const terms = requireRuntime(state).terms;
  const diplomatId = requireTermsPlayer(terms.offerer);
  const acceptingPlayer = requireTermsPlayer(terms.acceptingPlayer);
  const proposal = requireProposal(terms.proposalId);

  drawIntoHand(state, acceptingPlayer, 1, 'Mutual Disarmament accepted effect');
  const battle = requireBattle(state);
  applyAcceptedWithdrawal(state, [battle.attacker, battle.defender]);
  settleAcceptedTerms(state, diplomatId, acceptingPlayer, proposal);
}

function finishBothWithdrawAcceptedTerms(state: V070GameState): void {
  const terms = requireRuntime(state).terms;
  const diplomatId = requireTermsPlayer(terms.offerer);
  const acceptingPlayer = requireTermsPlayer(terms.acceptingPlayer);
  const proposal = requireProposal(terms.proposalId);
  const battle = requireBattle(state);

  applyAcceptedWithdrawal(state, [battle.attacker, battle.defender]);
  settleAcceptedTerms(state, diplomatId, acceptingPlayer, proposal);
}

function applyAcceptedWithdrawal(
  state: V070GameState,
  withdrawingPlayers: readonly PlayerId[],
): void {
  const battle = requireBattle(state);
  const withdrawal = resolveV070Withdrawal(battle, withdrawingPlayers);
  state.battle = endV070OnsetWithoutBattle(
    battle,
    'terms_accepted',
    withdrawal.positions,
  );
}

function settleAcceptedTerms(
  state: V070GameState,
  diplomatId: PlayerId,
  acceptingPlayer: PlayerId,
  proposal: V070CanonicalProposal,
): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  const cards = terms.termsCards;

  if (!cards.acceptedStakeReturned) {
    changeInfluence(state, diplomatId, terms.stake, 'Return accepted Stake');
    cards.acceptedStakeReturned = true;
  }

  const diplomat = requireDiplomat(state, diplomatId);
  if (!cards.acceptedRatificationComplete) {
    if (diplomat.ratifiedProposals.includes(proposal.id)) {
      cards.acceptedRatificationComplete = true;
    } else if (cards.nonbindingResolutionInstanceIds.length > 0) {
      beginTermsCardChoice(
        state,
        'nonbinding_resolution',
        acceptingPlayer,
        cards.nonbindingResolutionInstanceIds[0],
      );
      return;
    } else if (cards.nonbindingSuppressRatification) {
      cards.acceptedRatificationComplete = true;
    } else {
      cards.acceptedNewlyRatified = ratifyProposal(
        state,
        diplomatId,
        proposal.id,
        1,
        'accepted',
      );
      cards.acceptedRatificationComplete = true;
    }
  }

  // Once the Proposal has become ratified (or has definitively remained
  // unratified), additional Nonbinding Resolution copies no longer need to
  // interrupt default ratification. They still receive their normal
  // post-acceptance discard/draw cleanup below.
  if (cards.acceptedRatificationComplete
    && cards.nonbindingResolutionInstanceIds.length > 0) {
    cards.resolvedNonbindingResolutionInstanceIds.push(
      ...cards.nonbindingResolutionInstanceIds,
    );
    cards.nonbindingResolutionInstanceIds = [];
  }

  resolveV070AcceptedAutomaticTermsCards(state, diplomatId);

  const player = state.players[diplomatId];
  if (terms.ratifiedAtOffer.includes(proposal.id)
    && player.diplomats
    && player.diplomats.detenteUsedTurn !== state.turnNumber
    && hasBankedCard(state, diplomatId, 'diplomats-detente')) {
    player.diplomats.detenteUsedTurn = state.turnNumber;
    changeInfluence(state, diplomatId, 1, 'Détente');
    appendV070Event(state, {
      type: 'detente_triggered',
      actor: diplomatId,
      visibility: 'public',
      payload: { proposalId: proposal.id },
    });
  }
  if (player.leaderId === 'ambassador'
    && player.diplomats
    && player.diplomats.cordialityUsedTurn !== state.turnNumber) {
    player.diplomats.cordialityUsedTurn = state.turnNumber;
    drawIntoHand(state, diplomatId, 1, 'Ambassador Cordiality');
    appendV070Event(state, {
      type: 'cordiality_triggered',
      actor: diplomatId,
      visibility: 'public',
      payload: { proposalId: proposal.id },
    });
  }

  if (cards.tradeConcessionsInstanceIds.length > 0) {
    beginTermsCardChoice(
      state,
      'trade_concessions',
      acceptingPlayer,
      cards.tradeConcessionsInstanceIds[0],
    );
    return;
  }

  finishAcceptedTermsAfterCardEffects(state);
}

function finishAcceptedTermsAfterCardEffects(state: V070GameState): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  const cards = terms.termsCards;
  const diplomatId = requireTermsPlayer(terms.offerer);
  const acceptingPlayer = requireTermsPlayer(terms.acceptingPlayer);
  const proposal = requireProposal(terms.proposalId);

  if (cards.tradeConcessionsInstanceIds.length > 0) {
    beginTermsCardChoice(
      state,
      'trade_concessions',
      acceptingPlayer,
      cards.tradeConcessionsInstanceIds[0],
    );
    return;
  }

  if (cards.resolvedNonbindingResolutionInstanceIds.length > 0) {
    state.players[diplomatId].zones.discardPile.push(
      ...cards.resolvedNonbindingResolutionInstanceIds,
    );
    drawIntoHand(
      state,
      diplomatId,
      cards.resolvedNonbindingResolutionInstanceIds.length,
      'Nonbinding Resolution',
    );
    cards.resolvedNonbindingResolutionInstanceIds = [];
  }

  appendV070Event(state, {
    type: 'terms_concluded',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      proposalId: proposal.id,
      acceptingPlayer,
      result: 'accepted',
      newlyRatified: cards.acceptedNewlyRatified,
    },
  });

  finishOnsetWithoutBattle(state);
}

function resolveV070DivinationsAfterResponse(
  state: V070GameState,
  diplomatId: PlayerId,
  response: 'accept' | 'refuse',
): void {
  const cards = requireRuntime(state).terms.termsCards;
  for (const divination of cards.diplomaticDivinations) {
    const matched = divination.prediction === response;
    if (matched) {
      changeInfluence(state, diplomatId, 1, 'Diplomatic Divination');
      state.players[diplomatId].zones.discardPile.push(divination.instanceId);
    } else {
      state.players[diplomatId].zones.graveyard.push(divination.instanceId);
    }

    appendV070Event(state, {
      type: 'diplomatic_divination_resolved',
      actor: diplomatId,
      visibility: 'public',
      payload: {
        cardInstanceId: divination.instanceId,
        prediction: divination.prediction,
        response,
        matched,
      },
    });
  }
  cards.diplomaticDivinations = [];
}

function resolveV070RefusedTermsCards(
  state: V070GameState,
  diplomatId: PlayerId,
): void {
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  const cards = terms.termsCards;
  const player = state.players[diplomatId];

  if (cards.goodFaithSetAsideInstanceIds.length > 0) {
    player.zones.hand.push(...cards.goodFaithSetAsideInstanceIds);
    appendV070Event(state, {
      type: 'good_faith_refused',
      actor: diplomatId,
      visibility: 'public',
      payload: { returned: [...cards.goodFaithSetAsideInstanceIds] },
    });
    cards.goodFaithSetAsideInstanceIds = [];
  }

  if (cards.tradeConcessionsInstanceIds.length > 0) {
    player.zones.hand.push(...cards.tradeConcessionsInstanceIds);
    appendV070Event(state, {
      type: 'trade_concessions_refused',
      actor: diplomatId,
      visibility: 'public',
      payload: { returned: [...cards.tradeConcessionsInstanceIds] },
    });
    cards.tradeConcessionsInstanceIds = [];
  }

  if (cards.nonbindingResolutionInstanceIds.length > 0) {
    const count = cards.nonbindingResolutionInstanceIds.length;
    player.zones.discardPile.push(...cards.nonbindingResolutionInstanceIds);
    cards.nonbindingResolutionInstanceIds = [];
    drawIntoHand(state, diplomatId, count, 'Nonbinding Resolution refused effect');
  }

  for (const instanceId of cards.gunboatDiplomacyInstanceIds) {
    const handIndex = player.zones.hand.indexOf(instanceId);
    if (handIndex < 0) {
      throw new V070GameActionError('Revealed Gunboat Diplomacy is no longer in Hand.');
    }
    player.zones.hand.splice(handIndex, 1);
    runtime.participants[diplomatId].additionalGambits.push({
      instanceId,
      owner: diplomatId,
      role: 'gambit',
      faceUp: true,
    });

    appendV070Event(state, {
      type: 'additional_gambit_set',
      actor: diplomatId,
      visibility: 'public',
      payload: {
        instanceId,
        cardId: 'diplomats-gunboat-diplomacy',
        faceUp: true,
        source: 'refused_terms',
      },
    });
  }
  cards.gunboatDiplomacyInstanceIds = [];
}

function resolveV070AcceptedAutomaticTermsCards(
  state: V070GameState,
  diplomatId: PlayerId,
): void {
  const cards = requireRuntime(state).terms.termsCards;
  const player = state.players[diplomatId];

  if (cards.goodFaithSetAsideInstanceIds.length > 0) {
    const count = cards.goodFaithSetAsideInstanceIds.length;
    player.zones.graveyard.push(...cards.goodFaithSetAsideInstanceIds);
    cards.goodFaithSetAsideInstanceIds = [];
    changeInfluence(state, diplomatId, count, 'Good Faith');

    appendV070Event(state, {
      type: 'good_faith_accepted',
      actor: diplomatId,
      visibility: 'public',
      payload: { count },
    });
  }

  for (const instanceId of cards.gunboatDiplomacyInstanceIds) {
    const handIndex = player.zones.hand.indexOf(instanceId);
    if (handIndex >= 0) {
      player.zones.hand.splice(handIndex, 1);
      player.zones.discardPile.push(instanceId);
    } else if (!player.zones.discardPile.includes(instanceId)) {
      throw new V070GameActionError('Revealed Gunboat Diplomacy has no legal accepted destination.');
    }
  }
  cards.gunboatDiplomacyInstanceIds = [];
}

function beginTermsCardChoice(
  state: V070GameState,
  kind: NonNullable<NonNullable<V070GameState['battleRuntime']>['terms']['termsCardChoice']>['kind'],
  playerId: PlayerId,
  sourceInstanceId: string | null,
): void {
  const terms = requireRuntime(state).terms;
  terms.stage = 'terms_card_choice';
  terms.priorityPlayer = playerId;
  terms.termsCardChoice = {
    kind,
    playerId,
    sourceInstanceId,
  };

  appendV070Event(state, {
    type: 'terms_card_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind,
      playerId,
      sourceInstanceId,
    },
  });
}

function requireBeforeTermsResponse(
  state: V070GameState,
  diplomatId: PlayerId,
) {
  const terms = requireRuntime(state).terms;
  if (terms.stage !== 'response' || terms.offerer !== diplomatId || terms.response !== null) {
    throw new V070GameActionError('This card may be used only after offering Terms and before the opponent responds.');
  }
  return terms;
}

function removeHandCardToTerms(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  expectedCardId: string,
): void {
  requireCardInZone(state, playerId, 'hand', instanceId, expectedCardId);
  const hand = state.players[playerId].zones.hand;
  hand.splice(hand.indexOf(instanceId), 1);
}

function proposalRequirementMet(
  state: V070GameState,
  diplomatId: PlayerId,
  opponentId: PlayerId,
  attackerId: PlayerId,
  proposal: V070CanonicalProposal,
): boolean {
  const battle = requireBattle(state);
  const diplomat = state.players[diplomatId];
  const opponent = state.players[opponentId];

  switch (proposal.id) {
    case 'orderly-withdrawal':
      return attackerId === diplomatId;
    case 'capitulation':
      return battle.defender === diplomatId;
    case 'open-channels':
      return diplomat.zones.hand.length > 0;
    case 'mutual-disarmament':
      return diplomat.zones.hand.length > 0 && opponent.zones.hand.length > 0;
    case 'prisoner-exchange':
      return diplomat.zones.graveyard.length > 0 && opponent.zones.graveyard.length > 0;
    case 'rebuilding-pact':
      return bankableV070AssetInstanceIds(state, diplomatId).length > 0;
    case 'diplomatic-recognition': {
      if (battle.defender !== diplomatId || battle.lastStand) return false;
      const contested = state.board.find(space => space.position === battle.contestedPosition);
      return contested?.controller === battle.attacker;
    }
    default:
      return true;
  }
}

function beginProposalChoice(
  state: V070GameState,
  kind: V070ProposalChoiceKind,
  playerId: PlayerId,
  stage: 'diplomat' | 'opponent' | 'single',
  optional: boolean,
): void {
  const terms = requireRuntime(state).terms;
  terms.stage = 'proposal_choice';
  terms.priorityPlayer = playerId;
  terms.proposalChoice = {
    kind,
    playerId,
    stage,
    optional,
  };

  appendV070Event(state, {
    type: 'proposal_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      proposalId: terms.proposalId,
      kind,
      playerId,
      stage,
      optional,
    },
  });
}

function resumeRefusedTerms(runtime: NonNullable<V070GameState['battleRuntime']>): void {
  runtime.terms.stage = 'refused';
  runtime.terms.priorityPlayer = null;
  runtime.terms.proposalChoice = null;
}

function refusedLossChoiceFor(proposalId: string): V070ProposalChoiceKind | null {
  if (proposalId === 'prisoner-exchange') return 'prisoner_exchange_refused';
  if (proposalId === 'rebuilding-pact') return 'rebuilding_pact_refused';
  return null;
}

function discardSpecificHandCard(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  purpose: string,
): void {
  discardOptionalHandCard(state, playerId, instanceId, purpose);
}

function hasBankedCard(state: V070GameState, playerId: PlayerId, cardId: string): boolean {
  return state.players[playerId].zones.assetBank.some(instanceId =>
    state.cardInstances[instanceId]?.cardId === cardId
  );
}

function requireCardInZone(
  state: V070GameState,
  playerId: PlayerId,
  zone: 'hand' | 'assetBank',
  instanceId: string,
  expectedCardId: string,
): void {
  const player = state.players[playerId];
  if (!player.zones[zone].includes(instanceId)
    || state.cardInstances[instanceId]?.cardId !== expectedCardId) {
    throw new V070GameActionError(`${expectedCardId} is not available in the required zone.`);
  }
}

function discardRequiredHandCard(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string | undefined,
  purpose: string,
): void {
  if (!instanceId) throw new V070GameActionError('Choose exactly one card from Hand.');
  discardOptionalHandCard(state, playerId, instanceId, purpose);
}

function discardOptionalHandCard(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  purpose: string,
): void {
  const player = state.players[playerId];
  const index = player.zones.hand.indexOf(instanceId);
  if (index < 0) throw new V070GameActionError('That card is not in the player’s Hand.');
  player.zones.hand.splice(index, 1);
  player.zones.discardPile.push(instanceId);

  appendV070Event(state, {
    type: 'card_discarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: state.cardInstances[instanceId]?.cardId,
      purpose,
    },
  });
}

function moveOptionalGraveyardCardToDiscard(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string | undefined,
  purpose: string,
): void {
  if (!instanceId) return;
  const player = state.players[playerId];
  const index = player.zones.graveyard.indexOf(instanceId);
  if (index < 0) throw new V070GameActionError('That card is not in the player’s Graveyard.');
  player.zones.graveyard.splice(index, 1);
  player.zones.discardPile.push(instanceId);

  appendV070Event(state, {
    type: 'graveyard_card_recycled',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: state.cardInstances[instanceId]?.cardId,
      purpose,
    },
  });
}

function bankOptionalAssetFromHand(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string | undefined,
  replaceAssetInstanceId: string | undefined,
  purpose: string,
): void {
  if (!instanceId) {
    if (replaceAssetInstanceId) {
      throw new V070GameActionError('An Asset cannot be replaced when the player declines to bank a new Asset.');
    }
    return;
  }

  const player = state.players[playerId];
  if (!bankableV070AssetInstanceIds(state, playerId).includes(instanceId)) {
    throw new V070GameActionError('That Hand card cannot legally be banked as an Asset now.');
  }

  const atLimit = player.zones.assetBank.length >= player.controlledTerritories.length;
  if (atLimit) {
    if (!replaceAssetInstanceId) {
      throw new V070GameActionError('Banking at the Asset limit requires choosing a replaceable Asset.');
    }
    const replaceable = replaceableV070AssetInstanceIds(state, playerId);
    if (!replaceable.includes(replaceAssetInstanceId)) {
      throw new V070GameActionError('That banked Asset cannot be replaced now.');
    }
    const replacementIndex = player.zones.assetBank.indexOf(replaceAssetInstanceId);
    player.zones.assetBank.splice(replacementIndex, 1);
    player.zones.discardPile.push(replaceAssetInstanceId);
    appendV070Event(state, {
      type: 'asset_replaced',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: replaceAssetInstanceId,
        cardId: state.cardInstances[replaceAssetInstanceId]?.cardId,
        purpose,
      },
    });
  } else if (replaceAssetInstanceId) {
    throw new V070GameActionError('Asset replacement is available only when banking at the Asset limit.');
  }

  player.zones.hand.splice(player.zones.hand.indexOf(instanceId), 1);
  player.zones.assetBank.push(instanceId);
  appendV070Event(state, {
    type: 'asset_banked',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: state.cardInstances[instanceId]?.cardId,
      purpose,
    },
  });
}

function replaceableV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const bank = state.players[playerId].zones.assetBank;
  const extraordinary = bank.find(instanceId =>
    state.cardInstances[instanceId]?.cardId === 'intelligence-extraordinary-rendition'
  );

  // Extraordinary Rendition must be the first Asset discarded, but its bound
  // card also has a lifecycle that the v0.7.0 authoritative state does not yet
  // represent. Do not permit an Asset replacement that would silently orphan
  // or lose that bound card.
  if (extraordinary) return [];

  return bank.filter(instanceId => {
    const card = canonicalCardForInstance(state, instanceId);
    const assetText = card.effects
      .filter(effect => effect.label === 'Asset')
      .map(effect => effect.text)
      .join(' ');
    if (/cannot voluntarily discard this card at another time/i.test(assetText)) return false;
    // Tariffs is replaceable only after the turn in which it was banked. The
    // current engine does not yet persist bank-age metadata, so do not
    // over-permit replacement while that timing cannot be proven.
    if (/cannot voluntarily cause it to leave play during the turn it is banked/i.test(assetText)) return false;
    return true;
  });
}

function violatesSingleBankedCopy(
  state: V070GameState,
  playerId: PlayerId,
  card: V070CanonicalCard,
): boolean {
  const restrictionText = card.effects.map(effect => effect.text).join(' ');
  if (!/only one banked|cannot bank it while you control another banked/i.test(restrictionText)) {
    return false;
  }
  return state.players[playerId].zones.assetBank.some(instanceId =>
    state.cardInstances[instanceId]?.cardId === card.id
  );
}

function canonicalCardForInstance(
  state: V070GameState,
  instanceId: string,
): V070CanonicalCard {
  const cardId = state.cardInstances[instanceId]?.cardId;
  const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
  if (!card) throw new V070GameActionError(`Unknown card instance ${instanceId}.`);
  return card;
}

function cardHasAssetEffect(card: V070CanonicalCard): boolean {
  return card.effects.some(effect => effect.label === 'Asset');
}

function ratifyProposal(
  state: V070GameState,
  diplomatId: PlayerId,
  proposalId: string,
  reward: number,
  source: 'accepted' | 'imposed' | 'plenipotentiary',
): boolean {
  const diplomat = requireDiplomat(state, diplomatId);
  if (diplomat.ratifiedProposals.includes(proposalId)) return false;

  diplomat.ratifiedProposals.push(proposalId);
  if (reward > 0) changeInfluence(state, diplomatId, reward, `${source} Proposal ratification`);

  appendV070Event(state, {
    type: 'proposal_ratified',
    actor: diplomatId,
    visibility: 'public',
    payload: { proposalId, source, influenceReward: reward },
  });
  return true;
}

function finishOnsetWithoutBattle(state: V070GameState): void {
  const battle = requireBattle(state);
  state.players.A.position = battle.positions.A;
  state.players.B.position = battle.positions.B;
  syncBoardOccupants(state);

  state.battle = null;
  state.battleRuntime = null;

  if (!state.turnState || state.turnState.phase !== 'movement') {
    throw new Error('Terms accepted during movement must return to the post-Movement turn boundary.');
  }
  state.turnState = advanceV070TurnPhase(state.turnState);
  appendV070Event(state, {
    type: 'turn_phase',
    actor: state.activePlayer ?? undefined,
    visibility: 'public',
    payload: { turnNumber: state.turnNumber, phase: state.turnState.phase },
  });
}

function endGameFromFrontLine(
  state: V070GameState,
  playerId: PlayerId,
  source: string,
): void {
  state.stage = 'ended';
  state.winner = playerId;
  state.turnState = null;
  state.battle = null;
  state.battleRuntime = null;
  appendV070Event(state, {
    type: 'game_won',
    actor: playerId,
    visibility: 'public',
    payload: {
      route: 'final_territory_capture',
      source,
    },
  });
}

function drawIntoHand(
  state: V070GameState,
  playerId: PlayerId,
  count: number,
  purpose: string,
): void {
  const result = drawV070Cards(state, playerId, count, purpose);
  state.players[playerId].zones.hand.push(...result.drawn);

  appendV070Event(state, {
    type: 'cards_drawn',
    actor: playerId,
    visibility: 'public',
    payload: {
      count: result.drawn.length,
      purpose,
      reshuffles: result.reshuffles,
      exhausted: result.exhausted,
    },
  });
  if (result.drawn.length > 0) {
    appendV070Event(state, {
      type: 'drawn_card_identity',
      actor: playerId,
      visibility: playerId,
      payload: { cardInstanceIds: [...result.drawn], purpose },
    });
  }
}

function revealBothHands(state: V070GameState): void {
  appendV070Event(state, {
    type: 'hands_revealed',
    visibility: 'public',
    payload: {
      A: visibleCardPayload(state, state.players.A.zones.hand),
      B: visibleCardPayload(state, state.players.B.zones.hand),
    },
  });
}

function revealHandTo(
  state: V070GameState,
  owner: PlayerId,
  viewer: PlayerId,
): void {
  appendV070Event(state, {
    type: 'hand_revealed',
    actor: owner,
    visibility: viewer,
    payload: {
      playerId: owner,
      cards: visibleCardPayload(state, state.players[owner].zones.hand),
    },
  });
}

function visibleCardPayload(state: V070GameState, instanceIds: readonly string[]) {
  return instanceIds.map(instanceId => ({
    instanceId,
    cardId: state.cardInstances[instanceId]?.cardId,
  }));
}

function changeInfluence(
  state: V070GameState,
  diplomatId: PlayerId,
  delta: number,
  reason: string,
): void {
  const diplomat = requireDiplomat(state, diplomatId);
  const next = diplomat.influence + delta;
  if (next < 0) throw new V070GameActionError('Influence cannot fall below 0.');
  const previous = diplomat.influence;
  diplomat.influence = Math.min(INFLUENCE_MAXIMUM, next);

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

function triangularCost(bonus: number): number {
  return bonus * (bonus + 1) / 2;
}

function closeTerms(runtime: NonNullable<V070GameState['battleRuntime']>): void {
  runtime.terms.stage = 'closed';
  runtime.terms.priorityPlayer = null;
  runtime.terms.politicalCapitalPending = false;
  runtime.terms.leverageResolved = true;
  runtime.terms.acceptingPlayer = null;
  runtime.terms.proposalChoice = null;
  runtime.terms.termsCardChoice = null;
  runtime.terms.termsCards = {
    diplomaticDivinations: [],
    tradeConcessionsInstanceIds: [],
    goodFaithSetAsideInstanceIds: [],
    nonbindingResolutionInstanceIds: [],
    resolvedNonbindingResolutionInstanceIds: [],
    gunboatDiplomacyInstanceIds: [],
    nonbindingSuppressRatification: false,
    acceptedStakeReturned: false,
    acceptedRatificationComplete: false,
    acceptedNewlyRatified: false,
  };
  runtime.terms.deferredAfterPoliticalCapital = null;
  runtime.terms.response = null;
  runtime.terms.offeredProposalIds = [];
  runtime.terms.ratifiedAtOffer = [];
  runtime.terms.diplomaticLatitudeInstanceId = null;
}

function syncBoardOccupants(state: V070GameState): void {
  for (const territory of state.board) territory.occupant = null;
  for (const playerId of ['A', 'B'] as const) {
    const position = state.players[playerId].position;
    if (position === null) continue;
    const territory = state.board.find(space => space.position === position);
    if (territory) territory.occupant = playerId;
  }
}

function isDiplomat(state: V070GameState, playerId: PlayerId): boolean {
  return state.players[playerId].factionId === 'diplomats';
}

function requireDiplomat(state: V070GameState, playerId: PlayerId) {
  const diplomat = state.players[playerId].diplomats;
  if (!diplomat || !isDiplomat(state, playerId)) {
    throw new V070GameActionError(`${playerId} is not a Diplomat.`);
  }
  return diplomat;
}

function requireBattle(state: V070GameState) {
  if (!state.battle) throw new V070GameActionError('Terms require an active battle.');
  return state.battle;
}

function requireRuntime(state: V070GameState) {
  if (!state.battleRuntime) throw new V070GameActionError('Terms require an active battle runtime.');
  return state.battleRuntime;
}

function requireTermsPlayer(playerId: PlayerId | null): PlayerId {
  if (!playerId) throw new V070GameActionError('Active Terms are missing a required player.');
  return playerId;
}

function requireProposal(proposalId: string | null): V070CanonicalProposal {
  if (!proposalId) throw new V070GameActionError('Active Terms are missing their Proposal.');
  const proposal = v070CanonicalContent.proposalsById.get(proposalId);
  if (!proposal) throw new V070GameActionError(`Unknown Proposal ${proposalId}.`);
  return proposal;
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}
