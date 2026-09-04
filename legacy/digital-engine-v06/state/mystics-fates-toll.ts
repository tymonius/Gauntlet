import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ActionCardTarget, ResolveMysticsChoiceAction } from './actions';
import { battleDiceCount, deterministicBattleDiceValues, selectBattleDieResult } from './battle-dice';
import { sacrificeMysticHandCard } from './mystics-conversion';

export const FATES_TOLL_CARD_ID = 'mystics-fates-toll';

export class FatesTollError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatesTollError';
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

function cardTarget(targets: ActionCardTarget[] | undefined, playerId: PlayerID): CardID | undefined {
  const target = targets?.find((candidate) => candidate.kind === 'card' && candidate.owner === playerId);
  return target?.kind === 'card' ? target.cardId : undefined;
}

export function requireFatesTollActionTarget(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): void {
  if (cardId !== FATES_TOLL_CARD_ID) return;
  const player = game.players[playerId];
  if (!player || player.factionId !== 'mystics' || !player.mystics) {
    throw new FatesTollError(`${playerId} is not a Mystics player.`);
  }
  const targetCardId = cardTarget(targets, playerId);
  if (!targetCardId) throw new FatesTollError("Fate's Toll requires one other card from your hand.");
  const remainingHand = [...player.zones.hand];
  const sourceIndex = remainingHand.indexOf(cardId);
  if (sourceIndex >= 0) remainingHand.splice(sourceIndex, 1);
  if (!remainingHand.includes(targetCardId)) {
    throw new FatesTollError("Fate's Toll must sacrifice another card from your hand.");
  }
}

export function applyFatesTollAction(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): boolean {
  if (cardId !== FATES_TOLL_CARD_ID) return false;
  const player = game.players[playerId];
  if (!player?.mystics) throw new FatesTollError(`${playerId} is not a Mystics player.`);
  const targetCardId = cardTarget(targets, playerId);
  if (!targetCardId) throw new FatesTollError("Fate's Toll requires one other card from your hand.");

  sacrificeMysticHandCard(game, playerId, targetCardId, FATES_TOLL_CARD_ID);
  const mystics = player.mystics;
  if (mystics.fatesTollMovementTurn !== game.turn) {
    mystics.fatesTollMovementTurn = game.turn;
    mystics.fatesTollMovementRemaining = 0;
  }
  mystics.fatesTollMovementRemaining = (mystics.fatesTollMovementRemaining ?? 0) + 1;
  player.movementRemaining += 1;
  if (game.phase === 'action_after_movement') game.phase = 'movement';
  publicLog(game, playerId, 'mystics_fates_toll_action', `${player.name} sacrificed ${targetCardId} and gained one additional position of movement.`, {
    cardId: targetCardId,
    movementRemaining: player.movementRemaining,
    bonusRemaining: mystics.fatesTollMovementRemaining,
  });
  return true;
}

export function fatesTollMoveUsesBonus(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  const bonus = player?.mystics?.fatesTollMovementRemaining ?? 0;
  return bonus > 0 && player.movementRemaining <= bonus;
}

export function continueFatesTollMovement(
  game: GameState,
  playerId: PlayerID,
  usedBonus: boolean,
  battleStarted: boolean,
): void {
  const player = game.players[playerId];
  const mystics = player?.mystics;
  if (!player || !mystics) return;
  if (battleStarted) {
    player.movementRemaining = 0;
    mystics.fatesTollMovementTurn = undefined;
    mystics.fatesTollMovementRemaining = undefined;
    return;
  }
  if (usedBonus) {
    mystics.fatesTollMovementRemaining = Math.max((mystics.fatesTollMovementRemaining ?? 0) - 1, 0);
  }
  if ((mystics.fatesTollMovementRemaining ?? 0) > 0 && player.movementRemaining > 0) {
    game.phase = 'movement';
    game.priorityPlayer = playerId;
    return;
  }
  if ((mystics.fatesTollMovementRemaining ?? 0) < 1) {
    mystics.fatesTollMovementTurn = undefined;
    mystics.fatesTollMovementRemaining = undefined;
  }
}

export function expireFatesTollMovement(game: GameState, playerId: PlayerID): void {
  const mystics = game.players[playerId]?.mystics;
  if (!mystics) return;
  mystics.fatesTollMovementTurn = undefined;
  mystics.fatesTollMovementRemaining = undefined;
}

function active(card: BattlePlayedCard | undefined): card is BattlePlayedCard {
  return Boolean(card && card.cardId === FATES_TOLL_CARD_ID && !card.canceled && !card.negated);
}

function activeSources(battle: BattleState): Array<{ playerId: PlayerID; sourceKey: string }> {
  const result: Array<{ playerId: PlayerID; sourceKey: string }> = [];
  for (const participant of [battle.attacker, battle.defender]) {
    if (active(participant.handCommit)) result.push({ playerId: participant.playerId, sourceKey: `${participant.playerId}:hand` });
    participant.battleDrawPlayed.forEach((card, index) => {
      if (active(card)) result.push({ playerId: participant.playerId, sourceKey: `${participant.playerId}:battle_draw:${index}` });
    });
  }
  return result;
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new FatesTollError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new FatesTollError(`${playerId} is not participating in this battle.`);
}

export function isFatesTollChoice(kind?: string): boolean {
  return kind === 'fates_toll_reroll';
}

export function openNextFatesTollReroll(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  const battle = game.battle;
  if (!battle || (battle.stage !== 'dice' && battle.stage !== 'resolution')) return false;

  for (const source of activeSources(battle)) {
    const participant = participantFor(game, source.playerId);
    if (participant.diceRoll === undefined) continue;
    const marker = `mystics_fates_toll_resolved:${source.sourceKey}`;
    if (battle.effectsResolved.includes(marker)) continue;
    battle.effectsResolved.push(marker);
    const handOptions = [...new Set(game.players[source.playerId].zones.hand)];
    if (handOptions.length === 0) continue;

    game.pendingMysticsChoice = {
      kind: 'fates_toll_reroll',
      playerId: source.playerId,
      battleId: battle.id,
      sourceKey: source.sourceKey,
      oldRoll: participant.diceRoll,
      handOptions,
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = source.playerId;
    return true;
  }
  return false;
}

function randomValues(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

function validateValues(values: number[], expectedCount: number): void {
  if (values.length !== expectedCount) throw new FatesTollError(`This reroll requires exactly ${expectedCount} dice.`);
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) {
    throw new FatesTollError('Every rerolled die must be an integer from 1 to 6.');
  }
}

function putHandCardInGraveyard(game: GameState, playerId: PlayerID, cardId: CardID): void {
  const player = game.players[playerId];
  if (!player.zones.hand.includes(cardId)) throw new FatesTollError(`${cardId} is not in ${player.name}'s hand.`);
  if (player.factionId === 'mystics' && player.mystics) {
    sacrificeMysticHandCard(game, playerId, cardId, FATES_TOLL_CARD_ID);
    return;
  }
  removeOne(player.zones.hand, cardId);
  player.zones.graveyard.push(cardId);
  publicLog(game, playerId, 'mystics_fates_toll_sacrifice', `${player.name} put ${cardId} in their Graveyard for Fate's Toll.`, { cardId });
}

export function resolveFatesTollChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'fates_toll_reroll' || pending.playerId !== action.playerId) {
    throw new FatesTollError(`${action.playerId} has no pending Fate's Toll choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) throw new FatesTollError("The Fate's Toll battle is no longer active.");
  if (action.choice !== 'pass' && action.choice !== 'use') throw new FatesTollError("Choose whether to use Fate's Toll.");

  game.pendingMysticsChoice = undefined;
  if (action.choice === 'use') {
    if (!action.cardId || !pending.handOptions.includes(action.cardId)) {
      throw new FatesTollError("Choose an eligible card from hand for Fate's Toll.");
    }
    putHandCardInGraveyard(game, action.playerId, action.cardId);
    const participant = participantFor(game, action.playerId);
    const count = battleDiceCount(participant);
    const values = action.values
      ? [...action.values]
      : action.value !== undefined
        ? count === 1
          ? [action.value]
          : deterministicBattleDiceValues(participant, action.value)
        : randomValues(count);
    validateValues(values, count);
    const selected = selectBattleDieResult(participant, values);
    participant.diceRolls = values;
    participant.diceRoll = selected;
    publicLog(game, action.playerId, 'mystics_fates_toll_rerolled', `${game.players[action.playerId].name} rerolled with Fate's Toll and must use ${selected}.`, {
      oldRoll: pending.oldRoll,
      values,
      selected,
      cardId: action.cardId,
      battleId: battle.id,
    });
  } else {
    publicLog(game, action.playerId, 'mystics_fates_toll_passed', `${game.players[action.playerId].name} declined Fate's Toll.`, {
      oldRoll: pending.oldRoll,
      battleId: battle.id,
    });
  }
  if (game.phase !== 'game_over') game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}
