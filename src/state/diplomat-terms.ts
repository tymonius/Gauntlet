import { diplomatProposalDefinitions, diplomatProposalsById } from '../cards/diplomats';
import type { GameEvent, GameState, PlayerID, ProposalDefinition, ProposalID } from '../types';
import { gainFactionResource, spendFactionResource } from './resources';

export class DiplomatTermsError extends Error {
  constructor(message: string) { super(message); this.name = 'DiplomatTermsError'; }
}

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function proposalEligible(game: GameState, diplomatId: PlayerID, proposal: ProposalDefinition): boolean {
  const battle = game.battle;
  if (!battle) return false;
  const diplomat = game.players[diplomatId];
  const opponentId = battle.attacker.playerId === diplomatId ? battle.defender.playerId : battle.attacker.playerId;
  const opponent = game.players[opponentId];
  switch (proposal.id) {
    case 'orderly-withdrawal': return battle.attacker.playerId === diplomatId;
    case 'capitulation': return battle.defender.playerId === diplomatId;
    case 'open-channels': return diplomat.zones.hand.length > 0;
    case 'mutual-disarmament': return diplomat.zones.hand.length > 0 && opponent.zones.hand.length > 0;
    case 'prisoner-exchange': return diplomat.zones.graveyard.length > 0 && opponent.zones.graveyard.length > 0;
    case 'rebuilding-pact': return diplomat.zones.hand.length > 0;
    case 'diplomatic-recognition': {
      const location = game.board.spaces.find((space) => space.id === battle.location);
      return battle.defender.playerId === diplomatId && location?.kind === 'territory' && location.occupant === diplomatId && location.controller === opponentId;
    }
    default: return true;
  }
}

export function eligibleProposals(game: GameState, diplomatId: PlayerID): ProposalID[] {
  const player = game.players[diplomatId];
  if (!player || player.factionId !== 'diplomats' || !game.battle || game.battle.stage !== 'hand_commit') return [];
  const available = player.resources?.influence?.value ?? 0;
  return diplomatProposalDefinitions.filter((proposal) => proposal.stake <= available && proposalEligible(game, diplomatId, proposal)).map((proposal) => proposal.id);
}

export function offerTerms(game: GameState, diplomatId: PlayerID, proposalId: ProposalID): void {
  const proposal = diplomatProposalsById.get(proposalId);
  const battle = game.battle;
  if (!proposal || !battle || !eligibleProposals(game, diplomatId).includes(proposalId)) throw new DiplomatTermsError('That Proposal cannot be offered now.');
  const opponentId = battle.attacker.playerId === diplomatId ? battle.defender.playerId : battle.attacker.playerId;
  spendFactionResource(game, diplomatId, 'influence', proposal.stake, `Stake for ${proposal.name}`);
  game.players[diplomatId].diplomats ??= { ratifiedProposals: [] };
  game.players[diplomatId].diplomats!.activeTerms = {
    diplomat: diplomatId, opponent: opponentId, proposalIds: [proposalId], selectedProposalId: proposalId,
    stake: proposal.stake, contestedSpace: battle.location, attacker: battle.attacker.playerId, defender: battle.defender.playerId,
  };
  game.pendingDiplomatChoice = { kind: 'respond_to_terms', playerId: opponentId, diplomatId, proposalIds: [proposalId], stake: proposal.stake, options: ['accept', 'refuse'] };
  game.priorityPlayer = opponentId;
  log(game, diplomatId, 'terms_offered', `${game.players[diplomatId].name} offered ${proposal.name}.`, { proposalId, stake: proposal.stake });
}

export function respondToTerms(game: GameState, opponentId: PlayerID, response: 'accept' | 'refuse'): void {
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind !== 'respond_to_terms' || pending.playerId !== opponentId) throw new DiplomatTermsError('No Terms response is pending.');
  const diplomat = game.players[pending.diplomatId];
  const terms = diplomat.diplomats?.activeTerms;
  if (!terms) throw new DiplomatTermsError('Active Terms are missing.');
  terms.response = response === 'accept' ? 'accepted' : 'refused';
  game.pendingDiplomatChoice = undefined;
  if (response === 'accept') {
    const proposalId = terms.selectedProposalId!;
    const newlyRatified = !diplomat.diplomats!.ratifiedProposals.includes(proposalId);
    gainFactionResource(game, diplomat.id, 'influence', terms.stake, 'Return accepted Stake');
    if (newlyRatified) {
      diplomat.diplomats!.ratifiedProposals.push(proposalId);
      gainFactionResource(game, diplomat.id, 'influence', terms.stake, 'New Treaty Article');
    }
    if (diplomat.leaderName === 'Ambassador' && diplomat.factionTriggerUsage?.ambassador_cordiality !== game.turn) {
      diplomat.factionTriggerUsage ??= {};
      diplomat.factionTriggerUsage.ambassador_cordiality = game.turn;
      const card = diplomat.zones.deck.shift(); if (card) diplomat.zones.hand.push(card);
    }
    game.battle = undefined;
    game.phase = 'action_after_movement';
    game.priorityPlayer = game.activePlayer;
    log(game, diplomat.id, 'terms_accepted', `${game.players[opponentId].name} accepted the Terms.`, { proposalId, newlyRatified });
  } else {
    game.priorityPlayer = terms.attacker;
    log(game, opponentId, 'terms_refused', `${game.players[opponentId].name} refused the Terms.`, { proposalId: terms.selectedProposalId });
  }
}

export function applyLeverage(game: GameState, diplomatId: PlayerID, amount: number): void {
  const terms = game.players[diplomatId].diplomats?.activeTerms;
  if (!game.battle || terms?.response !== 'refused' || !Number.isInteger(amount) || amount < 0) throw new DiplomatTermsError('Leverage is not available.');
  spendFactionResource(game, diplomatId, 'influence', amount, 'Leverage');
  const side = game.battle.attacker.playerId === diplomatId ? game.battle.attacker : game.battle.defender;
  side.modifiers += amount;
  terms.leverageSpent = amount;
  log(game, diplomatId, 'leverage_used', `${game.players[diplomatId].name} spent ${amount} Influence on Leverage.`, { amount });
}

export function checkPeaceTreatyVictory(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  if (player?.factionId !== 'diplomats' || (player.diplomats?.ratifiedProposals.length ?? 0) < 5) return false;
  game.winner = playerId; game.phase = 'game_over'; game.priorityPlayer = playerId;
  log(game, playerId, 'peace_treaty_completed', `${player.name} completed the Peace Treaty.`);
  return true;
}
