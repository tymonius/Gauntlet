import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { pendingV070DivineMercyBattleChoice } from './divine-mercy-battle';

function activeBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'divine-mercy-battle',
    seed: 'divine-mercy-battle-seed',
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
  const instanceId = `divine-mercy-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function putInHand(
  state: V070GameState,
  owner: 'A' | 'B',
  instanceId: string,
): void {
  state.players[owner].zones.hand.push(instanceId);
}

function putInGraveyard(
  state: V070GameState,
  owner: 'A' | 'B',
  instanceId: string,
): void {
  state.players[owner].zones.graveyard.push(instanceId);
}

describe('v0.7.0 Divine Mercy battle effect', () => {
  test('Gambit reveal adds +2 and pauses for the opposing Graveyard recycle', () => {
    let state = activeBattle();
    const mercy = injectCard(
      state,
      'A',
      'inquisition-divine-mercy',
      'gambit',
    );
    const target = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'target',
    );
    putInHand(state, 'A', mercy);
    putInGraveyard(state, 'B', target);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: mercy,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
    expect(pendingV070DivineMercyBattleChoice(state)).toEqual(
      expect.objectContaining({
        owner: 'A',
        opponent: 'B',
        sourceInstanceId: mercy,
      }),
    );
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/Divine Mercy/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_divine_mercy_battle',
      playerId: 'A',
      targetInstanceId: target,
    });

    expect(state.players.B.zones.graveyard).not.toContain(target);
    expect(state.players.B.zones.discardPile).toContain(target);
    expect(pendingV070DivineMercyBattleChoice(state)).toBeNull();
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
  });

  test('still grants +2 when the opponent has no Graveyard card to move', () => {
    let state = activeBattle();
    const mercy = injectCard(
      state,
      'A',
      'inquisition-divine-mercy',
      'empty-graveyard',
    );
    putInHand(state, 'A', mercy);
    state.players.B.zones.graveyard = [];

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: mercy,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
    expect(pendingV070DivineMercyBattleChoice(state)).toBeNull();
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.events.some(event =>
      event.type === 'divine_mercy_battle_recycle_unavailable'
    )).toBe(true);
  });

  test('works as a Tactic and resolves before battle dice may be submitted', () => {
    let state = activeBattle();
    const target = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'tactic-target',
    );
    putInGraveyard(state, 'B', target);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    const mercy = injectCard(
      state,
      'A',
      'inquisition-divine-mercy',
      'tactic',
    );
    state.battleRuntime!.participants.A.reserve.push(mercy);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: mercy,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
    expect(() => reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    })).toThrow(/Divine Mercy/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_divine_mercy_battle',
      playerId: 'A',
      targetInstanceId: target,
    });
    expect(pendingV070DivineMercyBattleChoice(state)).toBeNull();
  });

  test('multiple Divine Mercy effects preserve attacker-first shared timing', () => {
    let state = activeBattle();
    const aMercy = injectCard(
      state,
      'A',
      'inquisition-divine-mercy',
      'a',
    );
    const bMercy = injectCard(
      state,
      'B',
      'inquisition-divine-mercy',
      'b',
    );
    const aTarget = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'a-target',
    );
    const bTarget = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'b-target',
    );
    putInHand(state, 'A', aMercy);
    putInHand(state, 'B', bMercy);
    putInGraveyard(state, 'A', aTarget);
    putInGraveyard(state, 'B', bTarget);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: aMercy,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: bMercy,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(pendingV070DivineMercyBattleChoice(state)?.owner).toBe('A');
    state = reduceV070BattleAction(state, {
      type: 'resolve_divine_mercy_battle',
      playerId: 'A',
      targetInstanceId: bTarget,
    });
    expect(pendingV070DivineMercyBattleChoice(state)?.owner).toBe('B');
    state = reduceV070BattleAction(state, {
      type: 'resolve_divine_mercy_battle',
      playerId: 'B',
      targetInstanceId: aTarget,
    });

    expect(pendingV070DivineMercyBattleChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(2);
  });
});
