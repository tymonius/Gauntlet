import type {
  BattleParticipantState,
  BattlePlayedCard,
  PlayerID,
} from '../types/v06';
import type { EffectHandler } from './types';

export const CAPITAL_PUNISHMENT = 'neutral-capital-punishment';

function markedByWinner(card: BattlePlayedCard | undefined, winner: PlayerID): boolean {
  return Boolean(
    card
    && !card.virtual
    && card.capitalPunishmentBy?.includes(winner),
  );
}

function markedCards(participant: BattleParticipantState, winner: PlayerID): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => markedByWinner(card, winner));
}

export const capitalPunishmentCleanupHandler: EffectHandler = {
  id: 'neutral_capital_punishment_cleanup',
  timing: ['after_battle_resolution'],
  applies(context) {
    const winner = context.battle?.winner;
    if (!context.battle || !winner) return false;
    return [context.battle.attacker, context.battle.defender]
      .some((participant) => markedCards(participant, winner).length > 0);
  },
  resolve(context) {
    const battle = context.battle;
    const winner = battle?.winner;
    if (!battle || !winner) return {};

    const marked = [battle.attacker, battle.defender]
      .flatMap((participant) => markedCards(participant, winner));
    const destinationOverrides = [battle.attacker, battle.defender]
      .flatMap((participant) => participant.battleDrawPlayed
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => markedByWinner(card, winner))
        .map(({ card, index }) => ({
          cardId: card.cardId,
          owner: card.owner,
          destination: 'graveyard' as const,
          reason: 'Capital Punishment: the negated card goes to the Graveyard because its controller won the battle.',
          target: { zone: 'battle_draw_played' as const, index },
        })));

    return {
      destinationOverrides,
      logMessages: marked.length > 0
        ? [`Capital Punishment condemned ${marked.length} negated card${marked.length === 1 ? '' : 's'} after its controller won.`]
        : [],
    };
  },
};
