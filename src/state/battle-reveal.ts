import { EffectRegistry, baseBattleEffectHandlers, totalModifiersFor } from '../effects/v06';
import type { GameEvent, GameState, PlayerID } from '../types';
import type { ResolveBattleRevealAction } from './actions';
import { applySubversionBattleRestrictions } from './intelligence-subversion-battle';
import { applyBattleCancellations } from './battle-cancellation';
import { applyCapitalPunishmentBattleEffects } from './neutral-capital-punishment';
import { applyPalisadeWallBattleEffects } from './neutral-palisade-wall';
import { applySequestrationBattleRestriction } from './neutral-sequestration';
import { GameActionError, type ApplyGameActionResult } from './reducer';

export const BATTLE_REVEAL_CANCELLATIONS_RESOLVED = 'battle_reveal_cancellations_resolved';

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
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

function validateBattleReveal(game: GameState, action: ResolveBattleRevealAction): void {
  if (!game.battle || game.phase !== 'battle' || game.battle.stage !== 'dice') {
    throw new GameActionError('Battle cards are not ready to resolve.');
  }
  if (game.pendingMilitaryChoice || game.pendingMilitaryTimingChoice || game.pendingDiplomatChoice || game.pendingFinancierChoice || game.pendingLeaderAbilityWindow) {
    throw new GameActionError('Resolve the pending faction choice before resolving revealed Battle effects.');
  }
  const battle = game.battle;
  if (action.playerId !== battle.attacker.playerId && action.playerId !== battle.defender.playerId) {
    throw new GameActionError(`${action.playerId} cannot resolve a battle they are not in.`);
  }
  if (battle.effectsResolved.includes('before_battle_resolution')) {
    throw new GameActionError('Revealed Battle effects have already resolved.');
  }
  if (game.pendingAssetBankDiscards && Object.keys(game.pendingAssetBankDiscards).length > 0) {
    throw new GameActionError('Resolve pending Asset Bank discard choices first.');
  }
}


/**
 * Cancellation and negation resolve first. Reinforcements uses the pause after
 * this pass so a canceled or negated copy cannot draw an additional card.
 */
export function resolveBattleRevealCancellations(
  game: GameState,
  action: ResolveBattleRevealAction,
): void {
  validateBattleReveal(game, action);
  const battle = game.battle!;
  if (battle.effectsResolved.includes(BATTLE_REVEAL_CANCELLATIONS_RESOLVED)) return;

  const context = {
    game,
    battle,
    timing: 'before_battle_resolution' as const,
    actor: action.playerId,
    location: battle.location,
    battleCardTargets: action.battleCardTargets,
  };
  const initialResult = new EffectRegistry(baseBattleEffectHandlers).resolve(context);
  const cancellations = initialResult.cancellations ?? [];
  applyBattleCancellations(game, cancellations);
  applySubversionBattleRestrictions(game);
  applyPalisadeWallBattleEffects(game);
  applyCapitalPunishmentBattleEffects(game, action);
  applySequestrationBattleRestriction(game);
  battle.resolvedCancellations = cancellations;
  battle.effectsResolved.push(BATTLE_REVEAL_CANCELLATIONS_RESOLVED);

  for (const cancellation of cancellations) {
    log(game, action.playerId, 'effect_resolved', `${cancellation.source} canceled ${cancellation.cardId}.`);
  }
}

export function resolveBattleReveal(game: GameState, action: ResolveBattleRevealAction): ApplyGameActionResult {
  validateBattleReveal(game, action);
  resolveBattleRevealCancellations(game, action);
  const battle = game.battle!;
  const context = {
    game,
    battle,
    timing: 'before_battle_resolution' as const,
    actor: action.playerId,
    location: battle.location,
    battleCardTargets: action.battleCardTargets,
  };
  const nonCancellationHandlers = baseBattleEffectHandlers.filter((handler) => (
    handler.id !== 'neutral_disruption_battle'
    && handler.id !== 'neutral_sabotage_battle'
    && handler.id !== 'trade_ban_battle'
  ));
  const effectResult = new EffectRegistry(nonCancellationHandlers).resolve(context);
  const modifiers = effectResult.modifiers ?? [];

  battle.attacker.modifiers += totalModifiersFor(modifiers, battle.attacker.playerId);
  battle.defender.modifiers += totalModifiersFor(modifiers, battle.defender.playerId);
  battle.resolvedModifiers = modifiers;
  battle.effectsResolved.push('before_battle_resolution');

  for (const message of effectResult.logMessages ?? []) log(game, action.playerId, 'effect_resolved', message);
  log(game, action.playerId, 'battle_reveal_resolved', 'Revealed Battle effects were resolved before dice were rolled.', {
    battleId: battle.id,
    modifiers,
    cancellations: battle.resolvedCancellations ?? [],
  });
  return { state: game };
}
