import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  cardEligibleForV070BattleRole,
  reduceV070BattleAction,
} from './battle-engine';
import {
  CURRENT_ASSIMILATION_BATTLE_TEXT,
  CURRENT_FORECLOSURE_BATTLE_TEXT,
  V070_ASSIMILATION_BATTLE_TEXT,
  V070_ASSIMILATION_ID,
  V070_FORECLOSURE_BATTLE_TEXT,
  V070_FORECLOSURE_ID,
} from './aftermath-capture-cards';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  currentBattleEffectHandler,
  v070BattleEffectHandler,
} from './battle-effects';
import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';

function startBattle(options: {
  deedOwnerAtOnset?: 'A' | 'B' | null;
} = {}): V070GameState {
  let state = createV070StarterGame({
    gameId: 'aftermath-capture-cards',
    seed: 'aftermath-capture-cards-seed',
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
  state.board.forEach((space, index) => {
    space.occupant = null;
    space.blank = true;
    space.controller = index <= 2 ? 'A' : 'B';
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';

  const contested = state.board[3];
  const deed = state.deeds.find(
    candidate =>
      candidate.territoryInstanceId === contested.territoryInstanceId,
  );
  if (!deed) throw new Error('Expected contested Territory Deed.');
  deed.owner = options.deedOwnerAtOnset ?? null;

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
  expect(state.battleRuntime?.contestedDeedOwnerAtOnset)
    .toBe(options.deedOwnerAtOnset ?? null);
  return state;
}

function revealGambits(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function chooseATactic(
  state: V070GameState,
  cardId: string,
): { state: V070GameState; instanceId: string } {
  const instanceId = state.battleRuntime!.participants.A.reserve[0];
  expect(instanceId).toBeDefined();
  state.cardInstances[instanceId].cardId = cardId;
  expect(cardEligibleForV070BattleRole(cardId, 'tactic')).toBe(true);

  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: instanceId,
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
  return { state, instanceId };
}

function resolveAttackerWin(state: V070GameState): V070GameState {
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

describe('current v0.7.2 battle capture effects', () => {
  test('binds frozen and current Assimilation/Foreclosure wording separately', () => {
    expect(V070_ASSIMILATION_ID).toBe('neutral-assimilation');
    expect(V070_ASSIMILATION_BATTLE_TEXT).toBe(
      'In the Aftermath, if you win as the attacker on a Territory the opponent controls, advance Front Line 1, if able, instead of occupying it. Put this card in your Graveyard after the Front Line advance.',
    );
    expect(CURRENT_ASSIMILATION_BATTLE_TEXT).toBe(
      'In the Aftermath, if you win as the attacker on a Territory the opponent controls, capture that Territory, if able, instead of occupying it. Then put this card in your Graveyard.',
    );
    expect(V070_FORECLOSURE_ID).toBe('financiers-foreclosure');
    expect(V070_FORECLOSURE_BATTLE_TEXT).toBe(
      'In the Aftermath, if you initiated the battle on a Territory whose Deed you owned when the battle began and you won, advance Front Line 1, if able, instead of becoming the occupier.',
    );
    expect(CURRENT_FORECLOSURE_BATTLE_TEXT).toBe(
      'In the Aftermath, if you initiated and won this battle on a Territory whose Deed you owned when the battle began, capture that Territory, if able, instead of becoming the occupier.',
    );

    for (const [cardId, frozenText, currentText] of [
      [
        V070_ASSIMILATION_ID,
        V070_ASSIMILATION_BATTLE_TEXT,
        CURRENT_ASSIMILATION_BATTLE_TEXT,
      ],
      [
        V070_FORECLOSURE_ID,
        V070_FORECLOSURE_BATTLE_TEXT,
        CURRENT_FORECLOSURE_BATTLE_TEXT,
      ],
    ] as const) {
      expect(v070CanonicalContent.cardsById.get(cardId)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(frozenText);
      expect(currentCanonicalContent.cardsById.get(cardId)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(currentText);
      expect(v070BattleEffectHandler(cardId)?.expectedText)
        .toBe(frozenText);
      expect(currentBattleEffectHandler(cardId)?.expectedText)
        .toBe(currentText);
      expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(cardId);
    }
  });

  test('Assimilation captures the contested opposing Territory and sends its Tactic to the Graveyard', () => {
    let state = startBattle();
    state = revealGambits(state);
    const chosen = chooseATactic(state, V070_ASSIMILATION_ID);
    state = chosen.state;

    expect(state.battleRuntime?.battleCardAftermathCaptures)
      .toContainEqual(expect.objectContaining({
        owner: 'A',
        sourceInstanceId: chosen.instanceId,
        sourceCardId: V070_ASSIMILATION_ID,
        requiresOpponentControlAtOnset: true,
        sourceToGraveyard: true,
      }));

    state = resolveAttackerWin(state);
    expect(state.battle?.occupier).toBe('A');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.board[3].controller).toBe('A');
    expect(state.players.A.zones.graveyard).toContain(chosen.instanceId);
    expect(state.players.A.zones.discardPile)
      .not.toContain(chosen.instanceId);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_card_aftermath_capture_resolved',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: chosen.instanceId,
        sourceCardId: V070_ASSIMILATION_ID,
        captured: true,
      }),
    }));
  });

  test('Assimilation does nothing when the attacker did not fight on an opponent-controlled Territory', () => {
    let state = startBattle();
    state.board[3].controller = 'A';
    state.battle!.defenderControlsContested = false;
    state = revealGambits(state);
    const chosen = chooseATactic(state, V070_ASSIMILATION_ID);
    state = resolveAttackerWin(chosen.state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.board[3].controller).toBe('A');
    expect(state.players.A.zones.discardPile).toContain(chosen.instanceId);
    expect(state.players.A.zones.graveyard)
      .not.toContain(chosen.instanceId);
  });

  test('Foreclosure uses Deed ownership snapshotted at battle Onset', () => {
    let state = startBattle({ deedOwnerAtOnset: 'A' });
    state = revealGambits(state);
    const chosen = chooseATactic(state, V070_FORECLOSURE_ID);
    state = chosen.state;

    const contested = state.board[3];
    const deed = state.deeds.find(
      candidate =>
        candidate.territoryInstanceId === contested.territoryInstanceId,
    )!;
    deed.owner = null;

    state = resolveAttackerWin(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.board[3].controller).toBe('A');
    expect(state.players.A.zones.discardPile).toContain(chosen.instanceId);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_card_aftermath_capture_resolved',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: chosen.instanceId,
        sourceCardId: V070_FORECLOSURE_ID,
        captured: true,
        deedOwnerAtOnset: 'A',
      }),
    }));
  });

  test('Foreclosure cannot become eligible from a Deed acquired after battle Onset', () => {
    let state = startBattle({ deedOwnerAtOnset: null });
    state = revealGambits(state);
    const chosen = chooseATactic(state, V070_FORECLOSURE_ID);
    state = chosen.state;

    const contested = state.board[3];
    state.deeds.find(
      candidate =>
        candidate.territoryInstanceId === contested.territoryInstanceId,
    )!.owner = 'A';

    state = resolveAttackerWin(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.board[3].controller).toBe('B');
    expect(state.players.A.zones.discardPile).toContain(chosen.instanceId);
    expect(state.events.some(event =>
      event.type === 'battle_card_aftermath_capture_resolved'
      && (event.payload as { sourceInstanceId?: string } | undefined)
        ?.sourceInstanceId === chosen.instanceId
    )).toBe(false);
  });
});
