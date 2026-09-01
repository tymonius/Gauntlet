import {
  V070GameActionError,
  appendV070Event,
  type V070AccursedWagerState,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export function armV070AccursedWager(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  if (state.accursedWagers.some(
    wager => wager.sourceActionInstanceId === sourceActionInstanceId,
  )) {
    throw new V070GameActionError(
      'That Accursed Wager is already armed.',
    );
  }

  state.accursedWagers.push({
    sourceActionInstanceId,
    owner: playerId,
    armedTurn: state.turnNumber,
    battleInitiatedEventIndex: null,
  });
  appendV070Event(state, {
    type: 'accursed_wager_armed',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceActionInstanceId,
      turnNumber: state.turnNumber,
    },
  });
}

export function attachV070AccursedWagersToBattle(
  state: V070GameState,
  attacker: PlayerId,
  battleInitiatedEventIndex: number,
): string[] {
  const attached: string[] = [];
  for (const wager of state.accursedWagers) {
    if (wager.owner !== attacker
      || wager.armedTurn !== state.turnNumber
      || wager.battleInitiatedEventIndex !== null) {
      continue;
    }
    wager.battleInitiatedEventIndex = battleInitiatedEventIndex;
    attached.push(wager.sourceActionInstanceId);
  }

  if (attached.length > 0) {
    appendV070Event(state, {
      type: 'accursed_wager_attached',
      actor: attacker,
      visibility: 'public',
      payload: {
        battleInitiatedEventIndex,
        sourceActionInstanceIds: [...attached],
        count: attached.length,
      },
    });
  }

  return attached;
}

export function currentV070BattleInitiationEventIndex(
  state: V070GameState,
): number | null {
  const battle = state.battle;
  if (!battle) return null;

  const event = [...state.events].reverse().find(candidate => {
    if (candidate.type !== 'battle_initiated') return false;
    const payload = candidate.payload as {
      attacker?: PlayerId;
      contestedPosition?: number;
    } | undefined;
    return payload?.attacker === battle.attacker
      && payload.contestedPosition === battle.contestedPosition;
  });
  return event?.index ?? null;
}

export function v070AccursedWagersForCurrentBattle(
  state: V070GameState,
): V070AccursedWagerState[] {
  const eventIndex = currentV070BattleInitiationEventIndex(state);
  if (eventIndex === null) return [];
  return state.accursedWagers
    .filter(wager =>
      wager.battleInitiatedEventIndex === eventIndex
    )
    .map(wager => structuredClone(wager));
}

export function clearV070AccursedWagersForCurrentBattle(
  state: V070GameState,
  reason: string,
): string[] {
  const eventIndex = currentV070BattleInitiationEventIndex(state);
  if (eventIndex === null) return [];
  const cleared = state.accursedWagers.filter(
    wager => wager.battleInitiatedEventIndex === eventIndex,
  );
  if (cleared.length === 0) return [];

  const clearedIds = new Set(
    cleared.map(wager => wager.sourceActionInstanceId),
  );
  state.accursedWagers = state.accursedWagers.filter(
    wager => !clearedIds.has(wager.sourceActionInstanceId),
  );
  appendV070Event(state, {
    type: 'accursed_wager_consumed',
    actor: state.battle?.attacker,
    visibility: 'public',
    payload: {
      battleInitiatedEventIndex: eventIndex,
      sourceActionInstanceIds: [...clearedIds],
      reason,
    },
  });
  return [...clearedIds];
}

export function expireV070AccursedWagersAtTurnEnd(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const expired = state.accursedWagers.filter(
    wager =>
      wager.owner === playerId
      && wager.armedTurn === state.turnNumber
      && wager.battleInitiatedEventIndex === null,
  );
  if (expired.length === 0) return [];

  const ids = new Set(expired.map(
    wager => wager.sourceActionInstanceId,
  ));
  state.accursedWagers = state.accursedWagers.filter(
    wager => !ids.has(wager.sourceActionInstanceId),
  );
  appendV070Event(state, {
    type: 'accursed_wager_expired',
    actor: playerId,
    visibility: 'public',
    payload: {
      turnNumber: state.turnNumber,
      sourceActionInstanceIds: [...ids],
    },
  });
  return [...ids];
}
