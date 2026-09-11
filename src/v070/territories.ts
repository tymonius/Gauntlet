import {
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  applyV070BattleRetreatStep,
  observeV070NormalBattleRetreat,
} from './retreat-step';
import {
  V070_ARENA_NO_QUARTER_ID,
} from './territories-core';

export * from './territories-core';

/**
 * Arena: No Quarter remains the printed source of the extra Retreat, but the
 * actual position change now uses the shared one-step battle Retreat procedure.
 * This wrapper also observes the already-applied normal loss Retreat first so
 * every landing is exposed in chronological order.
 */
export function applyV070NoQuarterAdditionalRetreat(
  state: V070GameState,
): boolean {
  observeV070NormalBattleRetreat(state);

  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.activePrintedTerritoryAtOnset?.territoryId !==
      V070_ARENA_NO_QUARTER_ID
    || !battle.loser) {
    return false;
  }

  const result = applyV070BattleRetreatStep(
    state,
    battle.loser,
    {
      kind: 'territory',
      label: 'Arena: No Quarter',
      sourceCardId: V070_ARENA_NO_QUARTER_ID,
    },
  );
  if (!result.moved) return false;

  appendV070Event(state, {
    type: 'territory_aftermath_retreat',
    actor: battle.loser,
    visibility: 'public',
    payload: {
      territoryId: V070_ARENA_NO_QUARTER_ID,
      loser: battle.loser,
      from: result.from,
      to: result.to,
      additionalRetreat: 1,
    },
  });
  return true;
}
