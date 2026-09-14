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
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';
import {
  V070_RECONNAISSANCE_BATTLE_TEXT,
  V070_RECONNAISSANCE_ID,
} from './reconnaissance-battle';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'reconnaissance-battle',
    seed: 'reconnaissance-battle-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: 'financiers-banker-sound-investment' },
      B: { name: 'Bravo', starterDeckId: 'military-commandant-holdfast' },
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
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
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
    type: 'resolve_capture', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset', playerId: 'A',
  });
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `reconnaissance-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function setAndRevealGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  if (aGambit) state.players.A.zones.hand.push(aGambit);
  if (bGambit) state.players.B.zones.hand.push(bGambit);
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A', cardInstanceId: aGambit,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B', cardInstanceId: bGambit,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });
}

function passTacticsAndReveal(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics', playerId: 'A',
  });
}

describe('v0.7.0 Reconnaissance battle integration', () => {
  test('binds exact released authority and registers the battle surface', () => {
    expect(V070_RECONNAISSANCE_BATTLE_TEXT).toBe(
      'After Tactics are revealed, you may withdraw.',
    );
    expect(v070CanonicalContent.cardsById.get(V070_RECONNAISSANCE_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_RECONNAISSANCE_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_RECONNAISSANCE_ID)?.expectedText)
      .toBe(V070_RECONNAISSANCE_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_RECONNAISSANCE_ID);
  });

  test('Gambit Reconnaissance waits until after Tactics are revealed', () => {
    let state = startBattle();
    const reconnaissance = inject(
      state,
      'A',
      V070_RECONNAISSANCE_ID,
      'deferred-gambit',
    );

    state = setAndRevealGambits(state, reconnaissance);

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.deferredReconnaissanceGambitCommitments)
      .toEqual([
        expect.objectContaining({
          instanceId: reconnaissance,
          owner: 'A',
          role: 'gambit',
        }),
      ]);

    state = passTacticsAndReveal(state);

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'reconnaissance',
        owner: 'A',
        sourceInstanceId: reconnaissance,
      }),
    );
  });

  test('declining Reconnaissance resumes later ordinary reveal effects before dice', () => {
    let state = startBattle();
    const reconnaissance = inject(
      state,
      'A',
      V070_RECONNAISSANCE_ID,
      'decline',
    );
    state = setAndRevealGambits(state, reconnaissance);

    const rallyingCry = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'later-ordinary',
    );
    state.battleRuntime!.participants.B.reserve.push(rallyingCry);
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B', cardInstanceId: rallyingCry,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });

    expect(pendingV070BattleRevealChoice(state)?.kind)
      .toBe('reconnaissance');
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);

    state = reduceV070BattleAction(state, {
      type: 'resolve_reconnaissance_battle',
      playerId: 'A',
      withdraw: false,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battle?.endReason).toBeNull();
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'reconnaissance_battle_withdrawal_declined',
        actor: 'A',
      }),
      expect.objectContaining({
        type: 'battle_card_effect_applied',
        actor: 'B',
        payload: expect.objectContaining({
          instanceId: rallyingCry,
          cardId: 'neutral-rallying-cry',
        }),
      }),
    ]));

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'A', values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice', playerId: 'B', values: [1],
    });
    expect(state.battle?.winner).toBe('A');
  });

  test('accepting Gambit Reconnaissance ends the battle and prevents later reveal effects', () => {
    let state = startBattle();
    const reconnaissance = inject(
      state,
      'A',
      V070_RECONNAISSANCE_ID,
      'withdraw-gambit',
    );
    state = setAndRevealGambits(state, reconnaissance);

    const rallyingCry = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'suppressed-by-withdrawal',
    );
    state.battleRuntime!.participants.B.reserve.push(rallyingCry);
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B', cardInstanceId: rallyingCry,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });

    const before = state.battle!.positions.A;
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);

    state = reduceV070BattleAction(state, {
      type: 'resolve_reconnaissance_battle',
      playerId: 'A',
      withdraw: true,
    });

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battle?.stage).toBe('ended');
    expect(state.battle?.endReason).toBe('withdrawal');
    expect(state.battle?.winner).toBeNull();
    expect(state.battle?.loser).toBeNull();
    expect(state.battle?.positions.A).toBe(before - 1);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'reconnaissance_battle_withdrawal',
        actor: 'A',
        payload: expect.objectContaining({
          sourceInstanceId: reconnaissance,
          playerId: 'A',
        }),
      }),
    ]));

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath', playerId: 'A',
    });
    expect(state.battle).toBeNull();
    expect(state.players.A.zones.graveyard).toContain(reconnaissance);
  });

  test('Tactic Reconnaissance lets its defender controller withdraw', () => {
    let state = setAndRevealGambits(startBattle());
    const reconnaissance = inject(
      state,
      'B',
      V070_RECONNAISSANCE_ID,
      'defender-tactic',
    );
    state.battleRuntime!.participants.B.reserve.push(reconnaissance);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B', cardInstanceId: reconnaissance,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics', playerId: 'A',
    });

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'reconnaissance',
        owner: 'B',
        sourceInstanceId: reconnaissance,
      }),
    );
    const before = state.battle!.positions.B;

    state = reduceV070BattleAction(state, {
      type: 'resolve_reconnaissance_battle',
      playerId: 'B',
      withdraw: true,
    });

    expect(state.battle?.endReason).toBe('withdrawal');
    expect(state.battle?.positions.B).toBe(before + 1);
    expect(state.battleRuntime?.stage).toBe('aftermath');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath', playerId: 'A',
    });
    expect(state.battle).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(reconnaissance);
  });
});
