import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameState,
} from '../types/v06';
import {
  battleHasUnresolvedConfessionPreReveal,
  openNextConfessionPreRevealWindow,
} from './inquisition-confession';
import {
  battleHasUnresolvedContrabandPreReveal,
  openNextContrabandPreRevealWindow,
} from './neutral-contraband';
import {
  battleHasUnresolvedCounterworksPreReveal,
  openNextCounterworksPreRevealWindow,
} from './neutral-counterworks';
import { resolveFogOfWarPreRevealCard } from './intelligence-fog-of-war-battle';
import { resolveInterceptedOrdersPreRevealCard } from './intelligence-intercepted-orders-battle';
import { resolveReconnaissancePreRevealCard } from './intelligence-reconnaissance-battle';
import {
  resolveAssassinsPreRevealCard,
  resolveDisinformationPreRevealCard,
} from './intelligence-simple-battle-effects';
import { resolveSpiesPreRevealCard } from './intelligence-spies-battle';
import { resolveTreasonPreRevealCard } from './intelligence-treason';
import {
  battleHasUnresolvedScoutingReportPreReveal,
  openNextScoutingReportPreRevealWindow,
} from './neutral-scouting-report';

const EARLY_BATTLE_CARDS = {
  spies: 'intelligence-spies',
  fogOfWar: 'intelligence-fog-of-war',
  disinformation: 'intelligence-disinformation',
  interceptedOrders: 'intelligence-intercepted-orders',
  reconnaissance: 'intelligence-reconnaissance',
  assassins: 'intelligence-assassins',
  treason: 'intelligence-treason',
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
    || card.cardId === EARLY_BATTLE_CARDS.reconnaissance
    || card.cardId === EARLY_BATTLE_CARDS.assassins
    || card.cardId === EARLY_BATTLE_CARDS.treason;
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
    || cardId === EARLY_BATTLE_CARDS.reconnaissance
    || cardId === EARLY_BATTLE_CARDS.assassins
    || cardId === EARLY_BATTLE_CARDS.treason;
}

export function battleHasUnresolvedIntelligencePreReveal(
  game: GameState,
  incomingBattleHandCardId?: CardID,
): boolean {
  return battleHasUnresolvedContrabandPreReveal(game, incomingBattleHandCardId)
    || battleHasUnresolvedCounterworksPreReveal(game, incomingBattleHandCardId)
    || battleHasUnresolvedScoutingReportPreReveal(game, incomingBattleHandCardId)
    || battleHasUnresolvedConfessionPreReveal(game, incomingBattleHandCardId)
    || incomingBattleHandCardRequiresEarlyReveal(incomingBattleHandCardId)
    || Boolean(nextPreRevealSource(game));
}

export function openNextIntelligencePreRevealWindow(game: GameState): boolean {
  if (!game.battle || game.battle.stage !== 'normal_reveal') return false;
  if (game.pendingNeutralChoice || game.pendingInquisitionChoice || game.pendingIntelligenceChoice) return true;
  if (openNextContrabandPreRevealWindow(game)) return true;
  if (openNextCounterworksPreRevealWindow(game)) return true;
  if (openNextScoutingReportPreRevealWindow(game)) return true;
  if (openNextConfessionPreRevealWindow(game)) return true;

  while (true) {
    const source = nextPreRevealSource(game);
    if (!source) return false;

    if (source.card.cardId === EARLY_BATTLE_CARDS.spies) {
      if (resolveSpiesPreRevealCard(game, source.participant, source.card)) return true;
    } else if (source.card.cardId === EARLY_BATTLE_CARDS.fogOfWar) {
      if (resolveFogOfWarPreRevealCard(game, source.participant, source.card)) return true;
    } else if (source.card.cardId === EARLY_BATTLE_CARDS.interceptedOrders) {
      if (resolveInterceptedOrdersPreRevealCard(game, source.participant, source.card)) return true;
    } else if (source.card.cardId === EARLY_BATTLE_CARDS.reconnaissance) {
      resolveReconnaissancePreRevealCard(game, source.participant, source.card);
    } else if (source.card.cardId === EARLY_BATTLE_CARDS.assassins) {
      resolveAssassinsPreRevealCard(game, source.participant, source.card);
    } else if (source.card.cardId === EARLY_BATTLE_CARDS.disinformation) {
      resolveDisinformationPreRevealCard(game, source.participant, source.card);
    } else if (source.card.cardId === EARLY_BATTLE_CARDS.treason) {
      resolveTreasonPreRevealCard(game, source.participant, source.card);
    }
  }
}
