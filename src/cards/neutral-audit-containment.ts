import type { CardID } from '../types/v06';
import type { CardPlayTiming } from './playability';

/**
 * Historical quarantine metadata retained for governance and frozen v0.6.3
 * validation. Runtime playability enforcement is encoded directly in
 * playability.ts; importing this module has no side effects.
 */
export const neutralAuditDisabledTimings: Partial<Record<CardID, CardPlayTiming[]>> = {
  'neutral-arcane-knowledge': ['battle_hand_commit', 'battle_draw_play'],
};
