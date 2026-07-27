import { destinationForCardPlay, diplomatProposalDefinitions, diplomatProposalsById } from '../cards';
import type { CardID, GameEvent, GameState, PlayerID, ProposalDefinition, ProposalID } from '../types';
import { drawFromDeck } from './draw';
import { gainFactionResource, spendFactionResource } from './resources';

export class DiplomatTermsError extends Error {
  constructor(message: string) { super(message); this.name = 'DiplomatTermsError'; }
}

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function draw(game: GameState, playerId: PlayerID, count: number): void {
  const result = drawFromDeck(game.players[playerId], { count });
  game.players[playerId].zones.hand.push(...result.drawnCards);
}

function opponentFor(game: GameState, playerId: PlayerID): PlayerID {
  if (!game.battle) throw new DiplomatTermsError('There is no battle.');
  return game.battle.attacker.playerId === playerId ? game.battle.defender.playerId : game.battle.attacker.playerId;
}

function proposalEligible(game: GameState, diplomatId: PlayerID, proposal: ProposalDefinition): boolean {
  const battle = game.battle;
  if (!battle) return false;
  const diplomat = game.players[diplomatId];
  const opponentId = opponentFor(game, diplomatId);
  const opponent = game.players[opponentId];
  switch (proposal.id) {
    case 'orderly-withdrawal': return battle.attacker.playerId === diplomatId;
    case 'capitulation': return battle.defender.playerId === diplomatId;
    case 'open-channels': return diplomat.zones.hand.length > 0;
    case 'mutual-disarmament': return diplomat.zones.hand.length > 0 && opponent.zones.hand.length > 0;
    case 'prisoner-exchange': return diplomat.zones.graveyard.length > 0 && opponent.zones.graveyard.length > 0;
    case 'rebuilding-pact': return diplomat.zones.hand.some((cardId) => destinationForCardPlay(cardId, 'hand') === 'asset_bank');
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
  return diplomatProposalDefinitions
    .filter((proposal) => proposal.stake <= available && proposalEligible(game, diplomatId, proposal))
    .map((proposal) => proposal.id);
}

export function openDiplomatTermsWindow(game: GameState): boolean {
  if (!game.battle || game.pendingDiplomatChoice) return false;
  for (const playerId of [game.battle.attacker.playerId, game.battle.defender.playerId]) {
    const eligible = eligibleProposals(game, playerId);
    if (eligible.length) {
      game.pendingDiplomatChoice = { kind: 'offer_terms', playerId, opponentId: opponentFor(game, playerId), contestedSpace: game.battle.location, eligibleProposals: eligible, options: ['offer', 'decline'] };
      game.priorityPlayer = playerId;
      return true;
    }
  }
  return false;
}

export function declineTerms(game: GameState, diplomatId: PlayerID): void {
  if (game.pendingDiplomatChoice?.kind !== 'offer_terms' || game.pendingDiplomatChoice.playerId !== diplomatId) throw new DiplomatTermsError('No Terms offer is pending.');
  game.pendingDiplomatChoice = undefined;
  game.priorityPlayer = game.battle?.attacker.playerId ?? game.activePlayer;
}

export function offerTerms(game: GameState, diplomatId: PlayerID, proposalId: ProposalID): void {
  const proposal = diplomatProposalsById.get(proposalId);
  const battle = game.battle;
  if (!proposal || !battle || !eligibleProposals(game, diplomatId).includes(proposalId)) throw new DiplomatTermsError('That Proposal cannot be offered now.');
  const opponentId = opponentFor(game, diplomatId);
  spendFactionResource(game, diplomatId, 'influence', proposal.stake, `Stake for ${proposal.name}`);
  game.players[diplomatId].diplomats ??= { ratifiedProposals: [] };
  game.players[diplomatId].diplomats!.activeTerms = { diplomat: diplomatId, opponent: opponentId, proposalIds: [proposalId], selectedProposalId: proposalId, stake: proposal.stake, contestedSpace: battle.location, attacker: battle.attacker.playerId, defender: battle.defender.playerId };
  game.pendingDiplomatChoice = { kind: 'respond_to_terms', playerId: opponentId, diplomatId, proposalIds: [proposalId], stake: proposal.stake, options: ['accept', 'refuse'] };
  game.priorityPlayer = opponentId;
  log(game, diplomatId, 'terms_offered', `${game.players[diplomatId].name} offered ${proposal.name}.`, { proposalId, stake: proposal.stake });
}

function direction(game: GameState): number {
  const battle = game.battle!;
  const location = game.board.spaces.find((space) => space.id === battle.location)!;
  const origin = game.board.spaces.find((space) => space.id === battle.attackerOrigin)!;
  return Math.sign(location.index - origin.index);
}

function moveOccupant(game: GameState, playerId: PlayerID, toIndex: number): void {
  const from = game.board.spaces.find((space) => space.occupant === playerId);
  const to = game.board.spaces.find((space) => space.index === toIndex);
  if (!from || !to || to.occupant) return;
  delete from.occupant;
  to.occupant = playerId;
  game.players[playerId].occupiedSpaceId = to.id;
}

function withdraw(game: GameState, playerId: PlayerID): void {
  const battle = game.battle!;
  if (playerId === battle.attacker.playerId) return;
  const location = game.board.spaces.find((space) => space.id === battle.location)!;
  moveOccupant(game, playerId, location.index + direction(game));
}

function occupyContested(game: GameState, playerId: PlayerID): void {
  const battle = game.battle!;
  const location = game.board.spaces.find((space) => space.id === battle.location)!;
  const from = game.board.spaces.find((space) => space.occupant === playerId);
  if (from && !location.occupant) {
    delete from.occupant;
    location.occupant = playerId;
    game.players[playerId].occupiedSpaceId = location.id;
  }
}

function captureContested(game: GameState, playerId: PlayerID, spaceId?: string): void {
  const activeSpaceId = spaceId ?? game.players[playerId].diplomats?.activeTerms?.contestedSpace ?? game.battle?.location;
  const space = game.board.spaces.find((candidate) => candidate.id === activeSpaceId);
  if (!space?.territoryId) return;
  const old = space.controller;
  if (old && old !== playerId) game.players[old].controlledTerritories = game.players[old].controlledTerritories.filter((id) => id !== space.territoryId);
  if (!game.players[playerId].controlledTerritories.includes(space.territoryId)) game.players[playerId].controlledTerritories.push(space.territoryId);
  space.controller = playerId;
  delete space.capturePendingBy;
}

function bankableCards(game: GameState, playerId: PlayerID): CardID[] {
  const player = game.players[playerId];
  const capacity = Math.max(player.controlledTerritories.length - player.zones.assetBank.length, 0);
  if (capacity === 0) return [];
  return player.zones.hand.filter((cardId) => destinationForCardPlay(cardId, 'hand') === 'asset_bank');
}

function finalizeAcceptedTerms(game: GameState, diplomatId: PlayerID): void {
  const diplomat = game.players[diplomatId];
  const terms = diplomat.diplomats!.activeTerms!;
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
    draw(game, diplomat.id, 1);
  }
  game.pendingDiplomatChoice = undefined;
  game.battle = undefined;
  game.phase = 'action_after_movement';
  game.priorityPlayer = game.activePlayer;
  diplomat.diplomats!.activeTerms = undefined;
  log(game, diplomat.id, 'terms_accepted', `${game.players[terms.opponent].name} accepted the Terms.`, { proposalId, newlyRatified });
}

function resolveAcceptedEffect(game: GameState, diplomatId: PlayerID, proposalId: ProposalID): boolean {
  const terms = game.players[diplomatId].diplomats!.activeTerms!;
  const opponent = terms.opponent;
  switch (proposalId) {
    case 'de-escalation': withdraw(game, terms.defender); draw(game, opponent, 1); break;
    case 'orderly-withdrawal': draw(game, opponent, 1); break;
    case 'capitulation': withdraw(game, diplomatId); occupyContested(game, opponent); draw(game, opponent, 1); break;
    case 'open-channels':
      log(game, diplomatId, 'hands_revealed', 'Both players revealed their hands for Open Channels.', { [diplomatId]: [...game.players[diplomatId].zones.hand], [opponent]: [...game.players[opponent].zones.hand] });
      withdraw(game, terms.defender);
      draw(game, opponent, 1);
      break;
    case 'mutual-disarmament':
      game.pendingDiplomatChoice = { kind: 'mutual_disarmament', playerId: diplomatId, diplomatId, opponentId: opponent, stage: 'diplomat', handOptions: [...game.players[diplomatId].zones.hand] };
      game.priorityPlayer = diplomatId;
      return true;
    case 'prisoner-exchange':
      game.pendingDiplomatChoice = { kind: 'prisoner_exchange', playerId: diplomatId, diplomatId, opponentId: opponent, stage: 'diplomat', graveyardOptions: [...game.players[diplomatId].zones.graveyard], optional: true };
      game.priorityPlayer = diplomatId;
      return true;
    case 'rebuilding-pact':
      game.pendingDiplomatChoice = { kind: 'rebuilding_pact', playerId: diplomatId, diplomatId, opponentId: opponent, stage: 'diplomat', handOptions: bankableCards(game, diplomatId), optional: true };
      game.priorityPlayer = diplomatId;
      return true;
    case 'ultimatum': withdraw(game, opponent); occupyContested(game, diplomatId); break;
    case 'diplomatic-recognition': captureContested(game, diplomatId, terms.contestedSpace); withdraw(game, opponent); draw(game, opponent, 2); break;
  }
  return false;
}

function applyRefusedEffect(game: GameState, diplomatId: PlayerID, proposalId: ProposalID): boolean {
  const terms = game.players[diplomatId].diplomats!.activeTerms!;
  const side = game.battle!.attacker.playerId === diplomatId ? game.battle!.attacker : game.battle!.defender;
  switch (proposalId) {
    case 'de-escalation': draw(game, diplomatId, 1); break;
    case 'orderly-withdrawal': side.modifiers += 1; terms.refusedBattleModifier = 1; break;
    case 'capitulation': terms.refusedLossDraw = 2; break;
    case 'open-channels':
      log(game, diplomatId, 'opponent_hand_viewed', `${game.players[diplomatId].name} looked at the opponent's hand.`, { hand: [...game.players[terms.opponent].zones.hand] });
      side.battleDrawCount += 1;
      terms.refusedBattleDrawBonus = 1;
      break;
    case 'mutual-disarmament':
      if (game.players[diplomatId].zones.hand.length) {
        game.pendingDiplomatChoice = { kind: 'mutual_disarmament', playerId: diplomatId, diplomatId, opponentId: terms.opponent, stage: 'diplomat', handOptions: [...game.players[diplomatId].zones.hand] };
        game.priorityPlayer = diplomatId;
        return true;
      }
      break;
    case 'prisoner-exchange': break;
    case 'rebuilding-pact': break;
    case 'ultimatum': side.modifiers += 1; terms.refusedBattleModifier = 1; break;
    case 'diplomatic-recognition': terms.refusedImmediateCapture = true; break;
  }
  return false;
}

function openLeverage(game: GameState, diplomatId: PlayerID): void {
  const maximum = game.players[diplomatId].resources?.influence?.value ?? 0;
  game.pendingDiplomatChoice = { kind: 'leverage', playerId: diplomatId, maximum, options: Array.from({ length: maximum + 1 }, (_, index) => index) };
  game.priorityPlayer = diplomatId;
}

export function respondToTerms(game: GameState, opponentId: PlayerID, response: 'accept' | 'refuse'): void {
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind !== 'respond_to_terms' || pending.playerId !== opponentId) throw new DiplomatTermsError('No Terms response is pending.');
  const diplomat = game.players[pending.diplomatId];
  const terms = diplomat.diplomats?.activeTerms;
  if (!terms) throw new DiplomatTermsError('Active Terms are missing.');
  const proposalId = terms.selectedProposalId!;
  terms.response = response === 'accept' ? 'accepted' : 'refused';
  game.pendingDiplomatChoice = undefined;
  if (response === 'accept') {
    if (!resolveAcceptedEffect(game, diplomat.id, proposalId)) finalizeAcceptedTerms(game, diplomat.id);
  } else {
    const choiceOpened = applyRefusedEffect(game, diplomat.id, proposalId);
    if (!choiceOpened) openLeverage(game, diplomat.id);
    log(game, opponentId, 'terms_refused', `${game.players[opponentId].name} refused the Terms.`, { proposalId });
  }
}

function requireSingleChoice(cardIds: CardID[], options: CardID[], optional: boolean): CardID | undefined {
  if (cardIds.length > 1 || (!optional && cardIds.length !== 1)) throw new DiplomatTermsError('Choose exactly one card.');
  const cardId = cardIds[0];
  if (cardId && !options.includes(cardId)) throw new DiplomatTermsError('That card is not an available choice.');
  return cardId;
}

export function resolveProposalCardChoice(game: GameState, playerId: PlayerID, cardIds: CardID[]): void {
  const pending = game.pendingDiplomatChoice;
  if (!pending || pending.playerId !== playerId) throw new DiplomatTermsError('No Proposal card choice is pending.');
  if (pending.kind === 'mutual_disarmament') {
    const cardId = requireSingleChoice(cardIds, pending.handOptions, false)!;
    const player = game.players[playerId];
    player.zones.hand.splice(player.zones.hand.indexOf(cardId), 1);
    player.zones.discard.push(cardId);
    const terms = game.players[pending.diplomatId].diplomats!.activeTerms!;
    if (terms.response === 'refused') {
      const side = game.battle!.attacker.playerId === pending.diplomatId ? game.battle!.attacker : game.battle!.defender;
      side.battleDrawCount += 1;
      terms.refusedBattleDrawBonus = 1;
      openLeverage(game, pending.diplomatId);
      return;
    }
    if (pending.stage === 'diplomat') {
      game.pendingDiplomatChoice = { ...pending, playerId: pending.opponentId, stage: 'opponent', handOptions: [...game.players[pending.opponentId].zones.hand] };
      game.priorityPlayer = pending.opponentId;
      return;
    }
    draw(game, pending.opponentId, 1);
    withdraw(game, terms.defender);
    finalizeAcceptedTerms(game, pending.diplomatId);
    return;
  }
  if (pending.kind === 'prisoner_exchange') {
    const cardId = requireSingleChoice(cardIds, pending.graveyardOptions, true);
    if (cardId) {
      const player = game.players[playerId];
      player.zones.graveyard.splice(player.zones.graveyard.indexOf(cardId), 1);
      player.zones.discard.push(cardId);
    }
    if (pending.stage === 'diplomat') {
      game.pendingDiplomatChoice = { ...pending, playerId: pending.opponentId, stage: 'opponent', graveyardOptions: [...game.players[pending.opponentId].zones.graveyard] };
      game.priorityPlayer = pending.opponentId;
      return;
    }
    const terms = game.players[pending.diplomatId].diplomats!.activeTerms!;
    withdraw(game, terms.defender);
    finalizeAcceptedTerms(game, pending.diplomatId);
    return;
  }
  if (pending.kind === 'rebuilding_pact') {
    const cardId = requireSingleChoice(cardIds, pending.handOptions, true);
    if (cardId) {
      const player = game.players[playerId];
      player.zones.hand.splice(player.zones.hand.indexOf(cardId), 1);
      player.zones.assetBank.push(cardId);
    }
    if (pending.stage === 'diplomat') {
      game.pendingDiplomatChoice = { ...pending, playerId: pending.opponentId, stage: 'opponent', handOptions: bankableCards(game, pending.opponentId) };
      game.priorityPlayer = pending.opponentId;
      return;
    }
    const terms = game.players[pending.diplomatId].diplomats!.activeTerms!;
    withdraw(game, terms.defender);
    finalizeAcceptedTerms(game, pending.diplomatId);
    return;
  }
  throw new DiplomatTermsError('The pending choice is not a Proposal card choice.');
}

export function applyLeverage(game: GameState, diplomatId: PlayerID, amount: number): void {
  const terms = game.players[diplomatId].diplomats?.activeTerms;
  if (!game.battle || terms?.response !== 'refused' || !Number.isInteger(amount) || amount < 0 || amount > (game.players[diplomatId].resources?.influence?.value ?? 0)) throw new DiplomatTermsError('Leverage is not available.');
  spendFactionResource(game, diplomatId, 'influence', amount, 'Leverage');
  const side = game.battle.attacker.playerId === diplomatId ? game.battle.attacker : game.battle.defender;
  side.modifiers += amount;
  terms.leverageSpent = amount;
  game.pendingDiplomatChoice = undefined;
  game.priorityPlayer = game.battle.attacker.playerId;
  log(game, diplomatId, 'leverage_used', `${game.players[diplomatId].name} spent ${amount} Influence on Leverage.`, { amount });
}

export function resolveRefusedTermsBattle(game: GameState, winner: PlayerID): void {
  for (const diplomat of Object.values(game.players).filter((player) => player.factionId === 'diplomats')) {
    const terms = diplomat.diplomats?.activeTerms;
    if (terms?.response !== 'refused') continue;
    const proposalId = terms.selectedProposalId!;
    if (winner === diplomat.id) {
      gainFactionResource(game, diplomat.id, 'influence', terms.stake, 'Return imposed Stake');
      if (!diplomat.diplomats!.ratifiedProposals.includes(proposalId)) diplomat.diplomats!.ratifiedProposals.push(proposalId);
      gainFactionResource(game, diplomat.id, 'influence', proposalId === 'ultimatum' ? 2 : proposalId === 'diplomatic-recognition' ? 0 : 1, 'Imposed Proposal');
      if (terms.refusedImmediateCapture) captureContested(game, diplomat.id, terms.contestedSpace);
    } else {
      if (terms.refusedLossDraw) draw(game, diplomat.id, terms.refusedLossDraw);
      if (proposalId === 'prisoner-exchange' && diplomat.zones.graveyard.length) {
        game.pendingDiplomatChoice = { kind: 'prisoner_exchange', playerId: diplomat.id, diplomatId: diplomat.id, opponentId: terms.opponent, stage: 'diplomat', graveyardOptions: [...diplomat.zones.graveyard], optional: true };
        game.priorityPlayer = diplomat.id;
        return;
      }
      if (proposalId === 'rebuilding-pact') {
        const options = bankableCards(game, diplomat.id);
        if (options.length) {
          game.pendingDiplomatChoice = { kind: 'rebuilding_pact', playerId: diplomat.id, diplomatId: diplomat.id, opponentId: terms.opponent, stage: 'opponent', handOptions: options, optional: true };
          game.priorityPlayer = diplomat.id;
          return;
        }
      }
      if (diplomat.leaderName === 'Senator' && terms.stake > 0 && diplomat.factionTriggerUsage?.senator_political_capital !== game.turn) {
        diplomat.factionTriggerUsage ??= {};
        diplomat.factionTriggerUsage.senator_political_capital = game.turn;
        game.pendingDiplomatChoice = { kind: 'political_capital', playerId: diplomat.id, lostStake: terms.stake, handOptions: [...diplomat.zones.hand] };
        game.priorityPlayer = diplomat.id;
      }
    }
    if (!game.pendingDiplomatChoice) diplomat.diplomats!.activeTerms = undefined;
  }
}

export function resolveRefusedTermsWithoutWinner(game: GameState, diplomatId: PlayerID): void {
  const diplomat = game.players[diplomatId];
  const terms = diplomat.diplomats?.activeTerms;
  if (!terms || terms.response !== 'refused' || !game.battle) throw new DiplomatTermsError('There are no refused Terms to end without a winner.');
  gainFactionResource(game, diplomatId, 'influence', terms.stake, 'Return Stake after no-winner battle');
  withdraw(game, diplomatId);
  game.battle = undefined;
  game.phase = 'action_after_movement';
  game.priorityPlayer = game.activePlayer;
  game.pendingDiplomatChoice = undefined;
  diplomat.diplomats!.activeTerms = undefined;
  log(game, diplomatId, 'battle_ended_without_winner', 'The battle ended without a winner following refused Terms.', { proposalId: terms.selectedProposalId });
}

export function resolvePoliticalCapital(game: GameState, playerId: PlayerID, cardIds: CardID[]): void {
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind !== 'political_capital' || pending.playerId !== playerId || cardIds.length > pending.lostStake || cardIds.some((id) => !pending.handOptions.includes(id))) throw new DiplomatTermsError('Invalid Political Capital choice.');
  const player = game.players[playerId];
  for (const id of cardIds) {
    const index = player.zones.hand.indexOf(id);
    if (index >= 0) {
      player.zones.hand.splice(index, 1);
      player.zones.graveyard.push(id);
      gainFactionResource(game, playerId, 'influence', 1, 'Political Capital');
    }
  }
  player.diplomats!.activeTerms = undefined;
  game.pendingDiplomatChoice = undefined;
  game.priorityPlayer = game.activePlayer;
}

export function checkPeaceTreatyVictory(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  if (player?.factionId !== 'diplomats' || (player.diplomats?.ratifiedProposals.length ?? 0) < 5) return false;
  game.winner = playerId;
  game.phase = 'game_over';
  game.priorityPlayer = playerId;
  log(game, playerId, 'peace_treaty_completed', `${player.name} completed the Peace Treaty.`);
  return true;
}
