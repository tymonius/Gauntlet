import {
  reduceV070RecordedAction,
  type V070RecordedAction,
} from '../v070/replay';
import type { V070GameState } from '../v070/engine';

export type V070CliReducerCommand = V070RecordedAction;

export function parseV070CliReducerCommand(
  line: string,
): V070CliReducerCommand {
  const trimmed = line.trim();
  const space = trimmed.indexOf(' ');
  if (space < 0) {
    throw new Error(
      'Reducer command must be: setup|turn|battle <JSON action>.',
    );
  }

  const domain = trimmed.slice(0, space);
  if (domain !== 'setup' && domain !== 'turn' && domain !== 'battle') {
    throw new Error(
      'Reducer command domain must be setup, turn, or battle.',
    );
  }

  let action: unknown;
  try {
    action = JSON.parse(trimmed.slice(space + 1));
  } catch {
    throw new Error('Reducer action must be valid JSON.');
  }
  if (!isRecord(action) || typeof action.type !== 'string') {
    throw new Error('Reducer action must be a JSON object with a string type.');
  }

  return {
    domain,
    action,
  } as V070CliReducerCommand;
}

export function applyV070CliReducerCommand(
  state: V070GameState,
  command: V070CliReducerCommand,
): V070GameState {
  return reduceV070RecordedAction(state, command);
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value);
}
