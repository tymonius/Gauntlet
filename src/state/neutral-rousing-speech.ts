import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { faceUpAssetCopies, faceUpAssetCount } from './asset-facing';
import { drawFromDeck } from './draw';
import { bankedAssetUseAllowed } from './intelligence-subversion-battle';
import { GameActionError } from './reducer';

export const ROUSING_SPEECH = 'neutral-rousing-speech';
const ROUSING_SPEECH_BATTLE_RESOLUTION = 'neutral_rousing_speech_battle';

export type RousingSpeechAssetSnapshot = Record<PlayerID, CardID[]>;

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

function multisetAdditions(after: CardID[], before: CardID[]): CardID[] {
  const remaining = [...before];
  const additions: CardID[] = [];
  for (const cardId of after) {
    const index = remaining.indexOf(cardId);
    if (index >= 0) remaining.splice(index, 1);
    else additions.push(cardId);
  }
  return additions;
}

function hasBlockingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingNeutralChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingInquisitionChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

function activeRousingSpeech(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === ROUSING_SPEECH
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (activeRousingSpeech(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeRousingSpeech).length;
}

export function captureRousingSpeechAssetSnapshot(game: GameState): RousingSpeechAssetSnapshot {
  return Object.fromEntries(
    Object.values(game.players).map((player) => [player.id, [...player.zones.assetBank]]),
  );
}

/**
 * Registers only newly banked physical cards. Changing an existing Asset's
 * face-up/face-down status does not change the Asset Bank multiset and cannot
 * create this trigger.
 */
export function registerRousingSpeechAssetTriggers(
  game: GameState,
  before: RousingSpeechAssetSnapshot,
  sourcePlayerId: PlayerID,
): number {
  const source = game.players[sourcePlayerId];
  if (!source) return 0;
  const bankedCount = multisetAdditions(
    source.zones.assetBank,
    before[sourcePlayerId] ?? [],
  ).length;
  if (bankedCount < 1) return 0;

  const queue = game.neutralRousingSpeechAssetQueue ?? [];
  let registered = 0;
  for (const player of Object.values(game.players)) {
    if (player.id === sourcePlayerId || !bankedAssetUseAllowed(game, player.id)) continue;
    const copyCount = faceUpAssetCopies(player, ROUSING_SPEECH);
    const triggersRemaining = copyCount * bankedCount;
    if (triggersRemaining < 1) continue;
    queue.push({
      id: `${game.id}-rousing-speech-${game.turn}-${queue.length + 1}`,
      playerId: player.id,
      sourcePlayerId,
      triggersRemaining,
    });
    registered += triggersRemaining;
  }
  game.neutralRousingSpeechAssetQueue = queue.length > 0 ? queue : undefined;
  return registered;
}

function trimQueue(game: GameState): void {
  const retained = (game.neutralRousingSpeechAssetQueue ?? []).filter((entry) => {
    if (!bankedAssetUseAllowed(game, entry.playerId)) return false;
    const owner = game.players[entry.playerId];
    const available = owner ? faceUpAssetCopies(owner, ROUSING_SPEECH) : 0;
    return available > 0 && entry.triggersRemaining > 0;
  });
  game.neutralRousingSpeechAssetQueue = retained.length > 0 ? retained : undefined;
}

export function openNextRousingSpeechChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  trimQueue(game);
  const entry = game.neutralRousingSpeechAssetQueue?.[0];
  if (!entry) return false;
  game.pendingNeutralChoice = {
    kind: 'rousing_speech_asset',
    playerId: entry.playerId,
    sourcePlayerId: entry.sourcePlayerId,
    entryId: entry.id,
    triggersRemaining: entry.triggersRemaining,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = entry.playerId;
  return true;
}

function finishTrigger(game: GameState, entryId: string): void {
  const entry = game.neutralRousingSpeechAssetQueue?.find((candidate) => candidate.id === entryId);
  if (entry) entry.triggersRemaining -= 1;
  trimQueue(game);
  openNextRousingSpeechChoice(game);
}

function resolveAssetChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'rousing_speech_asset' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Rousing Speech choice.`);
  }
  const entry = game.neutralRousingSpeechAssetQueue?.find((candidate) => candidate.id === pending.entryId);
  if (!entry) throw new GameActionError('The Rousing Speech trigger is no longer pending.');
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to use Rousing Speech.');
  }

  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  if (action.choice === 'pass') {
    entry.triggersRemaining = 0;
    appendPublicLog(
      game,
      action.playerId,
      'neutral_rousing_speech_passed',
      `${game.players[action.playerId].name} used no more Rousing Speech triggers for this banked Asset.`,
      { sourcePlayerId: pending.sourcePlayerId },
    );
    trimQueue(game);
    openNextRousingSpeechChoice(game);
    return;
  }

  const player = game.players[action.playerId];
  const draw = drawFromDeck(player, { count: 1 });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    action.playerId,
    'neutral_rousing_speech_draw',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Rousing Speech.`,
    {
      sourcePlayerId: pending.sourcePlayerId,
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );

  if (player.zones.hand.length < 1) {
    finishTrigger(game, pending.entryId);
    return;
  }
  game.pendingNeutralChoice = {
    kind: 'rousing_speech_discard',
    playerId: pending.playerId,
    sourcePlayerId: pending.sourcePlayerId,
    entryId: pending.entryId,
    cardOptions: unique(player.zones.hand),
    triggersRemaining: pending.triggersRemaining,
    options: ['select_card'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = pending.playerId;
}

function resolveDiscardChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'rousing_speech_discard' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Rousing Speech discard.`);
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one card from your hand to discard for Rousing Speech.');
  }
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer in hand.`);
  }
  player.zones.discard.push(action.cardId);
  appendPublicLog(
    game,
    action.playerId,
    'neutral_rousing_speech_discard',
    `${player.name} discarded one card after drawing with Rousing Speech.`,
    { sourcePlayerId: pending.sourcePlayerId },
  );
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  finishTrigger(game, pending.entryId);
}

export function resolveRousingSpeechChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): void {
  if (game.pendingNeutralChoice?.kind === 'rousing_speech_asset') resolveAssetChoice(game, action);
  else resolveDiscardChoice(game, action);
}

export function applyRousingSpeechBattleEffects(game: GameState): number {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || battle.effectsResolved.includes(ROUSING_SPEECH_BATTLE_RESOLUTION)) return 0;
  battle.effectsResolved.push(ROUSING_SPEECH_BATTLE_RESOLUTION);
  let applied = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const opponent = participant.playerId === battle.attacker.playerId
      ? battle.defender
      : battle.attacker;
    const copyCount = activeCopyCount(participant);
    if (copyCount < 1) continue;
    if (faceUpAssetCount(game.players[opponent.playerId]) <= faceUpAssetCount(game.players[participant.playerId])) {
      continue;
    }
    participant.advantage = (participant.advantage ?? 0) + copyCount;
    applied += copyCount;
    appendPublicLog(
      game,
      participant.playerId,
      'neutral_rousing_speech_battle',
      `${game.players[participant.playerId].name} gained ${copyCount} advantage with Rousing Speech.`,
      { battleId: battle.id, copyCount },
    );
  }
  return applied;
}
