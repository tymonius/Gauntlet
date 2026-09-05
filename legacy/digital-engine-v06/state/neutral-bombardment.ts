import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
  TerritoryOverlayState,
} from '../types/v06';
import type { ResolveBattleRevealAction } from './actions';
import { resolveBattleRevealCancellations } from './battle-reveal';
import {
  counterworksOverlayInactive,
  processCounterworksOverlayQueue,
  queueCounterworksOverlayPlacement,
} from './neutral-counterworks';
import { GameActionError } from './reducer';
import { territoryPrintedEffectIsActive } from './territory-printed-effects';
import {
  placeRuinsOverlay,
  type TerritoryControllerSnapshot,
} from './territory-overlays';

export const BOMBARDMENT = 'neutral-bombardment';

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

function playerStartIndex(game: GameState, playerId: PlayerID): number | undefined {
  return game.board.spaces.find((space) => (
    space.kind === 'endpoint'
    && space.endpointOwner === playerId
    && space.endpointRole === 'before_gauntlet'
  ))?.index ?? game.board.spaces.find((space) => (
    space.kind === 'heartland' && space.controller === playerId
  ))?.index;
}

function advanceDirection(game: GameState, playerId: PlayerID): -1 | 1 {
  const ownStart = playerStartIndex(game, playerId);
  const opponent = Object.keys(game.players).find((candidate) => candidate !== playerId);
  const opposingStart = opponent ? playerStartIndex(game, opponent) : undefined;
  if (ownStart === undefined || opposingStart === undefined || ownStart === opposingStart) {
    throw new GameActionError('Bombardment could not determine the direction of advance.');
  }
  return opposingStart > ownStart ? 1 : -1;
}

export function bombardmentActionTarget(game: GameState, playerId: PlayerID): SpaceID | undefined {
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

export function canResolveBombardmentAction(game: GameState, playerId: PlayerID): boolean {
  return bombardmentActionTarget(game, playerId) !== undefined;
}

export function applyBombardmentAction(game: GameState, playerId: PlayerID): void {
  const target = bombardmentActionTarget(game, playerId);
  if (!target) {
    throw new GameActionError('Bombardment requires an enemy-controlled Territory ahead with an active printed effect.');
  }
  if (!game.players[playerId].zones.removed.includes(BOMBARDMENT)) {
    throw new GameActionError('Bombardment did not reach its temporary Action destination.');
  }
  queueCounterworksOverlayPlacement(game, {
    kind: 'bombardment_action',
    playerId,
    cardId: BOMBARDMENT,
    spaceId: target,
    source: { zone: 'removed' },
  });
  processCounterworksOverlayQueue(game);
}

function activeUnplacedBombardment(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === BOMBARDMENT
    && !card.canceled
    && !card.negated
    && !card.virtual
    && !card.postRevealEffectResolved
    && !card.overlayPlacementCompleted,
  );
}

function attackerBombardmentSources(battle: BattleState): BattlePlayedCard[] {
  return [battle.attacker.handCommit, ...battle.attacker.battleDrawPlayed]
    .filter(activeUnplacedBombardment);
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

/**
 * Bombardment must become an Overlay before ordinary reveal effects such as
 * Pathfinders test whether the Territory's printed effect remains active.
 */
export function prepareBombardmentBattleReveal(
  game: GameState,
  action: ResolveBattleRevealAction,
): boolean {
  resolveBattleRevealCancellations(game, action);
  const battle = game.battle;
  if (!battle || !contestedEnemyTerritory(game)) return false;

  const sources = attackerBombardmentSources(battle);
  for (const card of sources) {
    card.postRevealEffectResolved = true;
    queueCounterworksOverlayPlacement(game, {
      kind: 'bombardment_battle',
      playerId: card.owner,
      cardId: BOMBARDMENT,
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
  if (sources.length < 1) return false;
  processCounterworksOverlayQueue(game);
  return Boolean(game.pendingNeutralChoice?.kind === 'counterworks_asset');
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
  space: GameState['board']['spaces'][number],
  overlay: TerritoryOverlayState,
): void {
  if (!removeOverlay(space, overlay)) return;
  const result = placeRuinsOverlay(game, space, BOMBARDMENT, overlay.owner);
  result.overlay.faceUp = false;
  result.overlay.kind = 'ruins';
  appendPublicLog(
    game,
    overlay.owner,
    'neutral_bombardment_ruins',
    `${game.players[overlay.owner].name}'s Bombardment became Ruins on ${space.id}.`,
    {
      spaceId: space.id,
      replacedRuins: result.replaced.map((candidate) => ({
        cardId: candidate.cardId,
        owner: candidate.owner,
      })),
    },
  );
}

function removeBattleCleanupCopy(game: GameState, overlay: TerritoryOverlayState): void {
  const player = game.players[overlay.owner];
  const zone = overlay.bombardmentOrigin === 'hand'
    ? player.zones.graveyard
    : player.zones.discard;
  if (!removeOne(zone, BOMBARDMENT)) {
    throw new GameActionError('Bombardment could not remove its duplicate battle-cleanup copy.');
  }
}

export function resolveBombardmentAfterBattle(
  game: GameState,
  battle: BattleState,
  winnerId: PlayerID | undefined,
): number {
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  if (!space || space.kind !== 'territory' || !space.overlays?.length) return 0;
  const attackerId = battle.attacker.playerId;
  if (winnerId !== attackerId && winnerId !== battle.defender.playerId) return 0;

  const candidates = [...space.overlays]
    .map((overlay, index) => ({ overlay, index }))
    .filter(({ overlay, index }) => (
      overlay.cardId === BOMBARDMENT
      && overlay.faceUp
      && overlay.kind !== 'ruins'
      && overlay.owner === attackerId
      && !counterworksOverlayInactive(game, space.id, overlay, index, battle.id)
    ));
  let resolved = 0;

  for (const { overlay } of candidates) {
    if (overlay.bombardmentSource === 'battle' && overlay.bombardmentBattleId === battle.id) {
      if (winnerId === attackerId) {
        removeBattleCleanupCopy(game, overlay);
        convertOverlayToRuins(game, space, overlay);
      } else {
        removeOverlay(space, overlay);
      }
      resolved += 1;
      continue;
    }

    if (overlay.bombardmentSource === 'action') {
      if (winnerId === attackerId) {
        convertOverlayToRuins(game, space, overlay);
      } else if (removeOverlay(space, overlay)) {
        game.players[overlay.owner].zones.graveyard.push(BOMBARDMENT);
        appendPublicLog(
          game,
          overlay.owner,
          'neutral_bombardment_destroyed',
          `${game.players[overlay.owner].name}'s Bombardment entered the Graveyard after they lost the attack on ${space.id}.`,
          { spaceId: space.id, battleId: battle.id },
        );
      }
      resolved += 1;
    }
  }
  return resolved;
}

export function convertCapturedBombardmentToRuins(
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
      overlay.cardId === BOMBARDMENT
      && overlay.faceUp
      && overlay.kind !== 'ruins'
      && overlay.owner === space.controller
      && overlay.bombardmentSource === 'action'
    ));
    for (const overlay of candidates) {
      convertOverlayToRuins(game, space, overlay);
      converted += 1;
    }
  }
  return converted;
}
