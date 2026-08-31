import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  associateV070Sanction,
  V070_SANCTIONS_CENSURE_ID,
} from './sanctions';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'scouting-report-action',
    seed: 'scouting-report-action-seed',
    players: {
      A: { name: 'Diplomat', starterDeckId: diplomatStarter },
      B: { name: 'Opponent', starterDeckId: militaryStarter },
    },
  });

  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'A',
    value: 1,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 6,
  });
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'B' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'B' });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function injectHandCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner: playerId };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function injectOpposingCensure(state: V070GameState): string {
  const instanceId = `test-A-${V070_SANCTIONS_CENSURE_ID}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: V070_SANCTIONS_CENSURE_ID,
    owner: 'A',
  };
  state.players.A.zones.assetBank.push(instanceId);
  associateV070Sanction(state, {
    instanceId,
    owner: 'A',
    opponent: 'B',
    kind: 'asset',
  });
  return instanceId;
}

describe('v0.7.0 Scouting Report Action', () => {
  test('requires at least one reveal source before spending the Action', () => {
    const state = openingForB();
    state.players.A.zones.drawPile = [];
    state.players.A.zones.hand = [];
    state.players.B.zones.drawPile = [];
    const source = injectHandCard(state, 'B', 'neutral-scouting-report', 'source');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires a nonempty Draw Pile or opposing Hand/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('opens the three released source choices when all are available', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-scouting-report', 'source');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'scouting_report_source',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
    const event = state.events.find(candidate =>
      candidate.type === 'action_effect_choice_pending'
      && (candidate.payload as { kind?: string })?.kind === 'scouting_report_source'
    );
    expect((event?.payload as { sources?: string[] })?.sources).toEqual([
      'own_draw',
      'opponent_draw',
      'opponent_hand',
    ]);
  });

  test('reveals the top card of your Draw Pile without moving it', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-scouting-report', 'own-draw');
    const top = state.players.B.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_scouting_report_choice',
      playerId: 'B',
      source: 'own_draw',
    });

    expect(state.players.B.zones.drawPile[0]).toBe(top);
    const event = state.events.find(candidate =>
      candidate.type === 'card_revealed'
      && (candidate.payload as { purpose?: string })?.purpose === 'Scouting Report'
    );
    expect(event?.visibility).toBe('public');
    expect(event?.payload).toEqual(expect.objectContaining({
      instanceId: top,
      cardId: state.cardInstances[top].cardId,
      owner: 'B',
      zone: 'draw_top',
      purpose: 'Scouting Report',
    }));
    expect(state.players.B.zones.discardPile).toContain(source);
  });

  test('reveals the top opposing Draw card without moving it', () => {
    let state = openingForB();
    const source = injectHandCard(state, 'B', 'neutral-scouting-report', 'opponent-draw');
    const top = state.players.A.zones.drawPile[0];

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_scouting_report_choice',
      playerId: 'B',
      source: 'opponent_draw',
    });

    expect(state.players.A.zones.drawPile[0]).toBe(top);
    expect(state.events.some(event =>
      event.type === 'card_revealed'
      && (event.payload as { instanceId?: string })?.instanceId === top
      && (event.payload as { owner?: string })?.owner === 'A'
    )).toBe(true);
  });

  test('random opposing Hand reveal is deterministic and leaves the card in Hand', () => {
    const original = openingForB();
    injectHandCard(original, 'A', 'neutral-rallying-cry', 'extra-opponent-card');
    const source = injectHandCard(original, 'B', 'neutral-scouting-report', 'hand');

    const play = (state: V070GameState) => {
      state = reduceV070TurnAction(state, {
        type: 'play_action_card',
        playerId: 'B',
        cardInstanceId: source,
      });
      return reduceV070TurnAction(state, {
        type: 'resolve_scouting_report_choice',
        playerId: 'B',
        source: 'opponent_hand',
      });
    };

    const first = play(original);
    const second = play(original);

    const firstEvent = first.events.find(event =>
      event.type === 'card_revealed'
      && (event.payload as { zone?: string; purpose?: string })?.zone === 'hand'
      && (event.payload as { purpose?: string })?.purpose === 'Scouting Report'
    );
    const secondEvent = second.events.find(event =>
      event.type === 'card_revealed'
      && (event.payload as { zone?: string; purpose?: string })?.zone === 'hand'
      && (event.payload as { purpose?: string })?.purpose === 'Scouting Report'
    );
    const revealed = (firstEvent?.payload as { instanceId?: string })?.instanceId;

    expect(revealed).toBeTruthy();
    expect((secondEvent?.payload as { instanceId?: string })?.instanceId).toBe(revealed);
    expect(first.players.A.zones.hand).toContain(revealed);
  });

  test('an unavailable source choice is rejected without destroying the pending choice', () => {
    let state = openingForB();
    state.players.A.zones.hand = [];
    const source = injectHandCard(state, 'B', 'neutral-scouting-report', 'unavailable');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_scouting_report_choice',
      playerId: 'B',
      source: 'opponent_hand',
    })).toThrow(/no longer available/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'scouting_report_source',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
  });

  test('if Censure consumes the last reveal source, the Action finishes without deadlocking', () => {
    let state = openingForB();
    state.players.A.zones.drawPile = [];
    state.players.A.zones.hand = [];
    const onlyDraw = state.players.B.zones.drawPile[0];
    state.players.B.zones.drawPile = onlyDraw ? [onlyDraw] : [];
    const source = injectHandCard(state, 'B', 'neutral-scouting-report', 'censured');
    const censure = injectOpposingCensure(state);

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    expect(state.pendingSanctionChoices).toHaveLength(1);

    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure,
      choice: 'draw',
    });

    expect(state.players.B.zones.hand).toContain(onlyDraw);
    expect(state.players.B.zones.drawPile).toHaveLength(0);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.events.some(event =>
      event.type === 'action_effect_incomplete'
      && (event.payload as { purpose?: string; reason?: string })?.purpose === 'Scouting Report'
      && (event.payload as { reason?: string })?.reason === 'required_reveal_source_unavailable'
    )).toBe(true);
  });
});
