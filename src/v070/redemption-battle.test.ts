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
  V070_REDEMPTION_BATTLE_TEXT,
  V070_REDEMPTION_ID,
  v070RedemptionTargetInstanceIds,
} from './redemption-battle';
import { negateV070BattleCardEffect } from './battle-effect-status';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'redemption-battle',
    seed: 'redemption-battle-seed',
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
  const instanceId = `redemption-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function reachChooseTacticsWithRedemptionGambit(
  state: V070GameState,
): { state: V070GameState; source: string } {
  const source = injectCard(
    state,
    'A',
    V070_REDEMPTION_ID,
    'gambit-source',
  );
  state.players.A.zones.hand.push(source);
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
  return { state, source };
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

describe('Redemption battle effect', () => {
  test('binds exact unchanged frozen/current authority', () => {
    for (const content of [
      v070CanonicalContent,
      currentCanonicalContent,
    ]) {
      expect(content.cardsById.get(V070_REDEMPTION_ID)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(V070_REDEMPTION_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(V070_REDEMPTION_ID)?.expectedText)
      .toBe(V070_REDEMPTION_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_REDEMPTION_ID);
  });

  test('a Redemption Gambit returns one opposing-effect-negated Tactic to Hand in the Aftermath', () => {
    let { state, source } =
      reachChooseTacticsWithRedemptionGambit(startBattle());

    const target = state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[target].cardId = 'neutral-rallying-cry';
    const negator = injectCard(
      state,
      'B',
      'inquisition-tyranny',
      'gambit-negator',
    );

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: target,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });

    negateV070BattleCardEffect(
      state,
      target,
      negator,
      'inquisition-tyranny',
    );

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('outcome');

    state = resolveOutcome(state);
    expect(state.battleRuntime?.stage).toBe('aftermath');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.hand).toContain(target);
    expect(state.players.A.zones.discardPile).not.toContain(target);
    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.events.some(event =>
      event.type === 'redemption_battle_aftermath_resolved'
      && (event.payload as { targetInstanceId?: string }).targetInstanceId
        === target
    )).toBe(true);
  });

  test('a Tactic Redemption can protect a Tactic negated before Redemption itself normally reveals', () => {
    let state = startBattle();
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

    const source = state.battleRuntime!.participants.A.reserve[0];
    const target = state.battleRuntime!.participants.A.reserve[1];
    state.cardInstances[source].cardId = V070_REDEMPTION_ID;
    state.cardInstances[target].cardId = 'neutral-rallying-cry';

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: source,
    });
    state.battleRuntime!.participants.A.reserve =
      state.battleRuntime!.participants.A.reserve.filter(
        instanceId => instanceId !== target,
      );
    state.battleRuntime!.participants.A.additionalTactics.push({
      instanceId: target,
      owner: 'A',
      role: 'tactic',
      faceUp: false,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });

    const negator = injectCard(
      state,
      'B',
      'inquisition-tyranny',
      'pre-reveal-negator',
    );
    negateV070BattleCardEffect(
      state,
      target,
      negator,
      'inquisition-tyranny',
    );

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('outcome');

    state = resolveOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.hand).toContain(target);
    expect(state.players.A.zones.discardPile).not.toContain(target);
    expect(state.players.A.zones.discardPile).toContain(source);
  });

  test('one Redemption chooses among multiple eligible negated Tactics', () => {
    let { state, source } =
      reachChooseTacticsWithRedemptionGambit(startBattle());
    const first = state.battleRuntime!.participants.A.reserve[0];
    const second = state.battleRuntime!.participants.A.reserve[1];
    state.cardInstances[first].cardId = 'neutral-rallying-cry';
    state.cardInstances[second].cardId = 'neutral-stand-ground';

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: first,
    });
    state.battleRuntime!.participants.A.reserve =
      state.battleRuntime!.participants.A.reserve.filter(
        instanceId => instanceId !== second,
      );
    state.battleRuntime!.participants.A.additionalTactics.push({
      instanceId: second,
      owner: 'A',
      role: 'tactic',
      faceUp: false,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });

    const negator = injectCard(
      state,
      'B',
      'inquisition-tyranny',
      'multi-negator',
    );
    negateV070BattleCardEffect(
      state,
      first,
      negator,
      'inquisition-tyranny',
    );
    negateV070BattleCardEffect(
      state,
      second,
      negator,
      'inquisition-tyranny',
    );

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = resolveOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toEqual(expect.objectContaining({
      playerId: 'A',
      candidateSourceInstanceIds: [source],
    }));

    const options = [...state.events].reverse().find(event =>
      event.type
        === 'battle_aftermath_controlled_effect_choice_options'
    );
    expect(options?.payload).toEqual(expect.objectContaining({
      redemptionTargetOptions: [
        {
          sourceInstanceId: source,
          targetInstanceIds: expect.arrayContaining([first, second]),
        },
      ],
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: source,
      targetInstanceId: second,
    });

    expect(state.players.A.zones.hand).toContain(second);
    expect(state.players.A.zones.discardPile).toContain(first);
    expect(state.players.A.zones.hand).not.toContain(first);
  });

  test('does not protect a negated Tactic whose effective Aftermath destination is already not Discard', () => {
    let { state, source } =
      reachChooseTacticsWithRedemptionGambit(startBattle());
    const target = state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[target].cardId = 'neutral-rallying-cry';

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: target,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });

    const negator = injectCard(
      state,
      'B',
      'inquisition-tyranny',
      'override-negator',
    );
    negateV070BattleCardEffect(
      state,
      target,
      negator,
      'inquisition-tyranny',
    );
    state.battleRuntime!.battleCardAftermathDestinationOverrides.push({
      sourceCardId: 'test-graveyard-override',
      playerId: 'A',
      instanceId: target,
      destination: 'graveyard',
    });

    expect(v070RedemptionTargetInstanceIds(state, 'A', source))
      .toEqual([]);

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = resolveOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.graveyard).toContain(target);
    expect(state.players.A.zones.hand).not.toContain(target);
  });

  test('does not trigger on a same-player negation', () => {
    let { state, source } =
      reachChooseTacticsWithRedemptionGambit(startBattle());
    const target = state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[target].cardId = 'neutral-rallying-cry';
    const ownNegator = injectCard(
      state,
      'A',
      'inquisition-tyranny',
      'own-negator',
    );

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: target,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    negateV070BattleCardEffect(
      state,
      target,
      ownNegator,
      'inquisition-tyranny',
    );

    expect(v070RedemptionTargetInstanceIds(state, 'A', source))
      .toEqual([]);

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = resolveOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.discardPile).toContain(target);
    expect(state.players.A.zones.hand).not.toContain(target);
  });
});
