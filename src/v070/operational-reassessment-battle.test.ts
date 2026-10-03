import { describe, expect, test } from 'vitest';
import { currentCanonicalContent } from '../content/current-game';
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
  V070_OPERATIONAL_REASSESSMENT_BATTLE_TEXT,
  V070_OPERATIONAL_REASSESSMENT_ID,
} from './operational-reassessment-battle';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'operational-reassessment-battle',
    seed: 'operational-reassessment-battle-seed',
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

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone?: 'hand',
): string {
  const instanceId = `operational-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  if (zone === 'hand') {
    state.players[owner].zones.hand.push(instanceId);
  }
  return instanceId;
}

function setAndRevealGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  if (aGambit && !state.players.A.zones.hand.includes(aGambit)) {
    state.players.A.zones.hand.push(aGambit);
  }
  if (bGambit && !state.players.B.zones.hand.includes(bGambit)) {
    state.players.B.zones.hand.push(bGambit);
  }
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aGambit,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bGambit,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function chooseAndRevealTactics(
  state: V070GameState,
  aTactic?: string,
  bTactic?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: aTactic,
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
    cardInstanceId: bTactic,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

function resolveOutcome(
  state: V070GameState,
  a = 6,
  b = 1,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [a],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [b],
  });
}

describe('Operational Reassessment battle effect', () => {
  test('binds exact unchanged frozen/current authority and registers the surface', () => {
    expect(V070_OPERATIONAL_REASSESSMENT_BATTLE_TEXT).toBe(
      'After Tactics are revealed, choose one: withdraw; or replace this card with an eligible card from your Hand, face up. If you replace it, put this card in your Graveyard.',
    );
    for (const content of [
      v070CanonicalContent,
      currentCanonicalContent,
    ]) {
      expect(content.cardsById.get(V070_OPERATIONAL_REASSESSMENT_ID)
        ?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(V070_OPERATIONAL_REASSESSMENT_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(
      V070_OPERATIONAL_REASSESSMENT_ID,
    )?.expectedText).toBe(
      V070_OPERATIONAL_REASSESSMENT_BATTLE_TEXT,
    );
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_OPERATIONAL_REASSESSMENT_ID);
  });

  test('a Gambit waits until after Tactics and excludes a timing-passed Gambit from replacement options', () => {
    let state = startBattle();
    const source = inject(
      state,
      'A',
      V070_OPERATIONAL_REASSESSMENT_ID,
      'deferred-gambit',
    );
    const usable = inject(
      state,
      'A',
      'neutral-new-recruits',
      'usable',
      'hand',
    );
    const tooLate = inject(
      state,
      'A',
      'intelligence-disinformation',
      'too-late',
      'hand',
    );

    state = setAndRevealGambits(state, source);

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(
      state.battleRuntime
        ?.deferredOperationalReassessmentGambitCommitments,
    ).toEqual([
      expect.objectContaining({
        instanceId: source,
        owner: 'A',
        role: 'gambit',
      }),
    ]);

    state = chooseAndRevealTactics(state);

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'operational_reassessment',
        owner: 'A',
        sourceInstanceId: source,
        role: 'gambit',
        candidateInstanceIds: expect.arrayContaining([usable]),
      }),
    );
    const pending = pendingV070BattleRevealChoice(state);
    expect(
      (pending as { candidateInstanceIds: string[] }).candidateInstanceIds,
    ).not.toContain(tooLate);
  });

  test('a Tactic can replace itself from Hand, apply that face-up effect, and leave the replacement on its normal cleanup path', () => {
    let state = setAndRevealGambits(startBattle());
    const source =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[source].cardId =
      V070_OPERATIONAL_REASSESSMENT_ID;
    const replacement = inject(
      state,
      'A',
      'neutral-new-recruits',
      'tactic-replacement',
      'hand',
    );

    state = chooseAndRevealTactics(state, source);
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'operational_reassessment',
        owner: 'A',
        sourceInstanceId: source,
        role: 'tactic',
        candidateInstanceIds: expect.arrayContaining([replacement]),
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_operational_reassessment_battle',
      playerId: 'A',
      choice: 'replace',
      cardInstanceId: replacement,
    });

    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.players.A.zones.hand).not.toContain(replacement);
    expect(state.battleRuntime?.participants.A.tactic).toEqual(
      expect.objectContaining({
        instanceId: replacement,
        role: 'tactic',
        faceUp: true,
      }),
    );
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.stage).toBe('outcome');

    state = resolveOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.discardPile).toContain(replacement);
    expect(state.players.A.zones.graveyard).not.toContain(replacement);
  });

  test('withdrawal ends the reveal procedure before a later ordinary Tactic can apply', () => {
    let state = startBattle();
    const source = inject(
      state,
      'A',
      V070_OPERATIONAL_REASSESSMENT_ID,
      'withdraw',
    );
    state = setAndRevealGambits(state, source);

    const later = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'later-ordinary',
    );
    state.battleRuntime!.participants.B.reserve.push(later);
    state = chooseAndRevealTactics(state, undefined, later);

    expect(pendingV070BattleRevealChoice(state)?.kind)
      .toBe('operational_reassessment');
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);

    const before = state.battle!.positions.A;
    state = reduceV070BattleAction(state, {
      type: 'resolve_operational_reassessment_battle',
      playerId: 'A',
      choice: 'withdraw',
    });

    expect(state.battle?.endReason).toBe('withdrawal');
    expect(state.battle?.winner).toBeNull();
    expect(state.battle?.loser).toBeNull();
    expect(state.battle?.positions.A).toBe(before - 1);
    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.players.A.zones.graveyard).toContain(source);
  });

  test('replacing with another Operational Reassessment opens a fresh mandatory choice', () => {
    let state = setAndRevealGambits(startBattle());
    const first =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[first].cardId =
      V070_OPERATIONAL_REASSESSMENT_ID;
    const second = inject(
      state,
      'A',
      V070_OPERATIONAL_REASSESSMENT_ID,
      'second',
      'hand',
    );
    const final = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'final',
      'hand',
    );

    state = chooseAndRevealTactics(state, first);
    state = reduceV070BattleAction(state, {
      type: 'resolve_operational_reassessment_battle',
      playerId: 'A',
      choice: 'replace',
      cardInstanceId: second,
    });

    expect(state.players.A.zones.graveyard).toContain(first);
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'operational_reassessment',
        owner: 'A',
        sourceInstanceId: second,
        role: 'tactic',
        candidateInstanceIds: expect.arrayContaining([final]),
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_operational_reassessment_battle',
      playerId: 'A',
      choice: 'replace',
      cardInstanceId: final,
    });

    expect(state.players.A.zones.graveyard).toEqual(
      expect.arrayContaining([first, second]),
    );
    expect(state.battleRuntime?.participants.A.tactic).toEqual(
      expect.objectContaining({
        instanceId: final,
        faceUp: true,
      }),
    );
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.stage).toBe('outcome');
  });

  test('revalidates the exact Hand card before replacing the source', () => {
    let state = setAndRevealGambits(startBattle());
    const source =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[source].cardId =
      V070_OPERATIONAL_REASSESSMENT_ID;
    const replacement = inject(
      state,
      'A',
      'neutral-new-recruits',
      'stale',
      'hand',
    );

    state = chooseAndRevealTactics(state, source);
    state.players.A.zones.hand =
      state.players.A.zones.hand.filter(
        instanceId => instanceId !== replacement,
      );

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_operational_reassessment_battle',
      playerId: 'A',
      choice: 'replace',
      cardInstanceId: replacement,
    })).toThrow(/no longer eligible/i);
    expect(state.players.A.zones.graveyard).not.toContain(source);
    expect(state.battleRuntime?.participants.A.tactic?.instanceId)
      .toBe(source);
  });
});
