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
import {
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import {
  V070_HOLD_THE_LINE_BATTLE_TEXT,
  V070_HOLD_THE_LINE_ID,
} from './hold-the-line-battle';
import {
  V070_PATHS_OF_SHADOW_ID,
} from './paths-of-shadow-battle';
import {
  pendingV070BattleRevealEffectOrderChoice,
} from './battle-reveal-order';
import {
  v070PlayerRetreatedInBattle,
} from './retreat-step';

function startBattle(
  contestedController: 'A' | 'B' = 'B',
): V070GameState {
  let state = createV070StarterGame({
    gameId: `hold-the-line-${contestedController}`,
    seed: `hold-the-line-${contestedController}-seed`,
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
    space.controller = space.position <= 2 ? 'A' : 'B';
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = contestedController;

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
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });

  expect(state.battle?.attacker).toBe('A');
  expect(state.battle?.defender).toBe('B');
  return state;
}

function injectHand(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `hold-line-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function putOnTopOfDrawPile(
  state: V070GameState,
  owner: 'A' | 'B',
  cards: readonly { cardId: string; suffix: string }[],
): string[] {
  const instanceIds = cards.map(({ cardId, suffix }) => {
    const instanceId = `hold-line-draw-${owner}-${suffix}`;
    state.cardInstances[instanceId] = {
      instanceId,
      cardId,
      owner,
    };
    return instanceId;
  });
  state.players[owner].zones.drawPile.unshift(...instanceIds);
  return instanceIds;
}

function setAndRevealGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
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

function resolveBattle(
  state: V070GameState,
  winner: 'A' | 'B',
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [winner === 'A' ? 6 : 1],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [winner === 'B' ? 6 : 1],
  });
}

function completeAftermath(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath',
    playerId: 'A',
  });
}

function makeHoldTactic(
  state: V070GameState,
): string {
  const source =
    state.battleRuntime!.participants.B.reserve[0]!;
  state.cardInstances[source].cardId = V070_HOLD_THE_LINE_ID;
  return source;
}

describe('Hold the Line battle effect', () => {
  test('binds exact unchanged frozen/current authority and registers the surface', () => {
    expect(V070_HOLD_THE_LINE_BATTLE_TEXT).toBe(
      'If you are defending a Territory you control, after Tactics are revealed, +2 Reserve; +1 Tactic from those cards. If you lose, after you retreat, the attacker captures that Territory. In the Aftermath, put this card in your Graveyard.',
    );
    for (const content of [
      v070CanonicalContent,
      currentCanonicalContent,
    ]) {
      expect(content.cardsById.get(V070_HOLD_THE_LINE_ID)
        ?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(V070_HOLD_THE_LINE_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(
      V070_HOLD_THE_LINE_ID,
    )?.expectedText).toBe(V070_HOLD_THE_LINE_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_HOLD_THE_LINE_ID);
  });

  test('a Gambit waits until after Tactics reveal before adding its Reserve', () => {
    let state = startBattle('B');
    const source = injectHand(
      state,
      'B',
      V070_HOLD_THE_LINE_ID,
      'deferred-gambit',
    );
    const [first, second] = putOnTopOfDrawPile(
      state,
      'B',
      [
        { cardId: 'diplomats-clemency', suffix: 'gambit-first' },
        { cardId: 'diplomats-clemency', suffix: 'gambit-second' },
      ],
    );

    state = setAndRevealGambits(state, undefined, source);

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(
      state.battleRuntime?.deferredHoldTheLineGambitCommitments,
    ).toEqual([
      expect.objectContaining({
        instanceId: source,
        owner: 'B',
        role: 'gambit',
      }),
    ]);
    expect(state.battleRuntime?.participants.B.reserve)
      .not.toContain(first);
    expect(state.battleRuntime?.participants.B.reserve)
      .not.toContain(second);

    state = chooseAndRevealTactics(state);

    expect(
      state.battleRuntime?.deferredHoldTheLineGambitCommitments,
    ).toEqual([]);
    expect(state.battleRuntime?.participants.B.reserve)
      .toEqual(expect.arrayContaining([first, second]));
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
  });

  test('does nothing when the defender does not control the contested Territory and the Tactic cleans up normally', () => {
    let state = setAndRevealGambits(startBattle('A'));
    const source = makeHoldTactic(state);
    const drawBefore = [...state.players.B.zones.drawPile];

    state = chooseAndRevealTactics(state, undefined, source);

    expect(state.players.B.zones.drawPile).toEqual(drawBefore);
    expect(state.battleRuntime?.battleCardAftermathCaptures)
      .not.toContainEqual(expect.objectContaining({
        sourceInstanceId: source,
      }));
    expect(state.battleRuntime?.battleCardAftermathDestinationOverrides)
      .not.toContainEqual(expect.objectContaining({
        instanceId: source,
        destination: 'graveyard',
      }));
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_card_condition_not_met',
      actor: 'B',
      payload: expect.objectContaining({
        sourceInstanceId: source,
        sourceCardId: V070_HOLD_THE_LINE_ID,
      }),
    }));

    state = resolveBattle(state, 'A');
    state = completeAftermath(state);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.B.zones.graveyard).not.toContain(source);
  });

  test('draws exactly two Reserve cards and limits the extra Tactic to eligible cards among those draws', () => {
    let state = setAndRevealGambits(startBattle('B'));
    const source = makeHoldTactic(state);
    const preexisting =
      state.battleRuntime!.participants.B.reserve[1]!;
    state.cardInstances[preexisting].cardId = 'neutral-rallying-cry';
    const reserveBefore = [
      ...state.battleRuntime!.participants.B.reserve,
    ];
    const [eligibleDrawn, ineligibleDrawn] = putOnTopOfDrawPile(
      state,
      'B',
      [
        { cardId: 'neutral-rallying-cry', suffix: 'eligible' },
        { cardId: 'diplomats-clemency', suffix: 'ineligible' },
      ],
    );

    state = chooseAndRevealTactics(state, undefined, source);

    const reserve =
      state.battleRuntime!.participants.B.reserve;
    expect(reserve).toContain(eligibleDrawn);
    expect(reserve).toContain(ineligibleDrawn);
    expect(reserve.length).toBe(reserveBefore.length - 1 + 2);

    const pending = pendingV070BattleRevealChoice(state);
    expect(pending).toEqual(expect.objectContaining({
      kind: 'late_additional_tactic',
      owner: 'B',
      sourceInstanceId: source,
      sourceCardId: V070_HOLD_THE_LINE_ID,
      candidateInstanceIds: [eligibleDrawn],
    }));
    expect(
      (pending as { candidateInstanceIds: string[] }).candidateInstanceIds,
    ).not.toContain(preexisting);
    expect(
      (pending as { candidateInstanceIds: string[] }).candidateInstanceIds,
    ).not.toContain(ineligibleDrawn);

    state = reduceV070BattleAction(state, {
      type: 'resolve_late_additional_tactic',
      playerId: 'B',
      cardInstanceId: eligibleDrawn,
    });

    expect(state.battleRuntime?.participants.B.additionalTactics)
      .toContainEqual(expect.objectContaining({
        instanceId: eligibleDrawn,
        owner: 'B',
        role: 'tactic',
        faceUp: true,
      }));
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);

    state = resolveBattle(state, 'A');
    state = completeAftermath(state);

    expect(state.players.B.zones.graveyard).toContain(source);
    expect(state.players.B.zones.discardPile).toContain(eligibleDrawn);
    expect(state.board[3].controller).toBe('A');
  });

  test('a defending win suppresses the capture while the active Hold the Line still goes to the Graveyard', () => {
    let state = setAndRevealGambits(startBattle('B'));
    const source = makeHoldTactic(state);
    putOnTopOfDrawPile(
      state,
      'B',
      [
        { cardId: 'diplomats-clemency', suffix: 'win-first' },
        { cardId: 'diplomats-clemency', suffix: 'win-second' },
      ],
    );
    state = chooseAndRevealTactics(state, undefined, source);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();

    state = resolveBattle(state, 'B');
    state = completeAftermath(state);

    expect(state.board[3].controller).toBe('B');
    expect(state.players.B.zones.graveyard).toContain(source);
    expect(state.events.some(event =>
      event.type === 'battle_card_aftermath_capture_resolved'
      && (event.payload as { sourceInstanceId?: string } | undefined)
        ?.sourceInstanceId === source
    )).toBe(false);
  });

  test('a loss after a real Retreat makes the attacker capture the contested Territory if it is the next Front Line target', () => {
    let state = setAndRevealGambits(startBattle('B'));
    const source = makeHoldTactic(state);
    putOnTopOfDrawPile(
      state,
      'B',
      [
        { cardId: 'diplomats-clemency', suffix: 'loss-first' },
        { cardId: 'diplomats-clemency', suffix: 'loss-second' },
      ],
    );
    state = chooseAndRevealTactics(state, undefined, source);
    state = resolveBattle(state, 'A');

    expect(v070PlayerRetreatedInBattle(state, 'B')).toBe(true);
    expect(state.board[3].controller).toBe('B');

    state = completeAftermath(state);

    expect(state.board[3].controller).toBe('A');
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_card_aftermath_capture_resolved',
      actor: 'B',
      payload: expect.objectContaining({
        sourceInstanceId: source,
        sourceCardId: V070_HOLD_THE_LINE_ID,
        capturePlayer: 'A',
        captured: true,
      }),
    }));
  });

  test('Paths of Shadow replacement movement is not a Retreat and therefore does not trigger the capture', () => {
    let state = startBattle('B');
    const paths = injectHand(
      state,
      'B',
      V070_PATHS_OF_SHADOW_ID,
      'paths-gambit',
    );
    putOnTopOfDrawPile(
      state,
      'B',
      [
        { cardId: 'diplomats-clemency', suffix: 'paths-first' },
        { cardId: 'diplomats-clemency', suffix: 'paths-second' },
      ],
    );
    state = setAndRevealGambits(state, undefined, paths);
    const source = makeHoldTactic(state);
    state = chooseAndRevealTactics(state, undefined, source);

    const order = pendingV070BattleRevealEffectOrderChoice(state);
    if (order) {
      expect(order.playerId).toBe('B');
      expect(order.candidateInstanceIds)
        .toEqual(expect.arrayContaining([paths, source]));
      state = reduceV070BattleAction(state, {
        type: 'resolve_battle_reveal_effect_order',
        playerId: 'B',
        sourceInstanceId: source,
      });
    }

    expect(pendingV070BattleRevealChoice(state)).toBeNull();

    state = resolveBattle(state, 'A');
    expect(
      state.battleRuntime?.pendingPathsOfShadowBattleChoice,
    ).toEqual(expect.objectContaining({
      playerId: 'B',
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_paths_of_shadow_battle',
      playerId: 'B',
      territoryPosition: 5,
    });

    expect(v070PlayerRetreatedInBattle(state, 'B')).toBe(false);
    state = completeAftermath(state);

    expect(state.board[3].controller).toBe('B');
    expect(state.players.B.position).toBe(5);
    expect(state.events.some(event =>
      event.type === 'battle_card_aftermath_capture_resolved'
      && (event.payload as { sourceInstanceId?: string } | undefined)
        ?.sourceInstanceId === source
    )).toBe(false);
  });

  test('does not create isolated control when the contested Territory is not the attacker\'s next Front Line target', () => {
    let state = setAndRevealGambits(startBattle('B'));
    const source = makeHoldTactic(state);
    putOnTopOfDrawPile(
      state,
      'B',
      [
        { cardId: 'diplomats-clemency', suffix: 'front-first' },
        { cardId: 'diplomats-clemency', suffix: 'front-second' },
      ],
    );
    state = chooseAndRevealTactics(state, undefined, source);

    // Make an earlier Territory uncontrolled by A after the Hold effect has
    // registered, so the contested Territory is no longer A's next legal
    // Front Line target.
    state.board[1].controller = 'B';

    state = resolveBattle(state, 'A');
    expect(v070PlayerRetreatedInBattle(state, 'B')).toBe(true);
    state = completeAftermath(state);

    expect(state.board[3].controller).toBe('B');
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_card_aftermath_capture_resolved',
      actor: 'B',
      payload: expect.objectContaining({
        sourceInstanceId: source,
        capturePlayer: 'A',
        captured: false,
      }),
    }));
  });
});
