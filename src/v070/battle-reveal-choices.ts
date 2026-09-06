import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export type V070BattleRevealChoice =
  | {
      kind: 'divine_mercy';
      owner: PlayerId;
      opponent: PlayerId;
      sourceInstanceId: string;
    }
  | {
      kind: 'dark_omens';
      owner: PlayerId;
      sourceInstanceId: string;
      drawnInstanceId: string;
    }
  | {
      kind: 'sedition';
      owner: PlayerId;
      opponent: PlayerId;
      sourceInstanceId: string;
      /** Face-up opposing Assets that existed when Sedition took effect. */
      candidateInstanceIds: string[];
    }
  | {
      kind: 'requisition';
      owner: PlayerId;
      sourceInstanceId: string;
      /** Voluntarily discardable Assets that existed when Requisition took effect. */
      candidateInstanceIds: string[];
    }
  | {
      kind: 'tariffs';
      owner: PlayerId;
      opponent: PlayerId;
      sourceInstanceId: string;
      /** Opposing Hand cards that existed when Tariffs took effect. */
      candidateInstanceIds: string[];
    }
  | {
      kind: 'penance';
      owner: PlayerId;
      opponent: PlayerId;
      sourceInstanceId: string;
      /** Opposing Hand cards that existed when Penance took effect. */
      candidateInstanceIds: string[];
    }
  | {
      kind: 'property_dues';
      owner: PlayerId;
      opponent: PlayerId;
      sourceInstanceId: string;
      /** Opposing Hand cards that existed when Property Dues took effect. */
      candidateInstanceIds: string[];
    }
  | {
      kind: 'speculation';
      owner: PlayerId;
      sourceInstanceId: string;
    }
  | {
      kind: 'palisade_wall';
      owner: PlayerId;
      opponent: PlayerId;
      sourceInstanceId: string;
      /** Opposing Gambits that had not taken effect when Palisade Wall applied. */
      candidateInstanceIds: string[];
    };

declare module './battle-types' {
  interface V070BattleRuntime {
    /** Shared reveal-timing choices in exact effect-application order. */
    battleRevealChoices?: V070BattleRevealChoice[];
    battleRevealChoiceOpen?: boolean;
  }
}

export function queueV070BattleRevealChoice(
  state: V070GameState,
  choice: V070BattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'A reveal-timing battle choice requires an active battle.',
    );
  }
  runtime.battleRevealChoices ??= [];
  runtime.battleRevealChoices.push(choice);
}

export function pendingV070BattleRevealChoice(
  state: V070GameState,
): V070BattleRevealChoice | null {
  return state.battleRuntime?.battleRevealChoices?.[0] ?? null;
}

export function isV070BattleRevealChoiceOpen(
  state: V070GameState,
): boolean {
  return Boolean(
    pendingV070BattleRevealChoice(state)
    && state.battleRuntime?.battleRevealChoiceOpen,
  );
}

export function markV070BattleRevealChoiceOpen(
  state: V070GameState,
): V070BattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = pendingV070BattleRevealChoice(state);
  if (!runtime || !pending) {
    throw new V070GameActionError(
      'There is no reveal-timing battle choice to open.',
    );
  }
  runtime.battleRevealChoiceOpen = true;
  return pending;
}

export function completeV070BattleRevealChoice(
  state: V070GameState,
  expectedKind: V070BattleRevealChoice['kind'],
): V070BattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = pendingV070BattleRevealChoice(state);
  if (!runtime || !pending || !runtime.battleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open reveal-timing battle choice.',
    );
  }
  if (pending.kind !== expectedKind) {
    throw new V070GameActionError(
      `The pending reveal-timing choice is ${pending.kind}, not ${expectedKind}.`,
    );
  }
  runtime.battleRevealChoices!.shift();
  runtime.battleRevealChoiceOpen = false;
  return pending;
}
