import { describe, expect, test } from 'vitest';
import {
  applyV070DevRecordedAction,
  createV070DevGame,
  defaultV070DevGameOptions,
  v070DevPlayerPayload,
  v070DevStarterDefinitions,
} from './v070-dev-session';

describe('v0.7.0 developer GUI session adapter', () => {
  test('creates deterministic games from certified starter Decks', () => {
    const options = defaultV070DevGameOptions();
    const first = createV070DevGame(options);
    const second = createV070DevGame(options);

    expect(first).toEqual(second);
    expect(v070DevStarterDefinitions()).toHaveLength(12);
    expect(first.players.A.starterDeckId).toBe(options.aStarterId);
    expect(first.players.B.starterDeckId).toBe(options.bStarterId);
  });

  test('routes recorded setup actions through the promoted reducer', () => {
    let state = createV070DevGame(defaultV070DevGameOptions());
    const discard = state.players.A.openingSelection[0];

    state = applyV070DevRecordedAction(state, {
      domain: 'setup',
      action: {
        type: 'choose_opening_discard',
        playerId: 'A',
        cardInstanceId: discard,
      },
    });

    expect(state.players.A.zones.hand).toHaveLength(3);
    expect(state.players.A.zones.discardPile).toContain(discard);
  });

  test('player payloads preserve hidden opening information', () => {
    const state = createV070DevGame(defaultV070DevGameOptions());
    const a = v070DevPlayerPayload(state, 'A').view;
    const b = v070DevPlayerPayload(state, 'B').view;

    expect(a.players.A.openingSelection).toHaveLength(4);
    expect(a.players.B.openingSelection).toBeUndefined();
    expect(b.players.B.openingSelection).toHaveLength(4);
    expect(b.players.A.openingSelection).toBeUndefined();
  });

  test('rejects starter IDs outside the certified package', () => {
    const options = defaultV070DevGameOptions();
    expect(() => createV070DevGame({
      ...options,
      aStarterId: 'not-a-certified-starter',
    })).toThrow(/certified v0\.7\.0 starter Deck/i);
  });
});
