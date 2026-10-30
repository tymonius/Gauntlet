import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  reduceV070BattleAction,
  requiredV070BattleDice,
} from './battle-engine';
import { retreatV070Position } from './rules';
import { currentCanonicalContent } from '../content/current-game';
import {
  beginV070MysticRite,
  applyV070MysticShatteringAtDiceEntry,
} from './mystics';

const mysticStarter = 'mystics-alchemist-first-principles';
const militaryStarter = 'military-commandant-holdfast';

function ready(spiritWalker = false): V070GameState {
  let state = createV070StarterGame({
    gameId: 'rite-shattering-regression',
    seed: 'rite-shattering-seed',
    players: {
      A: {
        name: 'Mystic',
        starterDeckId: spiritWalker
          ? 'mystics-spirit-walker-unbroken-circle'
          : mysticStarter,
        selectedRiteIds: ['shattering', 'blood', 'crossing'],
      },
      B: { name: 'Military', starterDeckId: militaryStarter },
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
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });
}

function bankAsset(state: V070GameState): string {
  // Choose an ordinary cost-2 bankable Asset from current authority without
  // making this Rite test assert historical behavior for an unrelated card.
  const card = currentCanonicalContent.content.cards.find(candidate =>
    candidate.cost === 2
    && candidate.effects.some(effect => effect.label === 'Asset')
    && candidate.allegiance === 'Neutral'
  );
  if (!card) throw new Error('Test requires an available cost-2 neutral Asset.');
  const cardId = card.id;
  const instanceId = 'shattering-asset-for-cost';
  state.cardInstances[instanceId] = { instanceId, owner: 'A', cardId };
  state.players.A.zones.assetBank.push(instanceId);
  return instanceId;
}

function toDenouement(): V070GameState {
  let state = ready();
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'hold',
  });
  expect(state.turnState?.phase).toBe('denouement');
  return state;
}

function activeBattle(spiritWalker = false): V070GameState {
  let state = ready(spiritWalker);
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(x => { x.occupant = null; x.blank = true; });
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

function simulateRiteFromPriorTurn(state: V070GameState, value = 2): void {
  const rite = state.players.A.mystics!.rites.shattering;
  rite.status = 'begun';
  rite.begunTurn = state.turnNumber - 1;
  rite.shatteringAssetValue = value;
  rite.shatteringDiceBattleReached = false;
}

function revealNoCards(state: V070GameState): V070GameState {
  const a = state.battle!.attacker;
  const b = state.battle!.defender;
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: a });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: a });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: b });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: a });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: a });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: b });
  return reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: a });
}

describe('Rite of Shattering gameplay against current canonical wording', () => {
  test('beginning sacrifices a banked Asset, remembers its value, and does not complete instantly', () => {
    let state = toDenouement();
    const asset = bankAsset(state);
    const currentTurn = state.turnNumber;
    state = reduceV070TurnAction(state, {
      type: 'mystics_begin_rite',
      playerId: 'A',
      riteId: 'shattering',
      shatteringAssetInstanceId: asset,
    });
    const rite = state.players.A.mystics!.rites.shattering;
    expect(rite).toEqual(expect.objectContaining({
      status: 'begun',
      begunTurn: currentTurn,
      shatteringAssetValue: 2,
      shatteringDiceBattleReached: false,
    }));
    expect(state.players.A.zones.assetBank).not.toContain(asset);
    expect(state.players.A.zones.graveyard).toContain(asset);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'mystic_shattering_asset_sacrificed',
      payload: expect.objectContaining({ assetInstanceId: asset, assetValue: 2 }),
    }));
  });

  test('missing/nonbanked cost is rejected before spending the Action', () => {
    const state = toDenouement();
    const remaining = state.turnState?.actionsAvailable;
    expect(() => reduceV070TurnAction(state, {
      type: 'mystics_begin_rite', playerId: 'A', riteId: 'shattering',
      shatteringAssetInstanceId: 'missing',
    })).toThrow(/one banked Asset/);
    expect(state.turnState?.actionsAvailable).toBe(remaining);
    expect(state.players.A.mystics!.rites.shattering.status).toBe('incomplete');
  });

  test('does not award Advantage in a battle during the same turn it was begun', () => {
    let state = activeBattle();
    simulateRiteFromPriorTurn(state);
    state.players.A.mystics!.rites.shattering.begunTurn = state.turnNumber;
    state = revealNoCards(state);
    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(state.battleRuntime!.participants.A.advantage).toBe(0);
    expect(requiredV070BattleDice(state.battleRuntime!, 'A')).toBe(1);
    expect(state.players.A.mystics!.rites.shattering.shatteringDiceBattleReached)
      .toBe(false);
  });

  test('first later-turn battle that reaches dice gets Asset-value Advantage exactly once', () => {
    let state = activeBattle();
    simulateRiteFromPriorTurn(state);
    state = revealNoCards(state);
    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(state.battleRuntime!.participants.A.advantage).toBe(2);
    expect(requiredV070BattleDice(state.battleRuntime!, 'A')).toBe(3);
    expect(state.players.A.mystics!.rites.shattering.shatteringDiceBattleReached)
      .toBe(true);
    applyV070MysticShatteringAtDiceEntry(state);
    expect(state.battleRuntime!.participants.A.advantage).toBe(2);
    expect(state.events.filter(e =>
      e.type === 'mystic_shattering_advantage_applied')).toHaveLength(1);
  });

  test('winning that dice battle completes Shattering, persists the Rite and unlocks Invocation', () => {
    let state = activeBattle();
    simulateRiteFromPriorTurn(state);
    state = revealNoCards(state);
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'A', values: [6, 2, 1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'B', values: [1],
    });
    expect(state.battle?.winner).toBe('A');
    expect(state.players.A.mystics!.rites.shattering.status).toBe('completed');
    expect(state.events.some(event =>
      event.type === 'mystic_rite_completed'
      && (event.payload as { rite?: string })?.rite === 'shattering')).toBe(true);
  });

  test('losing that dice battle gives an extra shared Retreat and resets Shattering', () => {
    let state = activeBattle();
    simulateRiteFromPriorTurn(state);
    state = revealNoCards(state);
    const before = state.battle!.contestedPosition;
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'A', values: [1, 1, 1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'B', values: [6],
    });
    const first = retreatV070Position('A', before, state.battle!.territoryCount);
    const second = retreatV070Position('A', first, state.battle!.territoryCount);
    expect(state.battle?.loser).toBe('A');
    expect(state.battle!.positions.A).toBe(second);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_retreat_step',
      payload: expect.objectContaining({
        sourceKind: 'rite',
        sourceLabel: 'Rite of Shattering Retreat +1',
      }),
    }));
    expect(state.players.A.mystics!.rites.shattering.status).toBe('incomplete');
    expect(state.players.A.mystics!.rites.shattering.shatteringAssetValue)
      .toBeUndefined();
  });
  test('Guardians protects a Shattering loss and rearms its next qualifying dice battle', () => {
    let state = activeBattle(true);
    simulateRiteFromPriorTurn(state, 2);
    const protectionCardId = currentCanonicalContent.content.cards.find(card =>
      card.trait === 'Arcane' && card.cost >= 1
    )?.id;
    if (!protectionCardId) throw new Error('Current authority needs a qualifying Arcane card.');
    const guardianCost = 'guardians-shattering-protection';
    state.cardInstances[guardianCost] = {
      instanceId: guardianCost,
      owner: 'A',
      cardId: protectionCardId,
    };
    state.players.A.zones.hand.push(guardianCost);

    state = revealNoCards(state);
    expect(state.battleRuntime!.participants.A.advantage).toBe(2);
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'A', values: [1, 1, 1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'B', values: [6],
    });
    expect(state.battle?.loser).toBe('A');
    expect(state.battleRuntime?.guardiansWindowOpen).toBe(true);
    // The loss's additional Retreat is still applied, even if its
    // interruption is subsequently prevented by Guardians.
    expect(state.events.some(event =>
      event.type === 'mystic_shattering_loss_retreat'
    )).toBe(true);
    expect(state.players.A.mystics!.rites.shattering.shatteringDiceBattleReached)
      .toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'use_guardians_of_the_circle',
      playerId: 'A', cardInstanceId: guardianCost,
    });
    const protectedRite = state.players.A.mystics!.rites.shattering;
    expect(protectedRite.status).toBe('begun');
    expect(protectedRite.shatteringDiceBattleReached).toBe(false);
    expect(protectedRite.shatteringAssetValue).toBe(2);
    expect(protectedRite.begunTurn).toBe(state.turnNumber - 1);
    expect(state.players.A.zones.graveyard).toContain(guardianCost);
    expect(state.players.A.mystics!.guardiansUsedTurn).toBe(state.turnNumber);
    expect(state.events.filter(event =>
      event.type === 'mystic_shattering_retry_armed')).toHaveLength(1);
    expect(state.events.filter(event =>
      event.type === 'mystic_rite_interrupted'
      && (event.payload as { rite?: string }).rite === 'shattering'
    )).toHaveLength(0);
    // Re-running dice-entry on the same (already resolved) battle does
    // not grant Advantage a second time.
    applyV070MysticShatteringAtDiceEntry(state);
    expect(state.events.filter(event =>
      event.type === 'mystic_shattering_advantage_applied')).toHaveLength(1);

    // Carry the preserved Rite into a fresh qualifying battle. This
    // isolates the next-battle dice lifecycle from turn-advance mechanics.
    let nextBattle = activeBattle(true);
    nextBattle.players.A.mystics = structuredClone(state.players.A.mystics);
    nextBattle = revealNoCards(nextBattle);
    expect(nextBattle.battleRuntime!.participants.A.advantage).toBe(2);
    expect(requiredV070BattleDice(nextBattle.battleRuntime!, 'A')).toBe(3);
    expect(nextBattle.events.filter(event =>
      event.type === 'mystic_shattering_advantage_applied')).toHaveLength(1);
    nextBattle = reduceV070BattleAction(nextBattle, {
      type: 'submit_battle_dice', playerId: 'A', values: [6, 2, 1],
    });
    nextBattle = reduceV070BattleAction(nextBattle, {
      type: 'submit_battle_dice', playerId: 'B', values: [1],
    });
    expect(nextBattle.battle?.winner).toBe('A');
    expect(nextBattle.players.A.mystics!.rites.shattering.status).toBe('completed');
  });

  test('declining Guardians resets Shattering and does not arm a retry', () => {
    let state = activeBattle(true);
    simulateRiteFromPriorTurn(state, 2);
    const protectionCardId = currentCanonicalContent.content.cards.find(card =>
      card.trait === 'Arcane' && card.cost >= 1
    )?.id;
    if (!protectionCardId) throw new Error('Current authority needs a qualifying Arcane card.');
    const guardianCost = 'guardians-decline-shattering';
    state.cardInstances[guardianCost] = {
      instanceId: guardianCost, owner: 'A', cardId: protectionCardId,
    };
    state.players.A.zones.hand.push(guardianCost);
    state = revealNoCards(state);
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'A', values: [1, 1, 1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'B', values: [6],
    });
    expect(state.battleRuntime?.guardiansWindowOpen).toBe(true);
    state = reduceV070BattleAction(state, {
      type: 'pass_guardians_of_the_circle', playerId: 'A',
    });
    expect(state.players.A.mystics!.rites.shattering.status).toBe('incomplete');
    expect(state.players.A.mystics!.rites.shattering.shatteringAssetValue)
      .toBeUndefined();
    expect(state.events.filter(event =>
      event.type === 'mystic_shattering_retry_armed')).toHaveLength(0);
  });

});
