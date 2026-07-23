import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameState,
} from '../types';
import { resolveFogOfWarPreRevealCard } from './intelligence-fog-of-war-battle';
import { resolveInterceptedOrdersPreRevealCard } from './intelligence-intercepted-orders-battle';
import {
  resolveAssassinsPreRevealCard,
  resolveDisinformationPreRevealCard,
} from './intelligence-simple-battle-effects';
import { resolveSpiesPreRevealCard } from './intelligence-spies-battle';

const EARLY_BATTLE_CARDS = {
  spies: 'intelligence-spies',
  fogOfWar: 'intelligence-fog-of-war',
  disinformation: 'intelligence-disinformation',
  interceptedOrders: 'intelligence-intercepted-orders',
  assassins: 'intelligence-assassins',
} as const;

type EarlyBattleCardId = typeof EARLY_BATTLE_CARDS[keyof typeof EARLY_BATTLE_CARDS];

interface PreRevealSource {
  participant: BattleParticipantState;
  card: BattlePlayedCard;
}

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function isEarlyCard(card: BattlePlayedCard): card is BattlePlayedCard & { cardId: EarlyBattleCardId } {
  if (card.cardId === EARLY_BATTLE_CARDS.disinformation) return card.origin === 'hand';
  return card.cardId === EARLY_BATTLE_CARDS.spies
    || card.cardId === EARLY_BATTLE_CARDS.fogOfWar
    || card.cardId === EARLY_BATTLE_CARDS.interceptedOrders
    || card.cardId === EARLY_BATTLE_CARDS.assassins;
}

function unresolvedSource(participant: BattleParticipantState): PreRevealSource | undefined {
  if (active(participant.handCommit)
    && !participant.handCommit.earlyEffectResolved
    && isEarlyCard(participant.handCommit)) {
    return { participant, card: participant.handCommit };
  }
  for (const card of participant.battleDrawPlayed) {
    if (!active(card) || card.earlyEffectResolved || !isEarlyCard(card)) continue;
    return { participant, card };
  }
  return undefined;
}

function nextPreRevealSource(game: GameState): PreRevealSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return unresolvedSource(battle.attacker) ?? unresolvedSource(battle.defender);
}

function incomingBattleHandCardRequiresEarlyReveal(cardId?: CardID): boolean {
  return cardId === EARLY_BATTLE_CARDS.spies
    || cardId === EARLY_BATTLE_CARDS.fogOfWar
    || cardId === EARLY_BATTLE_CARDS.interceptedOrders
    || cardId === EARLY_BATTLE_CARDS.assassins;
}

export function battleHasUnresolvedIntelligencePreReveal(
  game: GameState,
  incomingBattleHandCardId?: CardID,
): boolean {
  return incomingBattleHandCardRequiresEarlyReveal(incomingBattleHandCardId)
    || Boolean(nextPreRevealSource(game));
}

export function openNextIntelligencePreRevealWindow(game: GameState): boolean {
  if (!game.battle || game.battle.stage !== 'normal_reveal' || game.pendingIntelligenceChoice) return false;

  while (true) {
    const source = nextPreRevealSource(game);
    if (!source) return false;

    if (source.card.cardId === EARLY_BATTLE_CARDS.spies) {
      if (resolveSpiesPreRevealCard(game, source.participant, source.card)) return true;
    } else if (source.card.cardId === EARLY_BATTLE_CARDS.fogOfWar) {
      if (resolveFogOfWarPreRevealCard(game, source.participant, source.card)) return true;
    } else if (source.card.cardId === EARLY_BATTLE_CARDS.interceptedOrders) {
      if (resolveInterceptedOrdersPreRevealCard(game, source.participant, source.card)) return true;
    } else if (source.card.cardId === EARLY_BATTLE_CARDS.assassins) {
      resolveAssassinsPreRevealCard(game, source.participant, source.card);
    } else if (source.card.cardId === EARLY_BATTLE_CARDS.disinformation) {
      resolveDisinformationPreRevealCard(game, source.participant, source.card);
    }
  }
}
