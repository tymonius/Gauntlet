import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ActionCardTarget, ResolveMysticsChoiceAction } from './actions';
import { triggerMateriaPrimaAfterHandSacrifice } from './mystics-conversion';

export const SOUL_FOR_SOUL_CARD_ID = 'mystics-soul-for-soul';

export class SoulForSoulError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SoulForSoulError';
  }
}

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

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function hasBlockingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

function ownedCardTargets(targets: ActionCardTarget[] | undefined, playerId: PlayerID): CardID[] {
  return (targets ?? [])
    .filter((target): target is Extract<ActionCardTarget, { kind: 'card' }> => target.kind === 'card' && target.owner === playerId)
    .map((target) => target.cardId);
}

export interface SoulForSoulExchange {
  handCardId: CardID;
  graveyardCardId: CardID;
}

export function requireSoulForSoulActionTargets(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): SoulForSoulExchange | undefined {
  if (cardId !== SOUL_FOR_SOUL_CARD_ID) return undefined;
  const player = game.players[playerId];
  if (!player || player.factionId !== 'mystics' || !player.mystics) {
    throw new SoulForSoulError(`${playerId} is not a Mystics player.`);
  }
  const selected = ownedCardTargets(targets, playerId);
  if (selected.length !== 2) {
    throw new SoulForSoulError('Soul for Soul requires one hand card followed by one Graveyard card.');
  }
  const [handCardId, graveyardCardId] = selected;
  const eligibleHand = [...player.zones.hand];
  removeOne(eligibleHand, cardId);
  if (!eligibleHand.includes(handCardId)) {
    throw new SoulForSoulError('The first Soul for Soul target must be another card in your hand.');
  }
  if (!player.zones.graveyard.includes(graveyardCardId)) {
    throw new SoulForSoulError('The second Soul for Soul target must be a card in your Graveyard.');
  }
  return { handCardId, graveyardCardId };
}

export function exchangeHandAndGraveyard(
  game: GameState,
  playerId: PlayerID,
  handCardId: CardID,
  graveyardCardId: CardID,
  source: string,
): void {
  const player = game.players[playerId];
  const handIndex = player.zones.hand.indexOf(handCardId);
  const graveyardIndex = player.zones.graveyard.indexOf(graveyardCardId);
  if (handIndex < 0 || graveyardIndex < 0) {
    throw new SoulForSoulError('Both Soul for Soul cards must remain in their original zones when the exchange resolves.');
  }

  player.zones.hand.splice(handIndex, 1);
  player.zones.graveyard.splice(graveyardIndex, 1);
  player.zones.hand.push(graveyardCardId);
  player.zones.graveyard.push(handCardId);
  triggerMateriaPrimaAfterHandSacrifice(game, playerId, source);
  publicLog(game, playerId, 'mystics_soul_for_soul_exchanged', `${player.name} exchanged ${handCardId} from hand with ${graveyardCardId} from their Graveyard.`, {
    handCardId,
    graveyardCardId,
    source,
  });
}

export function applySoulForSoulAction(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): boolean {
  if (cardId !== SOUL_FOR_SOUL_CARD_ID) return false;
  const selected = ownedCardTargets(targets, playerId);
  if (selected.length !== 2) {
    throw new SoulForSoulError('Soul for Soul requires one hand card followed by one Graveyard card.');
  }
  exchangeHandAndGraveyard(game, playerId, selected[0], selected[1], SOUL_FOR_SOUL_CARD_ID);
  return true;
}

function active(card: BattlePlayedCard | undefined): card is BattlePlayedCard {
  return Boolean(card
    && card.cardId === SOUL_FOR_SOUL_CARD_ID
    && !card.canceled
    && !card.negated);
}

function battleSources(battle: BattleState): Array<{
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
      result.push({ playerId: participant.playerId, sourceKey: `${participant.playerId}:hand`, sourceOrigin: 'hand' });
    }
    participant.battleDrawPlayed.forEach((card, index) => {
      if (active(card)) {
        result.push({
          playerId: participant.playerId,
          sourceKey: `${participant.playerId}:battle_draw:${index}`,
          sourceOrigin: 'battle_draw',
        });
      }
    });
  }
  return result;
}

export function queueSoulForSoulBattleEffects(game: GameState, battle: BattleState): number {
  const result = game.recentBattleResult;
  if (!result || result.battleId !== battle.id || game.phase === 'game_over') return 0;
  let queued = 0;
  for (const source of battleSources(battle)) {
    const player = game.players[source.playerId];
    const mystics = player.mystics;
    if (!mystics) continue;
    const participant = battle.attacker.playerId === source.playerId ? battle.attacker : battle.defender;
    const committed = result.handCommittedCards?.[source.playerId]
      ?? (participant.handCommit ? [participant.handCommit.cardId] : []);
    const queue = mystics.soulForSoulBattleQueue ?? [];
    queue.push({
      battleId: battle.id,
      sourceKey: source.sourceKey,
      sourceOrigin: source.sourceOrigin,
      handCommittedCardIds: [...committed],
    });
    mystics.soulForSoulBattleQueue = queue;
    queued += 1;
  }
  return queued;
}

function graveyardOptions(
  game: GameState,
  playerId: PlayerID,
  sourceOrigin: 'hand' | 'battle_draw',
  committedCardIds: CardID[],
): CardID[] {
  const candidates = [...committedCardIds];
  if (sourceOrigin === 'hand') removeOne(candidates, SOUL_FOR_SOUL_CARD_ID);
  const graveyard = [...game.players[playerId].zones.graveyard];
  const available: CardID[] = [];
  for (const cardId of candidates) {
    const index = graveyard.indexOf(cardId);
    if (index < 0) continue;
    graveyard.splice(index, 1);
    available.push(cardId);
  }
  return [...new Set(available)];
}

export function openNextSoulForSoulBattleChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  for (const player of Object.values(game.players)) {
    const mystics = player.mystics;
    if (!mystics?.soulForSoulBattleQueue?.length) continue;
    while (mystics.soulForSoulBattleQueue.length > 0) {
      const effect = mystics.soulForSoulBattleQueue[0];
      const handOptions = [...new Set(player.zones.hand)];
      const eligibleGraveyard = graveyardOptions(
        game,
        player.id,
        effect.sourceOrigin,
        effect.handCommittedCardIds,
      );
      if (handOptions.length < 1 || eligibleGraveyard.length < 1) {
        mystics.soulForSoulBattleQueue.shift();
        continue;
      }
      game.pendingMysticsChoice = {
        kind: 'soul_for_soul_battle',
        playerId: player.id,
        battleId: effect.battleId,
        sourceKey: effect.sourceKey,
        handOptions,
        graveyardOptions: eligibleGraveyard,
        options: ['pass', 'exchange'],
        resumePriorityPlayer: game.priorityPlayer,
      };
      game.priorityPlayer = player.id;
      return true;
    }
    mystics.soulForSoulBattleQueue = undefined;
  }
  return false;
}

export function isSoulForSoulChoice(kind?: string): boolean {
  return kind === 'soul_for_soul_battle';
}

function removeBattleEffect(game: GameState, playerId: PlayerID, sourceKey: string): void {
  const mystics = game.players[playerId].mystics;
  if (!mystics?.soulForSoulBattleQueue) return;
  mystics.soulForSoulBattleQueue = mystics.soulForSoulBattleQueue.filter((effect) => effect.sourceKey !== sourceKey);
  if (mystics.soulForSoulBattleQueue.length === 0) mystics.soulForSoulBattleQueue = undefined;
}

export function resolveSoulForSoulBattleChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'soul_for_soul_battle' || pending.playerId !== action.playerId) {
    throw new SoulForSoulError(`${action.playerId} has no pending Soul for Soul Battle choice.`);
  }
  if (action.choice !== 'pass' && action.choice !== 'exchange') {
    throw new SoulForSoulError('Choose whether to exchange cards with Soul for Soul.');
  }

  game.pendingMysticsChoice = undefined;
  removeBattleEffect(game, action.playerId, pending.sourceKey);
  if (action.choice === 'exchange') {
    if (!action.cardId || !pending.handOptions.includes(action.cardId)) {
      throw new SoulForSoulError('Choose an eligible card from hand for Soul for Soul.');
    }
    if (!action.secondaryCardId || !pending.graveyardOptions.includes(action.secondaryCardId)) {
      throw new SoulForSoulError('Choose an eligible committed card from the Graveyard for Soul for Soul.');
    }
    exchangeHandAndGraveyard(
      game,
      action.playerId,
      action.cardId,
      action.secondaryCardId,
      SOUL_FOR_SOUL_CARD_ID,
    );
  } else {
    publicLog(game, action.playerId, 'mystics_soul_for_soul_passed', `${game.players[action.playerId].name} declined Soul for Soul.`, {
      battleId: pending.battleId,
      sourceKey: pending.sourceKey,
    });
  }
  if (game.phase !== 'game_over') game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}
