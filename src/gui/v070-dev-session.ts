import {
  createV070StarterGame,
  type V070GameState,
} from '../v070/engine';
import {
  reduceV070RecordedAction,
  type V070RecordedAction,
} from '../v070/replay';
import {
  v070StarterDecks,
  type V070StarterDeckDefinition,
} from '../v070/starter-decks';
import {
  viewV070GameForPlayer,
  type V070GameView,
} from '../v070/views';
import type { PlayerId } from '../v070/rules';

export interface V070DevGameOptions {
  seed: string;
  aStarterId: string;
  bStarterId: string;
}

export interface V070DevPlayerPayload {
  viewer: PlayerId;
  view: V070GameView;
}

export function v070DevStarterDefinitions():
ReadonlyArray<V070StarterDeckDefinition> {
  return [...v070StarterDecks.values()]
    .map(starter => structuredClone(starter.definition));
}

export function defaultV070DevGameOptions(): V070DevGameOptions {
  const starterIds = [...v070StarterDecks.keys()];
  if (starterIds.length < 2) {
    throw new Error(
      'The certified v0.7.0 starter package must contain at least two Decks.',
    );
  }
  return {
    seed: 'v070-dev-gui',
    aStarterId: starterIds[0],
    bStarterId: starterIds[1],
  };
}

export function createV070DevGame(
  options: V070DevGameOptions,
): V070GameState {
  assertStarter('A', options.aStarterId);
  assertStarter('B', options.bStarterId);
  if (!options.seed) throw new Error('A deterministic seed is required.');

  return createV070StarterGame({
    gameId: 'v070-gui-dev-game',
    seed: options.seed,
    players: {
      A: {
        name: 'Player A',
        starterDeckId: options.aStarterId,
      },
      B: {
        name: 'Player B',
        starterDeckId: options.bStarterId,
      },
    },
  });
}

export function applyV070DevRecordedAction(
  state: V070GameState,
  recorded: V070RecordedAction,
): V070GameState {
  return reduceV070RecordedAction(state, recorded);
}

export function v070DevPlayerPayload(
  state: V070GameState,
  viewer: PlayerId,
): V070DevPlayerPayload {
  return {
    viewer,
    view: viewV070GameForPlayer(state, viewer),
  };
}

function assertStarter(
  playerId: PlayerId,
  starterId: string,
): void {
  if (!v070StarterDecks.has(starterId)) {
    throw new Error(
      `Unknown certified v0.7.0 starter Deck for ${playerId}: ${starterId}.`,
    );
  }
}
