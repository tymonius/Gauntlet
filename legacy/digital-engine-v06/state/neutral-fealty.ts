import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
  ResolvedBattleModifier,
} from '../types/v06';
import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';

export const FEALTY = 'neutral-fealty';
const FEALTY_BATTLE_RESOLUTION = 'neutral_fealty_battle';

function hasActiveFealtyAsset(game: GameState, playerId: PlayerID): boolean {
  return bankedAssetCardUseAllowed(game, playerId, FEALTY);
}

function activeFealty(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === FEALTY && !card.canceled && !card.negated);
}

function activeBattleCopyCount(participant: BattleParticipantState): number {
  return (activeFealty(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeFealty).length;
}

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

/**
 * Fealty protects only against disadvantage created by an opposing card effect.
 * It does not prevent disadvantage from the protected player's own effects or
 * non-card rules, and a banked copy is inactive when banked Asset use is
 * prohibited for that player in the current battle.
 */
export function fealtyPreventsOpposingCardDisadvantage(
  game: GameState,
  sourcePlayerId: PlayerID,
  targetPlayerId: PlayerID,
): boolean {
  return sourcePlayerId !== targetPlayerId && hasActiveFealtyAsset(game, targetPlayerId);
}

export function logFealtyDisadvantagePrevention(
  game: GameState,
  sourcePlayerId: PlayerID,
  targetPlayerId: PlayerID,
  sourceName: string,
): void {
  appendPublicLog(
    game,
    targetPlayerId,
    'neutral_fealty_prevented_disadvantage',
    `${game.players[targetPlayerId].name}'s Fealty prevented disadvantage from ${sourceName}.`,
    { sourcePlayerId, targetPlayerId, sourceName },
  );
}

/**
 * Resolves every active Battle copy after cancellation and negation have been
 * finalized. Each copy ignores one raw disadvantage; copies left over after all
 * disadvantage is removed add +1 instead.
 */
export function applyFealtyBattleEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(FEALTY_BATTLE_RESOLUTION)) return;

  const modifiers: ResolvedBattleModifier[] = [];
  for (const participant of [battle.attacker, battle.defender]) {
    const copyCount = activeBattleCopyCount(participant);
    if (copyCount === 0) continue;

    const disadvantageBefore = participant.disadvantage ?? 0;
    const ignored = Math.min(copyCount, disadvantageBefore);
    const bonus = copyCount - ignored;
    participant.disadvantage = disadvantageBefore - ignored;

    if (bonus > 0) {
      participant.modifiers += bonus;
      modifiers.push({
        playerId: participant.playerId,
        source: FEALTY,
        amount: bonus,
        reason: `Fealty Battle: +${bonus} because ${bonus === copyCount ? 'no disadvantage was present' : 'the remaining copies found no disadvantage'}.`,
      });
    }

    appendPublicLog(
      game,
      participant.playerId,
      'neutral_fealty_battle_resolved',
      `${game.players[participant.playerId].name} used ${copyCount} Fealty battle effect${copyCount === 1 ? '' : 's'} to ignore ${ignored} disadvantage${ignored === 1 ? '' : 's'}${bonus > 0 ? ` and gain +${bonus}` : ''}.`,
      { battleId: battle.id, copyCount, ignored, bonus },
    );
  }

  battle.resolvedModifiers = [...(battle.resolvedModifiers ?? []), ...modifiers];
  battle.effectsResolved.push(FEALTY_BATTLE_RESOLUTION);
}
