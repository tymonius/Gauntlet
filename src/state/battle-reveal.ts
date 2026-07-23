import { EffectRegistry, baseBattleEffectHandlers, totalModifiersFor } from '../effects';
import type { CardID, GameEvent, GameState, PlayerID } from '../types';
import type { ResolveBattleRevealAction } from './actions';
import { applySubversionBattleRestrictions } from './intelligence-subversion-battle';
import { GameActionError, type ApplyGameActionResult } from './reducer';

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

function cancelPlayedCards(game: GameState, cancellations: Array<{ cardId: CardID; owner: PlayerID }>): Set<string> {
  const canceled = new Set<string>();
  const battle = game.battle;
  if (!battle) return canceled;

  for (const cancellation of cancellations) {
    const participant = battle.attacker.playerId === cancellation.owner
      ? battle.attacker
      : battle.defender.playerId === cancellation.owner
        ? battle.defender
        : undefined;
    if (!participant) continue;
    const target = [participant.handCommit, ...participant.battleDrawPlayed]
      .find((card) => card?.cardId === cancellation.cardId && !card.canceled);
    if (!target) continue;
    target.canceled = true;
    canceled.add(`${target.owner}:${target.cardId}`);
  }

  return canceled;
}

export function resolveBattleReveal(game: GameState, action: ResolveBattleRevealAction): ApplyGameActionResult {
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

  applySubversionBattleRestrictions(game);
  const effectResult = new EffectRegistry(baseBattleEffectHandlers).resolve({
    game,
    battle,
    timing: 'before_battle_resolution',
    actor: action.playerId,
    location: battle.location,
    battleCardTargets: action.battleCardTargets,
  });
  const cancellations = effectResult.cancellations ?? [];
  const canceled = cancelPlayedCards(game, cancellations);
  const modifiers = (effectResult.modifiers ?? [])
    .filter((modifier) => !canceled.has(`${modifier.playerId}:${String(modifier.source)}`));

  battle.attacker.modifiers += totalModifiersFor(modifiers, battle.attacker.playerId);
  battle.defender.modifiers += totalModifiersFor(modifiers, battle.defender.playerId);
  battle.resolvedModifiers = modifiers;
  battle.resolvedCancellations = cancellations;
  battle.effectsResolved.push('before_battle_resolution');

  for (const message of effectResult.logMessages ?? []) log(game, action.playerId, 'effect_resolved', message);
  log(game, action.playerId, 'battle_reveal_resolved', 'Revealed Battle effects were resolved before dice were rolled.', {
    battleId: battle.id,
    modifiers,
    cancellations,
  });
  return { state: game };
}
