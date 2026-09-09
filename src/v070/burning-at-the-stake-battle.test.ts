import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import {
  V070_BURNING_AT_THE_STAKE_BATTLE_TEXT,
  V070_BURNING_AT_THE_STAKE_ID,
  pendingV070BurningAtTheStakeAftermath,
} from './burning-at-the-stake-battle';
import { negateV070BattleCardEffect } from './battle-effect-status';
import { viewV070GameForPlayer } from './views';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'burning-at-the-stake-battle',
    seed: 'burning-at-the-stake-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'inquisition-grand-inquisitor-final-judgment',
      },
      B: {
        name: 'Bravo',
        starterDeckId: 'military-commandant-holdfast',
      },
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
    value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `burning-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function prepareBurningBattle(
  handCardIds: readonly string[],
): { state: V070GameState; source: string; hand: string[] } {
  let state = startBattle();
  const source = injectCard(
    state,
    'A',
    V070_BURNING_AT_THE_STAKE_ID,
    'source',
  );
  state.players.A.zones.hand.push(source);
  const hand = handCardIds.map((cardId, index) =>
    injectCard(state, 'B', cardId, `hand-${index}`)
  );
  state.players.B.zones.hand = [...hand];

  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: source,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });

  expect(state.battleRuntime?.burningAtTheStakeBattleSourceInstanceIds)
    .toContain(source);
  expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
    .toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceInstanceId: source }),
    ]));
  return { state, source, hand };
}

function resolveBattleOutcome(
  state: V070GameState,
  winner: 'A' | 'B',
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [winner === 'A' ? 6 : 1],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [winner === 'B' ? 6 : 1],
  });
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return state;
}

function completeAftermath(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath',
    playerId: 'A',
  });
}

describe('v0.7.0 Burning at the Stake battle effect', () => {
  test('binds to released authority and advertises the Gambit/Tactic effect as supported', () => {
    const card = v070CanonicalContent.cardsById.get(
      V070_BURNING_AT_THE_STAKE_ID,
    );
    expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_BURNING_AT_THE_STAKE_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_BURNING_AT_THE_STAKE_ID)?.expectedText)
      .toBe(V070_BURNING_AT_THE_STAKE_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_BURNING_AT_THE_STAKE_ID);
  });

  test('automatically graveyards a unique highest-value Hand card after the opponent loses', () => {
    const lowId = 'neutral-rallying-cry';
    const highId = V070_BURNING_AT_THE_STAKE_ID;
    expect(v070CanonicalContent.cardsById.get(lowId)!.cost)
      .toBeLessThan(v070CanonicalContent.cardsById.get(highId)!.cost);

    let { state, hand } = prepareBurningBattle([lowId, highId]);
    state = completeAftermath(resolveBattleOutcome(state, 'A'));

    expect(state.players.B.zones.hand).toContain(hand[0]);
    expect(state.players.B.zones.hand).not.toContain(hand[1]);
    expect(state.players.B.zones.graveyard).toContain(hand[1]);
    expect(state.players.A.inquisition?.conviction).toBe(1);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'burning_at_the_stake_hand_revealed',
        visibility: 'public',
      }),
      expect.objectContaining({
        type: 'burning_at_the_stake_card_graveyarded',
        visibility: 'public',
      }),
    ]));
  });

  test('reveals the full Hand publicly and lets the owner choose among tied highest-value cards', () => {
    let { state, hand } = prepareBurningBattle([
      'neutral-rallying-cry',
      'neutral-rallying-cry',
    ]);
    state = completeAftermath(resolveBattleOutcome(state, 'A'));

    const pending = pendingV070BurningAtTheStakeAftermath(state);
    expect(pending).toEqual(expect.objectContaining({
      playerId: 'A',
      owner: 'A',
      opponent: 'B',
      revealedHandInstanceIds: hand,
      candidateInstanceIds: hand,
    }));
    expect(viewV070GameForPlayer(state, 'A').pendingBurningAtTheStakeAftermath)
      .toEqual(expect.objectContaining({
        revealedHandInstanceIds: hand,
        candidateInstanceIds: hand,
        candidateCount: 2,
      }));
    expect(viewV070GameForPlayer(state, 'B').pendingBurningAtTheStakeAftermath)
      .toEqual(expect.objectContaining({
        revealedHandInstanceIds: hand,
        candidateInstanceIds: hand,
        candidateCount: 2,
      }));
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_burning_at_the_stake_aftermath',
      playerId: 'B',
      targetInstanceId: hand[0],
    })).toThrow(/owner/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_burning_at_the_stake_aftermath',
      playerId: 'A',
      targetInstanceId: hand[1],
    });
    expect(pendingV070BurningAtTheStakeAftermath(state)).toBeNull();
    expect(state.players.B.zones.hand).toContain(hand[0]);
    expect(state.players.B.zones.graveyard).toContain(hand[1]);
  });

  test('an Arcane highest-value card grants the printed bonus in addition to normal Aftermath Conviction', () => {
    const arcaneId = v070CanonicalContent.content.cards.find(
      card => card.trait === 'Arcane',
    )!.id;
    let { state, hand } = prepareBurningBattle([arcaneId]);
    state = completeAftermath(resolveBattleOutcome(state, 'A'));

    expect(state.players.B.zones.graveyard).toContain(hand[0]);
    expect(state.players.A.inquisition?.conviction).toBe(2);
    const convictionEvents = state.events.filter(event =>
      event.type === 'conviction_changed'
    );
    expect(convictionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          reason: 'Inquisition normal Aftermath gain',
        }),
      }),
      expect.objectContaining({
        payload: expect.objectContaining({
          reason: 'Burning at the Stake: highest-value Arcane card graveyarded',
        }),
      }),
    ]));
  });

  test('does nothing if the Burning at the Stake opponent did not lose', () => {
    let { state, hand } = prepareBurningBattle([
      V070_BURNING_AT_THE_STAKE_ID,
    ]);
    state = completeAftermath(resolveBattleOutcome(state, 'B'));

    expect(state.players.B.zones.hand).toContain(hand[0]);
    expect(state.players.B.zones.graveyard).not.toContain(hand[0]);
    expect(state.events.some(event =>
      event.type === 'burning_at_the_stake_aftermath_inapplicable'
    )).toBe(true);
  });

  test('does nothing when the losing opponent has no cards in Hand', () => {
    let { state } = prepareBurningBattle([]);
    state = completeAftermath(resolveBattleOutcome(state, 'A'));

    expect(state.events.some(event =>
      event.type === 'burning_at_the_stake_aftermath_no_hand'
    )).toBe(true);
    expect(state.players.A.inquisition?.conviction).toBe(0);
  });

  test('Counterintelligence prevents the entire revealing effect', () => {
    let { state, source, hand } = prepareBurningBattle([
      V070_BURNING_AT_THE_STAKE_ID,
    ]);
    const counterintelligence = injectCard(
      state,
      'B',
      'neutral-counterintelligence',
      'counterintelligence',
    );
    state.players.B.zones.assetBank.push(counterintelligence);

    state = completeAftermath(resolveBattleOutcome(state, 'A'));

    expect(state.players.B.zones.hand).toContain(hand[0]);
    expect(state.players.B.zones.graveyard).not.toContain(hand[0]);
    expect(state.events.some(event =>
      event.type === 'counterintelligence_prevented_reveal'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId
        === source
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'burning_at_the_stake_hand_revealed'
    )).toBe(false);
    expect(state.players.A.inquisition?.conviction).toBe(0);
  });

  test('negation before the Aftermath removes both the deferred source and its scheduler carrier', () => {
    let prepared = prepareBurningBattle([
      V070_BURNING_AT_THE_STAKE_ID,
    ]);
    let state = prepared.state;
    const negator = injectCard(
      state,
      'B',
      'neutral-palisade-wall',
      'negator',
    );
    negateV070BattleCardEffect(
      state,
      prepared.source,
      negator,
      'neutral-palisade-wall',
    );

    expect(state.battleRuntime?.burningAtTheStakeBattleSourceInstanceIds)
      .not.toContain(prepared.source);
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements.some(
      effect => effect.sourceInstanceId === prepared.source,
    )).toBe(false);

    state = completeAftermath(resolveBattleOutcome(state, 'A'));
    expect(state.players.B.zones.hand).toContain(prepared.hand[0]);
    expect(state.events.some(event =>
      event.type === 'burning_at_the_stake_hand_revealed'
    )).toBe(false);
  });
});
