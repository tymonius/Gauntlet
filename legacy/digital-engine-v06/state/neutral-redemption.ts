import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type {
  AppStateAction,
  FinishMovementAction,
  ResolveBattleAction,
  ResolveNeutralChoiceAction,
} from './actions';
import { activeBankedAssetCopies, bankedAssetUseAllowed } from './intelligence-subversion-battle';
import { GameActionError } from './reducer';

export const REDEMPTION = 'neutral-redemption';
export type DiscardSnapshot = Record<PlayerID, CardID[]>;
export type RedemptionObservedAction = AppStateAction | FinishMovementAction;

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

function multisetDifference(after: CardID[], before: CardID[]): CardID[] {
  const remaining = [...before];
  const entered: CardID[] = [];
  for (const cardId of after) {
    const index = remaining.indexOf(cardId);
    if (index >= 0) remaining.splice(index, 1);
    else entered.push(cardId);
  }
  return entered;
}

function multisetContains(source: CardID[], selected: CardID[]): boolean {
  const remaining = [...source];
  for (const cardId of selected) {
    if (!removeOne(remaining, cardId)) return false;
  }
  return true;
}

function unique(cards: CardID[]): CardID[] {
  return [...new Set(cards)];
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

export function captureDiscardSnapshot(game: GameState): DiscardSnapshot {
  return Object.fromEntries(
    Object.values(game.players).map((player) => [player.id, [...player.zones.discard]]),
  );
}

/**
 * Identifies the player whose effect is resolving. Structural game actions are
 * excluded so normal draws, movement, battle cleanup, and Asset-limit discards
 * never masquerade as opposing effects.
 */
export function redemptionEffectSourcePlayer(
  game: GameState,
  action: RedemptionObservedAction,
): PlayerID | undefined {
  switch (action.type) {
    case 'draw_card':
    case 'reveal_space':
    case 'resolve_asset_bank_discard':
    case 'move_player':
    case 'finish_movement':
    case 'commit_battle_hand_card':
    case 'pass_battle_hand_commit':
    case 'draw_battle_cards':
    case 'play_battle_draw_card':
    case 'pass_battle_draw_play':
    case 'roll_battle_die':
    case 'resolve_battle':
    case 'end_turn':
      return undefined;
    case 'resolve_inquisition_choice': {
      const pending = game.pendingInquisitionChoice;
      if (pending && 'inquisitorId' in pending) return pending.inquisitorId;
      return pending?.playerId ?? action.playerId;
    }
    default:
      return action.playerId;
  }
}

export function registerRedemptionDiscardEntries(
  game: GameState,
  before: DiscardSnapshot,
  sourcePlayerId: PlayerID | undefined,
): number {
  if (!sourcePlayerId) return 0;
  let registered = 0;
  const queue = game.neutralRedemptionDiscardQueue ?? [];

  for (const player of Object.values(game.players)) {
    if (player.id === sourcePlayerId) continue;
    if (!bankedAssetUseAllowed(game, player.id)) continue;
    const assetCount = activeBankedAssetCopies(game, player.id, REDEMPTION);
    if (assetCount < 1) continue;

    const entered = multisetDifference(player.zones.discard, before[player.id] ?? []);
    if (entered.length < 1) continue;
    const triggersRemaining = Math.min(assetCount, entered.length);
    queue.push({
      id: `${game.id}-redemption-discard-${game.turn}-${queue.length + 1}`,
      playerId: player.id,
      sourcePlayerId,
      cardIds: entered,
      triggersRemaining,
    });
    registered += 1;
  }

  game.neutralRedemptionDiscardQueue = queue.length > 0 ? queue : undefined;
  return registered;
}

/** Registers a known set of cards that entered one player's Discard Pile. */
export function registerRedemptionDiscardCardIds(
  game: GameState,
  playerId: PlayerID,
  cardIds: CardID[],
  sourcePlayerId: PlayerID | undefined,
): number {
  if (!sourcePlayerId || playerId === sourcePlayerId || cardIds.length < 1) return 0;
  if (!bankedAssetUseAllowed(game, playerId)) return 0;
  const assetCount = activeBankedAssetCopies(game, playerId, REDEMPTION);
  if (assetCount < 1) return 0;

  const player = game.players[playerId];
  if (!player) return 0;
  const available = [...player.zones.discard];
  const entered = cardIds.filter((cardId) => removeOne(available, cardId));
  if (entered.length < 1) return 0;

  const queue = game.neutralRedemptionDiscardQueue ?? [];
  queue.push({
    id: `${game.id}-redemption-discard-${game.turn}-${queue.length + 1}`,
    playerId,
    sourcePlayerId,
    cardIds: entered,
    triggersRemaining: Math.min(assetCount, entered.length),
  });
  game.neutralRedemptionDiscardQueue = queue;
  return 1;
}

function trimDiscardQueue(game: GameState): void {
  const queue = game.neutralRedemptionDiscardQueue ?? [];
  const retained = queue.filter((entry) => {
    const player = game.players[entry.playerId];
    if (!player || entry.triggersRemaining < 1) return false;
    if (!bankedAssetUseAllowed(game, player.id)) return false;
    const assetCount = activeBankedAssetCopies(game, player.id, REDEMPTION);
    if (assetCount < 1) return false;
    const available = [...player.zones.discard];
    const eligible = entry.cardIds.filter((cardId) => removeOne(available, cardId));
    entry.cardIds = eligible;
    entry.triggersRemaining = Math.min(entry.triggersRemaining, assetCount, eligible.length);
    return entry.triggersRemaining > 0;
  });
  game.neutralRedemptionDiscardQueue = retained.length > 0 ? retained : undefined;
}

export function openNextRedemptionChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  trimDiscardQueue(game);
  const entry = game.neutralRedemptionDiscardQueue?.[0];
  if (!entry) return false;

  game.pendingNeutralChoice = {
    kind: 'redemption_asset',
    playerId: entry.playerId,
    sourcePlayerId: entry.sourcePlayerId,
    entryId: entry.id,
    cardOptions: unique(entry.cardIds),
    triggersRemaining: entry.triggersRemaining,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = entry.playerId;
  return true;
}

function activeRedemption(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === REDEMPTION && !card.canceled && !card.negated);
}

function activeBattleCopyCount(participant: BattleParticipantState): number {
  return (activeRedemption(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeRedemption).length;
}

function eligibleNegatedBattleCards(participant: BattleParticipantState): CardID[] {
  return participant.battleDrawPlayed
    .filter((card) => card.cardId !== REDEMPTION && card.negated && !card.canceled)
    .map((card) => card.cardId);
}

/**
 * Prepares Battle cleanup protection. Returns true only when player input is
 * required; automatic selections are stored directly on the cloned game state.
 */
export function prepareRedemptionBattleResolution(
  game: GameState,
  action: ResolveBattleAction,
): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'resolution') return false;

  if (game.neutralRedemptionBattleReturns?.battleId !== battle.id) {
    game.neutralRedemptionBattleReturns = { battleId: battle.id, byPlayer: {} };
  }
  const returns = game.neutralRedemptionBattleReturns;

  for (const participant of [battle.attacker, battle.defender]) {
    if (returns.byPlayer[participant.playerId] !== undefined) continue;
    const copyCount = activeBattleCopyCount(participant);
    const candidates = eligibleNegatedBattleCards(participant);
    const selectCount = Math.min(copyCount, candidates.length);
    if (selectCount < 1) {
      returns.byPlayer[participant.playerId] = [];
      continue;
    }
    if (candidates.length <= copyCount) {
      returns.byPlayer[participant.playerId] = [...candidates];
      continue;
    }

    game.pendingNeutralChoice = {
      kind: 'redemption_battle',
      playerId: participant.playerId,
      battleId: battle.id,
      cardOptions: [...candidates],
      selectCount,
      resolverPlayerId: action.playerId,
      battleCardTargets: action.battleCardTargets?.map((target) => ({ ...target })),
      options: ['select_cards'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = participant.playerId;
    return true;
  }
  return false;
}

function resolveAssetChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'redemption_asset' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Redemption Asset choice.`);
  }
  const entry = game.neutralRedemptionDiscardQueue?.find((candidate) => candidate.id === pending.entryId);
  if (!entry) throw new GameActionError('The Redemption discard event is no longer pending.');
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to use Redemption.');
  }

  const player = game.players[action.playerId];
  game.pendingNeutralChoice = undefined;
  entry.triggersRemaining -= 1;

  if (action.choice === 'use') {
    if (!action.cardId || !pending.cardOptions.includes(action.cardId)) {
      throw new GameActionError('Choose one eligible discarded card for Redemption.');
    }
    if (!removeOne(player.zones.assetBank, REDEMPTION)) {
      throw new GameActionError('Redemption is no longer banked.');
    }
    if (!removeOne(player.zones.discard, action.cardId)) {
      throw new GameActionError(`${action.cardId} is no longer in the Discard Pile.`);
    }
    removeOne(entry.cardIds, action.cardId);
    player.zones.discard.push(REDEMPTION);
    player.zones.hand.push(action.cardId);
    appendPublicLog(
      game,
      action.playerId,
      'neutral_redemption_asset_used',
      `${player.name} discarded Redemption and returned ${action.cardId} to hand.`,
      { sourcePlayerId: pending.sourcePlayerId, cardId: action.cardId },
    );
  } else {
    appendPublicLog(
      game,
      action.playerId,
      'neutral_redemption_asset_passed',
      `${player.name} declined Redemption.`,
      { sourcePlayerId: pending.sourcePlayerId },
    );
  }

  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  trimDiscardQueue(game);
  openNextRedemptionChoice(game);
}

export interface ResolvedRedemptionChoice {
  deferredBattleAction?: ResolveBattleAction;
}

export function resolveRedemptionChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): ResolvedRedemptionChoice {
  const pending = game.pendingNeutralChoice;
  if (!pending) throw new GameActionError(`${action.playerId} has no pending Neutral choice.`);
  if (pending.kind === 'redemption_asset') {
    resolveAssetChoice(game, action);
    return {};
  }
  if (pending.kind !== 'redemption_battle'
    || pending.playerId !== action.playerId
    || action.choice !== 'select_cards') {
    throw new GameActionError(`${action.playerId} has no matching Redemption Battle choice.`);
  }
  const selected = action.cardIds ?? [];
  if (selected.length !== pending.selectCount || !multisetContains(pending.cardOptions, selected)) {
    throw new GameActionError(`Choose exactly ${pending.selectCount} eligible card${pending.selectCount === 1 ? '' : 's'} for Redemption.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId) {
    throw new GameActionError('The Redemption battle is no longer active.');
  }
  const returns = game.neutralRedemptionBattleReturns;
  if (!returns || returns.battleId !== pending.battleId) {
    throw new GameActionError('Redemption Battle cleanup state is missing.');
  }

  returns.byPlayer[action.playerId] = [...selected];
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  return {
    deferredBattleAction: {
      type: 'resolve_battle',
      playerId: pending.resolverPlayerId,
      battleCardTargets: pending.battleCardTargets?.map((target) => ({ ...target })),
    },
  };
}

export function applyRedemptionBattleReturns(
  game: GameState,
  battleId: string,
): number {
  const prepared = game.neutralRedemptionBattleReturns;
  if (!prepared || prepared.battleId !== battleId) return 0;
  let returned = 0;

  for (const [playerId, cardIds] of Object.entries(prepared.byPlayer)) {
    const player = game.players[playerId];
    if (!player) continue;
    for (const cardId of cardIds ?? []) {
      if (!removeOne(player.zones.discard, cardId)) continue;
      player.zones.hand.push(cardId);
      returned += 1;
      appendPublicLog(
        game,
        playerId,
        'neutral_redemption_battle_returned',
        `${player.name} returned ${cardId} to hand with Redemption.`,
        { battleId, cardId },
      );
    }
  }

  game.neutralRedemptionBattleReturns = undefined;
  return returned;
}
