import { v06CanonicalContent } from '../content';
import type { CardID } from '../types';

export interface IntelligenceCardDefinition {
  id: CardID;
  name: string;
  cost: number;
  unique: boolean;
  cardForm?: string;
  action?: string;
  battle?: string;
  mission?: string;
}

export const INTELLIGENCE_CARD_IDS = [
  'intelligence-exfiltration',
  'intelligence-spies',
  'intelligence-fog-of-war',
  'intelligence-disinformation',
  'intelligence-operational-reassessment',
  'intelligence-intercepted-orders',
  'intelligence-reconnaissance',
  'intelligence-deep-cover',
  'intelligence-assassins',
  'intelligence-treason',
  'intelligence-subversion',
  'intelligence-sleeper-network',
] as const satisfies readonly CardID[];

function definitionFor(id: CardID): IntelligenceCardDefinition {
  const card = v06CanonicalContent.cardsById.get(id);
  if (!card || card.allegiance !== 'Intelligence') throw new Error(`Missing canonical Intelligence card: ${id}.`);
  return {
    id,
    name: card.name,
    cost: card.cost,
    unique: card.unique,
    cardForm: card.card_form ?? undefined,
    action: card.action ?? undefined,
    battle: card.battle ?? undefined,
    mission: card.mission ?? undefined,
  };
}

export const intelligenceCardDefinitions: readonly IntelligenceCardDefinition[] = INTELLIGENCE_CARD_IDS.map(definitionFor);
export const intelligenceCardsById = new Map(intelligenceCardDefinitions.map((card) => [card.id, card]));
export const intelligenceMissionCardIds = new Set(intelligenceCardDefinitions.filter((card) => card.mission).map((card) => card.id));
