import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameEvent,
  GameState,
  PlayerID,
  ResistanceBattleCleanupEntry,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { reconcileFaceDownAssets } from './asset-facing';
import { activeBankedAssetCopies } from './banked-assets';
import { battleIsCounterattack } from './neutral-liberation';

export const RESISTANCE = 'neutral-resistance';
const RESISTANCE_ASSET_SETUP = 'neutral_resistance_asset_setup';
const RESISTANCE_BATTLE_RESOLUTION = 'neutral_resistance_battle';

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

function removeOne(cards: string[], cardId: string): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === RESISTANCE
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeSources(participant: BattleParticipantState): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter(active);
}

function normalDestination(card: BattlePlayedCard): ResistanceBattleCleanupEntry['normalDestination'] {
  return card.origin === 'hand' ? 'graveyard' : 'discard';
}

function assetBankHasRoom(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  return player.zones.assetBank.length < player.controlledTerritories.length;
}

/** Applies the continuous Asset form when a qualifying counterattack begins. */
export function applyResistanceAssetBattleHandDraw(game: GameState): number {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'hand_commit'
    || battle.effectsResolved.includes(RESISTANCE_ASSET_SETUP)
    || !battleIsCounterattack(game, battle)) return 0;

  battle.effectsResolved.push(RESISTANCE_ASSET_SETUP);
  const playerId = battle.attacker.playerId;
  const copies = activeBankedAssetCopies(game, playerId, RESISTANCE);
  if (copies < 1) return 0;

  const additionalCards = copies * 2;
  battle.attacker.battleDrawCount += additionalCards;
  appendPublicLog(
    game,
    playerId,
    'neutral_resistance_asset',
    `${game.players[playerId].name} will draw ${additionalCards} additional card${additionalCards === 1 ? '' : 's'} for the initial Battle Hand with Resistance.`,
    { battleId: battle.id, copies, additionalCards },
  );
  return additionalCards;
}

/** Applies one advantage per active physical Battle copy during a counterattack. */
export function applyResistanceBattleEffects(game: GameState): number {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || battle.effectsResolved.includes(RESISTANCE_BATTLE_RESOLUTION)) return 0;

  battle.effectsResolved.push(RESISTANCE_BATTLE_RESOLUTION);
  if (!battleIsCounterattack(game, battle)) return 0;
  const copies = activeSources(battle.attacker).length;
  if (copies < 1) return 0;

  battle.attacker.advantage = (battle.attacker.advantage ?? 0) + copies;
  appendPublicLog(
    game,
    battle.attacker.playerId,
    'neutral_resistance_battle',
    `${game.players[battle.attacker.playerId].name} gained ${copies} advantage from Resistance while counterattacking.`,
    { battleId: battle.id, copies },
  );
  return copies;
}

/**
 * Reserves winning physical Battle copies before normal card cleanup. The core
 * reducer sends each reserved card to Removed, where the post-battle queue can
 * bank it or restore its normal destination without losing physical identity.
 */
export function prepareResistanceBattleCleanup(
  game: GameState,
  battle: BattleState,
  winnerId: PlayerID,
): number {
  if (winnerId !== battle.attacker.playerId || !battleIsCounterattack(game, battle)) return 0;
  const sources = activeSources(battle.attacker);
  if (sources.length < 1) return 0;

  const queue = game.neutralResistanceCleanupQueue ?? [];
  for (const [index, card] of sources.entries()) {
    card.cleanupDestination = 'removed';
    queue.push({
      id: `${battle.id}:resistance:${queue.length + index + 1}`,
      battleId: battle.id,
      playerId: battle.attacker.playerId,
      normalDestination: normalDestination(card),
    });
  }
  game.neutralResistanceCleanupQueue = queue;
  return sources.length;
}

function bankQueuedResistance(game: GameState, entry: ResistanceBattleCleanupEntry): boolean {
  const player = game.players[entry.playerId];
  if (!removeOne(player.zones.removed, RESISTANCE)) return false;
  player.zones.assetBank.push(RESISTANCE);
  reconcileFaceDownAssets(player);
  appendPublicLog(
    game,
    entry.playerId,
    'neutral_resistance_banked',
    `${player.name} banked Resistance after winning a counterattack.`,
    { battleId: entry.battleId },
  );
  return true;
}

function restoreNormalDestination(game: GameState, entry: ResistanceBattleCleanupEntry): void {
  const player = game.players[entry.playerId];
  if (!removeOne(player.zones.removed, RESISTANCE)) return;
  player.zones[entry.normalDestination].push(RESISTANCE);
}

/** Auto-banks queued copies while room remains, otherwise opens the canonical replacement choice. */
export function processResistanceCleanupQueue(game: GameState): boolean {
  if (game.pendingNeutralChoice || !game.neutralResistanceCleanupQueue?.length) return false;

  while (game.neutralResistanceCleanupQueue.length > 0) {
    const entry = game.neutralResistanceCleanupQueue[0];
    const player = game.players[entry.playerId];
    if (!player.zones.removed.includes(RESISTANCE)) {
      game.neutralResistanceCleanupQueue.shift();
      continue;
    }
    if (assetBankHasRoom(game, entry.playerId)) {
      bankQueuedResistance(game, entry);
      game.neutralResistanceCleanupQueue.shift();
      continue;
    }

    game.pendingNeutralChoice = {
      kind: 'resistance_battle',
      playerId: entry.playerId,
      entryId: entry.id,
      battleId: entry.battleId,
      cardOptions: [...new Set(player.zones.assetBank)],
      options: ['pass', 'select_card'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = entry.playerId;
    return true;
  }

  game.neutralResistanceCleanupQueue = undefined;
  return false;
}

export function resolveResistanceChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'resistance_battle' || pending.playerId !== action.playerId) {
    throw new Error(`${action.playerId} has no pending Resistance choice.`);
  }
  const entry = game.neutralResistanceCleanupQueue?.[0];
  if (!entry || entry.id !== pending.entryId) throw new Error('The Resistance cleanup entry is no longer available.');
  const player = game.players[action.playerId];

  if (action.choice === 'pass') {
    restoreNormalDestination(game, entry);
    appendPublicLog(
      game,
      action.playerId,
      'neutral_resistance_passed',
      `${player.name} could not make room for Resistance, so it followed its normal destination.`,
      { battleId: entry.battleId, destination: entry.normalDestination },
    );
  } else if (action.choice === 'select_card' && action.cardId && pending.cardOptions.includes(action.cardId)) {
    if (!removeOne(player.zones.assetBank, action.cardId)) {
      throw new Error(`${action.cardId} is no longer in the Asset Bank.`);
    }
    player.zones.discard.push(action.cardId);
    reconcileFaceDownAssets(player);
    if (!bankQueuedResistance(game, entry)) throw new Error('Resistance is no longer awaiting cleanup.');
  } else {
    throw new Error('Choose one Asset to discard for Resistance, or pass.');
  }

  game.neutralResistanceCleanupQueue?.shift();
  if (game.neutralResistanceCleanupQueue?.length === 0) game.neutralResistanceCleanupQueue = undefined;
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  processResistanceCleanupQueue(game);
}
