import type { BattleParticipantState, CardID, PlayerID } from '../types';
import type { BattleCardTarget, EffectContext } from './types';

function participantHasCard(participant: BattleParticipantState, cardId: CardID): boolean {
  return participant.handCommit?.cardId === cardId && !participant.handCommit.canceled
    || participant.battleDrawPlayed.some((played) => played.cardId === cardId && !played.canceled);
}

function participantFor(context: EffectContext, playerId: PlayerID): BattleParticipantState | undefined {
  if (!context.battle) return undefined;
  if (context.battle.attacker.playerId === playerId) return context.battle.attacker;
  if (context.battle.defender.playerId === playerId) return context.battle.defender;
  return undefined;
}

function otherParticipant(context: EffectContext, playerId: PlayerID): BattleParticipantState | undefined {
  if (!context.battle) return undefined;
  if (context.battle.attacker.playerId === playerId) return context.battle.defender;
  if (context.battle.defender.playerId === playerId) return context.battle.attacker;
  return undefined;
}

function activePlayedCards(participant: BattleParticipantState) {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((played): played is NonNullable<typeof played> => played !== undefined && !played.canceled);
}

function hasTargetCard(participant: BattleParticipantState, target: BattleCardTarget): boolean {
  return activePlayedCards(participant)
    .some((played) => played.cardId === target.targetCardId && played.owner === target.targetOwner);
}

export function validateEmbargoTargets(context: EffectContext): void {
  if (!context.battle) return;

  const targets = context.battleCardTargets ?? [];
  const participants = [context.battle.attacker, context.battle.defender];

  for (const target of targets) {
    const source = participantFor(context, target.sourceOwner);
    if (!source || target.sourceCardId !== 'card-embargo' || !participantHasCard(source, 'card-embargo')) {
      throw new Error('Invalid Embargo source.');
    }

    const other = otherParticipant(context, target.sourceOwner);
    if (!other || other.playerId !== target.targetOwner || !hasTargetCard(other, target)) {
      throw new Error('Invalid Embargo target.');
    }
  }

  for (const participant of participants.filter((candidate) => participantHasCard(candidate, 'card-embargo'))) {
    const other = otherParticipant(context, participant.playerId);
    if (!other || activePlayedCards(other).length === 0) continue;

    const chosenTargets = targets.filter((target) => target.sourceCardId === 'card-embargo' && target.sourceOwner === participant.playerId);
    if (chosenTargets.length === 0) throw new Error('Embargo requires a target.');
    if (chosenTargets.length > 1) throw new Error('Embargo may choose only one target.');
  }
}
