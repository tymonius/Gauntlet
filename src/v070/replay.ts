import { V070_RULES_VERSION } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type CreateV070StarterGameInput,
  type V070GameState,
  type V070SetupAction,
} from './engine';
import {
  reduceV070TurnAction,
  type V070TurnAction,
} from './turn-engine';
import {
  reduceV070BattleAction,
  type V070BattleAction,
} from './battle-engine';

export const V070_REPLAY_FORMAT = 'gauntlet-v070-replay' as const;
export const V070_SAVE_FORMAT = 'gauntlet-v070-save' as const;
export const V070_SERIALIZATION_VERSION = 1 as const;

export type V070RecordedAction =
  | { domain: 'setup'; action: V070SetupAction }
  | { domain: 'turn'; action: V070TurnAction }
  | { domain: 'battle'; action: V070BattleAction };

export interface V070ReplayFile {
  format: typeof V070_REPLAY_FORMAT;
  serializationVersion: typeof V070_SERIALIZATION_VERSION;
  rulesVersion: typeof V070_RULES_VERSION;
  initialGame: CreateV070StarterGameInput;
  actions: V070RecordedAction[];
}

export interface V070SaveFile {
  format: typeof V070_SAVE_FORMAT;
  serializationVersion: typeof V070_SERIALIZATION_VERSION;
  rulesVersion: typeof V070_RULES_VERSION;
  state: V070GameState;
}

export function reduceV070RecordedAction(
  state: V070GameState,
  recorded: V070RecordedAction,
): V070GameState {
  switch (recorded.domain) {
    case 'setup':
      return reduceV070SetupAction(state, recorded.action);
    case 'turn':
      return reduceV070TurnAction(state, recorded.action);
    case 'battle':
      return reduceV070BattleAction(state, recorded.action);
  }
}

export function createV070ReplayFile(
  initialGame: CreateV070StarterGameInput,
  actions: readonly V070RecordedAction[],
): V070ReplayFile {
  return {
    format: V070_REPLAY_FORMAT,
    serializationVersion: V070_SERIALIZATION_VERSION,
    rulesVersion: V070_RULES_VERSION,
    initialGame: structuredClone(initialGame),
    actions: structuredClone([...actions]),
  };
}

export function replayV070Game(
  replay: V070ReplayFile,
): V070GameState {
  assertReplayFile(replay);
  let state = createV070StarterGame(
    structuredClone(replay.initialGame),
  );
  for (const recorded of replay.actions) {
    state = reduceV070RecordedAction(state, recorded);
  }
  return state;
}

export function serializeV070Replay(
  replay: V070ReplayFile,
): string {
  assertReplayFile(replay);
  return JSON.stringify(replay);
}

export function parseV070Replay(
  serialized: string,
): V070ReplayFile {
  const parsed = parseJsonObject(serialized, 'replay');
  assertReplayFile(parsed);
  return structuredClone(parsed);
}

export function createV070SaveFile(
  state: V070GameState,
): V070SaveFile {
  if (state.rulesVersion !== V070_RULES_VERSION) {
    throw new Error(
      `Cannot save rules version ${state.rulesVersion}; expected ${V070_RULES_VERSION}.`,
    );
  }
  return {
    format: V070_SAVE_FORMAT,
    serializationVersion: V070_SERIALIZATION_VERSION,
    rulesVersion: V070_RULES_VERSION,
    state: structuredClone(state),
  };
}

export function restoreV070SaveFile(
  save: V070SaveFile,
): V070GameState {
  assertSaveFile(save);
  return structuredClone(save.state);
}

export function serializeV070Save(
  save: V070SaveFile,
): string {
  assertSaveFile(save);
  return JSON.stringify(save);
}

export function parseV070Save(
  serialized: string,
): V070SaveFile {
  const parsed = parseJsonObject(serialized, 'save');
  assertSaveFile(parsed);
  return structuredClone(parsed);
}

function assertReplayFile(
  value: unknown,
): asserts value is V070ReplayFile {
  if (!isRecord(value) || value.format !== V070_REPLAY_FORMAT) {
    throw new Error('Invalid v0.7.0 replay format.');
  }
  assertSerializationVersion(value.serializationVersion, 'replay');
  if (value.rulesVersion !== V070_RULES_VERSION) {
    throw new Error(
      `Replay rules version ${String(value.rulesVersion)} does not match ${V070_RULES_VERSION}.`,
    );
  }
  if (!isStarterInput(value.initialGame)) {
    throw new Error('Replay is missing a valid initial game descriptor.');
  }
  if (!Array.isArray(value.actions)
    || value.actions.some(action => !isRecordedActionEnvelope(action))) {
    throw new Error('Replay actions must be typed setup, turn, or battle envelopes.');
  }
}

function assertSaveFile(
  value: unknown,
): asserts value is V070SaveFile {
  if (!isRecord(value) || value.format !== V070_SAVE_FORMAT) {
    throw new Error('Invalid v0.7.0 save format.');
  }
  assertSerializationVersion(value.serializationVersion, 'save');
  if (value.rulesVersion !== V070_RULES_VERSION) {
    throw new Error(
      `Save rules version ${String(value.rulesVersion)} does not match ${V070_RULES_VERSION}.`,
    );
  }
  if (!isRecord(value.state)
    || value.state.rulesVersion !== V070_RULES_VERSION) {
    throw new Error('Save does not contain a compatible v0.7.0 game state.');
  }
}

function assertSerializationVersion(
  value: unknown,
  kind: 'replay' | 'save',
): void {
  if (value !== V070_SERIALIZATION_VERSION) {
    throw new Error(
      `Unsupported v0.7.0 ${kind} serialization version ${String(value)}.`,
    );
  }
}

function parseJsonObject(
  serialized: string,
  kind: 'replay' | 'save',
): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error(`Invalid v0.7.0 ${kind} JSON.`);
  }
  if (!isRecord(parsed)) {
    throw new Error(`Invalid v0.7.0 ${kind} payload.`);
  }
  return parsed;
}

function isStarterInput(
  value: unknown,
): value is CreateV070StarterGameInput {
  if (!isRecord(value)
    || typeof value.gameId !== 'string'
    || typeof value.seed !== 'string'
    || !isRecord(value.players)) {
    return false;
  }
  const players = value.players;
  return ['A', 'B'].every(playerId => {
    const player = players[playerId];
    return isRecord(player)
      && typeof player.name === 'string'
      && typeof player.starterDeckId === 'string';
  });
}

function isRecordedActionEnvelope(
  value: unknown,
): value is V070RecordedAction {
  if (!isRecord(value)
    || !['setup', 'turn', 'battle'].includes(String(value.domain))
    || !isRecord(value.action)
    || typeof value.action.type !== 'string') {
    return false;
  }
  return true;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value);
}
