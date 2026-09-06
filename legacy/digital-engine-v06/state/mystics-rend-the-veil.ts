import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PendingRendTheVeilChoice,
  PlayerID,
} from '../types/v06';
import type { ResolveMysticsChoiceAction } from './actions';
import {
  addReplayedBattleCard,
  replayableBattleEffectsIn,
} from './battle-effect-replay';
import { activeBankedAssetCopies } from './intelligence-subversion-battle';
import { GameActionError } from './reducer';

export const REND_THE_VEIL = 'mystics-rend-the-veil';
const ASSET_INITIAL_PREFIX = 'rend_the_veil_asset_initial:';
const ASSET_PROCESSED_PREFIX = 'rend_the_veil_asset_processed:';

type SourceSlot = 'hand_commit' | 'battle_draw_played' | 'asset';

interface RendSource {
  playerId: PlayerID;
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

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === REND_THE_VEIL && !card.canceled && !card.negated);
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function unresolvedCardSource(participant: BattleParticipantState): RendSource | undefined {
  if (active(participant.handCommit) && !participant.handCommit.postRevealEffectResolved) {
    return {
      playerId: participant.playerId,
      sourceSlot: 'hand_commit',
      card: participant.handCommit,
    };
  }
  const sourceIndex = participant.battleDrawPlayed.findIndex((card) => (
    active(card) && !card.postRevealEffectResolved
  ));
  if (sourceIndex < 0) return undefined;
  return {
    playerId: participant.playerId,
    sourceSlot: 'battle_draw_played',
    sourceIndex,
    card: participant.battleDrawPlayed[sourceIndex],
  };
}

function assetInitialCount(game: GameState, playerId: PlayerID): number {
  const battle = game.battle!;
  const prefix = `${ASSET_INITIAL_PREFIX}${playerId}:`;
  const existing = battle.effectsResolved.find((entry) => entry.startsWith(prefix));
  if (existing) return Number(existing.slice(prefix.length));
  const count = activeBankedAssetCopies(game, playerId, REND_THE_VEIL);
  battle.effectsResolved.push(`${prefix}${count}`);
  return count;
}

function assetProcessedCount(game: GameState, playerId: PlayerID): number {
  return game.battle!.effectsResolved.filter((entry) => entry === `${ASSET_PROCESSED_PREFIX}${playerId}`).length;
}

function unresolvedAssetSource(game: GameState, playerId: PlayerID): RendSource | undefined {
  return assetProcessedCount(game, playerId) < assetInitialCount(game, playerId)
    ? { playerId, sourceSlot: 'asset' }
    : undefined;
}

function nextSource(game: GameState): RendSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  for (const participant of [battle.attacker, battle.defender]) {
    const cardSource = unresolvedCardSource(participant);
    if (cardSource) return cardSource;
    const assetSource = unresolvedAssetSource(game, participant.playerId);
    if (assetSource) return assetSource;
  }
  return undefined;
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

function markSourceProcessed(game: GameState, source: RendSource): void {
  if (source.sourceSlot === 'asset') {
    game.battle!.effectsResolved.push(`${ASSET_PROCESSED_PREFIX}${source.playerId}`);
  } else if (source.card) {
    source.card.postRevealEffectResolved = true;
  }
}

function sourceForPending(game: GameState, pending: PendingRendTheVeilChoice): RendSource {
  if (pending.sourceSlot === 'asset') {
    return { playerId: pending.playerId, sourceSlot: 'asset' };
  }
  const participant = participantFor(game, pending.playerId);
  const card = pending.sourceSlot === 'hand_commit'
    ? participant.handCommit
    : participant.battleDrawPlayed[pending.sourceIndex ?? -1];
  if (!active(card)) throw new GameActionError('The Rend the Veil source is no longer active.');
  return {
    playerId: pending.playerId,
    sourceSlot: pending.sourceSlot,
    sourceIndex: pending.sourceIndex,
    card,
  };
}

function discardAsset(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  const index = player.zones.assetBank.indexOf(REND_THE_VEIL);
  if (index < 0) throw new GameActionError('Rend the Veil is no longer banked.');
  player.zones.assetBank.splice(index, 1);
  player.zones.discard.push(REND_THE_VEIL);
}

export function openNextRendTheVeilChoice(game: GameState): boolean {
  if (hasBlockingWindow(game) || game.battle?.stage !== 'dice') return false;

  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    const graveyardOptions = replayableBattleEffectsIn(
      game,
      source.playerId,
      game.players[source.playerId].zones.graveyard,
    );
    if (graveyardOptions.length === 0) {
      markSourceProcessed(game, source);
      continue;
    }

    game.pendingMysticsChoice = {
      kind: 'rend_the_veil',
      playerId: source.playerId,
      battleId: game.battle.id,
      sourceSlot: source.sourceSlot,
      sourceIndex: source.sourceIndex,
      graveyardOptions,
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = source.playerId;
    return true;
  }
}

export function isRendTheVeilChoice(kind: unknown): kind is PendingRendTheVeilChoice['kind'] {
  return kind === 'rend_the_veil';
}

export function resolveRendTheVeilChoice(game: GameState, action: ResolveMysticsChoiceAction): CardID | undefined {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'rend_the_veil' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Rend the Veil choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId || game.battle.stage !== 'dice') {
    throw new GameActionError('The Rend the Veil battle window is no longer open.');
  }

  const source = sourceForPending(game, pending);
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingMysticsChoice = undefined;
  markSourceProcessed(game, source);

  if (action.choice === 'pass') {
    game.priorityPlayer = resumePriority ?? game.activePlayer;
    return undefined;
  }
  if (action.choice !== 'use' || !action.cardId) {
    throw new GameActionError('Choose an eligible Graveyard card or pass Rend the Veil.');
  }
  if (!pending.graveyardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose a Battle effect offered by Rend the Veil.');
  }

  const player = game.players[action.playerId];
  const graveyardIndex = player.zones.graveyard.indexOf(action.cardId);
  if (graveyardIndex < 0) throw new GameActionError('The chosen card is no longer in your Graveyard.');
  if (source.sourceSlot === 'asset') discardAsset(game, action.playerId);
  player.zones.graveyard.splice(graveyardIndex, 1);
  addReplayedBattleCard(game, action.playerId, action.cardId);

  publicLog(
    game,
    action.playerId,
    'mystics_rend_the_veil_used',
    `${player.name} used ${action.cardId} from their Graveyard with Rend the Veil.`,
    { cardId: action.cardId, sourceSlot: source.sourceSlot },
  );
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  return action.cardId;
}
