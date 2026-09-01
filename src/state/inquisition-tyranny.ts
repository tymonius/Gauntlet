import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  InquisitionTyrannyTargetOption,
  PendingInquisitionTyrannyChoice,
  PlayerID,
} from '../types/v06';
import type { ResolveInquisitionChoiceAction } from './actions';
import { recordBankedAssetUse } from './intelligence-mission-triggers';
import { bankedAssetUseAllowed, activeBankedAssetCopies, bankedAssetCardUseAllowed } from './intelligence-subversion-battle';
import { hasFactionResource, spendFactionResource } from './resources';
import { GameActionError } from './reducer';

export const TYRANNY = 'inquisition-tyranny';
const ASSET_INITIAL_PREFIX = 'tyranny_asset_initial:';
const ASSET_PROCESSED_PREFIX = 'tyranny_asset_processed:';

type SourceSlot = 'hand_commit' | 'battle_draw_played' | 'asset';

interface TyrannySource {
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

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function opponentFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.defender;
  if (battle.defender.playerId === playerId) return battle.attacker;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function activePhysicalCard(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated && !card.virtual);
}

function activeTyranny(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(activePhysicalCard(card) && card.cardId === TYRANNY);
}

export function tyrannyTargetOptions(game: GameState, playerId: PlayerID): InquisitionTyrannyTargetOption[] {
  if (!game.battle || game.battle.stage !== 'dice') return [];
  const opponent = opponentFor(game, playerId);
  const options: InquisitionTyrannyTargetOption[] = [];
  if (activePhysicalCard(opponent.handCommit)) {
    options.push({
      targetKey: 'hand_commit',
      cardId: opponent.handCommit.cardId,
      owner: opponent.playerId,
      sourceSlot: 'hand_commit',
    });
  }
  opponent.battleDrawPlayed.forEach((card, sourceIndex) => {
    if (!activePhysicalCard(card)) return;
    options.push({
      targetKey: `battle_draw_played:${sourceIndex}`,
      cardId: card.cardId,
      owner: opponent.playerId,
      sourceSlot: 'battle_draw_played',
      sourceIndex,
    });
  });
  return options;
}

function unresolvedBattleCardSource(participant: BattleParticipantState): TyrannySource | undefined {
  if (activeTyranny(participant.handCommit) && !participant.handCommit.postRevealEffectResolved) {
    return {
      playerId: participant.playerId,
      sourceKind: 'battle_card',
      sourceSlot: 'hand_commit',
      card: participant.handCommit,
    };
  }
  const sourceIndex = participant.battleDrawPlayed.findIndex((card) => (
    activeTyranny(card) && !card.postRevealEffectResolved
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
  const inquisition = game.players[playerId].inquisition;
  if (!inquisition || inquisition.tyrannyAssetUseTurn !== game.turn) return 0;
  return inquisition.tyrannyAssetUsesThisTurn ?? 0;
}

function availableAssetCount(game: GameState, playerId: PlayerID): number {
  const banked = activeBankedAssetCopies(game, playerId, TYRANNY);
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

function unresolvedAssetSource(game: GameState, playerId: PlayerID): TyrannySource | undefined {
  if (!hasFactionResource(game.players[playerId], 'conviction', 1)) return undefined;
  if (assetProcessedCount(game, playerId) >= assetInitialCount(game, playerId)) return undefined;
  return { playerId, sourceKind: 'asset', sourceSlot: 'asset' };
}

function nextSource(game: GameState): TyrannySource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  for (const participant of [battle.attacker, battle.defender]) {
    const battleSource = unresolvedBattleCardSource(participant);
    if (battleSource) return battleSource;
    const assetSource = unresolvedAssetSource(game, participant.playerId);
    if (assetSource) return assetSource;
  }
  return undefined;
}

function markSourceProcessed(game: GameState, source: TyrannySource): void {
  if (source.sourceKind === 'asset') {
    game.battle!.effectsResolved.push(`${ASSET_PROCESSED_PREFIX}${source.playerId}`);
  } else if (source.card) {
    source.card.postRevealEffectResolved = true;
  }
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
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

export function openNextTyrannyChoice(game: GameState): boolean {
  if (hasBlockingWindow(game) || game.battle?.stage !== 'dice') return false;
  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    markSourceProcessed(game, source);
    const targetOptions = tyrannyTargetOptions(game, source.playerId);
    if (targetOptions.length === 0) continue;
    const pending: PendingInquisitionTyrannyChoice = {
      kind: 'tyranny_negate',
      playerId: source.playerId,
      battleId: game.battle.id,
      sourceKind: source.sourceKind,
      sourceSlot: source.sourceSlot === 'asset' ? undefined : source.sourceSlot,
      sourceIndex: source.sourceKind === 'battle_card' ? source.sourceIndex : undefined,
      targetOptions,
      options: source.sourceKind === 'asset' ? ['pass', 'negate'] : ['negate'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.pendingInquisitionChoice = pending;
    game.priorityPlayer = source.playerId;
    return true;
  }
}

export function isTyrannyChoice(kind: unknown): kind is PendingInquisitionTyrannyChoice['kind'] {
  return kind === 'tyranny_negate';
}

function currentTarget(
  game: GameState,
  pending: PendingInquisitionTyrannyChoice,
  targetKey: string,
): { option: InquisitionTyrannyTargetOption; card: BattlePlayedCard } {
  const offered = pending.targetOptions.find((option) => option.targetKey === targetKey);
  if (!offered) throw new GameActionError('Choose an opposing active card for Tyranny.');
  const current = tyrannyTargetOptions(game, pending.playerId).find((option) => option.targetKey === targetKey);
  if (!current || current.cardId !== offered.cardId || current.owner !== offered.owner) {
    throw new GameActionError('The chosen Tyranny target is no longer active.');
  }
  const opponent = opponentFor(game, pending.playerId);
  const card = current.sourceSlot === 'hand_commit'
    ? opponent.handCommit
    : opponent.battleDrawPlayed[current.sourceIndex!];
  if (!activePhysicalCard(card)) throw new GameActionError('The chosen Tyranny target is no longer active.');
  return { option: current, card };
}

function recordAssetUse(game: GameState, playerId: PlayerID): void {
  const inquisition = game.players[playerId].inquisition;
  if (!inquisition) throw new GameActionError(`${playerId} is not using the Inquisition faction.`);
  if (inquisition.tyrannyAssetUseTurn !== game.turn) {
    inquisition.tyrannyAssetUseTurn = game.turn;
    inquisition.tyrannyAssetUsesThisTurn = 0;
  }
  inquisition.tyrannyAssetUsesThisTurn = (inquisition.tyrannyAssetUsesThisTurn ?? 0) + 1;
}

export function resolveTyrannyChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending || pending.kind !== 'tyranny_negate' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Tyranny choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId || game.battle.stage !== 'dice') {
    throw new GameActionError('The Tyranny battle window is no longer open.');
  }
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingInquisitionChoice = undefined;
  if (action.choice === 'pass') {
    if (pending.sourceKind !== 'asset') throw new GameActionError('A Tyranny Battle effect must negate an opposing card.');
    game.priorityPlayer = resumePriority ?? game.activePlayer;
    return;
  }
  if (action.choice !== 'negate' || !action.targetKey) {
    throw new GameActionError('Choose an opposing active card for Tyranny.');
  }
  const target = currentTarget(game, pending, action.targetKey);
  if (pending.sourceKind === 'asset') {
    if (!bankedAssetCardUseAllowed(game, action.playerId, TYRANNY)) {
      throw new GameActionError('Banked Asset use is prohibited in this battle.');
    }
    spendFactionResource(game, action.playerId, 'conviction', 1, TYRANNY);
    recordAssetUse(game, action.playerId);
    recordBankedAssetUse(game, action.playerId, pending.battleId, TYRANNY);
  }
  target.card.negated = true;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  publicLog(
    game,
    action.playerId,
    'inquisition_tyranny_negated',
    `${game.players[action.playerId].name} negated ${target.option.cardId} with Tyranny.`,
    {
      battleId: pending.battleId,
      sourceKind: pending.sourceKind,
      targetKey: target.option.targetKey,
      targetCardId: target.option.cardId,
      targetOwner: target.option.owner,
    },
  );
}
