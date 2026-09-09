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
  V070_BROTHERS_IN_ARMS_BATTLE_TEXT,
  V070_BROTHERS_IN_ARMS_ID,
  pendingV070BrothersInArmsAdditionalTactic,
} from './brothers-in-arms-battle';
import { V070_DEEP_COVER_ID } from './deep-cover-battle';
import { pendingV070BattleRevealEffectOrderChoice } from './battle-reveal-order';
import { viewV070GameForPlayer } from './views';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'brothers-in-arms-test',
    seed: 'brothers-in-arms-seed',
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
  const instanceId = `brothers-in-arms-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function prepareTacticChoice(aGambitCardId?: string): V070GameState {
  let state = startBattle();
  let aGambit: string | undefined;
  if (aGambitCardId) {
    aGambit = injectCard(state, 'A', aGambitCardId, 'gambit');
    state.players.A.zones.hand.push(aGambit);
  }

  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aGambit,
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

  // Starter-Hand contents are not part of these card-specific fixtures.
  // Isolate each case so it injects exactly the Hand Tactics it exercises.
  state.players.A.zones.removed.push(...state.players.A.zones.hand);
  state.players.A.zones.hand = [];
  return state;
}

function addBrothersToReserve(state: V070GameState, suffix: string): string {
  const source = injectCard(state, 'A', V070_BROTHERS_IN_ARMS_ID, suffix);
  state.battleRuntime?.participants.A.reserve.push(source);
  return source;
}

function addHandTactic(
  state: V070GameState,
  cardId: string,
  suffix: string,
): string {
  const card = injectCard(state, 'A', cardId, suffix);
  state.players.A.zones.hand.push(card);
  return card;
}

function chooseBrothersWithDeepCover(): {
  state: V070GameState;
  source: string;
  candidate: string;
} {
  let state = prepareTacticChoice();
  const source = addBrothersToReserve(state, 'source');
  const candidate = addHandTactic(state, V070_DEEP_COVER_ID, 'candidate');
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: source,
  });
  return { state, source, candidate };
}

function resolveTacticRevealOrder(state: V070GameState): V070GameState {
  let next = state;
  while (true) {
    const pending = pendingV070BattleRevealEffectOrderChoice(next);
    if (!pending) return next;
    next = reduceV070BattleAction(next, {
      type: 'resolve_battle_reveal_effect_order',
      playerId: pending.playerId,
      sourceInstanceId: pending.candidateInstanceIds[0],
    });
  }
}

describe('v0.7.0 Brothers in Arms battle effect', () => {
  test('binds to released authority and advertises the Tactic effect as supported', () => {
    const card = v070CanonicalContent.cardsById.get(V070_BROTHERS_IN_ARMS_ID);
    expect(card?.effects.find(effect => effect.label === 'Tactic')?.text)
      .toBe(V070_BROTHERS_IN_ARMS_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_BROTHERS_IN_ARMS_ID)?.expectedText)
      .toBe(V070_BROTHERS_IN_ARMS_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_BROTHERS_IN_ARMS_ID);
  });

  test('choosing Brothers with no Gambit opens an optional private Hand-Tactic choice', () => {
    const { state, source, candidate } = chooseBrothersWithDeepCover();

    expect(pendingV070BrothersInArmsAdditionalTactic(state)).toEqual({
      playerId: 'A',
      sourceInstanceId: source,
      candidateInstanceIds: [candidate],
    });
    expect(viewV070GameForPlayer(state, 'A')
      .pendingBrothersInArmsAdditionalTactic).toEqual({
        playerId: 'A',
        sourceInstanceId: source,
        candidateCount: 1,
        optional: true,
        candidateInstanceIds: [candidate],
      });
    expect(viewV070GameForPlayer(state, 'B')
      .pendingBrothersInArmsAdditionalTactic).toEqual({
        playerId: 'A',
        sourceInstanceId: source,
        candidateCount: 1,
        optional: true,
      });
  });

  test('the additional Tactic permission may be declined', () => {
    let { state, candidate } = chooseBrothersWithDeepCover();
    state = reduceV070BattleAction(state, {
      type: 'resolve_brothers_in_arms_additional_tactic',
      playerId: 'A',
    });

    expect(pendingV070BrothersInArmsAdditionalTactic(state)).toBeNull();
    expect(state.players.A.zones.hand).toContain(candidate);
    expect(state.battleRuntime?.participants.A.additionalTactics).toEqual([]);
  });

  test('setting any Gambit makes the additional-Tactic clause inapplicable', () => {
    let state = prepareTacticChoice(V070_DEEP_COVER_ID);
    const source = addBrothersToReserve(state, 'gambit-source');
    addHandTactic(state, V070_DEEP_COVER_ID, 'gambit-candidate');

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(pendingV070BrothersInArmsAdditionalTactic(state)).toBeNull();
    expect(state.events.some(event =>
      event.type === 'brothers_in_arms_additional_tactic_inapplicable'
    )).toBe(true);
  });

  test('a chosen Hand Tactic joins the battle face down with a Graveyard override', () => {
    let { state, candidate } = chooseBrothersWithDeepCover();
    state = reduceV070BattleAction(state, {
      type: 'resolve_brothers_in_arms_additional_tactic',
      playerId: 'A',
      cardInstanceId: candidate,
    });

    expect(state.players.A.zones.hand).not.toContain(candidate);
    expect(state.battleRuntime?.participants.A.additionalTactics).toEqual([
      {
        instanceId: candidate,
        owner: 'A',
        role: 'tactic',
        faceUp: false,
      },
    ]);
    expect(state.battleRuntime?.battleCardAftermathDestinationOverrides)
      .toContainEqual({
        sourceCardId: V070_BROTHERS_IN_ARMS_ID,
        playerId: 'A',
        instanceId: candidate,
        destination: 'graveyard',
      });
  });

  test('an added Brothers in Arms can chain another optional Hand Tactic', () => {
    let state = prepareTacticChoice();
    const first = addBrothersToReserve(state, 'chain-first');
    const second = addHandTactic(
      state,
      V070_BROTHERS_IN_ARMS_ID,
      'chain-second',
    );
    const finalCandidate = addHandTactic(
      state,
      V070_DEEP_COVER_ID,
      'chain-final',
    );

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: first,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_brothers_in_arms_additional_tactic',
      playerId: 'A',
      cardInstanceId: second,
    });

    expect(pendingV070BrothersInArmsAdditionalTactic(state)).toEqual({
      playerId: 'A',
      sourceInstanceId: second,
      candidateInstanceIds: [finalCandidate],
    });
  });

  test('the added Tactic resolves normally and enters the Graveyard in Aftermath', () => {
    let { state, source, candidate } = chooseBrothersWithDeepCover();
    state = reduceV070BattleAction(state, {
      type: 'resolve_brothers_in_arms_additional_tactic',
      playerId: 'A',
      cardInstanceId: candidate,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = resolveTacticRevealOrder(state);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    expect(state.battleRuntime?.stage).toBe('aftermath');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.graveyard).toContain(candidate);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.players.A.zones.discardPile).not.toContain(candidate);
  });
});
