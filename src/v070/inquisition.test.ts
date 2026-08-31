import { describe, expect, test } from 'vitest';
import { createV070StarterGame } from './engine';
import {
  V070_MAX_CONVICTION,
  gainV070Conviction,
  applyV070NormalAftermathConviction,
  spendV070Conviction,
  v070Conviction,
} from './inquisition';
import { viewV070GameForPlayer } from './views';

const inquisitionStarter = 'inquisition-grand-inquisitor-final-judgment';
const militaryStarter = 'military-commandant-holdfast';

function game() {
  return createV070StarterGame({
    gameId: 'conviction-core',
    seed: 'conviction-core-seed',
    players: {
      A: { name: 'Inquisition', starterDeckId: inquisitionStarter },
      B: { name: 'Military', starterDeckId: militaryStarter },
    },
  });
}

describe('v0.7.0 Inquisition Conviction core', () => {
  test('Inquisition begins at 0 Conviction and non-Inquisition players have no Conviction state', () => {
    const state = game();

    expect(state.players.A.inquisition).toEqual({
      conviction: 0,
      normalConvictionGainTurn: null,
    });
    expect(v070Conviction(state, 'A')).toBe(0);
    expect(state.players.B.inquisition).toBeNull();
    expect(() => v070Conviction(state, 'B')).toThrow(
      /not using the Inquisition faction/,
    );
  });

  test('gains Conviction up to the released maximum of 4', () => {
    const state = game();

    expect(gainV070Conviction(state, 'A', 3, 'test gain')).toBe(3);
    expect(v070Conviction(state, 'A')).toBe(3);

    expect(gainV070Conviction(state, 'A', 3, 'test cap')).toBe(1);
    expect(v070Conviction(state, 'A')).toBe(V070_MAX_CONVICTION);

    expect(state.events.some(candidate =>
      candidate.type === 'conviction_changed'
      && (candidate.payload as {
        requestedDelta?: number;
        delta?: number;
        balance?: number;
        capped?: boolean;
        reason?: string;
      })?.requestedDelta === 3
      && (candidate.payload as { delta?: number })?.delta === 1
      && (candidate.payload as { balance?: number })?.balance === 4
      && (candidate.payload as { capped?: boolean })?.capped === true
      && (candidate.payload as { reason?: string })?.reason === 'test cap'
    )).toBe(true);
  });

  test('spends Conviction exactly and records the public running balance', () => {
    const state = game();
    gainV070Conviction(state, 'A', 4, 'setup');

    spendV070Conviction(state, 'A', 2, 'test spend');

    expect(v070Conviction(state, 'A')).toBe(2);
    expect(state.events.some(event =>
      event.type === 'conviction_changed'
      && event.visibility === 'public'
      && (event.payload as {
        requestedDelta?: number;
        delta?: number;
        balance?: number;
        reason?: string;
      })?.requestedDelta === -2
      && (event.payload as { delta?: number })?.delta === -2
      && (event.payload as { balance?: number })?.balance === 2
      && (event.payload as { reason?: string })?.reason === 'test spend'
    )).toBe(true);
  });

  test('cannot spend more Conviction than is available', () => {
    const state = game();
    gainV070Conviction(state, 'A', 1, 'setup');

    expect(() => spendV070Conviction(
      state,
      'A',
      2,
      'overspend',
    )).toThrow(/requires 2 Conviction but only 1 is available/);

    expect(v070Conviction(state, 'A')).toBe(1);
  });

  test('resource operations reject negative and fractional amounts', () => {
    const state = game();

    expect(() => gainV070Conviction(
      state,
      'A',
      -1,
      'invalid',
    )).toThrow(/nonnegative integer/);
    expect(() => gainV070Conviction(
      state,
      'A',
      1.5,
      'invalid',
    )).toThrow(/nonnegative integer/);
    expect(() => spendV070Conviction(
      state,
      'A',
      -1,
      'invalid',
    )).toThrow(/nonnegative integer/);

    expect(v070Conviction(state, 'A')).toBe(0);
  });

  test('normal Aftermath gain is limited to the first qualifying event each turn even when capped', () => {
    const state = game();
    state.turnNumber = 7;
    gainV070Conviction(state, 'A', 4, 'setup');

    expect(applyV070NormalAftermathConviction(
      state,
      'A',
      ['opposing-card-1'],
    )).toBe(true);
    expect(v070Conviction(state, 'A')).toBe(4);
    expect(state.players.A.inquisition?.normalConvictionGainTurn).toBe(7);

    spendV070Conviction(state, 'A', 1, 'after capped trigger');
    expect(applyV070NormalAftermathConviction(
      state,
      'A',
      ['opposing-card-2'],
    )).toBe(false);
    expect(v070Conviction(state, 'A')).toBe(3);

    state.turnNumber = 8;
    expect(applyV070NormalAftermathConviction(
      state,
      'A',
      ['opposing-card-3'],
    )).toBe(true);
    expect(v070Conviction(state, 'A')).toBe(4);
  });

  test('Conviction is public in both player views', () => {
    const state = game();
    gainV070Conviction(state, 'A', 2, 'public resource');

    expect(viewV070GameForPlayer(state, 'A').players.A.inquisition)
      .toEqual({ conviction: 2 });
    expect(viewV070GameForPlayer(state, 'B').players.A.inquisition)
      .toEqual({ conviction: 2 });
    expect(viewV070GameForPlayer(state, 'A').players.A.inquisition)
      .not.toHaveProperty('normalConvictionGainTurn');
  });
});
