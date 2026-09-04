import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PendingSpiritHollowChoice,
  PlayerID,
  SpaceID,
  SpiritHollowChoiceState,
} from '../types/v06';
import type { ActionCardTarget, ResolveMysticsChoiceAction } from './actions';
import { triggerMateriaPrimaAfterHandSacrifice } from './mystics-conversion';
import { GameActionError } from './reducer';
import { topTerritoryOverlay } from './territory-overlays';
import { counterworksOverlayInactive, processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from './neutral-counterworks';

export const SPIRIT_HOLLOW = 'mystics-spirit-hollow';

function publicLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
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

function privateLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'private',
    visibleTo: [actor],
  } satisfies GameEvent);
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function unique(cards: CardID[]): CardID[] {
  return [...new Set(cards)];
}

function spaceTarget(targets?: ActionCardTarget[]): SpaceID | undefined {
  if (targets?.length !== 1 || targets[0]?.kind !== 'space') return undefined;
  return targets[0].spaceId;
}

function eligibleActionTarget(game: GameState, playerId: PlayerID, spaceId: SpaceID): boolean {
  const currentId = game.players[playerId]?.occupiedSpaceId;
  const current = game.board.spaces.find((space) => space.id === currentId);
  const target = game.board.spaces.find((space) => space.id === spaceId);
  if (!current || !target || target.kind !== 'territory') return false;
  return target.id === current.id || Math.abs(target.index - current.index) === 1;
}

export function spiritHollowActionTargets(game: GameState, playerId: PlayerID): SpaceID[] {
  return game.board.spaces
    .filter((space) => space.kind === 'territory' && eligibleActionTarget(game, playerId, space.id))
    .map((space) => space.id);
}

export function requireSpiritHollowActionTarget(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): void {
  if (cardId !== SPIRIT_HOLLOW) return;
  const target = spaceTarget(targets);
  if (!target) throw new GameActionError('Spirit Hollow requires exactly one current or adjacent Territory target.');
  if (!eligibleActionTarget(game, playerId, target)) {
    throw new GameActionError('Spirit Hollow must be placed on your current Territory or an adjacent Territory.');
  }
}

export function applySpiritHollowAction(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): boolean {
  if (cardId !== SPIRIT_HOLLOW) return false;
  requireSpiritHollowActionTarget(game, playerId, cardId, targets);
  const spaceId = spaceTarget(targets)!;
  const player = game.players[playerId];
  if (!player.zones.removed.includes(SPIRIT_HOLLOW)) {
    throw new GameActionError('Spirit Hollow did not reach its temporary Action destination.');
  }
  queueCounterworksOverlayPlacement(game, {
    kind: 'spirit_hollow_action',
    playerId,
    cardId: SPIRIT_HOLLOW,
    spaceId,
    source: { zone: 'removed' },
  });
  processCounterworksOverlayQueue(game);
  return true;
}

function activeSpiritHollow(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === SPIRIT_HOLLOW && !card.canceled && !card.negated);
}

function battleSources(battle: BattleState): BattlePlayedCard[] {
  const sources: BattlePlayedCard[] = [];
  for (const participant of [battle.attacker, battle.defender]) {
    if (activeSpiritHollow(participant.handCommit)) sources.push(participant.handCommit);
    for (const card of participant.battleDrawPlayed) {
      if (activeSpiritHollow(card)) sources.push(card);
    }
  }
  return sources;
}

export function placeSpiritHollowBattleOverlays(game: GameState, battle: BattleState): number {
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  if (!space || space.kind !== 'territory') return 0;
  let placed = 0;
  for (const source of battleSources(battle)) {
    const sourceZone = source.origin === 'hand' ? 'graveyard' : 'discard';
    const zone = game.players[source.owner].zones[sourceZone];
    if (!zone.includes(source.cardId)) continue;
    queueCounterworksOverlayPlacement(game, {
      kind: 'spirit_hollow_battle',
      playerId: source.owner,
      cardId: SPIRIT_HOLLOW,
      spaceId: space.id,
      source: { zone: sourceZone },
      battleId: battle.id,
    });
    placed += 1;
  }
  processCounterworksOverlayQueue(game);
  return placed;
}

export function queueSpiritHollowAfterBattle(game: GameState, battle: BattleState): boolean {
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  const overlay = topTerritoryOverlay(space);
  const overlayIndex = space?.overlays ? space.overlays.length - 1 : -1;
  if (!space || overlay?.cardId !== SPIRIT_HOLLOW) return false;
  if (counterworksOverlayInactive(game, space.id, overlay, overlayIndex, battle.id)) return false;
  const owner = game.players[overlay.owner];
  if (!owner?.mystics) return false;

  owner.mystics.spiritHollowChoiceQueue ??= [];
  for (const playerId of [battle.attacker.playerId, battle.defender.playerId]) {
    if (owner.mystics.spiritHollowChoiceQueue.some((entry) => (
      entry.battleId === battle.id && entry.playerId === playerId
    ))) continue;
    owner.mystics.spiritHollowChoiceQueue.push({
      battleId: battle.id,
      spaceId: space.id,
      playerId,
    });
  }
  return true;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingNeutralChoice
    || game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

function nextQueuedChoice(game: GameState): { ownerId: PlayerID; entry: SpiritHollowChoiceState } | undefined {
  for (const owner of Object.values(game.players)) {
    const queue = owner.mystics?.spiritHollowChoiceQueue;
    while (queue?.length) {
      const entry = queue[0];
      const space = game.board.spaces.find((candidate) => candidate.id === entry.spaceId);
      const overlay = topTerritoryOverlay(space);
      const overlayIndex = space?.overlays ? space.overlays.length - 1 : -1;
      if (overlay?.cardId !== SPIRIT_HOLLOW || counterworksOverlayInactive(game, entry.spaceId, overlay, overlayIndex, entry.battleId)) {
        queue.shift();
        continue;
      }
      return { ownerId: owner.id, entry };
    }
    if (queue?.length === 0) owner.mystics!.spiritHollowChoiceQueue = undefined;
  }
  return undefined;
}

export function openNextSpiritHollowChoice(game: GameState): boolean {
  if (hasBlockingWindow(game)) return false;
  while (true) {
    const queued = nextQueuedChoice(game);
    if (!queued) return false;
    const player = game.players[queued.entry.playerId];
    const handOptions = unique(player.zones.hand);
    if (handOptions.length === 0) {
      game.players[queued.ownerId].mystics!.spiritHollowChoiceQueue!.shift();
      continue;
    }
    const pending: PendingSpiritHollowChoice = {
      kind: 'spirit_hollow_after_cleanup',
      playerId: queued.entry.playerId,
      battleId: queued.entry.battleId,
      spaceId: queued.entry.spaceId,
      handOptions,
      graveyardOptions: unique(player.zones.graveyard),
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.pendingMysticsChoice = pending;
    game.priorityPlayer = pending.playerId;
    return true;
  }
}

export function isSpiritHollowChoice(kind: unknown): kind is PendingSpiritHollowChoice['kind'] {
  return kind === 'spirit_hollow_after_cleanup';
}

function shiftMatchingQueue(game: GameState, pending: PendingSpiritHollowChoice): void {
  for (const owner of Object.values(game.players)) {
    const queue = owner.mystics?.spiritHollowChoiceQueue;
    if (!queue?.length) continue;
    const entry = queue[0];
    if (entry.battleId !== pending.battleId || entry.playerId !== pending.playerId || entry.spaceId !== pending.spaceId) continue;
    queue.shift();
    if (queue.length === 0) owner.mystics!.spiritHollowChoiceQueue = undefined;
    return;
  }
}

export function resolveSpiritHollowChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'spirit_hollow_after_cleanup' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Spirit Hollow choice.`);
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to use Spirit Hollow.');
  }

  const player = game.players[action.playerId];
  if (action.choice === 'use') {
    if (!action.cardId || !pending.handOptions.includes(action.cardId) || !player.zones.hand.includes(action.cardId)) {
      throw new GameActionError('Choose an eligible card from your hand for Spirit Hollow.');
    }
    if (action.secondaryCardId && (
      !pending.graveyardOptions.includes(action.secondaryCardId)
      || !player.zones.graveyard.includes(action.secondaryCardId)
    )) {
      throw new GameActionError('Choose an eligible preexisting card from your Graveyard.');
    }
  }

  const resumePriority = pending.resumePriorityPlayer;
  game.pendingMysticsChoice = undefined;
  shiftMatchingQueue(game, pending);
  if (action.choice === 'pass') {
    game.priorityPlayer = resumePriority ?? game.activePlayer;
    publicLog(game, action.playerId, 'mystics_spirit_hollow_passed', `${player.name} declined Spirit Hollow.`, {
      battleId: pending.battleId,
      spaceId: pending.spaceId,
    });
    return;
  }

  removeOne(player.zones.hand, action.cardId!);
  player.zones.graveyard.push(action.cardId!);
  if (action.secondaryCardId) {
    removeOne(player.zones.graveyard, action.secondaryCardId);
    player.zones.discard.push(action.secondaryCardId);
  }
  if (player.factionId === 'mystics' && player.mystics) {
    triggerMateriaPrimaAfterHandSacrifice(game, action.playerId, SPIRIT_HOLLOW);
  }

  privateLog(
    game,
    action.playerId,
    'mystics_spirit_hollow_used_private',
    `You put ${action.cardId} in your Graveyard with Spirit Hollow${action.secondaryCardId ? ` and moved ${action.secondaryCardId} to your Discard Pile` : ''}.`,
    { sacrificedCardId: action.cardId, recoveredCardId: action.secondaryCardId },
  );
  publicLog(
    game,
    action.playerId,
    'mystics_spirit_hollow_used',
    `${player.name} put one card from their hand in their Graveyard with Spirit Hollow${action.secondaryCardId ? ' and moved one other Graveyard card to their Discard Pile' : ''}.`,
    { battleId: pending.battleId, spaceId: pending.spaceId, recovered: Boolean(action.secondaryCardId) },
  );
  game.priorityPlayer = resumePriority ?? game.activePlayer;
}
