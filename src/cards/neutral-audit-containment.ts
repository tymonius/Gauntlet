import type { CardID } from '../types/v06';
import {
  coreCardPlayRules,
  type CardPlayOrigin,
  type CardPlayTiming,
} from './playability';

/**
 * Temporary safety restrictions from the canonical Neutral implementation audit.
 *
 * These restrictions remove only the card forms known to be materially wrong or
 * incomplete. They must be removed card-by-card as issue #289 reimplements each
 * effect from the governing text.
 */
const disabledTimings: Partial<Record<CardID, CardPlayTiming[]>> = {
  'neutral-arcane-knowledge': ['battle_hand_commit', 'battle_draw_play'],
};

// Canonical Action destinations corrected by the audit.
coreCardPlayRules['neutral-assimilation'].defaultDestinationByOrigin.hand = 'asset_bank';
coreCardPlayRules['neutral-armistice'].defaultDestinationByOrigin.hand = 'asset_bank';

for (const cardId of Object.keys(disabledTimings) as CardID[]) {
  const rule = coreCardPlayRules[cardId];
  const disabled = disabledTimings[cardId];
  if (!rule || !disabled) continue;

  const timings = rule.timings.filter((timing) => !disabled.includes(timing));
  const allowedOrigins: CardPlayOrigin[] = [];
  if (timings.includes('action') || timings.includes('battle_hand_commit')) {
    allowedOrigins.push('hand');
  }
  if (timings.includes('battle_draw_play')) {
    allowedOrigins.push('battle_draw');
  }

  coreCardPlayRules[cardId] = {
    ...rule,
    timings,
    allowedOrigins,
  };
}
