import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PendingWitchcraftChoice,
  PlayerID,
  WitchcraftTargetOption,
} from '../types/v06';
import type { ResolveMysticsChoiceAction } from './actions';
import { activeBankedAssetCopies } from './intelligence-subversion-battle';
import { sacrificeMysticHandCard } from './mystics-conversion';
import { GameActionError } from './reducer';

export const WITCHCRAFT = 'mystics-witchcraft';
const ASSET_INITIAL_PREFIX = 'witchcraft_asset_initial:';
const ASSET_PROCESSED_PREFIX = 'witchcraft_asset_processed:';

const repeatableBattleEffectIds = new Set<CardID>([
  'card-valor',
  'card-fortifications',
  'mystics-dark-omens',
  'mystics-fates-toll',
]);

type SourceSlot = 'hand_commit' | 'battle_draw_played' | 'asset';

interface WitchcraftSource {
  playerId: PlayerID;
  sourceKind: 'battle_card' | 'asset';
  sourceSlot: SourceSlot;
  sourceIndex?: number;
  card?: BattlePlayedCard;
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

function removeLast(cards: CardID[], cardId: CardID): boolean {
  const index = cards.lastIndexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function activeWitchcraft(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(active(card) && card.cardId === WITCHCRAFT && !card.virtual);
}

export function canRepeatBattleEffect(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  if (!game.battle || game.battle.stage !== 'dice') return false;
  if (!repeatableBattleEffectIds.has(cardId)) return false;
  if (cardId === 'card-fortifications' && game.battle.defender.playerId !== playerId) return false;
  return true;
}

function sourceMatchesTarget(source: WitchcraftSource | undefined, option: WitchcraftTargetOption): boolean {
  if (!source || source.sourceKind === 'asset') return false;
  return source.sourceSlot === option.sourceSlot && source.sourceIndex === option.sourceIndex;
}

export function witchcraftTargetOptions(
  game: GameState,
  playerId: PlayerID,
  source?: WitchcraftSource,
): WitchcraftTargetOption[] {
  if (!game.battle || game.battle.stage !== 'dice') return [];
  const participant = participantFor(game, playerId);
  const options: WitchcraftTargetOption[] = [];

  if (active(participant.handCommit)
    && !participant.handCommit.virtual
    && participant.handCommit.cardId !== WITCHCRAFT
    && canRepeatBattleEffect(game, playerId, participant.handCommit.cardId)) {
    const option: WitchcraftTargetOption = {
      targetKey: 'hand_commit',
      cardId: participant.handCommit.cardId,
      sourceSlot: 'hand_commit',
    };
    if (!sourceMatchesTarget(source, option)) options.push(option);
  }

  participant.battleDrawPlayed.forEach((card, sourceIndex) => {
    if (!active(card) || card.virtual || card.cardId === WITCHCRAFT) return;
    if (!canRepeatBattleEffect(game, playerId, card.cardId)) return;
    const option: WitchcraftTargetOption = {
      targetKey: `battle_draw_played:${sourceIndex}`,
      cardId: card.cardId,
      sourceSlot: 'battle_draw_played',
      sourceIndex,
    };
    if (!sourceMatchesTarget(source, option)) options.push(option);
  });

  return options;
}

function unresolvedBattleCardSource(participant: BattleParticipantState): WitchcraftSource | undefined {
  if (activeWitchcraft(participant.handCommit) && !participant.handCommit.postRevealEffectResolved) {
    return {
      playerId: participant.playerId,
      sourceKind: 'battle_card',
      sourceSlot: 'hand_commit',
      card: participant.handCommit,
    };
  }
  const sourceIndex = participant.battleDrawPlayed.findIndex((card) => (
    activeWitchcraft(card) && !card.postRevealEffectResolved
  ));
  if (sourceIndex < 0) return undefined;
  return {
    playerId: participant.playerId,
    sourceKind: 'battle_card',
    sourceSlot: 'battle_draw_played',
    sourceIndex,
    card: participant.battleDrawPlayed[sourceIndex],
  };
}

function assetUsesThisTurn(game: GameState, playerId: PlayerID): number {
  const mystics = game.players[playerId].mystics;
  if (!mystics) return 0;
  if (mystics.witchcraftAssetUseTurn !== game.turn) return 0;
  return mystics.witchcraftAssetUsesThisTurn ?? 0;
}

function availableAssetCount(game: GameState, playerId: PlayerID): number {
  const banked = activeBankedAssetCopies(game, playerId, WITCHCRAFT);
  return Math.max(banked - assetUsesThisTurn(game, playerId), 0);
}

function assetInitialCount(game: GameState, playerId: PlayerID): number {
  const battle = game.battle!;
  const prefix = `${ASSET_INITIAL_PREFIX}${playerId}:`;
  const existing = battle.effectsResolved.find((entry) => entry.startsWith(prefix));
  if (existing) return Number(existing.slice(prefix.length));
  const count = availableAssetCount(game, playerId);
  battle.effectsResolved.push(`${prefix}${count}`);
  return count;
}

function assetProcessedCount(game: GameState, playerId: PlayerID): number {
  return game.battle!.effectsResolved.filter((entry) => entry === `${ASSET_PROCESSED_PREFIX}${playerId}`).length;
}

function unresolvedAssetSource(game: GameState, playerId: PlayerID): WitchcraftSource | undefined {
  if (assetProcessedCount(game, playerId) >= assetInitialCount(game, playerId)) return undefined;
  return { playerId, sourceKind: 'asset', sourceSlot: 'asset' };
}

function nextSource(game: GameState): WitchcraftSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  for (const participant of [battle.attacker, battle.defender]) {
    const cardSource = unresolvedBattleCardSource(participant);
    if (cardSource) return cardSource;
    const assetSource = unresolvedAssetSource(game, participant.playerId);
    if (assetSource) return assetSource;
  }
  return undefined;
}

function markSourceProcessed(game: GameState, source: WitchcraftSource): void {
  if (source.sourceKind === 'asset') {
    game.battle!.effectsResolved.push(`${ASSET_PROCESSED_PREFIX}${source.playerId}`);
  } else if (source.card) {
    source.card.postRevealEffectResolved = true;
  }
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

function grantFallbackAdvantage(game: GameState, playerId: PlayerID): void {
  const participant = participantFor(game, playerId);
  participant.advantage = (participant.advantage ?? 0) + 1;
  publicLog(
    game,
    playerId,
    'mystics_witchcraft_advantage',
    `${game.players[playerId].name} had no eligible Witchcraft target and gained advantage.`,
    { battleId: game.battle?.id },
  );
}

export function openNextWitchcraftChoice(game: GameState): boolean {
  if (hasBlockingWindow(game) || game.battle?.stage !== 'dice') return false;

  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    markSourceProcessed(game, source);
    const targetOptions = witchcraftTargetOptions(game, source.playerId, source);
    const handOptions = [...new Set(game.players[source.playerId].zones.hand)];

    if (source.sourceKind === 'battle_card' && targetOptions.length === 0) {
      grantFallbackAdvantage(game, source.playerId);
      continue;
    }
    if (source.sourceKind === 'asset' && (targetOptions.length === 0 || handOptions.length === 0)) continue;

    const pending: PendingWitchcraftChoice = {
      kind: 'witchcraft_repeat',
      playerId: source.playerId,
      battleId: game.battle.id,
      sourceKind: source.sourceKind,
      sourceSlot: source.sourceKind === 'battle_card' ? source.sourceSlot : undefined,
      sourceIndex: source.sourceKind === 'battle_card' ? source.sourceIndex : undefined,
      handOptions: source.sourceKind === 'asset' ? handOptions : [],
      targetOptions,
      options: source.sourceKind === 'asset' ? ['pass', 'repeat'] : ['repeat'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.pendingMysticsChoice = pending;
    game.priorityPlayer = source.playerId;
    return true;
  }
}

export function isWitchcraftChoice(kind: unknown): kind is PendingWitchcraftChoice['kind'] {
  return kind === 'witchcraft_repeat';
}

function currentTarget(game: GameState, pending: PendingWitchcraftChoice, targetKey: string): WitchcraftTargetOption {
  const offered = pending.targetOptions.find((option) => option.targetKey === targetKey);
  if (!offered) throw new GameActionError('Choose an eligible active Battle card for Witchcraft.');
  const current = witchcraftTargetOptions(game, pending.playerId).find((option) => option.targetKey === targetKey);
  if (!current || current.cardId !== offered.cardId) {
    throw new GameActionError('The chosen Witchcraft target is no longer active or eligible.');
  }
  return current;
}

function addVirtualRepeat(game: GameState, playerId: PlayerID, target: WitchcraftTargetOption): void {
  participantFor(game, playerId).battleDrawPlayed.push({
    cardId: target.cardId,
    owner: playerId,
    origin: 'replayed',
    faceDown: false,
    canceled: false,
    virtual: true,
  });
}

function recordAssetUse(game: GameState, playerId: PlayerID): void {
  const mystics = game.players[playerId].mystics;
  if (!mystics) throw new GameActionError(`${playerId} is not using the Mystics faction.`);
  if (mystics.witchcraftAssetUseTurn !== game.turn) {
    mystics.witchcraftAssetUseTurn = game.turn;
    mystics.witchcraftAssetUsesThisTurn = 0;
  }
  mystics.witchcraftAssetUsesThisTurn = (mystics.witchcraftAssetUsesThisTurn ?? 0) + 1;
}

export function resolveWitchcraftChoice(game: GameState, action: ResolveMysticsChoiceAction): CardID | undefined {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'witchcraft_repeat' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Witchcraft choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId || game.battle.stage !== 'dice') {
    throw new GameActionError('The Witchcraft battle window is no longer open.');
  }

  const resumePriority = pending.resumePriorityPlayer;
  game.pendingMysticsChoice = undefined;
  if (action.choice === 'pass') {
    if (pending.sourceKind !== 'asset') throw new GameActionError('A Witchcraft Battle effect must repeat an eligible effect.');
    game.priorityPlayer = resumePriority ?? game.activePlayer;
    return undefined;
  }
  if (action.choice !== 'repeat' || !action.targetKey) {
    throw new GameActionError('Choose an eligible Witchcraft target.');
  }

  const target = currentTarget(game, pending, action.targetKey);
  if (pending.sourceKind === 'asset') {
    if (!action.cardId || !pending.handOptions.includes(action.cardId)) {
      throw new GameActionError('Choose a card from hand to put in your Graveyard for Witchcraft.');
    }
    sacrificeMysticHandCard(game, action.playerId, action.cardId, WITCHCRAFT);
    recordAssetUse(game, action.playerId);
  }

  addVirtualRepeat(game, action.playerId, target);
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  publicLog(
    game,
    action.playerId,
    'mystics_witchcraft_repeated',
    `${game.players[action.playerId].name} repeated ${target.cardId} with Witchcraft.`,
    {
      battleId: pending.battleId,
      targetCardId: target.cardId,
      targetKey: target.targetKey,
      sourceKind: pending.sourceKind,
      sacrificeCardId: pending.sourceKind === 'asset' ? action.cardId : undefined,
    },
  );
  return target.cardId;
}

export function removeWitchcraftVirtualCleanupCopies(game: GameState, battle: BattleState): void {
  for (const participant of [battle.attacker, battle.defender]) {
    const virtualCards = participant.battleDrawPlayed.filter((card) => card.virtual);
    const player = game.players[participant.playerId];
    for (const card of virtualCards) {
      if (removeLast(player.zones.discard, card.cardId)) continue;
      removeLast(player.zones.graveyard, card.cardId);
    }
  }
}

export function correctWitchcraftBattleDestinations(game: GameState, battle: BattleState): void {
  for (const participant of [battle.attacker, battle.defender]) {
    const count = participant.battleDrawPlayed.filter((card) => (
      activeWitchcraft(card) && card.origin === 'battle_draw'
    )).length;
    for (let index = 0; index < count; index += 1) {
      if (!removeLast(game.players[participant.playerId].zones.discard, WITCHCRAFT)) break;
      game.players[participant.playerId].zones.graveyard.push(WITCHCRAFT);
    }
  }
}

export function supportedWitchcraftRepeatIds(): CardID[] {
  return [...repeatableBattleEffectIds];
}
