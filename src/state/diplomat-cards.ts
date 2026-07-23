import { diplomatProposalsById } from '../cards';
import type { CardID, GameEvent, GameState, PlayerID, ProposalID } from '../types';
import { drawFromDeck } from './draw';
import { gainFactionResource } from './resources';
import { resolveRefusedTermsWithoutWinner } from './diplomat-terms';

export const DIPLOMAT_REACTIVE_CARDS = {
  tradeConcessions: 'diplomats-trade-concessions',
  safeConduct: 'diplomats-safe-conduct',
  neutralObservers: 'diplomats-neutral-observers',
  goodFaith: 'diplomats-good-faith',
  diplomaticLatitude: 'diplomats-diplomatic-latitude',
  nonbindingResolution: 'diplomats-nonbinding-resolution',
  gunboatDiplomacy: 'diplomats-gunboat-diplomacy',
} as const;

export type DiplomatReactiveCardID = typeof DIPLOMAT_REACTIVE_CARDS[keyof typeof DIPLOMAT_REACTIVE_CARDS];

export interface DiplomatTermsCardState {
  setAsideCards: CardID[];
  goodFaithCard?: CardID;
  latitudeCard?: CardID;
  nonbindingCard?: CardID;
  tradeConcessionsCard?: CardID;
  gunboatCard?: CardID;
  neutralObserversUsed?: boolean;
  safeConductAvailable?: boolean;
}

function event(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function removeOne(zone: CardID[], cardId: CardID): void {
  const index = zone.indexOf(cardId);
  if (index < 0) throw new Error(`${cardId} is not in the required zone.`);
  zone.splice(index, 1);
}

function draw(game: GameState, playerId: PlayerID, count: number): void {
  const result = drawFromDeck(game.players[playerId], { count });
  game.players[playerId].zones.hand.push(...result.drawnCards);
}

function stateFor(game: GameState, diplomatId: PlayerID): DiplomatTermsCardState {
  const diplomat = game.players[diplomatId];
  diplomat.diplomats ??= { ratifiedProposals: [] };
  const state = diplomat.diplomats.termsCards;
  if (state) return state;
  const created: DiplomatTermsCardState = { setAsideCards: [] };
  diplomat.diplomats.termsCards = created;
  return created;
}

function activeTerms(game: GameState, diplomatId: PlayerID) {
  const terms = game.players[diplomatId]?.diplomats?.activeTerms;
  if (!terms) throw new Error('There are no active Terms.');
  return terms;
}

function requireBeforeResponse(game: GameState, diplomatId: PlayerID): void {
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind !== 'respond_to_terms' || pending.diplomatId !== diplomatId) throw new Error('This card can only be used before the opponent responds to Terms.');
}

export function useTradeConcessions(game: GameState, diplomatId: PlayerID): void {
  requireBeforeResponse(game, diplomatId);
  const player = game.players[diplomatId];
  const cardId = DIPLOMAT_REACTIVE_CARDS.tradeConcessions;
  removeOne(player.zones.hand, cardId);
  stateFor(game, diplomatId).tradeConcessionsCard = cardId;
  stateFor(game, diplomatId).setAsideCards.push(cardId);
  event(game, diplomatId, 'trade_concessions_revealed', `${player.name} revealed Trade Concessions.`);
}

export function useGoodFaith(game: GameState, diplomatId: PlayerID, cardId: CardID): void {
  requireBeforeResponse(game, diplomatId);
  const player = game.players[diplomatId];
  const assetId = DIPLOMAT_REACTIVE_CARDS.goodFaith;
  removeOne(player.zones.assetBank, assetId);
  player.zones.discard.push(assetId);
  draw(game, diplomatId, 1);
  if (!player.zones.hand.includes(cardId)) throw new Error('Good Faith must set aside a card from hand.');
  removeOne(player.zones.hand, cardId);
  const state = stateFor(game, diplomatId);
  state.goodFaithCard = cardId;
  state.setAsideCards.push(cardId);
  event(game, diplomatId, 'good_faith_used', `${player.name} used Good Faith and set aside a card.`);
}

export function useDiplomaticLatitude(game: GameState, diplomatId: PlayerID, secondProposalId: ProposalID): void {
  requireBeforeResponse(game, diplomatId);
  const player = game.players[diplomatId];
  const terms = activeTerms(game, diplomatId);
  const first = diplomatProposalsById.get(terms.proposalIds[0]);
  const second = diplomatProposalsById.get(secondProposalId);
  if (!first || !second || first.stake !== second.stake || terms.proposalIds.includes(secondProposalId)) throw new Error('Diplomatic Latitude requires a different eligible Proposal with the same Stake.');
  const cardId = DIPLOMAT_REACTIVE_CARDS.diplomaticLatitude;
  removeOne(player.zones.hand, cardId);
  stateFor(game, diplomatId).latitudeCard = cardId;
  stateFor(game, diplomatId).setAsideCards.push(cardId);
  terms.proposalIds.push(secondProposalId);
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind === 'respond_to_terms') pending.proposalIds = [...terms.proposalIds];
  event(game, diplomatId, 'diplomatic_latitude_used', `${player.name} offered two Proposals with the same Stake.`, { proposalIds: terms.proposalIds });
}

export function useNonbindingResolution(game: GameState, diplomatId: PlayerID): void {
  requireBeforeResponse(game, diplomatId);
  const player = game.players[diplomatId];
  const cardId = DIPLOMAT_REACTIVE_CARDS.nonbindingResolution;
  removeOne(player.zones.hand, cardId);
  stateFor(game, diplomatId).nonbindingCard = cardId;
  stateFor(game, diplomatId).setAsideCards.push(cardId);
  event(game, diplomatId, 'nonbinding_resolution_revealed', `${player.name} revealed Nonbinding Resolution.`);
}

export function useGunboatDiplomacy(game: GameState, diplomatId: PlayerID): void {
  requireBeforeResponse(game, diplomatId);
  const player = game.players[diplomatId];
  const cardId = DIPLOMAT_REACTIVE_CARDS.gunboatDiplomacy;
  removeOne(player.zones.hand, cardId);
  stateFor(game, diplomatId).gunboatCard = cardId;
  stateFor(game, diplomatId).setAsideCards.push(cardId);
  event(game, diplomatId, 'gunboat_diplomacy_revealed', `${player.name} revealed Gunboat Diplomacy.`);
}

export function resolveReactiveCardsAfterResponse(game: GameState, diplomatId: PlayerID, accepted: boolean): void {
  const player = game.players[diplomatId];
  const terms = activeTerms(game, diplomatId);
  const state = stateFor(game, diplomatId);
  if (state.goodFaithCard) {
    const cardId = state.goodFaithCard;
    if (accepted) player.zones.graveyard.push(cardId); else player.zones.hand.push(cardId);
    state.goodFaithCard = undefined;
  }
  if (state.tradeConcessionsCard) {
    if (accepted) {
      game.pendingDiplomatChoice = { kind: 'trade_concessions', playerId: terms.opponent, diplomatId, options: ['draw_two', 'bank_asset'] };
      game.priorityPlayer = terms.opponent;
    } else player.zones.hand.push(state.tradeConcessionsCard);
    state.tradeConcessionsCard = undefined;
  }
  if (state.nonbindingCard) {
    if (accepted && !player.diplomats!.ratifiedProposals.includes(terms.selectedProposalId!)) {
      game.pendingDiplomatChoice = { kind: 'nonbinding_resolution', playerId: terms.opponent, diplomatId, proposalId: terms.selectedProposalId!, options: ['ratify', 'decline_ratification'] };
      game.priorityPlayer = terms.opponent;
    } else {
      player.zones.discard.push(state.nonbindingCard);
      draw(game, diplomatId, 1);
    }
    state.nonbindingCard = undefined;
  }
  if (state.gunboatCard) {
    if (accepted) player.zones.discard.push(state.gunboatCard);
    else if (game.battle) {
      const side = game.battle.attacker.playerId === diplomatId ? game.battle.attacker : game.battle.defender;
      side.modifiers += 2;
      side.battleDrawPlayed.push({ cardId: state.gunboatCard, owner: diplomatId, origin: 'hand', faceDown: false, canceled: false });
    }
    state.gunboatCard = undefined;
  }
  if (state.latitudeCard && !accepted) {
    game.pendingDiplomatChoice = { kind: 'latitude_refusal', playerId: diplomatId, diplomatId, proposalIds: [...terms.proposalIds] };
    game.priorityPlayer = diplomatId;
  }
}

export function resolveTradeConcessions(game: GameState, opponentId: PlayerID, choice: 'draw_two' | 'bank_asset', cardId?: CardID): void {
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind !== 'trade_concessions' || pending.playerId !== opponentId) throw new Error('No Trade Concessions choice is pending.');
  const opponent = game.players[opponentId];
  if (choice === 'draw_two') draw(game, opponentId, 2);
  else {
    if (!cardId || !opponent.zones.hand.includes(cardId)) throw new Error('Choose an eligible card from hand to bank.');
    removeOne(opponent.zones.hand, cardId);
    opponent.zones.assetBank.push(cardId);
  }
  const diplomat = game.players[pending.diplomatId];
  diplomat.zones.discard.push(DIPLOMAT_REACTIVE_CARDS.tradeConcessions);
  draw(game, pending.diplomatId, 1);
  game.pendingDiplomatChoice = undefined;
  game.priorityPlayer = game.activePlayer;
}

export function resolveNonbindingResolution(game: GameState, opponentId: PlayerID, choice: 'ratify' | 'decline_ratification'): void {
  const pending = game.pendingDiplomatChoice;
  if (pending?.kind !== 'nonbinding_resolution' || pending.playerId !== opponentId) throw new Error('No Nonbinding Resolution choice is pending.');
  const diplomat = game.players[pending.diplomatId];
  if (choice === 'decline_ratification') gainFactionResource(game, pending.diplomatId, 'influence', 2, 'Nonbinding Resolution');
  else if (!diplomat.diplomats!.ratifiedProposals.includes(pending.proposalId)) diplomat.diplomats!.ratifiedProposals.push(pending.proposalId);
  diplomat.zones.discard.push(DIPLOMAT_REACTIVE_CARDS.nonbindingResolution);
  draw(game, pending.diplomatId, 1);
  game.pendingDiplomatChoice = undefined;
  game.priorityPlayer = game.activePlayer;
}

export function useNeutralObservers(game: GameState, diplomatId: PlayerID): void {
  const terms = activeTerms(game, diplomatId);
  if (terms.response !== 'refused' || !game.battle || game.battle.stage !== 'hand_commit') throw new Error('Neutral Observers is only available after Terms are refused and before hand commitments.');
  const player = game.players[diplomatId];
  removeOne(player.zones.assetBank, DIPLOMAT_REACTIVE_CARDS.neutralObservers);
  player.zones.discard.push(DIPLOMAT_REACTIVE_CARDS.neutralObservers);
  stateFor(game, diplomatId).neutralObserversUsed = true;
  game.priorityPlayer = terms.opponent;
  game.battle.effectsResolved.push(`neutral_observers:${diplomatId}`);
  event(game, diplomatId, 'neutral_observers_used', `${player.name} required the opponent to commit first and face up.`);
}

export function useSafeConduct(game: GameState, diplomatId: PlayerID): void {
  const player = game.players[diplomatId];
  if (!player.zones.assetBank.includes(DIPLOMAT_REACTIVE_CARDS.safeConduct)) throw new Error('Safe Conduct is not banked.');
  removeOne(player.zones.assetBank, DIPLOMAT_REACTIVE_CARDS.safeConduct);
  player.zones.discard.push(DIPLOMAT_REACTIVE_CARDS.safeConduct);
  resolveRefusedTermsWithoutWinner(game, diplomatId);
  event(game, diplomatId, 'safe_conduct_used', `${player.name} withdrew under Safe Conduct; the battle ended without a winner.`);
}
