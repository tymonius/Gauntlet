import type { ActionCardTarget, ResolveFinancierChoiceAction } from './actions';
import type { CardID, GameEvent, GameState, PlayerID, SpaceID } from '../types';
import { cardValue, buyDeed, checkControllingInterest, deedCost, deedOwner } from './financiers';

export const FINANCIER_ACQUISITION_CARDS = {
  leveragedBuyout: 'financiers-leveraged-buyout',
  cornerTheMarket: 'financiers-corner-the-market',
} as const satisfies Record<string, CardID>;

export class FinancierAcquisitionError extends Error {
  constructor(message: string) { super(message); this.name = 'FinancierAcquisitionError'; }
}

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function requireFinancier(game: GameState, playerId: PlayerID) {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'financiers' || !player.financiers) throw new FinancierAcquisitionError(`${playerId} is not a Financier.`);
  return player;
}

function targetSpace(targets?: ActionCardTarget[]): SpaceID | undefined {
  return targets?.find((target): target is Extract<ActionCardTarget, { kind: 'space' }> => target.kind === 'space')?.spaceId;
}

function removeOne(source: CardID[], cardId: CardID): boolean {
  const index = source.indexOf(cardId);
  if (index < 0) return false;
  source.splice(index, 1);
  return true;
}

function allCollateral(player: ReturnType<typeof requireFinancier>): CardID[] {
  return [...player.zones.hand, ...player.financiers!.treasury];
}

function lineOfCreditOptions(game: GameState, playerId: PlayerID, cost: number): CardID[] {
  const player = requireFinancier(game, playerId);
  if (player.leaderName !== 'Banker' || player.financiers!.lineOfCreditUsedTurn === game.turn) return [];
  const capital = player.resources?.capital?.value ?? 0;
  return allCollateral(player).filter((cardId) => capital + Math.min(cardValue(cardId), Math.floor(cost / 2)) >= cost);
}

function standardPurchaseOptions(game: GameState, playerId: PlayerID): SpaceID[] {
  const player = requireFinancier(game, playerId);
  const capital = player.resources?.capital?.value ?? 0;
  return game.board.spaces
    .filter((space) => space.kind === 'territory' && deedOwner(game, space.id) !== playerId)
    .filter((space) => {
      const cost = deedCost(game, playerId, space.id);
      return capital >= cost || lineOfCreditOptions(game, playerId, cost).length > 0;
    })
    .map((space) => space.id);
}

function leveragedPurchaseOptions(game: GameState, playerId: PlayerID): SpaceID[] {
  const player = requireFinancier(game, playerId);
  const purchasingPower = (player.resources?.capital?.value ?? 0) + allCollateral(player).reduce((sum, cardId) => sum + cardValue(cardId), 0);
  return game.board.spaces
    .filter((space) => space.kind === 'territory' && deedOwner(game, space.id) !== playerId)
    .filter((space) => deedCost(game, playerId, space.id) <= purchasingPower)
    .map((space) => space.id);
}

function openLeveragedTarget(game: GameState, playerId: PlayerID, selectedSpaceId?: SpaceID): void {
  const spaceOptions = leveragedPurchaseOptions(game, playerId);
  if (spaceOptions.length === 0) throw new FinancierAcquisitionError('Leveraged Buyout cannot fund any available Deed.');
  if (selectedSpaceId !== undefined) {
    if (!spaceOptions.includes(selectedSpaceId)) throw new FinancierAcquisitionError('Choose an affordable Deed for Leveraged Buyout.');
    openLeveragedCollateral(game, playerId, selectedSpaceId);
    return;
  }
  game.pendingFinancierChoice = { kind: 'leveraged_buyout_target', playerId, spaceOptions };
  game.priorityPlayer = playerId;
}

function openLeveragedCollateral(game: GameState, playerId: PlayerID, spaceId: SpaceID): void {
  const player = requireFinancier(game, playerId);
  const cost = deedCost(game, playerId, spaceId);
  const capitalAvailable = player.resources?.capital?.value ?? 0;
  const collateralOptions = allCollateral(player);
  const minimumCollateralValue = Math.max(cost - capitalAvailable, 0);
  if (collateralOptions.reduce((sum, cardId) => sum + cardValue(cardId), 0) < minimumCollateralValue) throw new FinancierAcquisitionError('Available collateral cannot fund this Deed.');
  game.pendingFinancierChoice = { kind: 'leveraged_buyout_collateral', playerId, spaceId, cost, capitalAvailable, collateralOptions, minimumCollateralValue };
  game.priorityPlayer = playerId;
}

export function openCornerTheMarketChoice(game: GameState, playerId: PlayerID): boolean {
  const spaceOptions = standardPurchaseOptions(game, playerId);
  if (spaceOptions.length === 0) {
    game.pendingFinancierChoice = undefined;
    if (game.phase !== 'game_over') game.priorityPlayer = game.activePlayer;
    return false;
  }
  game.pendingFinancierChoice = { kind: 'corner_the_market_purchase', playerId, spaceOptions, options: ['pass', 'purchase'] };
  game.priorityPlayer = playerId;
  return true;
}

function openCornerDeedPurchase(game: GameState, playerId: PlayerID, spaceId: SpaceID): void {
  const player = requireFinancier(game, playerId);
  const available = standardPurchaseOptions(game, playerId);
  if (!available.includes(spaceId)) throw new FinancierAcquisitionError('Choose an affordable Deed or stop Corner the Market.');
  const cost = deedCost(game, playerId, spaceId);
  game.pendingFinancierChoice = {
    kind: 'deed_purchase',
    playerId,
    spaceId,
    cost,
    currentOwner: deedOwner(game, spaceId),
    collateralOptions: lineOfCreditOptions(game, playerId, cost),
    maximumCollateralContribution: Math.floor(cost / 2),
    consumeAction: false,
    continuation: 'corner_the_market',
  };
  game.priorityPlayer = playerId;
}

export function applyFinancierAcquisitionActionEffect(game: GameState, playerId: PlayerID, cardId: CardID, targets?: ActionCardTarget[]): void {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'financiers' || !player.financiers) return;
  if (cardId === FINANCIER_ACQUISITION_CARDS.leveragedBuyout) {
    openLeveragedTarget(game, playerId, targetSpace(targets));
    log(game, playerId, 'financier_leveraged_buyout_started', `${player.name} began a Leveraged Buyout.`);
  } else if (cardId === FINANCIER_ACQUISITION_CARDS.cornerTheMarket) {
    openCornerTheMarketChoice(game, playerId);
    log(game, playerId, 'financier_corner_the_market_started', `${player.name} began Corner the Market.`);
  }
}

function resolveLeveragedTarget(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'leveraged_buyout_target' || pending.playerId !== action.playerId) return false;
  const spaceId = action.spaceId ?? action.choice;
  if (!pending.spaceOptions.includes(spaceId)) throw new FinancierAcquisitionError('Choose an eligible Deed.');
  openLeveragedCollateral(game, action.playerId, spaceId);
  return true;
}

function removeSelectedCollateral(game: GameState, playerId: PlayerID, selected: CardID[]): number {
  const player = requireFinancier(game, playerId);
  const hand = [...player.zones.hand];
  const treasury = [...player.financiers!.treasury];
  let total = 0;
  for (const cardId of selected) {
    if (!removeOne(hand, cardId) && !removeOne(treasury, cardId)) throw new FinancierAcquisitionError(`${cardId} is not available as collateral.`);
    total += cardValue(cardId);
  }
  player.zones.hand = hand;
  player.financiers!.treasury = treasury;
  player.zones.graveyard.push(...selected);
  return total;
}

function resolveLeveragedCollateral(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'leveraged_buyout_collateral' || pending.playerId !== action.playerId) return false;
  if (action.choice !== 'purchase') throw new FinancierAcquisitionError('Leveraged Buyout must complete its Deed purchase.');
  const selected = action.cardIds ?? [];
  const contribution = selected.reduce((sum, cardId) => sum + cardValue(cardId), 0);
  if (pending.capitalAvailable + contribution < pending.cost) throw new FinancierAcquisitionError('Selected collateral does not cover the Deed cost.');
  removeSelectedCollateral(game, action.playerId, selected);
  buyDeed(game, action.playerId, pending.spaceId, undefined, undefined, contribution);
  game.pendingFinancierChoice = undefined;
  checkControllingInterest(game, action.playerId);
  if (game.phase !== 'game_over') game.priorityPlayer = game.activePlayer;
  log(game, action.playerId, 'financier_leveraged_buyout_completed', `${game.players[action.playerId].name} completed a Leveraged Buyout.`, { spaceId: pending.spaceId, collateral: selected, contribution });
  return true;
}

function resolveCornerSelection(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'corner_the_market_purchase' || pending.playerId !== action.playerId) return false;
  if (action.choice === 'pass') {
    game.pendingFinancierChoice = undefined;
    game.priorityPlayer = game.activePlayer;
    log(game, action.playerId, 'financier_corner_the_market_ended', `${game.players[action.playerId].name} ended Corner the Market.`);
    return true;
  }
  const spaceId = action.spaceId ?? action.choice;
  openCornerDeedPurchase(game, action.playerId, spaceId);
  return true;
}

function resolveCornerDeedPurchase(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.kind !== 'deed_purchase' || pending.continuation !== 'corner_the_market' || pending.playerId !== action.playerId) return false;
  const collateralCardId = action.choice === 'collateral' ? action.cardId : undefined;
  if (action.choice !== 'capital' && action.choice !== 'collateral') throw new FinancierAcquisitionError('Choose Capital or eligible Line of Credit collateral.');
  if (collateralCardId && !pending.collateralOptions.includes(collateralCardId)) throw new FinancierAcquisitionError('That card is not eligible collateral.');
  buyDeed(game, action.playerId, pending.spaceId, collateralCardId);
  game.pendingFinancierChoice = undefined;
  if (checkControllingInterest(game, action.playerId)) return true;
  openCornerTheMarketChoice(game, action.playerId);
  return true;
}

export function resolveFinancierAcquisitionChoice(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  return resolveLeveragedTarget(game, action)
    || resolveLeveragedCollateral(game, action)
    || resolveCornerSelection(game, action)
    || resolveCornerDeedPurchase(game, action);
}
