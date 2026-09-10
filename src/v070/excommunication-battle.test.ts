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
  V070_EXCOMMUNICATION_BATTLE_MAX_VALUE,
  V070_EXCOMMUNICATION_BATTLE_TEXT,
  V070_EXCOMMUNICATION_ID,
  pendingV070ExcommunicationAftermath,
} from './excommunication-battle';
import { negateV070BattleCardEffect } from './battle-effect-status';
import { viewV070GameForPlayer } from './views';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'excommunication-battle',
    seed: 'excommunication-battle-seed',
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

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `excommunication-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function prepareExcommunicationBattle(): {
  state: V070GameState;
  source: string;
} {
  let state = startBattle();
  const source = injectCard(
    state,
    'A',
    V070_EXCOMMUNICATION_ID,
    'source',
  );
  state.players.A.zones.hand.push(source);

  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A', cardInstanceId: source,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });

  expect(state.battleRuntime?.excommunicationBattleSourceInstanceIds)
    .toContain(source);
  expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
    .toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceInstanceId: source,
        sourceCardId: V070_EXCOMMUNICATION_ID,
        condition: 'always',
      }),
    ]));
  return { state, source };
}

function resolveBattleOutcome(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics', playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'A', values: [6],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'B', values: [1],
  });
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return state;
}

function openAftermath(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath', playerId: 'A',
  });
}

function replaceOpponentDiscard(
  state: V070GameState,
  instanceIds: readonly string[],
): void {
  const zones = state.players.B.zones;
  zones.removed.push(...zones.discardPile.splice(0));
  zones.discardPile.push(...instanceIds);
}

function cardIdWithValue(value: number): string {
  for (const card of v070CanonicalContent.cardsById.values()) {
    if (card.value === value) return card.id;
  }
  throw new Error(`No canonical v0.7.0 card has value ${value}.`);
}

function cardIdAboveValue(value: number): string {
  for (const card of v070CanonicalContent.cardsById.values()) {
    if (card.value > value) return card.id;
  }
  throw new Error(`No canonical v0.7.0 card has value above ${value}.`);
}

describe('v0.7.0 Excommunication battle effect', () => {
  test('binds to exact released authority and is registered for reveal resolution', () => {
    expect(V070_EXCOMMUNICATION_BATTLE_TEXT).toBe(
      "In the Aftermath, choose one or more cards in the opponent's Discard Pile with combined card value up to 3. Put them in their Graveyard.",
    );
    expect(v070CanonicalContent.cardsById.get(V070_EXCOMMUNICATION_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_EXCOMMUNICATION_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_EXCOMMUNICATION_ID)?.expectedText)
      .toBe(V070_EXCOMMUNICATION_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_EXCOMMUNICATION_ID);
  });

  test('opens a mandatory owner-only choice and enforces exact physical cards plus the combined-value cap', () => {
    let { state, source } = prepareExcommunicationBattle();
    state = resolveBattleOutcome(state);

    const valueOneId = cardIdWithValue(1);
    const valueTwoId = cardIdWithValue(2);
    const valueOne = injectCard(state, 'B', valueOneId, 'value-one');
    const chosenValueTwo = injectCard(state, 'B', valueTwoId, 'value-two-chosen');
    const twinValueTwo = injectCard(state, 'B', valueTwoId, 'value-two-twin');
    replaceOpponentDiscard(state, [valueOne, chosenValueTwo, twinValueTwo]);
    const convictionBefore = state.players.A.inquisition!.conviction;

    state = openAftermath(state);
    const pending = pendingV070ExcommunicationAftermath(state);
    expect(pending).toEqual(expect.objectContaining({
      playerId: 'A',
      owner: 'A',
      opponent: 'B',
      sourceInstanceId: source,
      maximumCombinedValue: V070_EXCOMMUNICATION_BATTLE_MAX_VALUE,
      candidateInstanceIds: expect.arrayContaining([
        valueOne,
        chosenValueTwo,
        twinValueTwo,
      ]),
    }));

    const ownerView = viewV070GameForPlayer(state, 'A');
    const opponentView = viewV070GameForPlayer(state, 'B');
    expect(ownerView.pendingExcommunicationAftermath?.candidateInstanceIds)
      .toEqual(expect.arrayContaining([valueOne, chosenValueTwo, twinValueTwo]));
    expect(opponentView.pendingExcommunicationAftermath?.candidateCount).toBe(3);
    expect(opponentView.pendingExcommunicationAftermath?.candidateInstanceIds)
      .toBeUndefined();

    expect(() => reduceV070BattleAction(state, {
      type: 'complete_aftermath', playerId: 'A',
    })).toThrow(/Excommunication/i);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_excommunication_aftermath',
      playerId: 'B',
      targetInstanceIds: [valueOne],
    })).toThrow(/pending for that player/i);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_excommunication_aftermath',
      playerId: 'A',
      targetInstanceIds: [],
    })).toThrow(/one or more/i);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_excommunication_aftermath',
      playerId: 'A',
      targetInstanceIds: [valueOne, valueOne],
    })).toThrow(/same physical card/i);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_excommunication_aftermath',
      playerId: 'A',
      targetInstanceIds: [chosenValueTwo, twinValueTwo],
    })).toThrow(/maximum is 3/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_excommunication_aftermath',
      playerId: 'A',
      targetInstanceIds: [chosenValueTwo, valueOne],
    });

    expect(pendingV070ExcommunicationAftermath(state)).toBeNull();
    expect(state.players.B.zones.graveyard).toEqual(
      expect.arrayContaining([chosenValueTwo, valueOne]),
    );
    expect(state.players.B.zones.discardPile).toContain(twinValueTwo);
    expect(state.players.B.zones.discardPile).not.toContain(chosenValueTwo);
    expect(state.players.A.inquisition?.conviction).toBe(convictionBefore + 1);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'excommunication_battle_resolved',
        visibility: 'public',
      }),
    ]));
  });

  test('automatically moves the only eligible card and gains normal Aftermath Conviction once', () => {
    let { state } = prepareExcommunicationBattle();
    state = resolveBattleOutcome(state);
    const target = injectCard(state, 'B', cardIdWithValue(2), 'only-target');
    replaceOpponentDiscard(state, [target]);
    const convictionBefore = state.players.A.inquisition!.conviction;

    state = openAftermath(state);

    expect(pendingV070ExcommunicationAftermath(state)).toBeNull();
    expect(state.players.B.zones.discardPile).not.toContain(target);
    expect(state.players.B.zones.graveyard).toContain(target);
    expect(state.players.A.inquisition?.conviction).toBe(convictionBefore + 1);
    expect(state.battleRuntime).toBeNull();
  });

  test('resolves as far as able without pausing when the opponent has no eligible Discard card', () => {
    let { state } = prepareExcommunicationBattle();
    state = resolveBattleOutcome(state);
    const ineligible = injectCard(
      state,
      'B',
      cardIdAboveValue(V070_EXCOMMUNICATION_BATTLE_MAX_VALUE),
      'too-large',
    );
    replaceOpponentDiscard(state, [ineligible]);

    state = openAftermath(state);

    expect(pendingV070ExcommunicationAftermath(state)).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(ineligible);
    expect(state.players.B.zones.graveyard).not.toContain(ineligible);
    expect(state.battleRuntime).toBeNull();
  });

  test('negation removes both its deferred registration and shared-timing carrier', () => {
    const { state, source } = prepareExcommunicationBattle();
    const negator = injectCard(state, 'B', 'neutral-assassins', 'negator');

    negateV070BattleCardEffect(
      state,
      source,
      negator,
      'neutral-assassins',
    );

    expect(state.battleRuntime?.excommunicationBattleSourceInstanceIds ?? [])
      .not.toContain(source);
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements ?? [])
      .not.toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceInstanceId: source }),
      ]));
  });
});
