import { v06CanonicalContent } from '../content';
import type { CardID, GameEvent, GameState, PlayerID, SpaceID } from '../types';
import { gainFactionResource, setFactionResource, spendFactionResource } from './resources';

export class FinancierError extends Error {
  constructor(message: string) { super(message); this.name = 'FinancierError'; }
}

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

export function cardValue(cardId: CardID): number {
  return v06CanonicalContent.cardsById.get(cardId)?.cost ?? 0;
}

function financier(game: GameState, playerId: PlayerID) {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'financiers' || !player.financiers) throw new FinancierError(`${playerId} is not a Financier.`);
  return player;
}

export function treasuryValue(game: GameState, playerId: PlayerID): number {
  return financier(game, playerId).financiers!.treasury.reduce((total, id) => total + cardValue(id), 0);
}

export function capitalLimit(game: GameState, playerId: PlayerID): number {
  const player = financier(game, playerId);
  return player.controlledTerritories.length + treasuryValue(game, playerId);
}

export function placeInTreasury(game: GameState, playerId: PlayerID, cardId: CardID): void {
  const player = financier(game, playerId);
  if (game.phase !== 'action_after_movement' || player.actionsRemaining < 1) throw new FinancierError('Treasury placement requires an after-movement Action Opportunity.');
  const index = player.zones.hand.indexOf(cardId);
  if (index < 0) throw new FinancierError('The selected card is not in hand.');
  player.zones.hand.splice(index, 1);
  player.financiers!.treasury.push(cardId);
  player.actionsRemaining -= 1;
  player.hasPlayedActionThisTurn = true;
  log(game, playerId, 'treasury_card_added', `${player.name} placed a card in Treasury.`, { cardId, value: cardValue(cardId), capitalLimit: capitalLimit(game, playerId) });
}

export function deedOwner(game: GameState, spaceId: SpaceID): PlayerID | undefined {
  return Object.values(game.players).find((player) => player.financiers?.deedsOwned.includes(spaceId))?.id;
}

export function deedCount(game: GameState, playerId: PlayerID): number {
  return financier(game, playerId).financiers!.deedsOwned.length;
}

export function deedCost(game: GameState, buyerId: PlayerID, spaceId: SpaceID, positionModifierOverride?: number): number {
  const buyer = financier(game, buyerId);
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space || space.kind !== 'territory') throw new FinancierError('Deeds exist only for Territories in the Gauntlet.');
  const base = Math.min(deedCount(game, buyerId) + 1, 6);
  const positionModifier = positionModifierOverride ?? (space.controller === buyerId ? -1 : space.occupant === buyerId ? 0 : 1);
  const owner = deedOwner(game, spaceId);
  const premium = owner && owner !== buyerId ? Math.min(deedCount(game, owner), 6) : 0;
  return Math.max(base + positionModifier + premium, 1);
}

export function buyDeed(game: GameState, buyerId: PlayerID, spaceId: SpaceID, collateralCardId?: CardID, positionModifierOverride?: number): number {
  const buyer = financier(game, buyerId);
  const owner = deedOwner(game, spaceId);
  if (owner === buyerId) throw new FinancierError('You already own this Deed.');
  const cost = deedCost(game, buyerId, spaceId, positionModifierOverride);
  let collateralContribution = 0;
  if (collateralCardId !== undefined) {
    if (buyer.leaderName !== 'Banker' || buyer.financiers!.lineOfCreditUsedTurn === game.turn) throw new FinancierError('Line of Credit is not available.');
    const inHand = buyer.zones.hand.includes(collateralCardId);
    const inTreasury = buyer.financiers!.treasury.includes(collateralCardId);
    if (!inHand && !inTreasury) throw new FinancierError('Collateral must come from hand or Treasury.');
    collateralContribution = Math.min(cardValue(collateralCardId), Math.floor(cost / 2));
    if (inHand) buyer.zones.hand.splice(buyer.zones.hand.indexOf(collateralCardId), 1);
    else buyer.financiers!.treasury.splice(buyer.financiers!.treasury.indexOf(collateralCardId), 1);
    buyer.zones.discard.push(collateralCardId);
    buyer.financiers!.lineOfCreditUsedTurn = game.turn;
  }
  spendFactionResource(game, buyerId, 'capital', cost - collateralContribution, `Buy Deed for ${spaceId}`);
  if (owner) game.players[owner].financiers!.deedsOwned = game.players[owner].financiers!.deedsOwned.filter((id) => id !== spaceId);
  buyer.financiers!.deedsOwned.push(spaceId);
  log(game, buyerId, owner ? 'deed_bought_out' : 'deed_bought', `${buyer.name} acquired the Deed to ${spaceId}.`, { spaceId, cost, collateralContribution, previousOwner: owner });
  return cost;
}

export function gainDeedIncome(game: GameState, playerId: PlayerID): number {
  const amount = deedCount(game, playerId);
  if (amount > 0) gainFactionResource(game, playerId, 'capital', amount, 'Deed income');
  return amount;
}

export function enforceCapitalLimit(game: GameState): void {
  for (const player of Object.values(game.players)) {
    if (player.factionId !== 'financiers' || !player.financiers) continue;
    const current = player.resources?.capital?.value ?? 0;
    const limit = capitalLimit(game, player.id);
    if (current > limit) setFactionResource(game, player.id, 'capital', limit, 'End-turn Capital limit');
  }
}

export function playTheMarket(game: GameState, playerId: PlayerID, cardId: CardID, roll: number): number {
  const player = financier(game, playerId);
  if (game.phase !== 'action_after_movement' || player.actionsRemaining < 1) throw new FinancierError('Play the Market requires an after-movement Action Opportunity.');
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) throw new FinancierError('Play the Market requires a die result from 1 to 6.');
  const index = player.zones.hand.indexOf(cardId);
  if (index < 0) throw new FinancierError('The selected card is not in hand.');
  player.zones.hand.splice(index, 1);
  if (roll === 1) player.zones.graveyard.push(cardId); else player.zones.discard.push(cardId);
  const value = cardValue(cardId);
  const gain = roll === 1 ? 0 : roll <= 3 ? 1 : roll <= 5 ? value : value * 2;
  if (gain) gainFactionResource(game, playerId, 'capital', gain, 'Play the Market');
  player.actionsRemaining -= 1;
  player.hasPlayedActionThisTurn = true;
  log(game, playerId, 'market_played', `${player.name} played the market.`, { cardId, roll, gain });
  return gain;
}

export function subsidizeCost(bonus: number): number {
  if (!Number.isInteger(bonus) || bonus < 0) throw new FinancierError('Subsidize bonus must be a nonnegative integer.');
  return bonus * (bonus + 1) / 2;
}

export function subsidize(game: GameState, playerId: PlayerID, bonus: number): void {
  const player = financier(game, playerId);
  if (!game.battle || game.battle.stage !== 'dice') throw new FinancierError('Subsidize is available only before battle dice are rolled.');
  const side = game.battle.attacker.playerId === playerId ? game.battle.attacker : game.battle.defender.playerId === playerId ? game.battle.defender : undefined;
  if (!side) throw new FinancierError('You are not involved in this battle.');
  const cost = subsidizeCost(bonus);
  spendFactionResource(game, playerId, 'capital', cost, `Subsidize +${bonus}`);
  side.modifiers += bonus;
  player.financiers!.subsidizeBonusThisBattle = bonus;
  log(game, playerId, 'battle_subsidized', `${player.name} subsidized the battle for +${bonus}.`, { bonus, cost });
}

export function hasControllingInterest(game: GameState, playerId: PlayerID): boolean {
  const territorySpaces = game.board.spaces.filter((space) => space.kind === 'territory');
  return territorySpaces.length > 0 && territorySpaces.every((space) => deedOwner(game, space.id) === playerId);
}

export function checkControllingInterest(game: GameState, playerId: PlayerID): boolean {
  if (!hasControllingInterest(game, playerId)) return false;
  game.winner = playerId;
  game.phase = 'game_over';
  game.priorityPlayer = playerId;
  log(game, playerId, 'controlling_interest', `${game.players[playerId].name} achieved Controlling Interest.`);
  return true;
}
