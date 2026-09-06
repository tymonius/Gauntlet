import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  ResolvedBattleModifier,
} from '../types/v06';
import type { PlayActionCardAction } from './actions';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';

export const NEW_RECRUITS = 'neutral-new-recruits';
const NEW_RECRUITS_BATTLE_RESOLUTION = 'neutral_new_recruits_battle';

export interface PreparedNewRecruitsAction {
  targetCardId: CardID;
  remainingHand: CardID[];
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

export function canResolveNewRecruitsAction(game: GameState, playerId: PlayerID): boolean {
  const hand = game.players[playerId]?.zones.hand ?? [];
  return hand.includes(NEW_RECRUITS) && hand.length >= 2;
}

/**
 * Validates the required "one other card" before the source card is removed.
 * The returned hand snapshot removes exactly one physical source copy and one
 * physical target copy, including when both cards share the New Recruits ID.
 */
export function prepareNewRecruitsAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedNewRecruitsAction | undefined {
  if (action.cardId !== NEW_RECRUITS) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);

  const targets = action.targets ?? [];
  if (targets.length !== 1 || targets[0].kind !== 'card' || targets[0].owner !== action.playerId) {
    throw new GameActionError('New Recruits requires exactly one other card from your hand.');
  }

  const remainingHand = [...player.zones.hand];
  if (!removeOne(remainingHand, NEW_RECRUITS)) {
    throw new GameActionError(`${player.name} does not have New Recruits in hand.`);
  }
  if (!removeOne(remainingHand, targets[0].cardId)) {
    throw new GameActionError('The chosen New Recruits discard must be another card in your hand.');
  }

  return { targetCardId: targets[0].cardId, remainingHand };
}

export function applyNewRecruitsAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedNewRecruitsAction,
): CardID[] {
  const player = game.players[playerId];
  player.zones.hand = [...prepared.remainingHand];
  player.zones.discard.push(prepared.targetCardId);

  const draw = drawFromDeck(player, { count: 2 });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    playerId,
    'neutral_new_recruits_action',
    `${player.name} discarded ${prepared.targetCardId} and drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with New Recruits.`,
    {
      discardedCardId: prepared.targetCardId,
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );
  return draw.drawnCards;
}

function activeNewRecruits(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === NEW_RECRUITS && !card.canceled && !card.negated);
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (activeNewRecruits(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeNewRecruits).length;
}

export function applyNewRecruitsBattleEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(NEW_RECRUITS_BATTLE_RESOLUTION)) return;

  const modifiers: ResolvedBattleModifier[] = [];
  for (const participant of [battle.attacker, battle.defender]) {
    const count = activeCopyCount(participant);
    if (count === 0) continue;
    participant.modifiers += count;
    modifiers.push({
      playerId: participant.playerId,
      source: NEW_RECRUITS,
      amount: count,
      reason: `New Recruits Battle: +${count}.`,
    });
    appendPublicLog(
      game,
      participant.playerId,
      'neutral_new_recruits_battle',
      `${game.players[participant.playerId].name} gained +${count} from New Recruits.`,
      { battleId: battle.id, count },
    );
  }

  battle.resolvedModifiers = [...(battle.resolvedModifiers ?? []), ...modifiers];
  battle.effectsResolved.push(NEW_RECRUITS_BATTLE_RESOLUTION);
}
