import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  ScorchedEarthAssetQueueEntry,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { activeBankedAssetCopies, bankedAssetUseAllowed } from './banked-assets';
import { lossOrRetreatBenefitsSuppressed } from './inquisition-no-martyrs';
import { GameActionError } from './reducer';
import { processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from './neutral-counterworks';

export const SCORCHED_EARTH = 'neutral-scorched-earth';

function appendPublicLog(
  game: GameState,
  actor: PlayerID,
  type: string,
  message: string,
  payload?: unknown,
): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'public',
  } satisfies GameEvent);
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function activeScorchedEarth(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card
    && card.cardId === SCORCHED_EARTH
    && !card.canceled
    && !card.negated
    && !card.virtual);
}

function defenderBattleSources(battle: BattleState): BattlePlayedCard[] {
  const sources: BattlePlayedCard[] = [];
  if (activeScorchedEarth(battle.defender.handCommit)) sources.push(battle.defender.handCommit);
  sources.push(...battle.defender.battleDrawPlayed.filter(activeScorchedEarth));
  return sources;
}

function defenderLostControlledTerritoryAndRetreated(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): boolean {
  const defenderId = battle.defender.playerId;
  const result = game.recentBattleResult;
  return Boolean(
    winnerId === battle.attacker.playerId
    && controllerBeforeBattle === defenderId
    && result?.battleId === battle.id
    && result.loser === defenderId
    && result.defender === defenderId
    && game.players[defenderId]?.occupiedSpaceId !== battle.location
    && !lossOrRetreatBenefitsSuppressed(game, defenderId, battle.id)
  );
}

export function applyScorchedEarthBattleRuins(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): number {
  if (!defenderLostControlledTerritoryAndRetreated(game, battle, controllerBeforeBattle, winnerId)) return 0;
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  if (!space || space.kind !== 'territory') return 0;

  let placed = 0;
  for (const source of defenderBattleSources(battle)) {
    const sourceZone = source.origin === 'hand' ? 'graveyard' : 'discard';
    if (!game.players[source.owner].zones[sourceZone].includes(source.cardId)) continue;
    queueCounterworksOverlayPlacement(game, {
      kind: 'scorched_earth_battle',
      playerId: source.owner,
      cardId: source.cardId,
      spaceId: space.id,
      source: { zone: sourceZone },
      battleId: battle.id,
    });
    placed += 1;
  }
  processCounterworksOverlayQueue(game);
  return placed;
}

export function queueScorchedEarthAssetChoices(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): number {
  const playerId = battle.defender.playerId;
  if (!defenderLostControlledTerritoryAndRetreated(game, battle, controllerBeforeBattle, winnerId)) return 0;
  if (battle.bankedAssetUseProhibited?.includes(playerId) || !bankedAssetUseAllowed(game, playerId)) return 0;
  if (game.neutralScorchedEarthAssetQueue?.some((entry) => entry.battleId === battle.id && entry.playerId === playerId)) return 0;

  const count = activeBankedAssetCopies(game, playerId, SCORCHED_EARTH);
  if (count < 1) return 0;
  const queue = game.neutralScorchedEarthAssetQueue ?? [];
  queue.push({
    id: `${game.id}-scorched-earth-asset-${battle.id}-${queue.length + 1}`,
    playerId,
    battleId: battle.id,
    spaceId: battle.location,
    triggersRemaining: count,
  });
  game.neutralScorchedEarthAssetQueue = queue;
  return count;
}

function hasBlockingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingNeutralChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingInquisitionChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

function trimQueue(game: GameState): void {
  const retained: ScorchedEarthAssetQueueEntry[] = [];
  for (const entry of game.neutralScorchedEarthAssetQueue ?? []) {
    const space = game.board.spaces.find((candidate) => candidate.id === entry.spaceId);
    if (!space || space.kind !== 'territory' || !bankedAssetUseAllowed(game, entry.playerId)) continue;
    const available = activeBankedAssetCopies(game, entry.playerId, SCORCHED_EARTH);
    entry.triggersRemaining = Math.min(entry.triggersRemaining, available);
    if (entry.triggersRemaining > 0) retained.push(entry);
  }
  game.neutralScorchedEarthAssetQueue = retained.length > 0 ? retained : undefined;
}

export function openNextScorchedEarthChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  trimQueue(game);
  const entry = game.neutralScorchedEarthAssetQueue?.[0];
  if (!entry) return false;
  game.pendingNeutralChoice = {
    kind: 'scorched_earth_asset',
    playerId: entry.playerId,
    entryId: entry.id,
    battleId: entry.battleId,
    spaceId: entry.spaceId,
    triggersRemaining: entry.triggersRemaining,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = entry.playerId;
  return true;
}

export function resolveScorchedEarthChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'scorched_earth_asset' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Scorched Earth choice.`);
  }
  const entry = game.neutralScorchedEarthAssetQueue?.find((candidate) => candidate.id === pending.entryId);
  if (!entry) throw new GameActionError('The Scorched Earth trigger is no longer pending.');
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to place Scorched Earth as Ruins.');
  }

  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  if (action.choice === 'pass') {
    entry.triggersRemaining = 0;
    appendPublicLog(
      game,
      action.playerId,
      'neutral_scorched_earth_asset_passed',
      `${game.players[action.playerId].name} used no banked Scorched Earth after retreating.`,
      { battleId: pending.battleId, spaceId: pending.spaceId },
    );
  } else {
    const player = game.players[action.playerId];
    const space = game.board.spaces.find((candidate) => candidate.id === pending.spaceId);
    if (!space || space.kind !== 'territory') throw new GameActionError('The Scorched Earth Territory is no longer available.');
    if (!player.zones.assetBank.includes(SCORCHED_EARTH)) {
      throw new GameActionError('Scorched Earth is no longer banked.');
    }
    queueCounterworksOverlayPlacement(game, {
      kind: 'scorched_earth_asset',
      playerId: action.playerId,
      cardId: SCORCHED_EARTH,
      spaceId: space.id,
      source: { zone: 'asset_bank' },
      battleId: pending.battleId,
    });
    entry.triggersRemaining -= 1;
    processCounterworksOverlayQueue(game);
  }
  trimQueue(game);
  openNextScorchedEarthChoice(game);
}
