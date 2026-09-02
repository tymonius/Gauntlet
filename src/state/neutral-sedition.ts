import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  SeditionBattleQueueEntry,
} from '../types/v06';
import type {
  PlayActionCardAction,
  ResolveBattleRevealAction,
  ResolveNeutralChoiceAction,
} from './actions';
import { faceUpAssetCopies, reconcileFaceDownAssets } from './asset-facing';
import { resolveBattleRevealCancellations } from './battle-reveal';
import { GameActionError } from './reducer';

export const SEDITION = 'neutral-sedition';
const SEDITION_CHOICES_PREPARED = 'neutral_sedition_choices_prepared';
const SEDITION_BONUSES_APPLIED = 'neutral_sedition_bonuses_applied';

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

function unique(cards: CardID[]): CardID[] {
  return [...new Set(cards)];
}

function opposingPlayerId(game: GameState, playerId: PlayerID): PlayerID | undefined {
  return Object.values(game.players).find((player) => player.id !== playerId)?.id;
}

function activeSedition(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === SEDITION
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (activeSedition(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeSedition).length;
}

function suppressedCopyCount(game: GameState, playerId: PlayerID, cardId: CardID): number {
  return game.battle?.seditionInactiveAssets?.[playerId]
    ?.filter((candidate) => candidate === cardId).length ?? 0;
}

export function seditionFaceUpAssetCopies(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
): number {
  const player = game.players[playerId];
  if (!player) return 0;
  return Math.max(0, faceUpAssetCopies(player, cardId) - suppressedCopyCount(game, playerId, cardId));
}

export function seditionFaceUpAssetOptions(game: GameState, playerId: PlayerID): CardID[] {
  const player = game.players[playerId];
  if (!player) return [];
  return unique(player.zones.assetBank.filter((cardId) => seditionFaceUpAssetCopies(game, playerId, cardId) > 0));
}

export function queueSeditionActionChoice(game: GameState, sourcePlayerId: PlayerID): boolean {
  const targetPlayerId = opposingPlayerId(game, sourcePlayerId);
  if (!targetPlayerId) return false;
  const target = game.players[targetPlayerId];
  const cardOptions = unique(target.zones.assetBank);
  if (cardOptions.length < 1) {
    appendPublicLog(
      game,
      sourcePlayerId,
      'neutral_sedition_action_no_asset',
      `${target.name} controlled no Asset to discard for Sedition.`,
      { targetPlayerId },
    );
    return false;
  }
  game.pendingNeutralChoice = {
    kind: 'sedition_action',
    playerId: targetPlayerId,
    sourcePlayerId,
    cardOptions,
    options: ['select_card'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = targetPlayerId;
  return true;
}

function recordFallbackBonus(game: GameState, entry: SeditionBattleQueueEntry, count: number): void {
  if (!game.battle || count < 1) return;
  game.battle.seditionBonusByPlayer ??= {};
  game.battle.seditionBonusByPlayer[entry.sourcePlayerId] =
    (game.battle.seditionBonusByPlayer[entry.sourcePlayerId] ?? 0) + count;
  appendPublicLog(
    game,
    entry.sourcePlayerId,
    'neutral_sedition_battle_fallback',
    `${game.players[entry.targetPlayerId].name} controlled no face-up Asset, so ${game.players[entry.sourcePlayerId].name} gained +${count} from Sedition.`,
    {
      battleId: entry.battleId,
      sourcePlayerId: entry.sourcePlayerId,
      targetPlayerId: entry.targetPlayerId,
      amount: count,
    },
  );
}

function trimBattleQueue(game: GameState): void {
  const battleId = game.battle?.id;
  const retained = (game.neutralSeditionBattleQueue ?? []).filter((entry) => (
    entry.battleId === battleId && entry.triggersRemaining > 0
  ));
  game.neutralSeditionBattleQueue = retained.length > 0 ? retained : undefined;
}

export function openNextSeditionBattleChoice(game: GameState): boolean {
  if (game.pendingNeutralChoice) return false;
  trimBattleQueue(game);
  while (game.neutralSeditionBattleQueue?.length) {
    const entry = game.neutralSeditionBattleQueue[0];
    const cardOptions = seditionFaceUpAssetOptions(game, entry.targetPlayerId);
    if (cardOptions.length < 1) {
      recordFallbackBonus(game, entry, entry.triggersRemaining);
      entry.triggersRemaining = 0;
      trimBattleQueue(game);
      continue;
    }
    game.pendingNeutralChoice = {
      kind: 'sedition_battle',
      playerId: entry.targetPlayerId,
      sourcePlayerId: entry.sourcePlayerId,
      entryId: entry.id,
      battleId: entry.battleId,
      cardOptions,
      triggersRemaining: entry.triggersRemaining,
      resolverPlayerId: entry.resolverPlayerId,
      battleCardTargets: entry.battleCardTargets,
      options: ['select_card'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = entry.targetPlayerId;
    return true;
  }
  return false;
}

/**
 * Runs after cancellation/negation but before all remaining reveal effects so
 * the chosen physical Asset copy is inactive for every later battle timing.
 */
export function prepareSeditionBattleReveal(
  game: GameState,
  action: ResolveBattleRevealAction,
): boolean {
  resolveBattleRevealCancellations(game, action);
  const battle = game.battle!;
  if (battle.effectsResolved.includes(SEDITION_CHOICES_PREPARED)) return false;

  const entries: SeditionBattleQueueEntry[] = [];
  for (const source of [battle.attacker, battle.defender]) {
    const count = activeCopyCount(source);
    if (count < 1) continue;
    const target = source.playerId === battle.attacker.playerId ? battle.defender : battle.attacker;
    entries.push({
      id: `${battle.id}:sedition:${source.playerId}`,
      sourcePlayerId: source.playerId,
      targetPlayerId: target.playerId,
      battleId: battle.id,
      triggersRemaining: count,
      resolverPlayerId: action.playerId,
      battleCardTargets: action.battleCardTargets,
    });
  }
  battle.effectsResolved.push(SEDITION_CHOICES_PREPARED);
  game.neutralSeditionBattleQueue = entries.length > 0 ? entries : undefined;
  return openNextSeditionBattleChoice(game);
}

function resolveActionChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'sedition_action' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Sedition Action choice.`);
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one Asset you control to discard for Sedition.');
  }
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.assetBank, action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer in your Asset Bank.`);
  }
  player.zones.discard.push(action.cardId);
  reconcileFaceDownAssets(player);
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  appendPublicLog(
    game,
    action.playerId,
    'neutral_sedition_action_discard',
    `${player.name} discarded ${action.cardId} for Sedition.`,
    { sourcePlayerId: pending.sourcePlayerId, cardId: action.cardId },
  );
}

function resolveBattleChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): { deferredBattleAction?: ResolveBattleRevealAction } {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'sedition_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Sedition Battle choice.`);
  }
  const battle = game.battle;
  const entry = game.neutralSeditionBattleQueue?.find((candidate) => candidate.id === pending.entryId);
  if (!battle || battle.id !== pending.battleId || !entry) {
    throw new GameActionError('The Sedition battle choice is no longer available.');
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one face-up Asset you control for Sedition.');
  }
  if (seditionFaceUpAssetCopies(game, action.playerId, action.cardId) < 1) {
    throw new GameActionError(`${action.cardId} is no longer an eligible face-up Asset.`);
  }

  battle.seditionInactiveAssets ??= {};
  battle.seditionInactiveAssets[action.playerId] = [
    ...(battle.seditionInactiveAssets[action.playerId] ?? []),
    action.cardId,
  ];
  entry.triggersRemaining -= 1;
  const deferredBattleAction: ResolveBattleRevealAction = {
    type: 'resolve_battle_reveal',
    playerId: pending.resolverPlayerId,
    battleCardTargets: pending.battleCardTargets,
  };
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = resumePriority ?? pending.resolverPlayerId;
  appendPublicLog(
    game,
    action.playerId,
    'neutral_sedition_battle_asset_inactive',
    `${game.players[action.playerId].name} chose ${action.cardId}; one copy is inactive for this battle.`,
    {
      battleId: pending.battleId,
      sourcePlayerId: pending.sourcePlayerId,
      targetPlayerId: action.playerId,
      cardId: action.cardId,
    },
  );

  trimBattleQueue(game);
  if (openNextSeditionBattleChoice(game)) return {};
  return { deferredBattleAction };
}

export function resolveSeditionChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): { deferredBattleAction?: ResolveBattleRevealAction } {
  if (game.pendingNeutralChoice?.kind === 'sedition_action') {
    resolveActionChoice(game, action);
    return {};
  }
  return resolveBattleChoice(game, action);
}

export function applySeditionBattleBonuses(game: GameState): number {
  const battle = game.battle;
  if (!battle
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(SEDITION_BONUSES_APPLIED)) return 0;

  let applied = 0;
  for (const [playerId, amount] of Object.entries(battle.seditionBonusByPlayer ?? {}) as Array<[PlayerID, number]>) {
    if (amount < 1) continue;
    const participant = battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
    participant.modifiers += amount;
    battle.resolvedModifiers = [
      ...(battle.resolvedModifiers ?? []),
      {
        playerId,
        source: SEDITION,
        amount,
        reason: 'The opponent controlled no face-up Asset for Sedition.',
      },
    ];
    applied += amount;
  }
  battle.effectsResolved.push(SEDITION_BONUSES_APPLIED);
  return applied;
}

export function isSeditionAction(action: PlayActionCardAction): boolean {
  return action.cardId === SEDITION;
}
