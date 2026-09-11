import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import * as previous from './battle-reveal-choices-pre-witchcraft';

export * from './battle-reveal-choices-pre-witchcraft';

export interface V070WitchcraftBattleRevealChoice {
  kind: 'witchcraft';
  owner: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

export type V070BattleRevealChoice =
  | previous.V070BattleRevealChoice
  | V070WitchcraftBattleRevealChoice;

declare module './battle-types' {
  interface V070BattleRuntime {
    pendingWitchcraftBattleRevealChoice?: V070WitchcraftBattleRevealChoice | null;
    witchcraftBattleRevealChoiceOpen?: boolean;
  }
}

export function queueV070WitchcraftBattleRevealChoice(
  state: V070GameState,
  choice: V070WitchcraftBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Witchcraft battle resolution requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Witchcraft cannot open while another reveal-timing battle choice is pending.',
    );
  }
  runtime.pendingWitchcraftBattleRevealChoice = {
    ...choice,
    candidateInstanceIds: [...choice.candidateInstanceIds],
  };
  // Witchcraft owns its chooser UI directly at the outer battle facade. Mark
  // the choice open immediately so older reveal facades pause instead of
  // trying to interpret a choice kind they predate.
  runtime.witchcraftBattleRevealChoiceOpen = true;

  appendV070Event(state, {
    type: 'witchcraft_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'mystics-witchcraft',
      candidateCount: choice.candidateInstanceIds.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'witchcraft_battle_choice_options',
    actor: choice.owner,
    visibility: choice.owner,
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      targetInstanceIds: [...choice.candidateInstanceIds],
    },
  });
}

export function pendingV070BattleRevealChoice(
  state: V070GameState,
): V070BattleRevealChoice | null {
  return state.battleRuntime?.pendingWitchcraftBattleRevealChoice
    ?? previous.pendingV070BattleRevealChoice(state);
}

export function isV070BattleRevealChoiceOpen(
  state: V070GameState,
): boolean {
  if (state.battleRuntime?.pendingWitchcraftBattleRevealChoice) {
    return Boolean(state.battleRuntime.witchcraftBattleRevealChoiceOpen);
  }
  return previous.isV070BattleRevealChoiceOpen(state);
}

export function completeV070WitchcraftBattleRevealChoice(
  state: V070GameState,
): V070WitchcraftBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingWitchcraftBattleRevealChoice;
  if (!runtime || !pending || !runtime.witchcraftBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Witchcraft battle-effect choice.',
    );
  }
  runtime.pendingWitchcraftBattleRevealChoice = null;
  runtime.witchcraftBattleRevealChoiceOpen = false;
  return pending;
}
