import type { CardID, GameEvent, GameState, PendingIntelligenceChoice, PlayerID } from '../types';
import type { AppStateAction, ResolveIntelligenceChoiceAction } from './actions';
import { bankedAssetUseAllowed } from './intelligence-subversion-battle';
import { recordBankedAssetUse } from './intelligence-mission-triggers';

export const SUBVERSION_ASSET = 'intelligence-subversion';

const ASSETS = {
  attrition: 'card-attrition',
  fortifications: 'card-fortifications',
  tariffs: 'financiers-tariffs',
  exfiltration: 'intelligence-exfiltration',
  reconnaissance: 'intelligence-reconnaissance',
  interceptedOrders: 'intelligence-intercepted-orders',
  deepCover: 'intelligence-deep-cover',
  treason: 'intelligence-treason',
  sleeperNetwork: 'intelligence-sleeper-network',
  goodFaith: 'diplomats-good-faith',
  neutralObservers: 'diplomats-neutral-observers',
  safeConduct: 'diplomats-safe-conduct',
} as const satisfies Record<string, CardID>;

export interface BankedAssetEffectCandidate {
  targetOwner: PlayerID;
  targetCardId: CardID;
  effectLabel: string;
  negatedAction?: AppStateAction;
}

export interface PendingSubversionAssetChoice {
  kind: 'subversion_asset_negate';
  playerId: PlayerID;
  targetOwner: PlayerID;
  targetCardId: CardID;
  effectLabel: string;
  deferredAction: AppStateAction;
  negatedAction?: AppStateAction;
  priorIntelligenceChoice?: PendingIntelligenceChoice;
  resumePriorityPlayer?: PlayerID;
  options: ['pass', 'use'];
}

export class SubversionAssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubversionAssetError';
  }
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
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

function pendingChoice(game: GameState): PendingSubversionAssetChoice | undefined {
  const pending = game.pendingIntelligenceChoice as PendingIntelligenceChoice | PendingSubversionAssetChoice | undefined;
  return pending?.kind === 'subversion_asset_negate' ? pending : undefined;
}

export function isSubversionAssetChoice(choice: unknown): choice is PendingSubversionAssetChoice {
  return Boolean(choice && typeof choice === 'object' && (choice as { kind?: string }).kind === 'subversion_asset_negate');
}

function opposingSubversionOwner(game: GameState, targetOwner: PlayerID): PlayerID | undefined {
  return Object.values(game.players).find((player) => (
    player.id !== targetOwner
    && player.factionId === 'intelligence'
    && player.intelligence
    && player.zones.assetBank.includes(SUBVERSION_ASSET)
  ))?.id;
}

function candidateIfBanked(
  game: GameState,
  targetOwner: PlayerID,
  targetCardId: CardID,
  effectLabel: string,
  negatedAction?: AppStateAction,
): BankedAssetEffectCandidate | undefined {
  if (targetCardId === SUBVERSION_ASSET) return undefined;
  if (!game.players[targetOwner]?.zones.assetBank.includes(targetCardId)) return undefined;
  if (game.battle && !bankedAssetUseAllowed(game, targetOwner)) return undefined;
  return { targetOwner, targetCardId, effectLabel, negatedAction };
}

function intelligenceCandidate(game: GameState, action: Extract<AppStateAction, { type: 'resolve_intelligence_choice' }>): BankedAssetEffectCandidate | undefined {
  const pending = game.pendingIntelligenceChoice;
  if (!pending) return undefined;
  if (pending.kind === 'exfiltration' && action.choice === 'use') {
    return candidateIfBanked(game, pending.playerId, ASSETS.exfiltration, 'Exfiltration', { ...action, choice: 'pass' });
  }
  if (pending.kind === 'reconnaissance' && action.choice === 'use') {
    return candidateIfBanked(game, pending.playerId, ASSETS.reconnaissance, 'Reconnaissance', { ...action, choice: 'pass' });
  }
  if (pending.kind === 'intercepted_orders' && action.choice === 'use') {
    return candidateIfBanked(game, pending.playerId, ASSETS.interceptedOrders, 'Intercepted Orders', { ...action, choice: 'pass' });
  }
  if (pending.kind === 'deep_cover' && action.choice === 'use') {
    return candidateIfBanked(game, pending.playerId, ASSETS.deepCover, 'Deep Cover', { ...action, choice: 'pass' });
  }
  if (pending.kind === 'treason_battle_target' && pending.sourceKind === 'asset' && action.choice !== 'pass') {
    return candidateIfBanked(game, pending.playerId, ASSETS.treason, 'Treason', { ...action, choice: 'pass' });
  }
  if (pending.kind === 'sleeper_network_activate' && action.choice === 'activate') {
    return candidateIfBanked(game, pending.playerId, ASSETS.sleeperNetwork, 'Sleeper Network activation', { ...action, choice: 'pass' });
  }
  if (pending.kind === 'sleeper_network_compromised') {
    return candidateIfBanked(game, pending.playerId, ASSETS.sleeperNetwork, 'Sleeper Network — Compromised', { ...action, choice: 'pass', cardId: undefined });
  }
  return undefined;
}

function militaryTimingCandidate(game: GameState, action: Extract<AppStateAction, { type: 'resolve_military_timing_choice' }>): BankedAssetEffectCandidate | undefined {
  const pending = game.pendingMilitaryTimingChoice;
  if (!pending || pending.playerId !== action.playerId) return undefined;
  if (pending.kind === 'brothers_in_arms_precommit' && action.choice === 'use') {
    return candidateIfBanked(game, pending.playerId, pending.sourceCardId, 'Brothers in Arms', { ...action, choice: 'pass' });
  }
  if (pending.kind === 'military_asset_precommit' && action.choice === 'use') {
    return candidateIfBanked(game, pending.playerId, pending.sourceCardId, pending.sourceCardId, { ...action, choice: 'pass' });
  }
  if (pending.kind === 'reserve_force_after_reveal' && action.choice === 'deploy_stored') {
    return candidateIfBanked(game, pending.playerId, pending.sourceCardId, 'Reserve Force', { ...action, choice: 'pass', cardId: undefined, secondaryCardId: undefined });
  }
  return undefined;
}

function militaryAftermathCandidate(game: GameState, action: Extract<AppStateAction, { type: 'resolve_military_choice' }>): BankedAssetEffectCandidate | undefined {
  const pending = game.pendingMilitaryChoice;
  if (!pending || pending.playerId !== action.playerId) return undefined;
  if ((pending.kind === 'countercharge' || pending.kind === 'war_crimes') && action.choice === 'use') {
    return candidateIfBanked(game, pending.playerId, pending.sourceCardId, pending.sourceCardId, { ...action, choice: 'pass', cardId: undefined });
  }
  if (pending.kind === 'shock_and_awe' && (action.choice === 'breakthrough' || action.choice === 'consolidate')) {
    return candidateIfBanked(game, pending.playerId, pending.sourceCardId, 'Shock and Awe', { ...action, choice: 'negated', cardId: undefined });
  }
  return undefined;
}

function diplomatCandidate(game: GameState, action: Extract<AppStateAction, { type: 'use_diplomat_card' }>): BankedAssetEffectCandidate | undefined {
  if (![ASSETS.goodFaith, ASSETS.neutralObservers, ASSETS.safeConduct].includes(action.cardId as typeof ASSETS.goodFaith)) return undefined;
  return candidateIfBanked(game, action.playerId, action.cardId, action.cardId);
}

function battleWinner(game: GameState): PlayerID | undefined {
  const battle = game.battle;
  if (!battle || battle.stage !== 'resolution') return undefined;
  const attackerTotal = (battle.attacker.diceRoll ?? 0) + battle.attacker.modifiers;
  const defenderTotal = (battle.defender.diceRoll ?? 0) + battle.defender.modifiers;
  if (attackerTotal > defenderTotal) return battle.attacker.playerId;
  if (defenderTotal > attackerTotal) return battle.defender.playerId;
  return battle.tiePolicy === 'defender' ? battle.defender.playerId : undefined;
}

export function bankedAssetEffectCandidateForAction(
  game: GameState,
  action: AppStateAction,
): BankedAssetEffectCandidate | undefined {
  if (action.type === 'resolve_intelligence_choice') return intelligenceCandidate(game, action);
  if (action.type === 'resolve_military_timing_choice') return militaryTimingCandidate(game, action);
  if (action.type === 'resolve_military_choice') return militaryAftermathCandidate(game, action);
  if (action.type === 'use_diplomat_card') return diplomatCandidate(game, action);

  if (action.type === 'resolve_battle_reveal' && game.battle?.stage === 'dice') {
    const defender = game.battle.defender.playerId;
    return candidateIfBanked(game, defender, ASSETS.fortifications, 'Fortifications', action);
  }

  if (action.type === 'resolve_battle') {
    const winner = battleWinner(game);
    if (winner) return candidateIfBanked(game, winner, ASSETS.attrition, 'Attrition', action);
  }

  if (action.type === 'draw_card' && game.phase === 'turn_start') {
    return candidateIfBanked(game, action.playerId, ASSETS.tariffs, 'Tariffs', action);
  }

  return undefined;
}

export function maybeOpenSubversionAssetWindow(game: GameState, action: AppStateAction): boolean {
  if (pendingChoice(game)) return false;
  const candidate = bankedAssetEffectCandidateForAction(game, action);
  if (!candidate) return false;
  const playerId = opposingSubversionOwner(game, candidate.targetOwner);
  if (!playerId) return false;

  const priorIntelligenceChoice = game.pendingIntelligenceChoice;
  const pending: PendingSubversionAssetChoice = {
    kind: 'subversion_asset_negate',
    playerId,
    targetOwner: candidate.targetOwner,
    targetCardId: candidate.targetCardId,
    effectLabel: candidate.effectLabel,
    deferredAction: structuredClone(action),
    negatedAction: candidate.negatedAction ? structuredClone(candidate.negatedAction) : undefined,
    priorIntelligenceChoice,
    resumePriorityPlayer: game.priorityPlayer,
    options: ['pass', 'use'],
  };
  game.pendingIntelligenceChoice = pending as unknown as PendingIntelligenceChoice;
  game.priorityPlayer = playerId;
  return true;
}

export interface ResolvedSubversionAssetChoice {
  actionToApply?: AppStateAction;
  used: boolean;
}

export function resolveSubversionAssetChoice(
  game: GameState,
  action: ResolveIntelligenceChoiceAction,
): ResolvedSubversionAssetChoice {
  const pending = pendingChoice(game);
  if (!pending || pending.playerId !== action.playerId) throw new SubversionAssetError(`${action.playerId} has no pending Subversion Asset choice.`);
  if (action.choice !== 'pass' && action.choice !== 'use') throw new SubversionAssetError('Choose whether to use Subversion.');

  game.pendingIntelligenceChoice = pending.priorIntelligenceChoice;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;

  if (action.choice === 'pass') {
    publicLog(game, action.playerId, 'intelligence_subversion_asset_passed', `${game.players[action.playerId].name} allowed ${pending.effectLabel} to resolve.`, {
      targetOwner: pending.targetOwner,
      targetCardId: pending.targetCardId,
    });
    return { actionToApply: pending.deferredAction, used: false };
  }

  const player = game.players[action.playerId];
  if (!removeOne(player.zones.assetBank, SUBVERSION_ASSET)) throw new SubversionAssetError('Subversion is no longer banked.');
  player.zones.graveyard.push(SUBVERSION_ASSET);

  const target = game.players[pending.targetOwner];
  if (removeOne(target.zones.assetBank, pending.targetCardId)) target.zones.discard.push(pending.targetCardId);

  if (game.battle) {
    recordBankedAssetUse(game, pending.targetOwner, game.battle.id, pending.targetCardId);
    recordBankedAssetUse(game, action.playerId, game.battle.id, SUBVERSION_ASSET);
  }

  publicLog(game, action.playerId, 'intelligence_subversion_asset_used', `${player.name} put Subversion in the Graveyard and negated ${pending.effectLabel}.`, {
    targetOwner: pending.targetOwner,
    targetCardId: pending.targetCardId,
    discardedTargetAsset: target.zones.discard.includes(pending.targetCardId),
  });
  return { actionToApply: pending.negatedAction, used: true };
}
