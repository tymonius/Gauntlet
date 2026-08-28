import {
  v070CanonicalContent,
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

export const V070_EXECUTABLE_PROPOSAL_IDS = [
  'de-escalation',
  'orderly-withdrawal',
  'capitulation',
  'open-channels',
  'ultimatum',
] as const;

const executableProposalIds = new Set<string>(V070_EXECUTABLE_PROPOSAL_IDS);
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
  const availableInfluence = diplomat.influence;

  return [...v070CanonicalContent.proposalsById.values()]
    .filter(proposal => proposal.stake <= availableInfluence)
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
  if (!executableProposalIds.has(proposalId)) {
    throw new V070GameActionError(
      `${proposal.name} is valid under v0.7.0 but its choice-bearing Proposal procedure is not executable yet.`,
    );
  }

  const opponentId = otherPlayer(diplomatId);
  changeInfluence(state, diplomatId, -proposal.stake, `Stake for ${proposal.name}`);

  terms.stage = 'response';
  terms.priorityPlayer = opponentId;
  terms.offerer = diplomatId;
  terms.opponent = opponentId;
  terms.proposalId = proposalId;
  terms.stake = proposal.stake;
  terms.leverageResolved = false;
  terms.leverageBonus = 0;
  terms.leverageCost = 0;
  terms.politicalCapitalPending = false;

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
  const proposal = requireProposal(terms.proposalId);

  if (response === 'accept') {
    appendV070Event(state, {
      type: 'terms_accepted',
      actor: playerId,
      visibility: 'public',
      payload: { proposalId: proposal.id },
    });
    resolveAcceptedProposal(state, offerer, playerId, proposal);
    return;
  }

  terms.stage = 'refused';
  terms.priorityPlayer = null;
  applyRefusedProposalImmediate(state, offerer, playerId, proposal);

  appendV070Event(state, {
    type: 'terms_refused',
    actor: playerId,
    visibility: 'public',
    payload: { proposalId: proposal.id },
  });
}

export function v070TermsReadyForGambits(state: V070GameState): boolean {
  const terms = requireRuntime(state).terms;
  return terms.stage === 'closed' || terms.stage === 'refused';
}

export function v070LeverageRequiresDecision(state: V070GameState): boolean {
  const runtime = requireRuntime(state);
  return runtime.terms.stage === 'refused' && !runtime.terms.leverageResolved;
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
    ratifyProposal(state, diplomatId, proposal.id, 2, 'imposed');
    closeTerms(runtime);
    return;
  }

  if (proposal.id === 'capitulation') {
    drawIntoHand(state, diplomatId, 2, 'Capitulation refused-loss effect');
  }

  const player = state.players[diplomatId];
  if (player.leaderId === 'senator'
    && terms.stake > 0
    && player.diplomats?.politicalCapitalUsedTurn !== state.turnNumber) {
    terms.stage = 'political_capital';
    terms.politicalCapitalPending = true;
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
    const index = player.zones.hand.indexOf(instanceId);
    if (index < 0) throw new V070GameActionError('Political Capital cards must come from the Diplomat’s Hand.');
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

  closeTerms(runtime);
}

export function v070PoliticalCapitalPending(state: V070GameState): boolean {
  return Boolean(state.battleRuntime?.terms.politicalCapitalPending);
}

function resolveAcceptedProposal(
  state: V070GameState,
  diplomatId: PlayerId,
  acceptingPlayer: PlayerId,
  proposal: V070CanonicalProposal,
): void {
  const battle = requireBattle(state);
  const runtime = requireRuntime(state);
  const terms = runtime.terms;
  let withdrawing: PlayerId[] = [];

  switch (proposal.id) {
    case 'de-escalation':
      withdrawing = [battle.attacker, battle.defender];
      drawIntoHand(state, acceptingPlayer, 1, 'De-escalation accepted effect');
      break;
    case 'orderly-withdrawal':
      withdrawing = [diplomatId];
      drawIntoHand(state, acceptingPlayer, 1, 'Orderly Withdrawal accepted effect');
      break;
    case 'capitulation':
      withdrawing = [diplomatId];
      drawIntoHand(state, acceptingPlayer, 1, 'Capitulation accepted effect');
      break;
    case 'open-channels':
      revealBothHands(state);
      withdrawing = [battle.attacker, battle.defender];
      drawIntoHand(state, acceptingPlayer, 1, 'Open Channels accepted effect');
      break;
    case 'ultimatum':
      withdrawing = [acceptingPlayer];
      break;
    default:
      throw new V070GameActionError(`${proposal.name} accepted effect is not executable yet.`);
  }

  const withdrawal = resolveV070Withdrawal(battle, withdrawing);
  state.battle = endV070OnsetWithoutBattle(
    battle,
    'terms_accepted',
    withdrawal.positions,
  );

  changeInfluence(state, diplomatId, terms.stake, 'Return accepted Stake');
  const newlyRatified = ratifyProposal(state, diplomatId, proposal.id, 1, 'accepted');

  const diplomat = state.players[diplomatId];
  if (diplomat.leaderId === 'ambassador'
    && diplomat.diplomats
    && diplomat.diplomats.cordialityUsedTurn !== state.turnNumber) {
    diplomat.diplomats.cordialityUsedTurn = state.turnNumber;
    drawIntoHand(state, diplomatId, 1, 'Ambassador Cordiality');
    appendV070Event(state, {
      type: 'cordiality_triggered',
      actor: diplomatId,
      visibility: 'public',
      payload: { proposalId: proposal.id },
    });
  }

  appendV070Event(state, {
    type: 'terms_concluded',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      proposalId: proposal.id,
      result: 'accepted',
      newlyRatified,
    },
  });

  finishOnsetWithoutBattle(state);
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
      break;
    case 'open-channels':
      revealHandTo(state, refusingPlayer, diplomatId);
      runtime.participants[diplomatId].reserveBonus += 1;
      break;
    default:
      throw new V070GameActionError(`${proposal.name} refused effect is not executable yet.`);
  }
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
      return diplomat.zones.hand.some(instanceId => {
        const cardId = state.cardInstances[instanceId]?.cardId;
        const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
        return Boolean(card?.card_form === 'Asset' || card?.effects.some(effect => effect.label === 'Asset'));
      });
    case 'diplomatic-recognition': {
      if (battle.defender !== diplomatId || battle.lastStand) return false;
      const contested = state.board.find(space => space.position === battle.contestedPosition);
      return contested?.controller === battle.attacker;
    }
    default:
      return true;
  }
}

function ratifyProposal(
  state: V070GameState,
  diplomatId: PlayerId,
  proposalId: string,
  reward: number,
  source: 'accepted' | 'imposed',
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
  diplomat.influence = Math.min(INFLUENCE_MAXIMUM, next);

  appendV070Event(state, {
    type: 'influence_changed',
    actor: diplomatId,
    visibility: 'public',
    payload: {
      delta,
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
  if (!playerId) throw new V070GameActionError('Active Terms are missing their Diplomat.');
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
