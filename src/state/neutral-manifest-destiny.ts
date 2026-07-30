import type {
  BattlePlayedCard,
  BattleState,
  BoardSpaceState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  TerritoryID,
} from '../types';
import type { PlayActionCardAction } from './actions';
import { reconcileFaceDownAssets } from './asset-facing';
import { armisticeCanBeVoluntarilyDiscarded } from './neutral-armistice';
import { GameActionError } from './reducer';

export const MANIFEST_DESTINY = 'neutral-manifest-destiny';

export interface PreparedManifestDestinyAction {
  handCardIds: CardID[];
  assetCardIds: CardID[];
}

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

function removeChosenCards(source: CardID[], chosen: readonly CardID[]): CardID[] {
  const remaining = [...source];
  for (const cardId of chosen) {
    if (!removeOne(remaining, cardId)) {
      throw new GameActionError(`${cardId} is no longer available for Manifest Destiny.`);
    }
  }
  return remaining;
}

function otherCardsInHand(game: GameState, playerId: PlayerID): CardID[] {
  const cards = [...game.players[playerId].zones.hand];
  if (!removeOne(cards, MANIFEST_DESTINY)) {
    throw new GameActionError('Manifest Destiny is not in hand.');
  }
  return cards;
}

export function manifestDestinyRequiredAssetCount(game: GameState, playerId: PlayerID): number {
  return Math.max(1, 3 - otherCardsInHand(game, playerId).length);
}

function eligibleAssets(game: GameState, playerId: PlayerID): CardID[] {
  return game.players[playerId].zones.assetBank.filter(armisticeCanBeVoluntarilyDiscarded);
}

export function canResolveManifestDestinyAction(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  if (!player?.zones.hand.includes(MANIFEST_DESTINY)) return false;
  return eligibleAssets(game, playerId).length >= manifestDestinyRequiredAssetCount(game, playerId);
}

export function prepareManifestDestinyAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedManifestDestinyAction | undefined {
  if (action.cardId !== MANIFEST_DESTINY) return undefined;
  if (!canResolveManifestDestinyAction(game, action.playerId)) {
    throw new GameActionError('Manifest Destiny requires enough voluntarily discardable Assets to put at least three other cards in the Graveyard, including at least one Asset.');
  }

  const handCardIds = otherCardsInHand(game, action.playerId);
  const requiredAssets = Math.max(1, 3 - handCardIds.length);
  const targets = action.targets ?? [];
  if (targets.length !== requiredAssets || targets.some((target) => (
    target.kind !== 'card' || target.owner !== action.playerId
  ))) {
    throw new GameActionError(`Manifest Destiny requires exactly ${requiredAssets} banked Asset target${requiredAssets === 1 ? '' : 's'}.`);
  }

  const available = eligibleAssets(game, action.playerId);
  const assetCardIds: CardID[] = [];
  for (const target of targets) {
    if (target.kind !== 'card') continue;
    if (!removeOne(available, target.cardId)) {
      throw new GameActionError(`${target.cardId} is not an eligible banked Asset for Manifest Destiny.`);
    }
    assetCardIds.push(target.cardId);
  }
  return { handCardIds, assetCardIds };
}

function endpointPosition(game: GameState, playerId: PlayerID): number {
  const position = game.board.spaces.findIndex((space) => (
    (space.kind === 'endpoint'
      && space.endpointOwner === playerId
      && space.endpointRole === 'before_gauntlet')
    || (space.kind === 'heartland' && space.controller === playerId)
  ));
  if (position < 0) throw new GameActionError(`Manifest Destiny could not find ${playerId}'s end of the Gauntlet.`);
  return position;
}

function reindexBoard(game: GameState): void {
  game.board.spaces.forEach((space, index) => {
    space.index = index;
  });
}

function nextManifestSequence(game: GameState): number {
  return game.board.spaces.filter((space) => space.manifestDestiny).length + 1;
}

function insertBlankManifestTerritory(
  game: GameState,
  playerId: PlayerID,
  insertionPosition: number,
  source: 'action' | 'battle',
): BoardSpaceState {
  const sequence = nextManifestSequence(game);
  const territoryId: TerritoryID = `${MANIFEST_DESTINY}-${game.id}-${sequence}`;
  const space: BoardSpaceState = {
    id: `${game.id}-manifest-destiny-space-${sequence}`,
    index: insertionPosition,
    kind: 'territory',
    territoryId,
    revealed: true,
    controller: playerId,
    manifestDestiny: true,
    manifestDestinyOwner: playerId,
  };
  game.board.spaces.splice(insertionPosition, 0, space);
  reindexBoard(game);
  const player = game.players[playerId];
  if (!player.controlledTerritories.includes(territoryId)) {
    player.controlledTerritories.push(territoryId);
  }
  appendPublicLog(
    game,
    playerId,
    'neutral_manifest_destiny_territory_added',
    `${player.name} added Manifest Destiny to the Gauntlet as a blank Territory under their control.`,
    { source, spaceId: space.id, territoryId, insertionPosition: space.index },
  );
  return space;
}

function actionInsertionPosition(game: GameState, playerId: PlayerID): number {
  const own = endpointPosition(game, playerId);
  const opponent = Object.keys(game.players).find((candidate) => candidate !== playerId);
  if (!opponent) throw new GameActionError('Manifest Destiny requires an opposing player.');
  const opposing = endpointPosition(game, opponent);
  return opposing > own ? own + 1 : own;
}

export function applyManifestDestinyAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedManifestDestinyAction,
): BoardSpaceState {
  const player = game.players[playerId];
  if (!removeOne(player.zones.removed, MANIFEST_DESTINY)) {
    throw new GameActionError('Manifest Destiny did not reach its temporary Action destination.');
  }

  player.zones.hand = removeChosenCards(player.zones.hand, prepared.handCardIds);
  player.zones.graveyard.push(...prepared.handCardIds);
  player.zones.assetBank = removeChosenCards(player.zones.assetBank, prepared.assetCardIds);
  reconcileFaceDownAssets(player);
  player.zones.graveyard.push(...prepared.assetCardIds);

  const space = insertBlankManifestTerritory(
    game,
    playerId,
    actionInsertionPosition(game, playerId),
    'action',
  );
  appendPublicLog(
    game,
    playerId,
    'neutral_manifest_destiny_action_cost',
    `${player.name} paid Manifest Destiny's additional cost.`,
    {
      handCardIds: prepared.handCardIds,
      assetCardIds: prepared.assetCardIds,
      totalCards: prepared.handCardIds.length + prepared.assetCardIds.length,
    },
  );
  return space;
}

function activeManifestDestiny(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === MANIFEST_DESTINY
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function attackerCopies(battle: BattleState): BattlePlayedCard[] {
  return [battle.attacker.handCommit, ...battle.attacker.battleDrawPlayed]
    .filter(activeManifestDestiny);
}

function removeBattleCleanupCopy(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  for (const zone of [player.zones.graveyard, player.zones.discard, player.zones.hand, player.zones.removed]) {
    if (removeOne(zone, MANIFEST_DESTINY)) return;
  }
  throw new GameActionError('Manifest Destiny could not replace its normal battle-cleanup destination.');
}

function battleInsertionPosition(game: GameState, battle: BattleState): number {
  const origin = game.board.spaces.findIndex((space) => space.id === battle.attackerOrigin);
  const location = game.board.spaces.findIndex((space) => space.id === battle.location);
  if (origin < 0 || location < 0) {
    throw new GameActionError('Manifest Destiny could not find the completed battle positions.');
  }
  return Math.max(origin, location);
}

export function applyManifestDestinyAfterBattle(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): number {
  const attackerId = battle.attacker.playerId;
  const location = game.board.spaces.find((space) => space.id === battle.location);
  if (winnerId !== attackerId
    || !location
    || location.kind !== 'territory'
    || !controllerBeforeBattle
    || controllerBeforeBattle === attackerId) return 0;

  const copies = attackerCopies(battle);
  for (const _copy of copies) {
    removeBattleCleanupCopy(game, attackerId);
    insertBlankManifestTerritory(
      game,
      attackerId,
      battleInsertionPosition(game, battle),
      'battle',
    );
  }
  return copies.length;
}
