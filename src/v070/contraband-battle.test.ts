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
  V070_CONTRABAND_BATTLE_TEXT,
  V070_CONTRABAND_ID,
} from './contraband-battle';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'contraband-battle',
    seed: 'contraband-battle-seed',
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
): string {
  const instanceId = `contraband-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function passAllTactics(state: V070GameState): V070GameState {
  while ((state.battleRuntime?.participants.A.tacticChoicesMade ?? 0)
    < (state.battleRuntime?.participants.A.tacticLimit ?? 0)) {
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
  }
  while ((state.battleRuntime?.participants.B.tacticChoicesMade ?? 0)
    < (state.battleRuntime?.participants.B.tacticLimit ?? 0)) {
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
  }
  return state;
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

describe('Contraband battle effect', () => {
  test('binds exact unchanged frozen/current authority and registers the surface', () => {
    expect(V070_CONTRABAND_BATTLE_TEXT).toBe(
      'Choose one eligible card in your Discard Pile whose Gambit or Tactic effect can apply now. Put this card in your Graveyard and place the chosen card face up in the same role. In the Aftermath, put the chosen card in your Graveyard unless its text says otherwise.',
    );
    for (const content of [v070CanonicalContent, currentCanonicalContent]) {
      expect(content.cardsById.get(V070_CONTRABAND_ID)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(V070_CONTRABAND_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(V070_CONTRABAND_ID)?.expectedText)
      .toBe(V070_CONTRABAND_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_CONTRABAND_ID);
  });

  test('as a Tactic, replaces itself with an eligible Discard card and defaults that card to the Graveyard', () => {
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

    const source =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[source].cardId = V070_CONTRABAND_ID;
    const target = inject(
      state,
      'A',
      'neutral-fealty',
      'tactic-fealty',
    );
    state.players.A.zones.discardPile.push(target);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'contraband',
        owner: 'A',
        sourceInstanceId: source,
        role: 'tactic',
        candidates: expect.arrayContaining([
          expect.objectContaining({
            sourceInstanceId: target,
            cardId: 'neutral-fealty',
            effectLabel: 'Gambit/Tactic',
          }),
        ]),
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_contraband_battle',
      playerId: 'A',
      targetInstanceId: target,
      targetEffectLabel: 'Gambit/Tactic',
    });

    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.players.A.zones.discardPile).not.toContain(target);
    expect(state.battleRuntime?.participants.A.tactic)
      .toEqual(expect.objectContaining({
        instanceId: target,
        role: 'tactic',
        faceUp: true,
      }));
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);

    state = resolveOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.graveyard).toContain(target);
    expect(state.players.A.zones.discardPile).not.toContain(target);
  });

  test('the chosen card own destination text overrides the Contraband Graveyard fallback', () => {
    let state = startBattle();
    const source = inject(
      state,
      'A',
      V070_CONTRABAND_ID,
      'gambit-source',
    );
    const target = inject(
      state,
      'A',
      'intelligence-disinformation',
      'gambit-disinformation',
    );
    const opposingGambit = inject(
      state,
      'B',
      'neutral-fealty',
      'opposing-gambit',
    );
    state.players.A.zones.hand.push(source);
    state.players.A.zones.discardPile.push(target);
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

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'contraband',
        owner: 'A',
        role: 'gambit',
        candidates: expect.arrayContaining([
          expect.objectContaining({
            sourceInstanceId: target,
            cardId: 'intelligence-disinformation',
            effectLabel: 'Gambit',
          }),
        ]),
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_contraband_battle',
      playerId: 'A',
      targetInstanceId: target,
      targetEffectLabel: 'Gambit',
    });

    expect(state.battleRuntime?.participants.A.gambit)
      .toEqual(expect.objectContaining({
        instanceId: target,
        role: 'gambit',
        faceUp: true,
      }));
    expect(state.battleRuntime?.participants.A.advantage).toBe(1);
    expect(state.players.A.zones.graveyard).toContain(source);

    state = passAllTactics(state);
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6, 5],
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

    expect(state.players.A.zones.hand).toContain(target);
    expect(state.players.A.zones.graveyard).not.toContain(target);
  });

  test('revalidates that the selected physical card is still in the Discard Pile', () => {
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

    const source =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[source].cardId = V070_CONTRABAND_ID;
    const target = inject(
      state,
      'A',
      'neutral-fealty',
      'stale-target',
    );
    state.players.A.zones.discardPile.push(target);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    state.players.A.zones.discardPile =
      state.players.A.zones.discardPile.filter(
        instanceId => instanceId !== target,
      );

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_contraband_battle',
      playerId: 'A',
      targetInstanceId: target,
      targetEffectLabel: 'Gambit/Tactic',
    })).toThrow(/no longer apply/i);
    expect(state.players.A.zones.graveyard).not.toContain(source);
  });

  test('does not open a replacement choice when no Discard effect can apply now', () => {
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

    state.players.A.zones.discardPile = [];
    const source =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[source].cardId = V070_CONTRABAND_ID;

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.tactic?.instanceId)
      .toBe(source);
    expect(state.events.some(event =>
      event.type === 'contraband_battle_no_applicable_card'
    )).toBe(true);
  });
});
