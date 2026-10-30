import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { viewV070GameForPlayer } from './views';
import { currentCanonicalContent } from '../content/current-game';
const eligible = currentCanonicalContent.content.cards;
const playedCardId = eligible.find(card => card.allegiance === 'Neutral'
  && card.cost === 1 && card.effects.some(effect =>
    effect.label === 'Action' && effect.text === '+1 Card.'))?.id;
const exchangedCostId = eligible.find(card => card.allegiance === 'Neutral'
  && card.cost === 1 && card.id !== playedCardId)?.id;
const unequalCostId = eligible.find(card => card.allegiance === 'Neutral'
  && card.cost === 2)?.id;
if (!playedCardId || !exchangedCostId || !unequalCostId) {
  throw new Error('Current authority lacks required Equivalence fixtures.');
}

import {
  beginV070MysticRite,
  reconcileV070MysticEquivalenceHand,
  resolveV070MysticEquivalencePrintedPlay,
} from './mystics';

function ready(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'equivalence-regression',
    seed: 'equivalence-regression-seed',
    players: {
      A: { name: 'Mystic', starterDeckId: 'mystics-alchemist-first-principles',
        selectedRiteIds: ['equivalence', 'blood', 'crossing'] },
      B: { name: 'Military', starterDeckId: 'military-commandant-holdfast' },
    },
  });
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard', playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories', playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });
}

function exchangeCards(state: V070GameState): { handId: string; graveId: string } {
  const handId = 'equivalence-hand-cost';
  const graveId = 'equivalence-grave-card';
  state.cardInstances[handId] = { instanceId: handId, owner: 'A', cardId: exchangedCostId! };
  state.cardInstances[graveId] = { instanceId: graveId, owner: 'A', cardId: playedCardId! };
  state.players.A.zones.hand.push(handId);
  state.players.A.zones.graveyard.push(graveId);
  return { handId, graveId };
}

function begin(state: V070GameState): { handId: string; graveId: string } {
  const ids = exchangeCards(state);
  beginV070MysticRite(state, 'A', 'equivalence', {
    equivalenceHandInstanceId: ids.handId,
    equivalenceGraveyardInstanceId: ids.graveId,
  });
  return ids;
}

function toOpening(state: V070GameState): V070GameState {
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  return reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
}

function activeBattle(): V070GameState {
  let state = ready();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(t => { t.occupant = null; t.blank = true; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  expect(state.battle?.attacker).toBe('A');
  return state;
}
const assetCardId = eligible.find(card => card.allegiance === 'Neutral'
  && card.cost === 1
  && card.effects.some(effect => effect.label === 'Asset')
  && !card.effects.some(effect => effect.label === 'Action'))?.id;
if (!assetCardId) throw new Error('Missing eligible current-authority Asset');

describe('Rite of Equivalence against current selected-Rite authority', () => {
  test('equal-value exchange changes exact instances and publicly reveals only the exchanged card', () => {
    const state = ready();
    const { handId, graveId } = begin(state);
    const rite = state.players.A.mystics!.rites.equivalence;
    expect(rite.status).toBe('begun');
    expect(rite.equivalenceRevealedInstanceId).toBe(graveId);
    expect(state.players.A.zones.hand).toContain(graveId);
    expect(state.players.A.zones.hand).not.toContain(handId);
    expect(state.players.A.zones.graveyard).toContain(handId);
    expect(state.players.A.zones.graveyard).not.toContain(graveId);
    const opponent = viewV070GameForPlayer(state, 'B').players.A;
    expect(opponent.zones.hand).toBeUndefined();
    expect(opponent.zones.revealedHandCards).toEqual([
      { instanceId: graveId, cardId: playedCardId! },
    ]);
    expect(opponent.mystics).not.toHaveProperty('selectedRiteIds');
  });

  test('invalid zones or unequal printed value are rejected atomically', () => {
    const state = ready();
    const { handId, graveId } = exchangeCards(state);
    const before = structuredClone(state);
    expect(() => beginV070MysticRite(state, 'A', 'equivalence', {
      equivalenceHandInstanceId: graveId,
      equivalenceGraveyardInstanceId: handId,
    })).toThrow(/exchange one Hand card/);
    expect(state).toEqual(before);
    state.cardInstances[handId].cardId = unequalCostId!;
    const different = structuredClone(state);
    expect(() => beginV070MysticRite(state, 'A', 'equivalence', {
      equivalenceHandInstanceId: handId,
      equivalenceGraveyardInstanceId: graveId,
    })).toThrow(/equal printed values/);
    expect(state).toEqual(different);
  });

  test('a legal next-turn Action play completes the exact Rite', () => {
    let state = toOpening(ready());
    const { graveId } = begin(state);
    state.players.A.mystics!.rites.equivalence.begunTurn = state.turnNumber - 1;
    state = reduceV070TurnAction(state, {
      type: 'play_action_card', playerId: 'A', cardInstanceId: graveId,
    });
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('completed');
    expect(state.players.A.mystics!.rites.equivalence.equivalenceRevealedInstanceId)
      .toBeUndefined();
    expect(viewV070GameForPlayer(state, 'B').players.A.zones.revealedHandCards).toEqual([]);
    expect(state.events.some(event =>
      event.type === 'mystic_rite_completed'
      && (event.payload as { rite?: string }).rite === 'equivalence',
    )).toBe(true);
  });

  test('same-turn play cannot bypass general Rite completion delay', () => {
    let state = toOpening(ready());
    const { graveId } = begin(state);
    state = reduceV070TurnAction(state, {
      type: 'play_action_card', playerId: 'A', cardInstanceId: graveId,
    });
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('incomplete');
    expect(state.events.some(event =>
      event.type === 'mystic_rite_interrupted'
      && (event.payload as { reason?: string }).reason === 'same_turn_exchanged_card_play',
    )).toBe(true);
  });

  test('any other departure from Hand interrupts and clears the public reveal', () => {
    const state = ready();
    const { graveId } = begin(state);
    state.players.A.zones.hand.splice(state.players.A.zones.hand.indexOf(graveId), 1);
    state.players.A.zones.discardPile.push(graveId);
    reconcileV070MysticEquivalenceHand(state);
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('incomplete');
    expect(viewV070GameForPlayer(state, 'B').players.A.zones.revealedHandCards).toEqual([]);
    expect(state.events.some(event =>
      event.type === 'mystic_rite_interrupted'
      && (event.payload as { reason?: string }).reason === 'exchanged_card_left_hand',
    )).toBe(true);
  });

  test('another equal-title card cannot substitute for the exchanged instance', () => {
    const state = ready();
    const { graveId } = begin(state);
    const replacementId = 'another-instance-same-title';
    state.cardInstances[replacementId] = {
      instanceId: replacementId, owner: 'A', cardId: playedCardId!,
    };
    state.players.A.zones.hand.push(replacementId);
    state.players.A.zones.hand.splice(state.players.A.zones.hand.indexOf(graveId), 1);
    reconcileV070MysticEquivalenceHand(state);
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('incomplete');
  });
  test('a revealed Gambit remains active through commitment and completes at printed effect use', () => {
    let state = activeBattle();
    const { graveId } = begin(state);
    state.players.A.mystics!.rites.equivalence.begunTurn = state.turnNumber - 1;
    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit', playerId: 'A', cardInstanceId: graveId,
    });
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('begun');
    expect(state.battleRuntime?.participants.A.gambit?.faceUp).toBe(true);
    expect(viewV070GameForPlayer(state, 'B').battleRuntime?.participants.A.gambit)
      .toEqual({ instanceId: graveId, cardId: playedCardId! });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('begun');
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('completed');
    expect(state.players.A.mystics!.rites.equivalence.equivalenceRevealedInstanceId)
      .toBeUndefined();
  });

  test('Gambit used on its beginning turn cannot complete the Rite', () => {
    let state = activeBattle();
    const { graveId } = begin(state);
    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit', playerId: 'A', cardInstanceId: graveId,
    });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('incomplete');
  });

  test('banking the exchanged card for its printed Asset effect completes the Rite', () => {
    let state = toOpening(ready());
    const { graveId } = begin(state);
    state.cardInstances[graveId].cardId = assetCardId!;
    state.players.A.mystics!.rites.equivalence.begunTurn = state.turnNumber - 1;
    state = reduceV070TurnAction(state, {
      type: 'bank_asset', playerId: 'A', cardInstanceId: graveId,
    });
    expect(state.players.A.zones.assetBank).toContain(graveId);
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('completed');
  });

  test('the printed Tactic mode qualifies for exactly the exchanged instance', () => {
    const state = ready();
    const { graveId, handId } = begin(state);
    state.players.A.mystics!.rites.equivalence.begunTurn = state.turnNumber - 1;
    resolveV070MysticEquivalencePrintedPlay(state, 'A', handId, 'Gambit');
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('begun');
    resolveV070MysticEquivalencePrintedPlay(state, 'A', graveId, 'Tactic');
    expect(state.players.A.mystics!.rites.equivalence.status).toBe('completed');
  });

});
