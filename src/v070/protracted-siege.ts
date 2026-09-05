import { v070CanonicalContent } from '../content/v070';
import type { V070GameState } from './engine';

export const V070_PROTRACTED_SIEGE_ID = 'neutral-protracted-siege' as const;
export const V070_PROTRACTED_SIEGE_BATTLE_TEXT =
  'In the Aftermath, if you lose while defending a Territory you control, place this Overlay there.' as const;

function validateV070ProtractedSiegeAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_PROTRACTED_SIEGE_ID);
  const battleEffect = card?.effects.find(
    effect => effect.label === 'Gambit/Tactic',
  );
  if (!card || battleEffect?.text !== V070_PROTRACTED_SIEGE_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Protracted Siege Gambit/Tactic text drifted from released authority.',
    );
  }
}

validateV070ProtractedSiegeAuthority();

/**
 * Protracted Siege shares the generic mandatory Overlay-placement scheduler,
 * but its later outcome gate is owner-loss rather than owner-win. The battle
 * facade calls this once at the first shared Aftermath entry, before the core
 * scheduler can inspect the placement queue.
 */
export function pruneV070ProtractedSiegeAftermathPlacements(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) return;

  runtime.battleCardAftermathOverlayPlacements =
    runtime.battleCardAftermathOverlayPlacements.filter(placement =>
      placement.sourceCardId !== V070_PROTRACTED_SIEGE_ID
      || battle.loser === placement.owner
    );
}
