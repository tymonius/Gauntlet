import type { BattleState, CardID, GameEvent, GameState, PlayerID, SpaceID } from '../types';
import type { ResolveFinancierChoiceAction } from './actions';
import {
  buyDeed,
  cardValue,
  checkControllingInterest,
  deedCost,
  deedOwner,
  enforceCapitalLimit,
  gainDeedIncome,
  placeInTreasury,
  playTheMarket,
  subsidize,
  subsidizeCost,
} from './financiers';

export class FinancierIntegrationError extends Error {
  constructor(message: string) { super(message); this.name = 'FinancierIntegrationError'; }
}

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function requireFinancier(game: GameState, playerId: PlayerID) {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'financiers' || !player.financiers) throw new FinancierIntegrationError(`${playerId} is not a Financier.`);
  return player;
}

function requireAfterMovementAction(game: GameState, playerId: PlayerID): void {
  const player = requireFinancier(game, playerId);
  if (game.activePlayer !== playerId || game.priorityPlayer !== playerId) throw new FinancierIntegrationError('It is not this Financier’s Action Opportunity.');
  if (game.phase !== 'action_after_movement' || player.actionsRemaining < 1) throw new FinancierIntegrationError('This requires an after-movement Action Opportunity.');
}

function spendAction(game: GameState, playerId: PlayerID): void {
  const player = requireFinancier(game, playerId);
  player.actionsRemaining -= 1;
  player.hasPlayedActionThisTurn = true;
}

function collateralOptions(game: GameState, playerId: PlayerID): CardID[] {
  const player = requireFinancier(game, playerId);
  if (player.leaderName !== 'Banker' || player.financiers!.lineOfCreditUsedTurn === game.turn) return [];
  return [...player.zones.hand, ...player.financiers!.treasury];
}

export function placeTreasuryCardAction(game: GameState, playerId: PlayerID, cardId: CardID): void {
  requireAfterMovementAction(game, playerId);
  placeInTreasury(game, playerId, cardId);
}

export function beginPlayTheMarket(game: GameState, playerId: PlayerID, cardId: CardID): void {
  requireAfterMovementAction(game, playerId);
  const player = requireFinancier(game, playerId);
  if (!player.zones.hand.includes(cardId)) throw new FinancierIntegrationError('Play the Market requires a card from hand.');
  game.pendingFinancierChoice = { kind: 'play_the_market', playerId, cardId, options: [1, 2, 3, 4, 5, 6] };
  game.priorityPlayer = playerId;
}

export function beginDeedPurchase(game: GameState, playerId: PlayerID, spaceId: SpaceID, hostileTakeover = false): void {
  requireAfterMovementAction(game, playerId);
  const player = requireFinancier(game, playerId);
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space || space.kind !== 'territory') throw new FinancierIntegrationError('Choose a Territory in the Gauntlet.');
  if (deedOwner(game, spaceId) === playerId) throw new FinancierIntegrationError('You already own this Deed.');
  if (hostileTakeover) {
    if (player.leaderName !== 'Executive' || player.financiers!.hostileTakeoverEligibleSpaceId !== spaceId) throw new FinancierIntegrationError('Hostile Takeover is not available for this Territory.');
  }
  const cost = deedCost(game, playerId, spaceId, hostileTakeover ? 0 : undefined);
  game.pendingFinancierChoice = {
    kind: 'deed_purchase',
    playerId,
    spaceId,
    cost,
    currentOwner: deedOwner(game, spaceId),
    collateralOptions: collateralOptions(game, playerId),
    maximumCollateralContribution: Math.floor(cost / 2),
    hostileTakeover,
  };
  game.priorityPlayer = playerId;
}

export function beginHostileTakeover(game: GameState, playerId: PlayerID): void {
  const player = requireFinancier(game, playerId);
  const spaceId = player.financiers!.hostileTakeoverEligibleSpaceId;
  if (!spaceId) throw new FinancierIntegrationError('Hostile Takeover is not available.');
  beginDeedPurchase(game, playerId, spaceId, true);
}

function completeHostileTakeover(game: GameState, playerId: PlayerID, spaceId: SpaceID): void {
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space?.territoryId) return;
  const previousController = space.controller;
  if (previousController && previousController !== playerId) {
    game.players[previousController].controlledTerritories = game.players[previousController].controlledTerritories.filter((id) => id !== space.territoryId);
  }
  if (!game.players[playerId].controlledTerritories.includes(space.territoryId)) game.players[playerId].controlledTerritories.push(space.territoryId);
  space.controller = playerId;
  delete space.capturePendingBy;
  requireFinancier(game, playerId).financiers!.hostileTakeoverEligibleSpaceId = undefined;
  log(game, playerId, 'hostile_takeover_completed', `${game.players[playerId].name} completed a Hostile Takeover.`, { spaceId, previousController });
}

export function recordHostileTakeoverEligibility(game: GameState, battle: BattleState, winner: PlayerID): void {
  if (winner !== battle.attacker.playerId) return;
  const player = game.players[winner];
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  if (!player?.financiers || player.leaderName !== 'Executive' || !space || space.kind !== 'territory') return;
  const controllerAtResolution = space.controller;
  if (controllerAtResolution === winner) return;
  player.financiers.hostileTakeoverEligibleSpaceId = space.id;
  log(game, winner, 'hostile_takeover_available', `${player.name} may use Hostile Takeover on ${space.id}.`, { spaceId: space.id });
}

export function maybeOpenSubsidizeWindow(game: GameState): boolean {
  if (!game.battle || game.battle.stage !== 'dice' || game.pendingMilitaryChoice || game.pendingMilitaryTimingChoice || game.pendingDiplomatChoice || game.pendingFinancierChoice || game.pendingLeaderAbilityWindow) return false;
  for (const participant of [game.battle.attacker, game.battle.defender]) {
    const player = game.players[participant.playerId];
    if (player?.factionId !== 'financiers' || !player.financiers) continue;
    if (player.financiers.subsidizeOfferedBattleId === game.battle.id) continue;
    const capital = player.resources?.capital?.value ?? 0;
    let maximumBonus = 0;
    while (subsidizeCost(maximumBonus + 1) <= capital) maximumBonus += 1;
    if (maximumBonus < 1) continue;
    game.pendingFinancierChoice = { kind: 'subsidize', playerId: player.id, battleId: game.battle.id, maximumBonus, options: Array.from({ length: maximumBonus + 1 }, (_, index) => index) };
    game.priorityPlayer = player.id;
    return true;
  }
  return false;
}

export function clearFinancierBattleState(game: GameState): void {
  for (const player of Object.values(game.players)) {
    if (!player.financiers) continue;
    player.financiers.subsidizeBonusThisBattle = undefined;
    player.financiers.subsidizeOfferedBattleId = undefined;
  }
}

export function resolveFinancierChoice(game: GameState, action: ResolveFinancierChoiceAction): void {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.playerId !== action.playerId) throw new FinancierIntegrationError(`${action.playerId} has no pending Financier choice.`);
  if (pending.kind === 'play_the_market') {
    const roll = action.amount ?? Number(action.choice);
    playTheMarket(game, action.playerId, pending.cardId, roll);
  } else if (pending.kind === 'subsidize') {
    const bonus = action.amount ?? Number(action.choice);
    if (!pending.options.includes(bonus)) throw new FinancierIntegrationError('Choose an available Subsidize bonus.');
    const player = requireFinancier(game, action.playerId);
    player.financiers!.subsidizeOfferedBattleId = pending.battleId;
    if (bonus > 0) subsidize(game, action.playerId, bonus);
  } else {
    const collateralCardId = action.choice === 'collateral' ? action.cardId : undefined;
    if (action.choice !== 'capital' && action.choice !== 'collateral') throw new FinancierIntegrationError('Choose Capital or an eligible collateral card.');
    if (collateralCardId && !pending.collateralOptions.includes(collateralCardId)) throw new FinancierIntegrationError('That card is not eligible collateral.');
    buyDeed(game, action.playerId, pending.spaceId, collateralCardId, pending.hostileTakeover ? 0 : undefined);
    spendAction(game, action.playerId);
    if (pending.hostileTakeover) completeHostileTakeover(game, action.playerId, pending.spaceId);
    checkControllingInterest(game, action.playerId);
  }
  game.pendingFinancierChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = game.activePlayer;
  maybeOpenSubsidizeWindow(game);
}

export function resolveFinancierEndTurn(game: GameState, endingPlayerId: PlayerID): void {
  enforceCapitalLimit(game);
  const player = game.players[endingPlayerId];
  if (player?.financiers) player.financiers.hostileTakeoverEligibleSpaceId = undefined;
}

export function resolveFinancierTurnStart(game: GameState, playerId: PlayerID): number {
  const player = game.players[playerId];
  if (player?.factionId !== 'financiers' || !player.financiers) return 0;
  return gainDeedIncome(game, playerId);
}

export function collateralContributionFor(game: GameState, cardId: CardID, pendingCost: number): number {
  return Math.min(cardValue(cardId), Math.floor(pendingCost / 2));
}
