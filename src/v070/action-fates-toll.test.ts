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
import { currentV070MovementStep } from './rules';
import { viewV070GameForPlayer } from './views';

const militaryStarter = 'military-commandant-holdfast';

function openingForB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'fates-toll',
    seed: 'fates-toll-seed',
    players: {
      A: { name: 'A', starterDeckId: militaryStarter },
      B: { name: 'B', starterDeckId: militaryStarter },
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

  state.players.B.position = 1;
  state.players.A.position = 4;
  state.board.forEach(space => { space.occupant = null; });
  state.board[1].occupant = 'B';
  state.board[4].occupant = 'A';

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'B',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'B',
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function injectHand(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `fates-toll-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

describe("v0.7.0 Fate's Toll Action", () => {
  test('during Opening, pays one other Hand card to Graveyard and queues one unrestricted movement step', () => {
    let state = openingForB();
    const source = injectHand(
      state,
      'B',
      'mystics-fate-s-toll',
      'source',
    );
    const payment = injectHand(
      state,
      'B',
      'neutral-rallying-cry',
      'payment',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'fates_toll_cost',
      playerId: 'B',
      sourceActionInstanceId: source,
    });

    const publicPending = state.events.find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { sourceActionInstanceId?: string })
        ?.sourceActionInstanceId === source
    );
    expect(publicPending?.payload).not.toHaveProperty('targetInstanceIds');

    const ownView = viewV070GameForPlayer(state, 'B');
    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(ownView.events.some(event =>
      event.type === 'action_effect_choice_options'
      && (event.payload as { sourceActionInstanceId?: string })
        ?.sourceActionInstanceId === source
      && (event.payload as { targetInstanceIds?: string[] })
        ?.targetInstanceIds?.includes(payment)
    )).toBe(true);
    expect(opponentView.events.some(event =>
      event.type === 'action_effect_choice_options'
      && (event.payload as { sourceActionInstanceId?: string })
        ?.sourceActionInstanceId === source
    )).toBe(false);

    state = reduceV070TurnAction(state, {
      type: 'choose_fates_toll_cost',
      playerId: 'B',
      targetInstanceId: payment,
    });

    expect(state.players.B.zones.hand).not.toContain(payment);
    expect(state.players.B.zones.graveyard).toContain(payment);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.turnState?.pendingNormalMovementSteps).toEqual([
      {
        source: "Fate's Toll",
        choiceRestriction: 'any',
        battleRestriction: 'allowed',
      },
    ]);

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    expect(state.turnState?.movementStepQueue.map(step => step.source)).toEqual([
      'normal',
      "Fate's Toll",
    ]);
  });

  test('during Denouement, starts one separate effect movement and returns control to Denouement', () => {
    let state = openingForB();
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'hold',
    });
    expect(state.turnState?.phase).toBe('denouement');

    const source = injectHand(
      state,
      'B',
      'mystics-fate-s-toll',
      'source',
    );
    const payment = injectHand(
      state,
      'B',
      'neutral-rallying-cry',
      'payment',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_fates_toll_cost',
      playerId: 'B',
      targetInstanceId: payment,
    });

    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceSource).toBe('effect');
    expect(currentV070MovementStep(state.turnState!)).toEqual({
      source: "Fate's Toll",
      choiceRestriction: 'any',
      battleRestriction: 'allowed',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'advance',
    });

    expect(state.players.B.position).toBe(2);
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
  });

  test('Censure may consume the only remaining payment after Fate’s Toll is played, preventing the movement grant', () => {
    let state = openingForB();
    state.players.B.zones.drawPile.push(...state.players.B.zones.hand);
    state.players.B.zones.hand = [];

    const source = injectHand(
      state,
      'B',
      'mystics-fate-s-toll',
      'source',
    );
    const payment = injectHand(
      state,
      'B',
      'neutral-rallying-cry',
      'payment',
    );
    const censure = 'fates-toll-A-censure';
    state.cardInstances[censure] = {
      instanceId: censure,
      cardId: V070_SANCTIONS_CENSURE_ID,
      owner: 'A',
    };
    state.players.A.zones.assetBank.push(censure);
    associateV070Sanction(state, {
      instanceId: censure,
      owner: 'A',
      opponent: 'B',
      kind: 'asset',
    });

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    expect(state.pendingSanctionChoices).toHaveLength(1);
    expect(state.pendingActionEffectChoice).toBeNull();

    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure,
      choice: 'discard',
      discardInstanceId: payment,
    });

    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(payment);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.turnState?.pendingNormalMovementSteps).toEqual([]);
    expect(state.events.some(event =>
      event.type === 'action_effect_incomplete'
      && (event.payload as { purpose?: string; reason?: string })?.purpose === "Fate's Toll"
      && (event.payload as { reason?: string })?.reason
        === 'required_hand_cost_unavailable'
    )).toBe(true);
  });

  test('an invalid payment leaves the pending cost unresolved', () => {
    let state = openingForB();
    const source = injectHand(
      state,
      'B',
      'mystics-fate-s-toll',
      'source',
    );
    injectHand(
      state,
      'B',
      'neutral-rallying-cry',
      'payment',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_fates_toll_cost',
      playerId: 'B',
      targetInstanceId: source,
    })).toThrow(/must put another card from your Hand/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'fates_toll_cost',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
  });

  test('requires another Hand card before spending the Action', () => {
    const state = openingForB();
    state.players.B.zones.drawPile.push(...state.players.B.zones.hand);
    state.players.B.zones.hand = [];
    const source = injectHand(
      state,
      'B',
      'mystics-fate-s-toll',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires one other card in your Hand/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });
});
