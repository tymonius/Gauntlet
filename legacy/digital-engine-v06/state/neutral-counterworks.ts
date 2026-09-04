import type {
  BattlePlayedCard,
  CardID,
  CounterworksOverlayOption,
  CounterworksOverlayPlacementRequest,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
  TerritoryOverlayState,
} from '../types/v06';
import type { ResolveBattleRevealAction, ResolveNeutralChoiceAction } from './actions';
import { reconcileFaceDownAssets } from './asset-facing';
import { faceUpAssetCopies } from './asset-facing';
import { GameActionError } from './reducer';
import { placeRuinsOverlay, placeTerritoryOverlay } from './territory-overlays';

export const COUNTERWORKS = 'neutral-counterworks';

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
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

function removeOne(zone: CardID[], cardId: CardID): boolean {
  const index = zone.indexOf(cardId);
  if (index < 0) return false;
  zone.splice(index, 1);
  return true;
}

function opponentOf(game: GameState, playerId: PlayerID): PlayerID | undefined {
  return Object.keys(game.players).find((id) => id !== playerId);
}

function activeCounterworksAssets(game: GameState, playerId: PlayerID): number {
  const player = game.players[playerId];
  if (!player) return 0;
  const battle = game.battle;
  const recent = game.recentBattleResult;
  const prohibited = battle?.bankedAssetUseProhibited?.includes(playerId)
    || (!battle && recent?.bankedAssetUseProhibitedFor?.includes(playerId));
  if (prohibited) return 0;
  const inactive = battle?.seditionInactiveAssets?.[playerId]
    ?? (!battle ? recent?.seditionInactiveAssets?.[playerId] : undefined)
    ?? [];
  const suppressed = inactive.filter((cardId) => cardId === COUNTERWORKS).length;
  return Math.max(0, faceUpAssetCopies(player, COUNTERWORKS) - suppressed);
}

function battleForId(game: GameState, battleId?: string) {
  if (game.battle && (!battleId || game.battle.id === battleId)) return game.battle;
  return undefined;
}

function playedCards(game: GameState, battleId: string): BattlePlayedCard[] {
  const battle = battleForId(game, battleId);
  if (!battle) return [];
  return [
    battle.attacker.handCommit,
    ...battle.attacker.battleDrawPlayed,
    battle.defender.handCommit,
    ...battle.defender.battleDrawPlayed,
  ].filter((card): card is BattlePlayedCard => Boolean(card));
}

function findBattleCard(game: GameState, request: CounterworksOverlayPlacementRequest): BattlePlayedCard | undefined {
  if (request.source.zone !== 'battle_card') return undefined;
  const source = request.source;
  return playedCards(game, source.battleId).find((card) => (
    card.owner === source.owner
    && card.cardId === request.cardId
    && card.origin === source.origin
    && !card.overlayPlacementCompleted
  ));
}

function placementBattleId(game: GameState, request: CounterworksOverlayPlacementRequest): string | undefined {
  return request.battleId
    ?? (request.source.zone === 'battle_card' ? request.source.battleId : undefined)
    ?? (game.battle?.location === request.spaceId ? game.battle.id : undefined)
    ?? (game.recentBattleResult?.location === request.spaceId ? game.recentBattleResult.battleId : undefined);
}

function preventionList(game: GameState, battleId?: string) {
  if (game.battle && (!battleId || game.battle.id === battleId)) {
    game.battle.counterworksOverlayPreventions ??= [];
    return game.battle.counterworksOverlayPreventions;
  }
  if (game.recentBattleResult && (!battleId || game.recentBattleResult.battleId === battleId)) {
    game.recentBattleResult.counterworksOverlayPreventions ??= [];
    return game.recentBattleResult.counterworksOverlayPreventions;
  }
  return undefined;
}

function consumeBattlePrevention(game: GameState, request: CounterworksOverlayPlacementRequest): boolean {
  if (request.kind === 'protracted_siege_asset') return false;
  const battleId = placementBattleId(game, request);
  const prevention = preventionList(game, battleId)?.find((candidate) => (
    !candidate.consumed
    && candidate.spaceId === request.spaceId
    && candidate.playerId !== request.playerId
  ));
  if (!prevention) return false;
  prevention.consumed = true;
  log(
    game,
    prevention.playerId,
    'neutral_counterworks_overlay_prevented',
    `${game.players[prevention.playerId].name} prevented ${request.cardId} from becoming an Overlay with Counterworks.`,
    { cardId: request.cardId, spaceId: request.spaceId, battleId },
  );
  return true;
}

function sourceZone(game: GameState, request: CounterworksOverlayPlacementRequest): CardID[] | undefined {
  if (request.source.zone === 'battle_card') return undefined;
  const player = game.players[request.playerId];
  const map = {
    hand: player.zones.hand,
    removed: player.zones.removed,
    discard: player.zones.discard,
    graveyard: player.zones.graveyard,
    asset_bank: player.zones.assetBank,
  } as const;
  return map[request.source.zone];
}

function markBattleCardPlacement(game: GameState, request: CounterworksOverlayPlacementRequest, prevented: boolean): void {
  const card = findBattleCard(game, request);
  if (!card) return;
  card.postRevealEffectResolved = true;
  card.overlayPlacementCompleted = true;
  card.overlayPlacementPrevented = prevented;
  if (prevented) card.cleanupDestination = 'discard';
}

function movePreventedSourceToDiscard(game: GameState, request: CounterworksOverlayPlacementRequest): void {
  if (request.source.zone === 'battle_card') {
    markBattleCardPlacement(game, request, true);
    return;
  }
  const player = game.players[request.playerId];
  const zone = sourceZone(game, request);
  if (zone) removeOne(zone, request.cardId);
  player.zones.discard.push(request.cardId);
  if (request.source.zone === 'asset_bank') reconcileFaceDownAssets(player);
}

function withdrawOccupant(game: GameState, playerId: PlayerID, fromIndex: number): void {
  const current = game.board.spaces.find((space) => space.occupant === playerId);
  const candidates = game.board.spaces.filter((space) => Math.abs(space.index - fromIndex) === 1 && !space.occupant);
  const destination = candidates.find((space) => space.controller === playerId) ?? candidates[0];
  if (!current || !destination) return;
  delete current.occupant;
  destination.occupant = playerId;
  game.players[playerId].occupiedSpaceId = destination.id;
}

function addBlockadeSanction(game: GameState, request: CounterworksOverlayPlacementRequest): void {
  const opponentId = request.opponentId ?? opponentOf(game, request.playerId);
  if (!opponentId) return;
  const diplomat = game.players[request.playerId];
  diplomat.diplomats ??= { ratifiedProposals: [] };
  diplomat.diplomats.sanctionStates ??= [];
  diplomat.diplomats.sanctionStates.push({
    cardId: request.cardId,
    diplomatId: request.playerId,
    opponentId,
    territoryId: game.board.spaces.find((space) => space.id === request.spaceId)?.territoryId,
    spaceId: request.spaceId,
  });
  const map = diplomat.diplomats.sanctionsAgainst ??= {};
  map[opponentId] = [...(map[opponentId] ?? []), request.cardId];
}


function queueSpiritHollowChoicesAfterPlacement(game: GameState, request: CounterworksOverlayPlacementRequest): void {
  if (request.kind !== 'spirit_hollow_battle' || !request.battleId) return;
  const battle = game.battle?.id === request.battleId ? game.battle : undefined;
  const recent = game.recentBattleResult?.battleId === request.battleId ? game.recentBattleResult : undefined;
  const participants = battle
    ? [battle.attacker.playerId, battle.defender.playerId]
    : recent
      ? [recent.attacker, recent.defender]
      : [];
  const owner = game.players[request.playerId];
  if (!owner?.mystics || participants.length === 0) return;
  owner.mystics.spiritHollowChoiceQueue ??= [];
  for (const playerId of participants) {
    if (owner.mystics.spiritHollowChoiceQueue.some((entry) => entry.battleId === request.battleId && entry.playerId === playerId)) continue;
    owner.mystics.spiritHollowChoiceQueue.push({ battleId: request.battleId, spaceId: request.spaceId, playerId });
  }
}

function finalizePlacement(game: GameState, request: CounterworksOverlayPlacementRequest): void {
  const space = game.board.spaces.find((candidate) => candidate.id === request.spaceId);
  if (!space || space.kind !== 'territory') {
    movePreventedSourceToDiscard(game, request);
    return;
  }

  if (request.source.zone !== 'battle_card') {
    const zone = sourceZone(game, request);
    if (!zone || !removeOne(zone, request.cardId)) return;
    if (request.source.zone === 'asset_bank') reconcileFaceDownAssets(game.players[request.playerId]);
  } else {
    markBattleCardPlacement(game, request, false);
  }

  const isRuins = request.kind === 'scorched_earth_battle' || request.kind === 'scorched_earth_asset';
  const ruinsPlacement = isRuins
    ? placeRuinsOverlay(game, space, request.cardId, request.playerId)
    : undefined;
  const placedOverlay = ruinsPlacement?.overlay
    ?? placeTerritoryOverlay(space, request.cardId, request.playerId);
  if (request.kind === 'bombardment_action') {
    placedOverlay.kind = 'standard';
    placedOverlay.bombardmentSource = 'action';
  } else if (request.kind === 'bombardment_battle') {
    placedOverlay.kind = 'standard';
    placedOverlay.bombardmentSource = 'battle';
    placedOverlay.bombardmentBattleId = request.battleId;
    if (request.source.zone === 'battle_card') {
      placedOverlay.bombardmentOrigin = request.source.origin;
    }
  }
  const replaced = ruinsPlacement?.replaced ?? [];
  if (request.captureOccupierId) placedOverlay.captureDelayOccupier = request.captureOccupierId;

  if (request.kind === 'demilitarized_zone') {
    for (const playerId of Object.keys(game.players)) {
      if (space.occupant === playerId) withdrawOccupant(game, playerId, space.index);
    }
    log(game, request.playerId, 'demilitarized_zone_played', `${game.players[request.playerId].name} established a Demilitarized Zone.`, { spaceId: space.id, placedTurn: game.turn });
  } else if (request.kind === 'blockade') {
    addBlockadeSanction(game, request);
    log(game, request.playerId, 'sanction_applied', `${game.players[request.playerId].name} applied ${request.cardId}.`, { opponentId: request.opponentId, spaceId: space.id });
  } else if (request.kind === 'fog_of_war_action') {
    log(game, request.playerId, 'intelligence_fog_of_war_overlay_placed', `${game.players[request.playerId].name} placed Fog of War on a Territory.`, { spaceId: space.id });
  } else if (request.kind.startsWith('circle_of_bones')) {
    log(game, request.playerId, 'mystics_circle_of_bones_placed', `${game.players[request.playerId].name} placed Circle of Bones on ${space.id}.`, { cardId: request.cardId, spaceId: space.id, battleId: request.battleId, source: request.source.zone });
  } else if (request.kind.startsWith('spirit_hollow')) {
    queueSpiritHollowChoicesAfterPlacement(game, request);
    log(game, request.playerId, 'mystics_spirit_hollow_placed', `${game.players[request.playerId].name} placed Spirit Hollow on ${space.id}.`, { cardId: request.cardId, spaceId: space.id, battleId: request.battleId, source: request.source.zone });
  } else if (request.kind.startsWith('scorched_earth')) {
    log(game, request.playerId, request.kind === 'scorched_earth_asset' ? 'neutral_scorched_earth_asset_used' : 'neutral_scorched_earth_battle_ruins', `${game.players[request.playerId].name} placed Scorched Earth as Ruins on ${space.id}.`, { battleId: request.battleId, spaceId: space.id, replacedRuins: replaced.map((overlay) => ({ cardId: overlay.cardId, owner: overlay.owner })) });
  } else if (request.kind.startsWith('protracted_siege')) {
    log(game, request.playerId, 'neutral_protracted_siege_overlay_placed', `${game.players[request.playerId].name} placed Protracted Siege on ${space.id}.`, { battleId: request.battleId, spaceId: space.id, source: request.source.zone, captureOccupierId: request.captureOccupierId });
  } else if (request.kind.startsWith('military_encampment')) {
    log(game, request.playerId, 'military_encampment_placed', `${game.players[request.playerId].name} placed Encampment on ${space.territoryId ?? space.id}.`, { spaceId: space.id });
  } else if (request.kind.startsWith('bombardment')) {
    log(game, request.playerId, 'neutral_bombardment_placed', `${game.players[request.playerId].name} placed Bombardment on ${space.id}.`, { spaceId: space.id, battleId: request.battleId, source: request.source.zone });
  }
}

function overlayAssetResponder(game: GameState, request: CounterworksOverlayPlacementRequest): PlayerID | undefined {
  return Object.keys(game.players).find((playerId) => playerId !== request.playerId && activeCounterworksAssets(game, playerId) > 0);
}

export function queueCounterworksOverlayPlacement(game: GameState, request: CounterworksOverlayPlacementRequest): void {
  const queue = game.neutralCounterworksOverlayQueue ??= [];
  queue.push({ ...request, id: request.id ?? `${game.id}-counterworks-overlay-${game.turn}-${queue.length + 1}` });
}

export function processCounterworksOverlayQueue(game: GameState): boolean {
  if (game.pendingNeutralChoice) return false;
  const request = game.neutralCounterworksOverlayQueue?.[0];
  if (!request) return false;

  if (consumeBattlePrevention(game, request)) {
    movePreventedSourceToDiscard(game, request);
    game.neutralCounterworksOverlayQueue!.shift();
    if (!game.neutralCounterworksOverlayQueue!.length) game.neutralCounterworksOverlayQueue = undefined;
    return processCounterworksOverlayQueue(game) || true;
  }

  const responder = overlayAssetResponder(game, request);
  if (responder) {
    game.pendingNeutralChoice = {
      kind: 'counterworks_asset',
      playerId: responder,
      requestId: request.id!,
      overlayCardId: request.cardId,
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = responder;
    return true;
  }

  finalizePlacement(game, request);
  game.neutralCounterworksOverlayQueue!.shift();
  if (!game.neutralCounterworksOverlayQueue!.length) game.neutralCounterworksOverlayQueue = undefined;
  return processCounterworksOverlayQueue(game) || true;
}

function sourceKey(card: BattlePlayedCard, index: number): string {
  return `${card.owner}:${card.origin}:${card.cardId}:${index}`;
}

function orderedBattleCards(game: GameState): BattlePlayedCard[] {
  const battle = game.battle;
  if (!battle) return [];
  return [battle.attacker.handCommit, ...battle.attacker.battleDrawPlayed, battle.defender.handCommit, ...battle.defender.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => Boolean(card));
}

function activeUnresolvedCounterworks(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === COUNTERWORKS && !card.canceled && !card.negated && !card.earlyEffectResolved);
}

function overlayOptions(game: GameState): CounterworksOverlayOption[] {
  const battle = game.battle;
  if (!battle) return [];
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  return (space?.overlays ?? []).map((overlay, index) => ({
    targetKey: `${space!.id}:${index}:${overlay.owner}:${overlay.cardId}`,
    spaceId: space!.id,
    index,
    cardId: overlay.cardId,
    owner: overlay.owner,
  }));
}

export function battleHasUnresolvedCounterworksPreReveal(game: GameState, incomingBattleHandCardId?: CardID): boolean {
  return incomingBattleHandCardId === COUNTERWORKS || orderedBattleCards(game).some(activeUnresolvedCounterworks);
}

export function openNextCounterworksPreRevealWindow(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'normal_reveal' || game.pendingNeutralChoice) return false;
  const cards = orderedBattleCards(game);
  const index = cards.findIndex(activeUnresolvedCounterworks);
  if (index < 0) return false;
  const card = cards[index]!;
  card.faceDown = false;
  card.earlyEffectResolved = true;
  game.pendingNeutralChoice = {
    kind: 'counterworks_battle',
    playerId: card.owner,
    battleId: battle.id,
    sourceKey: sourceKey(card, index),
    overlayOptions: overlayOptions(game),
    options: ['deactivate_overlay', 'prevent_overlay'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = card.owner;
  return true;
}

export function counterworksOverlayInactive(
  game: GameState,
  spaceId: SpaceID,
  overlay: TerritoryOverlayState,
  index: number,
  battleId?: string,
): boolean {
  const inactive = game.battle && (!battleId || game.battle.id === battleId)
    ? game.battle.counterworksInactiveOverlays
    : game.recentBattleResult && (!battleId || game.recentBattleResult.battleId === battleId)
      ? game.recentBattleResult.counterworksInactiveOverlays
      : undefined;
  return Boolean(inactive?.some((candidate) => (
    candidate.spaceId === spaceId
    && candidate.index === index
    && candidate.cardId === overlay.cardId
    && candidate.owner === overlay.owner
  )));
}

export function resolveCounterworksChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): { resumeBattleReveal?: boolean; deferredBattleAction?: ResolveBattleRevealAction } {
  const pending = game.pendingNeutralChoice;
  if (!pending || !pending.kind.startsWith('counterworks_') || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Counterworks choice.`);
  }

  if (pending.kind === 'counterworks_asset') {
    const request = game.neutralCounterworksOverlayQueue?.find((candidate) => candidate.id === pending.requestId);
    if (!request) throw new GameActionError('The Overlay placement is no longer pending.');
    const deferredBattleAction: ResolveBattleRevealAction | undefined = request.resumeBattleReveal
      ? { type: 'resolve_battle_reveal', ...request.resumeBattleReveal }
      : undefined;
    if (action.choice !== 'pass' && action.choice !== 'use') throw new GameActionError('Choose whether to use Counterworks.');
    game.pendingNeutralChoice = undefined;
    game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
    if (action.choice === 'use') {
      const player = game.players[action.playerId];
      if (!removeOne(player.zones.assetBank, COUNTERWORKS)) throw new GameActionError('Counterworks is no longer banked.');
      player.zones.graveyard.push(COUNTERWORKS);
      reconcileFaceDownAssets(player);
      movePreventedSourceToDiscard(game, request);
      log(game, action.playerId, 'neutral_counterworks_asset_used', `${player.name} discarded Counterworks and prevented ${request.cardId}.`, { cardId: request.cardId, spaceId: request.spaceId });
    } else {
      finalizePlacement(game, request);
    }
    const index = game.neutralCounterworksOverlayQueue?.findIndex((candidate) => candidate.id === request.id) ?? -1;
    if (index >= 0) game.neutralCounterworksOverlayQueue!.splice(index, 1);
    if (!game.neutralCounterworksOverlayQueue?.length) game.neutralCounterworksOverlayQueue = undefined;
    processCounterworksOverlayQueue(game);
    if (deferredBattleAction && !game.pendingNeutralChoice && !game.neutralCounterworksOverlayQueue?.length) {
      return { deferredBattleAction };
    }
    return {};
  }

  if (pending.kind !== 'counterworks_battle') {
    throw new GameActionError('The pending Counterworks choice is invalid.');
  }
  if (action.choice !== 'deactivate_overlay' && action.choice !== 'prevent_overlay') {
    throw new GameActionError('Choose a Counterworks battle effect.');
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) throw new GameActionError('The Counterworks battle is no longer active.');
  if (action.choice === 'deactivate_overlay') {
    const selected = pending.overlayOptions.find((option) => option.targetKey === action.targetKey);
    if (!selected) throw new GameActionError('Choose an eligible Overlay.');
    battle.counterworksInactiveOverlays ??= [];
    battle.counterworksInactiveOverlays.push({ battleId: battle.id, ...selected });
    log(game, action.playerId, 'neutral_counterworks_overlay_inactive', `${game.players[action.playerId].name} made ${selected.cardId} inactive during this battle.`, { battleId: battle.id, spaceId: selected.spaceId, cardId: selected.cardId });
  } else {
    battle.counterworksOverlayPreventions ??= [];
    battle.counterworksOverlayPreventions.push({ battleId: battle.id, playerId: action.playerId, spaceId: battle.location });
    log(game, action.playerId, 'neutral_counterworks_prevention_armed', `${game.players[action.playerId].name} prepared Counterworks to prevent the next opposing Overlay.`, { battleId: battle.id, spaceId: battle.location });
  }
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  return { resumeBattleReveal: true };
}
