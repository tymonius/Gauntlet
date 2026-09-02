import type { CardCancellation } from '../effects/types';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerState } from '../types/v06';

function participantFor(game: GameState, owner: string): BattleParticipantState | undefined {
  if (!game.battle) return undefined;
  if (game.battle.attacker.playerId === owner) return game.battle.attacker;
  if (game.battle.defender.playerId === owner) return game.battle.defender;
  return undefined;
}

function pushDestination(
  player: PlayerState,
  cardId: string,
  destination: NonNullable<CardCancellation['destination']>,
): void {
  player.zones[destination].push(cardId);
}

function removePlayedCard(participant: BattleParticipantState, target: BattlePlayedCard): void {
  if (participant.handCommit === target) {
    participant.handCommit = undefined;
    return;
  }
  const index = participant.battleDrawPlayed.indexOf(target);
  if (index >= 0) participant.battleDrawPlayed.splice(index, 1);
}

/** Applies cancellation flags and any immediate card destination required by the source. */
export function applyBattleCancellations(
  game: GameState,
  cancellations: CardCancellation[],
): Set<string> {
  const canceled = new Set<string>();
  if (!game.battle) return canceled;

  for (const cancellation of cancellations) {
    const participant = participantFor(game, cancellation.owner);
    if (!participant) continue;
    const target = [participant.handCommit, ...participant.battleDrawPlayed]
      .find((played) => played?.cardId === cancellation.cardId && !played.canceled);
    if (!target) continue;

    target.canceled = true;
    canceled.add(`${target.owner}:${target.cardId}`);
    if (!cancellation.immediate) continue;

    removePlayedCard(participant, target);
    const player = game.players[cancellation.owner];
    if (player) pushDestination(player, target.cardId, cancellation.destination ?? 'discard');
  }
  return canceled;
}
