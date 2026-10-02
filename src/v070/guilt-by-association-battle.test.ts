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
  V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT,
  V070_GUILT_BY_ASSOCIATION_ID,
} from './guilt-by-association-battle';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'guilt-by-association-battle',
    seed: 'guilt-by-association-battle-seed',
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
  const instanceId = `guilt-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

describe('Guilt by Association battle effect', () => {
  test('binds exact unchanged frozen/current authority and registers the surface', () => {
    for (const content of [
      v070CanonicalContent,
      currentCanonicalContent,
    ]) {
      expect(content.cardsById.get(V070_GUILT_BY_ASSOCIATION_ID)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT);
    }
    expect(
      v070BattleEffectHandler(V070_GUILT_BY_ASSOCIATION_ID)?.expectedText,
    ).toBe(V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_GUILT_BY_ASSOCIATION_ID);
  });

  test('chooses an opposing battle-card title and graveyards every matching Discard copy', () => {
    let state = startBattle();
    const source = injectCard(
      state,
      'A',
      V070_GUILT_BY_ASSOCIATION_ID,
      'source',
    );
    const opposingGambit = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'opposing-gambit',
    );
    state.players.A.zones.hand.push(source);
    state.players.B.zones.hand.push(opposingGambit);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: opposingGambit,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    const opposingTactic =
      state.battleRuntime!.participants.B.reserve[0];
    state.cardInstances[opposingTactic].cardId = 'neutral-stand-ground';

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
      cardInstanceId: opposingTactic,
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
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1, 1],
    });
    expect(state.battleRuntime?.stage).toBe('aftermath');

    const matchOne = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'discard-match-one',
    );
    const matchTwo = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'discard-match-two',
    );
    const other = injectCard(
      state,
      'B',
      'neutral-new-recruits',
      'discard-other',
    );
    state.players.B.zones.discardPile.push(
      matchOne,
      matchTwo,
      other,
    );
    const convictionBefore =
      state.players.A.inquisition!.conviction;

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
      guiltByAssociationTargetOptions: [
        expect.objectContaining({
          sourceInstanceId: source,
          targetInstanceIds: expect.arrayContaining([
            opposingGambit,
            opposingTactic,
          ]),
        }),
      ],
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: source,
      targetInstanceId: opposingGambit,
    });

    expect(state.players.B.zones.discardPile).toContain(other);
    expect(state.players.B.zones.discardPile).not.toContain(matchOne);
    expect(state.players.B.zones.discardPile).not.toContain(matchTwo);
    expect(state.players.B.zones.graveyard)
      .toEqual(expect.arrayContaining([matchOne, matchTwo]));
    expect(state.players.A.inquisition!.conviction)
      .toBe(Math.min(4, convictionBefore + 2));

    const resolved = state.events.find(event =>
      event.type === 'guilt_by_association_aftermath_resolved'
    );
    expect(resolved?.payload).toEqual(expect.objectContaining({
      sourceInstanceId: source,
      selectedBattleInstanceId: opposingGambit,
      selectedCardId: 'neutral-rallying-cry',
      movedInstanceIds: [matchOne, matchTwo],
      movedCount: 2,
    }));
  });

  test('a single opposing title auto-resolves and does not require a meaningless target prompt', () => {
    let state = startBattle();
    const source = injectCard(
      state,
      'A',
      V070_GUILT_BY_ASSOCIATION_ID,
      'single-source',
    );
    const opposingGambit = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'single-opposing-gambit',
    );
    state.players.A.zones.hand.push(source);
    state.players.B.zones.hand.push(opposingGambit);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: opposingGambit,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });
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
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toBeNull();
    expect(state.events.some(event =>
      event.type === 'guilt_by_association_aftermath_resolved'
      && (event.payload as { selectedBattleInstanceId?: string })
        .selectedBattleInstanceId === opposingGambit
    )).toBe(true);
  });
});
