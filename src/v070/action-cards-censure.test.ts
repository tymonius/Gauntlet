import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
  type V070PlayerZones,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  associateV070Sanction,
  V070_SANCTIONS_CENSURE_ID,
} from './sanctions';
import { viewV070GameForPlayer } from './views';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function setupGame(firstPlayer: 'A' | 'B' = 'A'): V070GameState {
  let state = createV070StarterGame({
    gameId: `action-censure-${firstPlayer}`,
    seed: `action-censure-seed-${firstPlayer}`,
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
    value: firstPlayer === 'A' ? 6 : 1,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: firstPlayer === 'B' ? 6 : 1,
  });
}

function openingForB(): V070GameState {
  let state = setupGame('B');
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'B' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'B' });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function activeBattle(): V070GameState {
  let state = setupGame('A');
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(territory => { territory.occupant = null; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function relocateCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  target: keyof Pick<V070PlayerZones, 'hand' | 'discardPile' | 'graveyard' | 'assetBank'>,
  occurrence = 0,
): string {
  const instances = Object.values(state.cardInstances)
    .filter(candidate => candidate.owner === playerId && candidate.cardId === cardId);
  const instance = instances[occurrence];
  if (!instance) throw new Error(`Missing ${playerId} card ${cardId} #${occurrence}`);

  const player = state.players[playerId];
  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(instance.instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones[target].push(instance.instanceId);
  return instance.instanceId;
}

function injectCensure(
  state: V070GameState,
  suffix: string,
  target: 'hand' | 'assetBank',
): string {
  const instanceId = `test-A-${suffix}-${V070_SANCTIONS_CENSURE_ID}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: V070_SANCTIONS_CENSURE_ID,
    owner: 'A',
  };
  state.players.A.zones[target].push(instanceId);
  return instanceId;
}

function associateCensure(
  state: V070GameState,
  censure: string,
): void {
  associateV070Sanction(state, {
    instanceId: censure,
    owner: 'A',
    opponent: 'B',
    kind: 'asset',
  });
}

describe('v0.7.0 printed Action cards and Sanctions: Censure', () => {
  test('Rallying Cry spends the normal Action, draws one, then goes to Discard', () => {
    let state = openingForB();
    const rally = relocateCard(state, 'B', 'neutral-rallying-cry', 'hand');
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: rally,
    });

    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.turnState?.actionsTaken.opening).toBe(1);
    expect(state.players.B.zones.hand.length).toBe(handBefore);
    expect(state.players.B.zones.hand).not.toContain(rally);
    expect(state.players.B.zones.discardPile).toContain(rally);
    expect(state.events.some(event =>
      event.type === 'action_card_played'
      && (event.payload as { cardId?: string })?.cardId === 'neutral-rallying-cry'
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'action_card_resolved'
      && (event.payload as { instanceId?: string })?.instanceId === rally
    )).toBe(true);
  });

  test('unsupported printed Action effects fail explicitly without spending the Action or moving the card', () => {
    const state = openingForB();
    const recruits = relocateCard(state, 'B', 'neutral-new-recruits', 'hand');

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: recruits,
    })).toThrow(/not yet executable/);

    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.actionsTaken.opening).toBe(0);
    expect(state.players.B.zones.hand).toContain(recruits);
  });

  test('Censure may be banked from Hand after that opponent refuses Terms and remembers the refusing opponent', () => {
    let state = activeBattle();
    const censure = injectCensure(state, 'censure', 'hand');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_sanctions_censure',
      playerId: 'A',
      cardInstanceId: censure,
    });

    expect(state.players.A.zones.hand).not.toContain(censure);
    expect(state.players.A.zones.assetBank).toContain(censure);
    expect(state.sanctions).toContainEqual({
      instanceId: censure,
      owner: 'A',
      opponent: 'B',
      kind: 'asset',
    });
  });

  test('Censure interrupts after the Action card is played and before its printed effect resolves', () => {
    let state = openingForB();
    const censure = injectCensure(state, 'censure', 'assetBank');
    associateCensure(state, censure);
    const rally = relocateCard(state, 'B', 'neutral-rallying-cry', 'hand');
    const payment = state.players.B.zones.hand.find(instanceId => instanceId !== rally)!;
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: rally,
    });

    expect(state.pendingActionCard).toEqual({
      playerId: 'B',
      instanceId: rally,
      cardId: 'neutral-rallying-cry',
      phase: 'opening',
    });
    expect(state.pendingSanctionChoices).toEqual([{
      kind: 'censure_action',
      playerId: 'B',
      sanctionInstanceId: censure,
      sourceActionInstanceId: rally,
    }]);
    expect(state.players.B.zones.hand).not.toContain(rally);
    expect(state.players.B.zones.discardPile).not.toContain(rally);
    expect(state.players.B.zones.hand.length).toBe(handBefore - 1);

    const view = viewV070GameForPlayer(state, 'B');
    expect(view.pendingActionCard?.instanceId).toBe(rally);
    expect(view.pendingSanctionChoices).toHaveLength(1);

    expect(() => reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    })).toThrow(/pending Sanction choice/);

    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure,
      choice: 'discard',
      discardInstanceId: payment,
    });

    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.players.B.zones.discardPile).toContain(payment);
    expect(state.players.B.zones.discardPile).toContain(rally);
    // Play (-1), Censure discard (-1), Rallying Cry draw (+1).
    expect(state.players.B.zones.hand.length).toBe(handBefore - 1);
    expect(state.sanctionTriggerTurns[censure]).toBe(state.turnNumber);
  });

  test('Censure +1 Card resolves before the interrupted Rallying Cry +1 Card', () => {
    let state = openingForB();
    const censure = injectCensure(state, 'censure', 'assetBank');
    associateCensure(state, censure);
    const rally = relocateCard(state, 'B', 'neutral-rallying-cry', 'hand');
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: rally,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure,
      choice: 'draw',
    });

    // Play (-1), Censure +1, Rallying Cry +1.
    expect(state.players.B.zones.hand.length).toBe(handBefore + 1);
    expect(state.pendingActionCard).toBeNull();

    const draws = state.events.filter(event =>
      event.type === 'cards_drawn'
      && ['Sanctions: Censure', 'Rallying Cry'].includes(
        (event.payload as { purpose?: string })?.purpose ?? '',
      )
    );
    expect(draws.map(event => (event.payload as { purpose?: string }).purpose)).toEqual([
      'Sanctions: Censure',
      'Rallying Cry',
    ]);
  });

  test('multiple Censures each trigger on the first Action-card play, then stay spent for later Actions that turn', () => {
    let state = openingForB();
    state.turnState!.actionsAvailable = 2;

    const censure1 = injectCensure(state, 'censure-1', 'assetBank');
    const censure2 = injectCensure(state, 'censure-2', 'assetBank');
    associateCensure(state, censure1);
    associateCensure(state, censure2);

    const rally1 = relocateCard(state, 'B', 'neutral-rallying-cry', 'hand', 0);
    const rally2 = relocateCard(state, 'B', 'neutral-rallying-cry', 'hand', 1);

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: rally1,
    });
    expect(state.pendingSanctionChoices.map(choice => choice.sanctionInstanceId)).toEqual([
      censure1,
      censure2,
    ]);

    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure1,
      choice: 'draw',
    });
    expect(state.pendingActionCard?.instanceId).toBe(rally1);
    state = reduceV070TurnAction(state, {
      type: 'resolve_censure_choice',
      playerId: 'B',
      sanctionInstanceId: censure2,
      choice: 'draw',
    });
    expect(state.pendingActionCard).toBeNull();

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: rally2,
    })).toThrow(/normal Action limit for opening/);

    state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'B' });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'hold',
    });
    expect(state.turnState?.phase).toBe('denouement');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: rally2,
    });

    expect(state.pendingSanctionChoices).toHaveLength(0);
    expect(state.pendingActionCard).toBeNull();
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(state.turnState?.actionsTaken).toEqual({ opening: 1, denouement: 1 });
    expect(state.sanctionTriggerTurns[censure1]).toBe(state.turnNumber);
    expect(state.sanctionTriggerTurns[censure2]).toBe(state.turnNumber);
  });
});
