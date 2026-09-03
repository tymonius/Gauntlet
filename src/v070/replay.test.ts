import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  type CreateV070StarterGameInput,
  type V070GameState,
} from './engine';
import {
  createV070ReplayFile,
  createV070SaveFile,
  parseV070Replay,
  parseV070Save,
  reduceV070RecordedAction,
  replayV070Game,
  restoreV070SaveFile,
  serializeV070Replay,
  serializeV070Save,
  type V070RecordedAction,
} from './replay';

const input: CreateV070StarterGameInput = {
  gameId: 'replay-test',
  seed: 'replay-seed',
  players: {
    A: {
      name: 'Alpha',
      starterDeckId: 'military-general-forward-doctrine',
    },
    B: {
      name: 'Bravo',
      starterDeckId: 'military-commandant-holdfast',
    },
  },
};

function buildRecordedOpening(): {
  state: V070GameState;
  actions: V070RecordedAction[];
} {
  let state = createV070StarterGame(input);
  const actions: V070RecordedAction[] = [];

  const apply = (recorded: V070RecordedAction) => {
    actions.push(structuredClone(recorded));
    state = reduceV070RecordedAction(state, recorded);
  };

  apply({
    domain: 'setup',
    action: {
      type: 'choose_opening_discard',
      playerId: 'A',
      cardInstanceId: state.players.A.openingSelection[0],
    },
  });
  apply({
    domain: 'setup',
    action: {
      type: 'choose_opening_discard',
      playerId: 'B',
      cardInstanceId: state.players.B.openingSelection[0],
    },
  });
  apply({
    domain: 'setup',
    action: {
      type: 'arrange_territories',
      playerId: 'A',
      territoryIds: [...state.players.A.territoryCandidates],
    },
  });
  apply({
    domain: 'setup',
    action: {
      type: 'arrange_territories',
      playerId: 'B',
      territoryIds: [...state.players.B.territoryCandidates],
    },
  });
  apply({
    domain: 'setup',
    action: {
      type: 'roll_first_player',
      playerId: 'A',
      value: 6,
    },
  });
  apply({
    domain: 'setup',
    action: {
      type: 'roll_first_player',
      playerId: 'B',
      value: 1,
    },
  });
  apply({
    domain: 'turn',
    action: {
      type: 'resolve_capture',
      playerId: 'A',
    },
  });
  apply({
    domain: 'turn',
    action: {
      type: 'draw_turn_card',
      playerId: 'A',
    },
  });

  return { state, actions };
}

describe('v0.7.0 replay and save-state envelopes', () => {
  test('replays a seeded setup/turn transcript deterministically', () => {
    const recorded = buildRecordedOpening();
    const replay = createV070ReplayFile(input, recorded.actions);

    const first = replayV070Game(replay);
    const second = replayV070Game(replay);

    expect(first).toEqual(recorded.state);
    expect(second).toEqual(first);

    const serialized = serializeV070Replay(replay);
    const parsed = parseV070Replay(serialized);
    expect(replayV070Game(parsed)).toEqual(first);
  });

  test('round-trips a save state without sharing mutable references', () => {
    const recorded = buildRecordedOpening();
    const save = createV070SaveFile(recorded.state);
    const serialized = serializeV070Save(save);
    const parsed = parseV070Save(serialized);
    const restored = restoreV070SaveFile(parsed);

    expect(restored).toEqual(recorded.state);
    expect(restored).not.toBe(recorded.state);
    expect(restored.players.A).not.toBe(recorded.state.players.A);

    const originalHand = [...recorded.state.players.A.zones.hand];
    restored.players.A.zones.hand.length = 0;
    expect(recorded.state.players.A.zones.hand).toEqual(originalHand);
  });

  test('rejects incompatible replay and save serialization versions', () => {
    const recorded = buildRecordedOpening();
    const replay = createV070ReplayFile(input, recorded.actions);
    const save = createV070SaveFile(recorded.state);

    const replayPayload = JSON.parse(serializeV070Replay(replay));
    replayPayload.serializationVersion = 99;
    expect(() => parseV070Replay(JSON.stringify(replayPayload)))
      .toThrow(/serialization version/i);

    const savePayload = JSON.parse(serializeV070Save(save));
    savePayload.serializationVersion = 99;
    expect(() => parseV070Save(JSON.stringify(savePayload)))
      .toThrow(/serialization version/i);
  });

  test('dispatches battle-domain transcript entries through the battle reducer', () => {
    let state = buildRecordedOpening().state;
    state = reduceV070RecordedAction(state, {
      domain: 'turn',
      action: {
        type: 'pass_opening',
        playerId: 'A',
      },
    });

    state.players.A.position = 2;
    state.players.B.position = 3;
    state.board.forEach(space => {
      space.occupant = null;
      space.blank = true;
    });
    state.board[2].occupant = 'A';
    state.board[3].occupant = 'B';

    state = reduceV070RecordedAction(state, {
      domain: 'turn',
      action: {
        type: 'choose_movement',
        playerId: 'A',
        choice: 'advance',
      },
    });
    expect(state.battle).not.toBeNull();
    expect(state.battleRuntime).toBeNull();

    state = reduceV070RecordedAction(state, {
      domain: 'battle',
      action: {
        type: 'proceed_from_onset',
        playerId: 'A',
      },
    });

    expect(state.battleRuntime?.stage).toBe('set_gambits');
  });
});
