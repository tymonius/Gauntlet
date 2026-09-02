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

export const RALLYING_CRY = 'neutral-rallying-cry';
const RALLYING_CRY_BATTLE_RESOLUTION = 'neutral_rallying_cry_battle';

export interface PreparedRallyingCryAction {
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

export function prepareRallyingCryAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedRallyingCryAction | undefined {
  if (action.cardId !== RALLYING_CRY) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);

  const remainingHand = [...player.zones.hand];
  const sourceIndex = remainingHand.indexOf(RALLYING_CRY);
  if (sourceIndex < 0) throw new GameActionError(`${player.name} does not have Rallying Cry in hand.`);
  remainingHand.splice(sourceIndex, 1);
  return { remainingHand };
}

export function applyRallyingCryAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedRallyingCryAction,
): CardID[] {
  const player = game.players[playerId];
  player.zones.hand = [...prepared.remainingHand];

  const draw = drawFromDeck(player, { count: 1 });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    playerId,
    'neutral_rallying_cry_action',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Rallying Cry.`,
    {
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );
  return draw.drawnCards;
}

function activeRallyingCry(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === RALLYING_CRY && !card.canceled && !card.negated);
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (activeRallyingCry(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeRallyingCry).length;
}

export function applyRallyingCryBattleEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(RALLYING_CRY_BATTLE_RESOLUTION)) return;

  const modifiers: ResolvedBattleModifier[] = [];
  for (const participant of [battle.attacker, battle.defender]) {
    const count = activeCopyCount(participant);
    if (count === 0) continue;
    participant.modifiers += count;
    modifiers.push({
      playerId: participant.playerId,
      source: RALLYING_CRY,
      amount: count,
      reason: `Rallying Cry Battle: +${count}.`,
    });
    appendPublicLog(
      game,
      participant.playerId,
      'neutral_rallying_cry_battle',
      `${game.players[participant.playerId].name} gained +${count} from Rallying Cry.`,
      { battleId: battle.id, count },
    );
  }

  battle.resolvedModifiers = [...(battle.resolvedModifiers ?? []), ...modifiers];
  battle.effectsResolved.push(RALLYING_CRY_BATTLE_RESOLUTION);
}
