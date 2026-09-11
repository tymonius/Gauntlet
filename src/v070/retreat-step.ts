import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import { openV070BlockadeChoicesForPositionChange } from './movement-triggers';
import {
  retreatV070Position,
  type PlayerId,
} from './rules';

declare module './battle-types' {
  interface V070BattleRuntime {
    normalRetreatStepObserved?: boolean;
  }
}

export interface V070BattleRetreatStepSource {
  kind:
    | 'normal_battle_loss'
    | 'territory'
    | 'battle_card'
    | 'fortifications'
    | 'military_order';
  label: string;
  sourceInstanceId?: string;
  sourceCardId?: string;
}

export interface V070BattleRetreatStepResult {
  playerId: PlayerId;
  from: number;
  to: number;
  moved: boolean;
}

/**
 * Resolve exactly one Retreat step toward a player's own end. This procedure
 * is intentionally battle-only and does not represent Fall Back, withdrawal,
 * or ordinary/effect movement.
 */
export function applyV070BattleRetreatStep(
  state: V070GameState,
  playerId: PlayerId,
  source: V070BattleRetreatStepSource,
): V070BattleRetreatStepResult {
  const battle = state.battle;
  if (!battle) {
    throw new V070GameActionError(
      'A battle Retreat step requires an active battle.',
    );
  }

  const from = battle.positions[playerId];
  const to = retreatV070Position(
    playerId,
    from,
    battle.territoryCount,
  );
  if (to === from) {
    return { playerId, from, to, moved: false };
  }

  battle.positions[playerId] = to;
  observeV070BattleRetreatStep(
    state,
    playerId,
    from,
    to,
    source,
  );
  return { playerId, from, to, moved: true };
}

/**
 * Observe a Retreat step whose pure battle-state transition has already moved
 * the token. Normal battle loss currently enters through this path because the
 * released pure outcome helper owns that first positional transition.
 */
export function observeV070BattleRetreatStep(
  state: V070GameState,
  playerId: PlayerId,
  from: number,
  to: number,
  source: V070BattleRetreatStepSource,
): V070BattleRetreatStepResult {
  const battle = state.battle;
  if (!battle) {
    throw new V070GameActionError(
      'Observing a battle Retreat step requires an active battle.',
    );
  }
  if (from === to) {
    return { playerId, from, to, moved: false };
  }

  const expected = retreatV070Position(
    playerId,
    from,
    battle.territoryCount,
  );
  if (to !== expected) {
    throw new V070GameActionError(
      `A Retreat step must move exactly one Position toward ${playerId}'s own end.`,
    );
  }
  if (battle.positions[playerId] !== to) {
    throw new V070GameActionError(
      'The observed Retreat destination must match the live battle Position.',
    );
  }

  openV070BlockadeChoicesForPositionChange(
    state,
    playerId,
    from,
    to,
  );
  appendV070Event(state, {
    type: 'battle_retreat_step',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      from,
      to,
      sourceKind: source.kind,
      sourceLabel: source.label,
      sourceInstanceId: source.sourceInstanceId ?? null,
      sourceCardId: source.sourceCardId ?? null,
    },
  });

  return { playerId, from, to, moved: true };
}

/**
 * The pure outcome helper has already applied the normal loser Retreat before
 * the runtime resumes. Observe that one step exactly once, before any printed
 * or card-granted additional Retreat is resolved.
 */
export function observeV070NormalBattleRetreat(
  state: V070GameState,
): V070BattleRetreatStepResult | null {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || !battle.loser) return null;
  if (runtime.normalRetreatStepObserved) return null;
  runtime.normalRetreatStepObserved = true;

  const loser = battle.loser;
  const from = battle.contestedPosition;
  const to = battle.positions[loser];
  if (to === from) {
    return { playerId: loser, from, to, moved: false };
  }

  return observeV070BattleRetreatStep(
    state,
    loser,
    from,
    to,
    {
      kind: 'normal_battle_loss',
      label: 'normal battle retreat',
    },
  );
}
