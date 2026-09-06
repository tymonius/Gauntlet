import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'property-dues-battle',
    seed: 'property-dues-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'financiers-banker-sound-investment',
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

function ownContestedDeed(state: V070GameState): void {
  const battle = state.battle!;
  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  )!;
  const deed = state.deeds.find(
    candidate => candidate.territoryInstanceId === territory.territoryInstanceId,
  )!;
  deed.owner = 'A';
}

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `property-dues-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function setGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aGambit,
  });
  return reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bGambit,
  });
}

function revealGambits(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function resolveBattleWithAWin(state: V070GameState): V070GameState {
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
    values: [6],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [1],
  });
}

describe('v0.7.0 Property Dues battle effect', () => {
  test('opponent may discard one eligible Hand card', () => {
    let state = startBattle();
    ownContestedDeed(state);
    const dues = injectCard(
      state,
      'A',
      'financiers-property-dues',
      'discard',
    );
    const payment = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'payment',
    );
    state.players.A.zones.hand.push(dues);
    state.players.B.zones.hand = [payment];

    state = revealGambits(setGambits(state, dues));

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'property_dues',
        owner: 'A',
        opponent: 'B',
        sourceInstanceId: dues,
        candidateInstanceIds: [payment],
      }),
    );
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/Property Dues/);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_property_dues_battle',
      playerId: 'A',
      choice: 'discard',
      cardInstanceId: payment,
    })).toThrow(/opponent targeted by Property Dues/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_property_dues_battle',
      playerId: 'B',
      choice: 'discard',
      cardInstanceId: payment,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.B.zones.hand).not.toContain(payment);
    expect(state.players.B.zones.discardPile).toContain(payment);
    expect(state.battleRuntime?.propertyDuesAftermathEffects ?? []).toHaveLength(0);
  });

  test('Capital choice is delayed until the Aftermath', () => {
    let state = startBattle();
    ownContestedDeed(state);
    const dues = injectCard(
      state,
      'A',
      'financiers-property-dues',
      'capital',
    );
    const payment = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'capital-payment',
    );
    state.players.A.zones.hand.push(dues);
    state.players.B.zones.hand = [payment];
    const capitalBefore = state.players.A.financiers!.capital;

    state = revealGambits(setGambits(state, dues));
    state = reduceV070BattleAction(state, {
      type: 'resolve_property_dues_battle',
      playerId: 'B',
      choice: 'capital',
    });

    expect(state.players.A.financiers!.capital).toBe(capitalBefore);
    expect(state.battleRuntime?.propertyDuesAftermathEffects).toEqual([
      expect.objectContaining({
        owner: 'A',
        sourceInstanceId: dues,
        amount: 3,
      }),
    ]);

    state = resolveBattleWithAWin(state);

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.players.A.financiers!.capital).toBe(capitalBefore + 3);
    expect(state.battleRuntime?.propertyDuesAftermathEffects).toEqual([]);
  });

  test('empty opposing Hand schedules +3 Capital without opening a choice', () => {
    let state = startBattle();
    ownContestedDeed(state);
    const dues = injectCard(
      state,
      'A',
      'financiers-property-dues',
      'empty-hand',
    );
    state.players.A.zones.hand.push(dues);
    state.players.B.zones.hand = [];
    const capitalBefore = state.players.A.financiers!.capital;

    state = revealGambits(setGambits(state, dues));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.A.financiers!.capital).toBe(capitalBefore);
    expect(state.battleRuntime?.propertyDuesAftermathEffects).toHaveLength(1);

    state = resolveBattleWithAWin(state);
    expect(state.players.A.financiers!.capital).toBe(capitalBefore + 3);
  });

  test('does nothing when the owner does not own the contested Territory Deed', () => {
    let state = startBattle();
    const dues = injectCard(
      state,
      'A',
      'financiers-property-dues',
      'no-deed',
    );
    const payment = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'no-deed-payment',
    );
    state.players.A.zones.hand.push(dues);
    state.players.B.zones.hand = [payment];

    state = revealGambits(setGambits(state, dues));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.propertyDuesAftermathEffects ?? []).toHaveLength(0);
    expect(state.events.some(event =>
      event.type === 'property_dues_battle_condition_not_met'
    )).toBe(true);
  });

  test('a card added after Property Dues took effect cannot satisfy its discard choice', () => {
    let state = startBattle();
    ownContestedDeed(state);
    const dues = injectCard(
      state,
      'A',
      'financiers-property-dues',
      'snapshot',
    );
    const original = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'snapshot-original',
    );
    const later = injectCard(
      state,
      'B',
      'neutral-stand-ground',
      'snapshot-later',
    );
    state.players.A.zones.hand.push(dues);
    state.players.B.zones.hand = [original];

    state = revealGambits(setGambits(state, dues));
    state.players.B.zones.hand.push(later);

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_property_dues_battle',
      playerId: 'B',
      choice: 'discard',
      cardInstanceId: later,
    })).toThrow(/eligible when its battle effect took effect/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_property_dues_battle',
      playerId: 'B',
      choice: 'discard',
      cardInstanceId: original,
    });
    expect(state.players.B.zones.hand).toContain(later);
    expect(state.players.B.zones.discardPile).toContain(original);
  });
});
