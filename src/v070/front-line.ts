import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  activeV070Overlay,
  cardIdForV070Overlay,
  graveyardV070Overlay,
  replaceV070CaptureWithOverlay,
  resolveV070OverlayCaptureEffects,
} from './overlays';
import {
  preventV070CaptureWithProtractedSiege,
} from './protracted-siege';
import { expireV070BlockadesForControlLoss } from './sanctions';
import { discardV070SmugglersRunStashForControlLoss } from './smugglers-run';

export interface V070FrontLineCapture {
  position: number;
  territoryId: string;
  previousController: PlayerId;
}

export interface V070FrontLineAdvanceResult {
  captures: V070FrontLineCapture[];
  reachedOpponentEnd: boolean;
}

/**
 * Advances control from the player's own end one Territory at a time.
 * This is the shared control procedure behind "Advance Front Line N".
 *
 * It intentionally does not check token Position: an effect that says
 * "Advance Front Line" directly advances control, unlike the normal Capture
 * step whose Position requirement is checked by the turn engine.
 */
export function advanceV070FrontLine(
  state: V070GameState,
  playerId: PlayerId,
  amount = 1,
  source = 'effect',
): V070FrontLineAdvanceResult {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new V070GameActionError('Front Line advancement must be a nonnegative integer.');
  }

  const captures: V070FrontLineCapture[] = [];

  for (let step = 0; step < amount; step += 1) {
    const target = nextV070FrontLineTarget(state, playerId);
    if (!target) break;

    if (preventV070CaptureWithProtractedSiege(
      state,
      target.position,
      playerId,
      source,
    )) {
      break;
    }

    if (replaceV070CaptureWithOverlay(state, target.position, playerId, source)) {
      continue;
    }

    const previousController = target.controller;
    target.controller = playerId;
    resolveEncampmentControlLoss(
      state,
      target.position,
      playerId,
      source,
    );
    discardV070SmugglersRunStashForControlLoss(
      state,
      target.territoryInstanceId,
      previousController,
    );
    expireV070BlockadesForControlLoss(
      state,
      target.territoryInstanceId,
      previousController,
    );
    refreshV070ControlledTerritories(state);

    const capture = {
      position: target.position,
      territoryId: target.territoryId,
      previousController,
    };
    captures.push(capture);

    appendV070Event(state, {
      type: 'territory_captured',
      actor: playerId,
      visibility: 'public',
      payload: {
        ...capture,
        controller: playerId,
        source,
        frontLineAdvance: true,
      },
    });

    resolveV070OverlayCaptureEffects(
      state,
      target.position,
      source,
    );

    if (controlsEveryV070Territory(state, playerId)) break;
  }

  return {
    captures,
    reachedOpponentEnd: controlsEveryV070Territory(state, playerId),
  };
}

function resolveEncampmentControlLoss(
  state: V070GameState,
  territoryPosition: number,
  newController: PlayerId,
  source: string,
): void {
  const active = activeV070Overlay(state, territoryPosition);
  if (!active
    || active.owner === newController
    || cardIdForV070Overlay(state, active) !== 'military-encampment') {
    return;
  }

  graveyardV070Overlay(
    state,
    active.instanceId,
    `military-encampment opposing control gain (${source})`,
  );
}

export function nextV070FrontLineTarget(
  state: V070GameState,
  playerId: PlayerId,
) {
  const ordered = playerId === 'A'
    ? state.board
    : [...state.board].reverse();
  return ordered.find(territory => territory.controller !== playerId) ?? null;
}

export function refreshV070ControlledTerritories(state: V070GameState): void {
  for (const playerId of ['A', 'B'] as const) {
    state.players[playerId].controlledTerritories = state.board
      .filter(territory => territory.controller === playerId)
      .map(territory => territory.territoryId);
  }
}

export function controlsEveryV070Territory(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  return state.board.length > 0
    && state.board.every(territory => territory.controller === playerId);
}
