import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

declare module './battle-types' {
  interface V070BattleRuntime {
    /** Individual banked Assets made inactive only for the current battle. */
    battleInactiveAssetInstanceIds?: string[];
  }
}

export function v070BattleAssetInstanceInactive(
  state: V070GameState,
  instanceId: string,
): boolean {
  return Boolean(
    state.battle
    && state.battleRuntime?.battleInactiveAssetInstanceIds?.includes(
      instanceId,
    ),
  );
}

export function makeV070AssetInactiveForBattle(
  state: V070GameState,
  instanceId: string,
): PlayerId {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Battle-only Asset inactivity requires an active battle.',
    );
  }

  const owner = (['A', 'B'] as const).find(playerId =>
    state.players[playerId].zones.assetBank.includes(instanceId)
  );
  if (!owner) {
    throw new V070GameActionError(
      'Only a currently banked Asset can be made inactive for a battle.',
    );
  }

  runtime.battleInactiveAssetInstanceIds ??= [];
  if (!runtime.battleInactiveAssetInstanceIds.includes(instanceId)) {
    runtime.battleInactiveAssetInstanceIds.push(instanceId);
  }
  return owner;
}
