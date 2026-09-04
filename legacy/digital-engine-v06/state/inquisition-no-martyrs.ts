import type {
  BattlePlayedCard,
  BattleState,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveInquisitionChoiceAction } from './actions';
import { recordBankedAssetUse } from './intelligence-mission-triggers';
import { bankedAssetUseAllowed, activeBankedAssetCopies, bankedAssetCardUseAllowed } from './intelligence-subversion-battle';

export const NO_MARTYRS = 'inquisition-no-martyrs';

export class NoMartyrsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoMartyrsError';
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

function removeOne(cards: string[], cardId: string): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function countBankedCopies(game: GameState, playerId: PlayerID): number {
  return activeBankedAssetCopies(game, playerId, NO_MARTYRS);
}

function ensureAssetCounters(battle: BattleState, game: GameState, playerId: PlayerID): void {
  battle.noMartyrsAssetInitialCounts ??= {};
  battle.noMartyrsAssetProcessedCounts ??= {};
  battle.noMartyrsAssetActivatedCounts ??= {};
  if (battle.noMartyrsAssetInitialCounts[playerId] === undefined) {
    battle.noMartyrsAssetInitialCounts[playerId] = countBankedCopies(game, playerId);
  }
  battle.noMartyrsAssetProcessedCounts[playerId] ??= 0;
  battle.noMartyrsAssetActivatedCounts[playerId] ??= 0;
}

function postRevealWindowBlocked(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
    || game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.militaryChoiceQueue?.length
    || game.militaryTimingChoiceQueue?.length
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.financierChoiceQueue?.length
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

export function openNextNoMartyrsAssetChoice(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice' || postRevealWindowBlocked(game)) return false;

  for (const participant of [battle.attacker, battle.defender]) {
    const playerId = participant.playerId;
    const player = game.players[playerId];
    if (player.factionId !== 'inquisition') continue;
    ensureAssetCounters(battle, game, playerId);
    const initial = battle.noMartyrsAssetInitialCounts?.[playerId] ?? 0;
    const processed = battle.noMartyrsAssetProcessedCounts?.[playerId] ?? 0;
    if (processed >= initial) continue;
    if (!bankedAssetUseAllowed(game, playerId)) {
      battle.noMartyrsAssetProcessedCounts![playerId] = initial;
      continue;
    }
    game.pendingInquisitionChoice = {
      kind: 'no_martyrs_asset',
      playerId,
      battleId: battle.id,
      copyNumber: processed + 1,
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = playerId;
    return true;
  }
  return false;
}

export function isNoMartyrsChoice(kind: unknown): kind is 'no_martyrs_asset' {
  return kind === 'no_martyrs_asset';
}

export function resolveNoMartyrsChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  const battle = game.battle;
  if (!pending || pending.kind !== 'no_martyrs_asset' || pending.playerId !== action.playerId) {
    throw new NoMartyrsError(`${action.playerId} has no pending No Martyrs choice.`);
  }
  if (!battle || battle.id !== pending.battleId || battle.stage !== 'dice') {
    throw new NoMartyrsError('The No Martyrs Asset window is no longer available.');
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new NoMartyrsError('Choose whether to use No Martyrs.');
  }
  ensureAssetCounters(battle, game, pending.playerId);
  if (action.choice === 'use') {
    if (!bankedAssetCardUseAllowed(game, pending.playerId, NO_MARTYRS)) {
      throw new NoMartyrsError('Banked Asset use is prohibited in this battle.');
    }
    if (!removeOne(game.players[pending.playerId].zones.assetBank, NO_MARTYRS)) {
      throw new NoMartyrsError('No Martyrs is no longer in your Asset Bank.');
    }
    game.players[pending.playerId].zones.discard.push(NO_MARTYRS);
    battle.noMartyrsAssetActivatedCounts![pending.playerId] = (battle.noMartyrsAssetActivatedCounts?.[pending.playerId] ?? 0) + 1;
    recordBankedAssetUse(game, pending.playerId, battle.id, NO_MARTYRS);
    publicLog(
      game,
      pending.playerId,
      'inquisition_no_martyrs_asset_used',
      `${game.players[pending.playerId].name} discarded No Martyrs from their Asset Bank.`,
      { battleId: battle.id, copyNumber: pending.copyNumber },
    );
  }
  battle.noMartyrsAssetProcessedCounts![pending.playerId] = (battle.noMartyrsAssetProcessedCounts?.[pending.playerId] ?? 0) + 1;
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  openNextNoMartyrsAssetChoice(game);
}

function activeNoMartyrs(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card
    && card.cardId === NO_MARTYRS
    && !card.canceled
    && !card.negated
    && !card.virtual);
}

function activeBattleCopies(battle: BattleState, playerId: PlayerID): number {
  const participant = battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
  return (activeNoMartyrs(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeNoMartyrs).length;
}

export function applyNoMartyrsOutcome(
  game: GameState,
  battle: BattleState,
  winner: PlayerID,
  loser: PlayerID,
): number {
  const sourceCount = activeBattleCopies(battle, winner)
    + (battle.noMartyrsAssetActivatedCounts?.[winner] ?? 0);
  if (sourceCount < 1) return 0;
  const resolutionKey = `inquisition_no_martyrs_outcome:${winner}:${loser}`;
  if (battle.effectsResolved.includes(resolutionKey)) return sourceCount;
  battle.lossRetreatEffectsSuppressedFor = [
    ...new Set([...(battle.lossRetreatEffectsSuppressedFor ?? []), loser]),
  ];
  battle.additionalRetreatPositions ??= {};
  battle.additionalRetreatPositions[loser] = (battle.additionalRetreatPositions[loser] ?? 0) + sourceCount;
  battle.effectsResolved.push(resolutionKey);
  publicLog(
    game,
    winner,
    'inquisition_no_martyrs_applied',
    `${game.players[winner].name} suppressed ${game.players[loser].name}’s beneficial loss and retreat triggers and forced ${sourceCount} additional retreat position${sourceCount === 1 ? '' : 's'}.`,
    { battleId: battle.id, winner, loser, sourceCount },
  );
  return sourceCount;
}

export function lossOrRetreatBenefitsSuppressed(
  game: GameState,
  playerId: PlayerID,
  battleId?: string,
): boolean {
  if (game.battle
    && (!battleId || game.battle.id === battleId)
    && game.battle.lossRetreatEffectsSuppressedFor?.includes(playerId)) return true;
  const result = game.recentBattleResult;
  return Boolean(result
    && (!battleId || result.battleId === battleId)
    && result.lossRetreatEffectsSuppressedFor?.includes(playerId));
}
