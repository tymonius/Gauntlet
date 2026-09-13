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
  V070_REND_THE_VEIL_BATTLE_TEXT,
  V070_REND_THE_VEIL_ID,
} from './rend-the-veil-battle';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';
import { settleV070DeferredBattleAftermathDestinations } from './battle-aftermath-deferred';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'rend-the-veil-battle',
    seed: 'rend-the-veil-battle-seed',
    players: {
      A: {
        name: 'Mystics',
        starterDeckId: 'mystics-spirit-walker-ancestral-path',
      },
      B: { name: 'Military', starterDeckId: 'military-commandant-holdfast' },
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
  const instanceId = `rend-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function putInGraveyard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = inject(state, owner, cardId, suffix);
  state.players[owner].zones.graveyard.push(instanceId);
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

function revealNoTactics(state: V070GameState): V070GameState {
  while ((state.battleRuntime?.participants.A.tacticChoicesMade ?? 0)
    < (state.battleRuntime?.participants.A.tacticLimit ?? 0)) {
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A',
    });
  }
  while ((state.battleRuntime?.participants.B.tacticChoicesMade ?? 0)
    < (state.battleRuntime?.participants.B.tacticLimit ?? 0)) {
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B',
    });
  }
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics', playerId: 'A',
  });
}

describe('v0.7.0 Rend the Veil battle integration', () => {
  test('binds exact released authority and registers the battle surface', () => {
    expect(V070_REND_THE_VEIL_BATTLE_TEXT).toBe(
      'After Tactics are revealed, you may apply the Tactic effect of one card in your Graveyard that can apply now. In the Aftermath, move that card from your Graveyard to your Discard Pile.',
    );
    expect(v070CanonicalContent.cardsById.get(V070_REND_THE_VEIL_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_REND_THE_VEIL_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_REND_THE_VEIL_ID)?.expectedText)
      .toBe(V070_REND_THE_VEIL_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_REND_THE_VEIL_ID);
  });

  test('a Gambit waits until Tactics are revealed even when both players pass Tactics', () => {
    let state = startBattle();
    const rend = inject(state, 'A', V070_REND_THE_VEIL_ID, 'deferred');
    const target = putInGraveyard(state, 'A', 'neutral-new-recruits', 'deferred-target');

    state = setAndRevealGambits(state, rend);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();

    state = revealNoTactics(state);
    expect(pendingV070BattleRevealChoice(state)).toEqual(expect.objectContaining({
      kind: 'rend_the_veil',
      owner: 'A',
      candidates: [{ sourceInstanceId: target, effectLabel: 'Gambit/Tactic' }],
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_rend_the_veil_battle', playerId: 'A', use: false,
    });
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
    expect(state.players.A.zones.graveyard).toContain(target);
  });

  test('copies the chosen Tactic effect now and moves that exact physical card in the Aftermath', () => {
    let state = startBattle();
    const rend = inject(state, 'A', V070_REND_THE_VEIL_ID, 'apply');
    const target = putInGraveyard(state, 'A', 'neutral-new-recruits', 'apply-target');

    state = revealNoTactics(setAndRevealGambits(state, rend));
    state = reduceV070BattleAction(state, {
      type: 'resolve_rend_the_veil_battle',
      playerId: 'A',
      use: true,
      targetInstanceId: target,
      targetEffectLabel: 'Gambit/Tactic',
    });

    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.players.A.zones.graveyard).toContain(target);
    expect(state.deferredBattleAftermathDestinationEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceInstanceId: rend,
          sourceCardId: V070_REND_THE_VEIL_ID,
          targetPlayer: 'A',
          targetInstanceIds: [target],
          destination: 'discard',
          condition: 'always',
        }),
      ]),
    );

    const beforeOutcome = structuredClone(state) as V070GameState;
    state.battle!.winner = 'A';
    state.battle!.loser = 'B';
    settleV070DeferredBattleAftermathDestinations(beforeOutcome, state);

    expect(state.players.A.zones.graveyard).not.toContain(target);
    expect(state.players.A.zones.discardPile).toContain(target);
  });

  test('revalidates the selected physical Graveyard card before applying it', () => {
    let state = startBattle();
    const rend = inject(state, 'A', V070_REND_THE_VEIL_ID, 'stale');
    const target = putInGraveyard(state, 'A', 'neutral-new-recruits', 'stale-target');

    state = revealNoTactics(setAndRevealGambits(state, rend));
    state.players.A.zones.graveyard = state.players.A.zones.graveyard
      .filter(instanceId => instanceId !== target);

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_rend_the_veil_battle',
      playerId: 'A',
      use: true,
      targetInstanceId: target,
      targetEffectLabel: 'Gambit/Tactic',
    })).toThrow(/no longer apply/i);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
  });

  test('only offers effects from the controller own Graveyard', () => {
    let state = startBattle();
    const rend = inject(state, 'A', V070_REND_THE_VEIL_ID, 'ownership');
    const own = putInGraveyard(state, 'A', 'neutral-new-recruits', 'own');
    const opponent = putInGraveyard(state, 'B', 'neutral-new-recruits', 'opponent');

    state = revealNoTactics(setAndRevealGambits(state, rend));
    const pending = pendingV070BattleRevealChoice(state);
    expect(pending).toEqual(expect.objectContaining({
      kind: 'rend_the_veil',
      candidates: [{ sourceInstanceId: own, effectLabel: 'Gambit/Tactic' }],
    }));
    expect(JSON.stringify(pending)).not.toContain(opponent);
  });
});
