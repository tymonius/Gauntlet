import {
  reduceV070SetupAction,
  type V070GameState,
  type V070SetupAction,
} from '../v070/engine';
import {
  reduceV070TurnAction,
  type V070TurnAction,
} from '../v070/turn-engine';
import {
  reduceV070BattleAction,
  type V070BattleAction,
} from '../v070/battle-engine';

export type V070CliReducerCommand =
  | { domain: 'setup'; action: V070SetupAction }
  | { domain: 'turn'; action: V070TurnAction }
  | { domain: 'battle'; action: V070BattleAction };

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
  switch (command.domain) {
    case 'setup':
      return reduceV070SetupAction(state, command.action);
    case 'turn':
      return reduceV070TurnAction(state, command.action);
    case 'battle':
      return reduceV070BattleAction(state, command.action);
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value);
}
