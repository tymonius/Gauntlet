import type { ActionCardTarget, ResolveFinancierChoiceAction } from './actions';
import type { CardID, GameEvent, GameState, PlayerID, SpaceID } from '../types';
import { drawFromDeck } from './draw';
import { cardValue, deedCost, deedOwner } from './financiers';
import { openDeedPurchaseChoice } from './financier-integration';
import { gainFactionResource } from './resources';

export const FINANCIER_CARDS = {
  speculation: 'financiers-speculation',
  monetaryCrisis: 'financiers-monetary-crisis',
  liquidation: 'financiers-liquidation',
  underwriting: 'financiers-underwriting',
  capitalGains: 'financiers-capital-gains',
  tariffs: 'financiers-tariffs',
  divestment: 'financiers-divestment',
  marginLoan: 'financiers-margin-loan',
  leveragedBuyout: 'financiers-leveraged-buyout',
  foreclosure: 'financiers-foreclosure',
  propertyDues: 'financiers-property-dues',
  cornerTheMarket: 'financiers-corner-the-market',
} as const satisfies Record<string, CardID>;

export class FinancierCardError extends Error {
  constructor(message: string) { super(message); this.name = 'FinancierCardError'; }
}

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function requireFinancier(game: GameState, playerId: PlayerID) {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'financiers' || !player.financiers) throw new FinancierCardError(`${playerId} is not a Financier.`);
  return player;
}

function targetSpace(targets?: ActionCardTarget[]): SpaceID | undefined {
  return targets?.find((target): target is Extract<ActionCardTarget, { kind: 'space' }> => target.kind === 'space')?.spaceId;
}

function targetCards(targets?: ActionCardTarget[]): CardID[] {
  return targets?.filter((target): target is Extract<ActionCardTarget, { kind: 'card' }> => target.kind === 'card').map((target) => target.cardId) ?? [];
}

function removeOne(source: CardID[], cardId: CardID): boolean {
  const index = source.indexOf(cardId);
  if (index < 0) return false;
  source.splice(index, 1);
  return true;
}

function legalImmediateDeedOptions(game: GameState, playerId: PlayerID): SpaceID[] {
  const player = requireFinancier(game, playerId);
  const capital = player.resources?.capital?.value ?? 0;
  const collateral = player.leaderName === 'Banker' && player.financiers!.lineOfCreditUsedTurn !== game.turn
    ? [...player.zones.hand, ...player.financiers!.treasury]
    : [];
  return game.board.spaces
    .filter((space) => space.kind === 'territory' && deedOwner(game, space.id) !== playerId)
    .filter((space) => {
      const cost = deedCost(game, playerId, space.id);
      return capital >= cost || collateral.some((cardId) => capital + Math.min(cardValue(cardId), Math.floor(cost / 2)) >= cost);
    })
    .map((space) => space.id);
}

function playSpeculationAction(game: GameState, playerId: PlayerID, targets?: ActionCardTarget[]): void {
  const player = requireFinancier(game, playerId);
  const spaceId = targetSpace(targets);
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space || space.kind !== 'territory' || !space.revealed) throw new FinancierCardError('Speculation requires a revealed Territory.');
  if (space.controller === playerId || space.occupant === playerId) throw new FinancierCardError('Speculation requires a Territory you neither control nor occupy.');
  removeOne(player.zones.removed, FINANCIER_CARDS.speculation);
  player.financiers!.speculations ??= [];
  player.financiers!.speculations.push({ cardId: FINANCIER_CARDS.speculation, spaceId: space.id, resolvesTurn: game.turn + Object.keys(game.players).length });
  log(game, playerId, 'financier_speculation_placed', `${player.name} placed Speculation beside ${space.territoryId ?? space.id}.`, { spaceId: space.id, resolvesTurn: game.turn + Object.keys(game.players).length });
}

function playMonetaryCrisisAction(game: GameState, playerId: PlayerID): void {
  for (const player of Object.values(game.players)) {
    player.zones.discard.push(...player.zones.hand);
    player.zones.hand = [];
    const result = drawFromDeck(player, { count: 2 });
    player.zones.hand.push(...result.drawnCards);
  }
  log(game, playerId, 'financier_monetary_crisis', `${game.players[playerId].name} forced every player to discard their hand and draw two cards.`);
}

function playLiquidationAction(game: GameState, playerId: PlayerID, targets?: ActionCardTarget[]): void {
  const player = requireFinancier(game, playerId);
  const treasuryCardId = targetCards(targets)[0];
  if (!treasuryCardId || !removeOne(player.financiers!.treasury, treasuryCardId)) throw new FinancierCardError('Liquidation requires one card from your Treasury.');
  player.zones.discard.push(treasuryCardId);
  const value = cardValue(treasuryCardId);
  gainFactionResource(game, playerId, 'capital', value, 'Liquidation');
  const spaceOptions = legalImmediateDeedOptions(game, playerId);
  if (spaceOptions.length > 0) {
    game.pendingFinancierChoice = { kind: 'liquidation_purchase', playerId, spaceOptions, options: ['pass', 'purchase'] };
    game.priorityPlayer = playerId;
  }
  log(game, playerId, 'financier_liquidation', `${player.name} liquidated ${treasuryCardId} for ${value} Capital.`, { treasuryCardId, value, spaceOptions });
}

function playDivestmentAction(game: GameState, playerId: PlayerID, targets?: ActionCardTarget[]): void {
  const player = requireFinancier(game, playerId);
  const spaceId = targetSpace(targets);
  if (!spaceId || !player.financiers!.deedsOwned.includes(spaceId)) throw new FinancierCardError('Divestment requires one Deed you own.');
  const priorCount = player.financiers!.deedsOwned.length;
  player.financiers!.deedsOwned = player.financiers!.deedsOwned.filter((id) => id !== spaceId);
  gainFactionResource(game, playerId, 'capital', priorCount, 'Divestment');
  player.actionsRemaining += 1;
  player.hasPlayedActionThisTurn = false;
  log(game, playerId, 'financier_divestment', `${player.name} divested the Deed to ${spaceId} and gained ${priorCount} Capital.`, { spaceId, priorCount });
}

function playForeclosureAction(game: GameState, playerId: PlayerID, targets?: ActionCardTarget[]): void {
  const player = requireFinancier(game, playerId);
  const spaceId = targetSpace(targets);
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space || space.kind !== 'territory' || !space.territoryId) throw new FinancierCardError('Foreclosure requires a Territory.');
  if (space.occupant) throw new FinancierCardError('Foreclosure requires an unoccupied Territory.');
  if (!player.financiers!.deedsOwned.includes(space.id)) throw new FinancierCardError('You must own that Territory’s Deed.');
  const adjacentControlled = game.board.spaces.some((candidate) => candidate.kind === 'territory' && candidate.territoryId && Math.abs(candidate.index - space.index) === 1 && player.controlledTerritories.includes(candidate.territoryId));
  if (!adjacentControlled) throw new FinancierCardError('Foreclosure requires adjacency to a Territory you control.');
  const previousController = space.controller;
  if (previousController && previousController !== playerId) game.players[previousController].controlledTerritories = game.players[previousController].controlledTerritories.filter((id) => id !== space.territoryId);
  if (!player.controlledTerritories.includes(space.territoryId)) player.controlledTerritories.push(space.territoryId);
  space.controller = playerId;
  delete space.capturePendingBy;
  log(game, playerId, 'financier_foreclosure', `${player.name} took control of ${space.territoryId} through Foreclosure.`, { spaceId: space.id, previousController });
}

export function applyFinancierActionEffect(game: GameState, playerId: PlayerID, cardId: CardID, targets?: ActionCardTarget[]): void {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'financiers' || !player.financiers) return;
  switch (cardId) {
    case FINANCIER_CARDS.speculation: playSpeculationAction(game, playerId, targets); break;
    case FINANCIER_CARDS.monetaryCrisis: playMonetaryCrisisAction(game, playerId); break;
    case FINANCIER_CARDS.liquidation: playLiquidationAction(game, playerId, targets); break;
    case FINANCIER_CARDS.divestment: playDivestmentAction(game, playerId, targets); break;
    case FINANCIER_CARDS.foreclosure: playForeclosureAction(game, playerId, targets); break;
    case FINANCIER_CARDS.underwriting:
      log(game, playerId, 'financier_underwriting_banked', `${player.name} banked Underwriting.`);
      break;
    case FINANCIER_CARDS.propertyDues:
      log(game, playerId, 'financier_property_dues_banked', `${player.name} banked Property Dues.`);
      break;
  }
}

export function resolveFinancierCardTurnStart(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  if (!player?.financiers?.speculations?.length) return;
  const retained = [];
  for (const speculation of player.financiers.speculations) {
    if (speculation.resolvesTurn > game.turn) { retained.push(speculation); continue; }
    const space = game.board.spaces.find((candidate) => candidate.id === speculation.spaceId);
    if (space && (space.controller === playerId || space.occupant === playerId)) {
      gainFactionResource(game, playerId, 'capital', 2, 'Speculation matured');
      player.zones.discard.push(speculation.cardId);
      log(game, playerId, 'financier_speculation_succeeded', `${player.name} gained 2 Capital from Speculation.`, { spaceId: speculation.spaceId });
    } else {
      player.zones.graveyard.push(speculation.cardId);
      log(game, playerId, 'financier_speculation_failed', `${player.name} lost Speculation.`, { spaceId: speculation.spaceId });
    }
  }
  player.financiers.speculations = retained;
}

export function resolveFinancierCardChoice(game: GameState, action: ResolveFinancierChoiceAction): boolean {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.playerId !== action.playerId || pending.kind !== 'liquidation_purchase') return false;
  if (action.choice === 'pass') {
    game.pendingFinancierChoice = undefined;
    game.priorityPlayer = game.activePlayer;
    return true;
  }
  const spaceId = action.spaceId ?? action.choice;
  if (!pending.spaceOptions.includes(spaceId)) throw new FinancierCardError('Choose an eligible Deed or pass.');
  game.pendingFinancierChoice = undefined;
  openDeedPurchaseChoice(game, action.playerId, spaceId, { consumeAction: false });
  return true;
}
