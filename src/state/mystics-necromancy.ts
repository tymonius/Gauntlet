import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PendingNecromancyActionChoice,
  PendingNecromancyBattleChoice,
  PlayerID,
} from '../types/v06';
import type { ResolveMysticsChoiceAction } from './actions';
import { drawFromDeck } from './draw';
import { triggerMateriaPrimaAfterHandSacrifice } from './mystics-conversion';
import { GameActionError } from './reducer';

export const NECROMANCY = 'mystics-necromancy';

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

function nonNecromancyCards(cards: CardID[]): CardID[] {
  return cards.filter((cardId) => cardId !== NECROMANCY);
}

function validateSelections(options: CardID[], selected: CardID[] | undefined): CardID[] {
  const chosen = selected ? [...selected] : [];
  if (chosen.length > 3) throw new GameActionError('Necromancy may return at most three cards.');
  if (chosen.some((cardId) => cardId === NECROMANCY)) {
    throw new GameActionError('Necromancy cannot return a Necromancy card.');
  }
  const remaining = [...options];
  for (const cardId of chosen) {
    const index = remaining.indexOf(cardId);
    if (index < 0) throw new GameActionError('Choose only eligible cards that were in your Graveyard.');
    remaining.splice(index, 1);
  }
  return chosen;
}

function sacrificeRemainingHand(game: GameState, playerId: PlayerID): CardID[] {
  const player = game.players[playerId];
  const sacrificed = [...player.zones.hand];
  player.zones.hand = [];
  player.zones.graveyard.push(...sacrificed);
  if (sacrificed.length > 0 && player.factionId === 'mystics' && player.mystics) {
    triggerMateriaPrimaAfterHandSacrifice(game, playerId, NECROMANCY);
  }
  return sacrificed;
}

function returnChosenCards(game: GameState, playerId: PlayerID, chosen: CardID[]): void {
  const player = game.players[playerId];
  for (const cardId of chosen) {
    if (!removeOne(player.zones.graveyard, cardId)) {
      throw new GameActionError(`${cardId} is no longer available in the Graveyard.`);
    }
    player.zones.hand.push(cardId);
  }
}

export function applyNecromancyAction(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  if (cardId !== NECROMANCY) return false;
  const player = game.players[playerId];
  if (!player.zones.removed.includes(NECROMANCY)) {
    throw new GameActionError('Necromancy did not reach its temporary Action destination.');
  }
  const pending: PendingNecromancyActionChoice = {
    kind: 'necromancy_action',
    playerId,
    sourceCardId: NECROMANCY,
    graveyardOptions: nonNecromancyCards(player.zones.graveyard),
    options: ['bury', 'recover'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.pendingMysticsChoice = pending;
  game.priorityPlayer = playerId;
  return true;
}

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === NECROMANCY && !card.canceled && !card.negated);
}

function sources(battle: BattleState): Array<{
  playerId: PlayerID;
  sourceKey: string;
  sourceOrigin: 'hand' | 'battle_draw';
}> {
  const result: Array<{
    playerId: PlayerID;
    sourceKey: string;
    sourceOrigin: 'hand' | 'battle_draw';
  }> = [];
  for (const participant of [battle.attacker, battle.defender]) {
    if (active(participant.handCommit)) {
      result.push({
        playerId: participant.playerId,
        sourceKey: `${participant.playerId}:hand`,
        sourceOrigin: 'hand',
      });
    }
    participant.battleDrawPlayed.forEach((card, index) => {
      if (!active(card)) return;
      result.push({
        playerId: participant.playerId,
        sourceKey: `${participant.playerId}:battle_draw:${index}`,
        sourceOrigin: 'battle_draw',
      });
    });
  }
  return result;
}

export function queueNecromancyBattleEffects(game: GameState, battle: BattleState): number {
  if (game.recentBattleResult?.battleId !== battle.id || game.phase === 'game_over') return 0;
  let queued = 0;
  for (const source of sources(battle)) {
    const player = game.players[source.playerId];
    if (!player.mystics) continue;
    const normalZone = source.sourceOrigin === 'hand' ? player.zones.graveyard : player.zones.discard;
    if (!removeOne(normalZone, NECROMANCY)) continue;
    player.mystics.necromancyBattleQueue ??= [];
    player.mystics.necromancyBattleQueue.push({
      battleId: battle.id,
      sourceKey: source.sourceKey,
      sourceOrigin: source.sourceOrigin,
    });
    queued += 1;
  }
  return queued;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

export function openNextNecromancyBattleChoice(game: GameState): boolean {
  if (hasBlockingWindow(game)) return false;
  for (const player of Object.values(game.players)) {
    const queue = player.mystics?.necromancyBattleQueue;
    if (!queue?.length) continue;
    const effect = queue[0];
    const pending: PendingNecromancyBattleChoice = {
      kind: 'necromancy_battle',
      playerId: player.id,
      battleId: effect.battleId,
      sourceKey: effect.sourceKey,
      sourceOrigin: effect.sourceOrigin,
      graveyardOptions: nonNecromancyCards(player.zones.graveyard),
      options: ['resolve'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.pendingMysticsChoice = pending;
    game.priorityPlayer = player.id;
    return true;
  }
  return false;
}

export function isNecromancyChoice(
  kind: unknown,
): kind is PendingNecromancyActionChoice['kind'] | PendingNecromancyBattleChoice['kind'] {
  return kind === 'necromancy_action' || kind === 'necromancy_battle';
}

function shiftBattleQueue(game: GameState, pending: PendingNecromancyBattleChoice): void {
  const queue = game.players[pending.playerId].mystics?.necromancyBattleQueue;
  if (!queue?.length) return;
  if (queue[0].battleId !== pending.battleId || queue[0].sourceKey !== pending.sourceKey) {
    throw new GameActionError('The pending Necromancy cleanup effect is no longer first in its queue.');
  }
  queue.shift();
  if (queue.length === 0) game.players[pending.playerId].mystics!.necromancyBattleQueue = undefined;
}

function resolveRecovery(
  game: GameState,
  playerId: PlayerID,
  options: CardID[],
  selected: CardID[] | undefined,
): { chosen: CardID[]; sacrificed: CardID[] } {
  const chosen = validateSelections(options, selected);
  const sacrificed = sacrificeRemainingHand(game, playerId);
  returnChosenCards(game, playerId, chosen);
  return { chosen, sacrificed };
}

export function resolveNecromancyChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending
    || (pending.kind !== 'necromancy_action' && pending.kind !== 'necromancy_battle')
    || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Necromancy choice.`);
  }
  const player = game.players[action.playerId];
  const resumePriority = pending.resumePriorityPlayer;

  if (pending.kind === 'necromancy_action') {
    if (action.choice !== 'bury' && action.choice !== 'recover') {
      throw new GameActionError('Choose a Necromancy Action mode.');
    }
    if (!removeOne(player.zones.removed, NECROMANCY)) {
      throw new GameActionError('The Necromancy source card is no longer available.');
    }
    game.pendingMysticsChoice = undefined;

    if (action.choice === 'bury') {
      player.zones.deck.push(NECROMANCY);
      const draw = drawFromDeck(player, { count: 1 });
      player.zones.hand.push(...draw.drawnCards);
      publicLog(game, action.playerId, 'mystics_necromancy_buried', `${player.name} placed Necromancy beneath their Draw Pile and drew one card.`, {
        drawnCount: draw.drawnCards.length,
        reshuffled: draw.reshuffled,
        exhausted: draw.exhausted,
      });
      privateLog(game, action.playerId, 'mystics_necromancy_buried_private', `You drew ${draw.drawnCards.join(', ') || 'no card'} with Necromancy.`, {
        drawnCards: draw.drawnCards,
      });
    } else {
      const resolution = resolveRecovery(game, action.playerId, pending.graveyardOptions, action.cardIds);
      player.zones.graveyard.push(NECROMANCY);
      publicLog(game, action.playerId, 'mystics_necromancy_recovered', `${player.name} sacrificed their remaining hand and returned ${resolution.chosen.length} card${resolution.chosen.length === 1 ? '' : 's'} from their Graveyard.`, {
        sacrificedCount: resolution.sacrificed.length,
        returnedCount: resolution.chosen.length,
      });
      privateLog(game, action.playerId, 'mystics_necromancy_recovered_private', `You sacrificed ${resolution.sacrificed.join(', ') || 'no cards'} and returned ${resolution.chosen.join(', ') || 'no cards'}.`, resolution);
    }
    game.priorityPlayer = resumePriority ?? game.activePlayer;
    return;
  }

  if (action.choice !== 'resolve') throw new GameActionError('Resolve the pending Necromancy Battle effect.');
  const resolution = resolveRecovery(game, action.playerId, pending.graveyardOptions, action.cardIds);
  if (pending.sourceOrigin === 'hand') player.zones.graveyard.push(NECROMANCY);
  else player.zones.discard.push(NECROMANCY);
  shiftBattleQueue(game, pending);
  game.pendingMysticsChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  publicLog(game, action.playerId, 'mystics_necromancy_battle_resolved', `${player.name} sacrificed their remaining hand and returned ${resolution.chosen.length} card${resolution.chosen.length === 1 ? '' : 's'} from their Graveyard with Necromancy.`, {
    battleId: pending.battleId,
    sourceOrigin: pending.sourceOrigin,
    sacrificedCount: resolution.sacrificed.length,
    returnedCount: resolution.chosen.length,
  });
  privateLog(game, action.playerId, 'mystics_necromancy_battle_private', `You sacrificed ${resolution.sacrificed.join(', ') || 'no cards'} and returned ${resolution.chosen.join(', ') || 'no cards'}.`, resolution);
}
