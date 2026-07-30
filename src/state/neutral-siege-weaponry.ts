import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  CardOrigin,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
  TerritoryOverlayState,
} from '../types';
import type { ResolveBattleRevealAction } from './actions';
import { resolveBattleRevealCancellations } from './battle-reveal';
import { GameActionError } from './reducer';
import {
  counterworksOverlayInactive,
  processCounterworksOverlayQueue,
  queueCounterworksOverlayPlacement,
} from './neutral-counterworks';
import { territoryPrintedEffectIsActive } from './territory-printed-effects';
import { placeRuinsOverlay, type TerritoryControllerSnapshot } from './territory-overlays';

export const SIEGE_WEAPONRY = 'neutral-siege-weaponry';

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

function advanceDirection(game: GameState, playerId: PlayerID): -1 | 1 {
  const ownEndpoint = game.board.spaces.find((space) => space.id === `${playerId}-heartland`);
  const opposingEndpoint = game.board.spaces.find((space) => (
    space.kind === 'heartland' && space.id !== `${playerId}-heartland`
  ));
  if (!ownEndpoint || !opposingEndpoint) {
    throw new GameActionError('Siege Weaponry could not determine the direction of advance.');
  }
  return opposingEndpoint.index > ownEndpoint.index ? 1 : -1;
}

export function siegeWeaponryActionTarget(game: GameState, playerId: PlayerID): SpaceID | undefined {
  const current = game.board.spaces.find((space) => space.id === game.players[playerId]?.occupiedSpaceId);
  if (!current) return undefined;
  const direction = advanceDirection(game, playerId);
  return game.board.spaces
    .filter((space) => (
      space.kind === 'territory'
      && space.controller !== undefined
      && space.controller !== playerId
      && (space.index - current.index) * direction > 0
      && territoryPrintedEffectIsActive(game, space, playerId)
    ))
    .sort((left, right) => Math.abs(left.index - current.index) - Math.abs(right.index - current.index))[0]?.id;
}

export function canResolveSiegeWeaponryAction(game: GameState, playerId: PlayerID): boolean {
  return siegeWeaponryActionTarget(game, playerId) !== undefined;
}

export function applySiegeWeaponryAction(game: GameState, playerId: PlayerID): void {
  const target = siegeWeaponryActionTarget(game, playerId);
  if (!target) {
    throw new GameActionError('Siege Weaponry requires an enemy-controlled Territory ahead with an active printed effect.');
  }
  if (!game.players[playerId].zones.removed.includes(SIEGE_WEAPONRY)) {
    throw new GameActionError('Siege Weaponry did not reach its temporary Action destination.');
  }
  queueCounterworksOverlayPlacement(game, {
    kind: 'siege_weaponry_action',
    playerId,
    cardId: SIEGE_WEAPONRY,
    spaceId: target,
    source: { zone: 'removed' },
  });
  processCounterworksOverlayQueue(game);
}

function activeUnplacedSiegeWeaponry(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === SIEGE_WEAPONRY
    && !card.canceled
    && !card.negated
    && !card.virtual
    && !card.postRevealEffectResolved
    && !card.overlayPlacementCompleted,
  );
}

function attackerSiegeWeaponrySources(battle: BattleState): BattlePlayedCard[] {
  return [battle.attacker.handCommit, ...battle.attacker.battleDrawPlayed]
    .filter(activeUnplacedSiegeWeaponry);
}

function contestedEnemyTerritory(game: GameState): boolean {
  const battle = game.battle;
  const space = game.board.spaces.find((candidate) => candidate.id === battle?.location);
  return Boolean(
    battle
    && space?.kind === 'territory'
    && space.controller !== undefined
    && space.controller !== battle.attacker.playerId,
  );
}

export function prepareSiegeWeaponryBattleReveal(
  game: GameState,
  action: ResolveBattleRevealAction,
): boolean {
  resolveBattleRevealCancellations(game, action);
  const battle = game.battle;
  if (!battle || !contestedEnemyTerritory(game)) return false;

  for (const card of attackerSiegeWeaponrySources(battle)) {
    card.postRevealEffectResolved = true;
    queueCounterworksOverlayPlacement(game, {
      kind: 'siege_weaponry_battle',
      playerId: card.owner,
      cardId: SIEGE_WEAPONRY,
      spaceId: battle.location,
      source: {
        zone: 'battle_card',
        battleId: battle.id,
        owner: card.owner,
        origin: card.origin,
      },
      battleId: battle.id,
      resumeBattleReveal: {
        playerId: action.playerId,
        battleCardTargets: action.battleCardTargets,
      },
    });
  }
  processCounterworksOverlayQueue(game);
  return game.pendingNeutralChoice?.kind === 'counterworks_asset';
}

function sourceCardForOverlay(
  battle: BattleState,
  overlay: TerritoryOverlayState,
): BattlePlayedCard | undefined {
  const participant = battle.attacker.playerId === overlay.owner
    ? battle.attacker
    : battle.defender.playerId === overlay.owner
      ? battle.defender
      : undefined;
  if (!participant) return undefined;
  return [participant.handCommit, ...participant.battleDrawPlayed].find((card) => (
    card?.cardId === SIEGE_WEAPONRY
    && card.origin === overlay.siegeWeaponryOrigin
    && card.overlayPlacementCompleted
    && !card.overlayPlacementPrevented
  ));
}

function removeCleanupCopy(game: GameState, card: BattlePlayedCard): void {
  const zone = card.origin === 'hand'
    ? game.players[card.owner].zones.graveyard
    : game.players[card.owner].zones.discard;
  if (!removeOne(zone, SIEGE_WEAPONRY)) {
    throw new GameActionError('Siege Weaponry could not remove its duplicate battle-cleanup copy.');
  }
}

function removeOverlay(
  space: { overlays?: TerritoryOverlayState[] },
  target: TerritoryOverlayState,
): boolean {
  const index = space.overlays?.indexOf(target) ?? -1;
  if (index < 0) return false;
  space.overlays!.splice(index, 1);
  if (space.overlays!.length === 0) space.overlays = undefined;
  return true;
}

function convertOverlayToRuins(
  game: GameState,
  space: NonNullable<GameState['board']['spaces'][number]>,
  overlay: TerritoryOverlayState,
): void {
  if (!removeOverlay(space, overlay)) return;
  const result = placeRuinsOverlay(game, space, SIEGE_WEAPONRY, overlay.owner);
  result.overlay.faceUp = false;
  result.overlay.kind = 'ruins';
  appendPublicLog(
    game,
    overlay.owner,
    'neutral_siege_weaponry_ruins',
    `${game.players[overlay.owner].name}'s Siege Weaponry became Ruins on ${space.id}.`,
    {
      spaceId: space.id,
      replacedRuins: result.replaced.map((candidate) => ({ cardId: candidate.cardId, owner: candidate.owner })),
    },
  );
}

export function resolveSiegeWeaponryAfterBattle(
  game: GameState,
  battle: BattleState,
  winnerId: PlayerID | undefined,
): number {
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  if (!space || space.kind !== 'territory' || !space.overlays?.length) return 0;
  const attackerId = battle.attacker.playerId;
  if (winnerId !== attackerId && winnerId !== battle.defender.playerId) return 0;

  const candidates = [...space.overlays].filter((overlay, index) => (
    overlay.cardId === SIEGE_WEAPONRY
    && overlay.faceUp
    && overlay.kind !== 'ruins'
    && overlay.owner === attackerId
    && !counterworksOverlayInactive(game, space.id, overlay, index, battle.id)
  ));
  let resolved = 0;

  for (const overlay of candidates) {
    if (overlay.siegeWeaponrySource === 'battle' && overlay.siegeWeaponryBattleId === battle.id) {
      const source = sourceCardForOverlay(battle, overlay);
      if (winnerId === attackerId) {
        if (!source) throw new GameActionError('Siege Weaponry could not find its Battle source card.');
        removeCleanupCopy(game, source);
        convertOverlayToRuins(game, space, overlay);
      } else {
        removeOverlay(space, overlay);
      }
      resolved += 1;
      continue;
    }

    if (overlay.siegeWeaponrySource === 'action') {
      if (winnerId === attackerId) {
        convertOverlayToRuins(game, space, overlay);
      } else if (removeOverlay(space, overlay)) {
        game.players[overlay.owner].zones.graveyard.push(SIEGE_WEAPONRY);
        appendPublicLog(
          game,
          overlay.owner,
          'neutral_siege_weaponry_destroyed',
          `${game.players[overlay.owner].name}'s Siege Weaponry entered the Graveyard after they lost the attack on ${space.id}.`,
          { spaceId: space.id, battleId: battle.id },
        );
      }
      resolved += 1;
    }
  }
  return resolved;
}

export function convertCapturedSiegeWeaponryToRuins(
  game: GameState,
  controllersBefore: TerritoryControllerSnapshot,
): number {
  let converted = 0;
  for (const space of game.board.spaces) {
    if (space.kind !== 'territory'
      || controllersBefore[space.id] === space.controller
      || !space.controller
      || !space.overlays?.length) continue;
    const candidates = [...space.overlays].filter((overlay) => (
      overlay.cardId === SIEGE_WEAPONRY
      && overlay.faceUp
      && overlay.kind !== 'ruins'
      && overlay.owner === space.controller
      && overlay.siegeWeaponrySource === 'action'
    ));
    for (const overlay of candidates) {
      convertOverlayToRuins(game, space, overlay);
      converted += 1;
    }
  }
  return converted;
}

export function siegeWeaponryOverlayMetadata(
  kind: 'siege_weaponry_action' | 'siege_weaponry_battle',
  battleId?: string,
  origin?: CardOrigin,
): Pick<TerritoryOverlayState, 'siegeWeaponrySource' | 'siegeWeaponryBattleId' | 'siegeWeaponryOrigin'> {
  return kind === 'siege_weaponry_action'
    ? { siegeWeaponrySource: 'action' }
    : {
      siegeWeaponrySource: 'battle',
      siegeWeaponryBattleId: battleId,
      siegeWeaponryOrigin: origin,
    };
}
