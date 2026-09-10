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
  V070_SUPPLIES_BATTLE_DRAW_COUNT,
  V070_SUPPLIES_BATTLE_TEXT,
  V070_SUPPLIES_ID,
  pendingV070SuppliesAftermath,
} from './supplies-battle';
import { negateV070BattleCardEffect } from './battle-effect-status';
import { viewV070GameForPlayer } from './views';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'supplies-battle',
    seed: 'supplies-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-commandant-holdfast',
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
  const instanceId = `supplies-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function prepareSuppliesBattle(): {
  state: V070GameState;
  source: string;
} {
  let state = startBattle();
  const source = injectCard(state, 'A', V070_SUPPLIES_ID, 'source');
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

  expect(state.battleRuntime?.suppliesBattleSourceInstanceIds)
    .toContain(source);
  expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
    .toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceInstanceId: source,
        sourceCardId: V070_SUPPLIES_ID,
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

function replaceOwnerResources(
  state: V070GameState,
  input: {
    hand?: readonly string[];
    drawPile?: readonly string[];
    discardPile?: readonly string[];
  },
): void {
  const zones = state.players.A.zones;
  zones.removed.push(
    ...zones.hand.splice(0),
    ...zones.drawPile.splice(0),
    ...zones.discardPile.splice(0),
  );
  zones.hand.push(...(input.hand ?? []));
  zones.drawPile.push(...(input.drawPile ?? []));
  zones.discardPile.push(...(input.discardPile ?? []));
}

describe('v0.7.0 Supplies battle effect', () => {
  test('binds to exact released authority and is registered for reveal resolution', () => {
    expect(V070_SUPPLIES_BATTLE_TEXT).toBe(
      'In the Aftermath, +2 Cards, then discard one card.',
    );
    expect(V070_SUPPLIES_BATTLE_DRAW_COUNT).toBe(2);
    expect(v070CanonicalContent.cardsById.get(V070_SUPPLIES_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_SUPPLIES_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_SUPPLIES_ID)?.expectedText)
      .toBe(V070_SUPPLIES_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_SUPPLIES_ID);
  });

  test('draws two first, then opens an owner-private mandatory discard choice from the resulting Hand', () => {
    let { state, source } = prepareSuppliesBattle();
    state = resolveBattleOutcome(state);

    const existing = injectCard(state, 'A', 'neutral-new-recruits', 'existing');
    const drawnOne = injectCard(state, 'A', 'neutral-rallying-cry', 'draw-one');
    const drawnTwo = injectCard(state, 'A', 'neutral-forced-march', 'draw-two');
    replaceOwnerResources(state, {
      hand: [existing],
      drawPile: [drawnOne, drawnTwo],
    });

    state = openAftermath(state);
    const pending = pendingV070SuppliesAftermath(state);
    expect(pending).toEqual(expect.objectContaining({
      playerId: 'A',
      owner: 'A',
      sourceInstanceId: source,
      candidateInstanceIds: expect.arrayContaining([
        existing,
        drawnOne,
        drawnTwo,
      ]),
    }));
    expect(state.players.A.zones.hand).toEqual(
      expect.arrayContaining([existing, drawnOne, drawnTwo]),
    );

    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'cards_drawn',
        actor: 'A',
        visibility: 'public',
        payload: expect.objectContaining({
          count: 2,
          purpose: 'Supplies battle effect',
        }),
      }),
      expect.objectContaining({
        type: 'drawn_card_identity',
        actor: 'A',
        visibility: 'A',
        payload: expect.objectContaining({
          cardInstanceIds: [drawnOne, drawnTwo],
          purpose: 'Supplies battle effect',
        }),
      }),
    ]));

    const ownerView = viewV070GameForPlayer(state, 'A');
    const opponentView = viewV070GameForPlayer(state, 'B');
    expect(ownerView.pendingSuppliesAftermath?.candidateInstanceIds)
      .toEqual(expect.arrayContaining([existing, drawnOne, drawnTwo]));
    expect(opponentView.pendingSuppliesAftermath?.candidateCount).toBe(3);
    expect(opponentView.pendingSuppliesAftermath?.candidateInstanceIds)
      .toBeUndefined();

    expect(() => reduceV070BattleAction(state, {
      type: 'complete_aftermath', playerId: 'A',
    })).toThrow(/Supplies/i);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_supplies_aftermath',
      playerId: 'B',
      targetInstanceId: drawnOne,
    })).toThrow(/pending for that player/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_supplies_aftermath',
      playerId: 'A',
      targetInstanceId: existing,
    });

    expect(pendingV070SuppliesAftermath(state)).toBeNull();
    expect(state.players.A.zones.discardPile).toContain(existing);
    expect(state.players.A.zones.hand).toEqual(
      expect.arrayContaining([drawnOne, drawnTwo]),
    );
    expect(state.players.A.zones.hand).not.toContain(existing);
    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.battleRuntime).toBeNull();
  });

  test('uses the normal reshuffle-aware draw procedure before the required discard', () => {
    let { state } = prepareSuppliesBattle();
    state = resolveBattleOutcome(state);

    const recycleOne = injectCard(state, 'A', 'neutral-rallying-cry', 'recycle-one');
    const recycleTwo = injectCard(state, 'A', 'neutral-forced-march', 'recycle-two');
    replaceOwnerResources(state, {
      hand: [],
      drawPile: [],
      discardPile: [recycleOne, recycleTwo],
    });

    state = openAftermath(state);
    const pending = pendingV070SuppliesAftermath(state);
    expect(pending?.candidateInstanceIds.sort()).toEqual(
      [recycleOne, recycleTwo].sort(),
    );
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'discard_reshuffled',
        actor: 'A',
        visibility: 'public',
        payload: expect.objectContaining({
          purpose: 'Supplies battle effect',
        }),
      }),
      expect.objectContaining({
        type: 'cards_drawn',
        actor: 'A',
        payload: expect.objectContaining({
          count: 2,
          reshuffles: 1,
          exhausted: false,
        }),
      }),
    ]));

    state = reduceV070BattleAction(state, {
      type: 'resolve_supplies_aftermath',
      playerId: 'A',
      targetInstanceId: recycleOne,
    });
    expect(state.players.A.zones.discardPile).toContain(recycleOne);
    expect(state.players.A.zones.hand).toContain(recycleTwo);
  });

  test('automatically discards the only available card after drawing as far as able', () => {
    let { state } = prepareSuppliesBattle();
    state = resolveBattleOutcome(state);

    const onlyCard = injectCard(state, 'A', 'neutral-new-recruits', 'only-card');
    replaceOwnerResources(state, {
      hand: [],
      drawPile: [onlyCard],
      discardPile: [],
    });

    state = openAftermath(state);

    expect(pendingV070SuppliesAftermath(state)).toBeNull();
    expect(state.players.A.zones.hand).not.toContain(onlyCard);
    expect(state.players.A.zones.discardPile).toContain(onlyCard);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'cards_drawn',
        payload: expect.objectContaining({
          count: 1,
          exhausted: true,
        }),
      }),
      expect.objectContaining({
        type: 'supplies_battle_resolved',
        payload: expect.objectContaining({
          discardedInstanceId: onlyCard,
        }),
      }),
    ]));
    expect(state.battleRuntime).toBeNull();
  });

  test('resolves as far as able when no card can be drawn or discarded', () => {
    let { state } = prepareSuppliesBattle();
    state = resolveBattleOutcome(state);
    replaceOwnerResources(state, {
      hand: [],
      drawPile: [],
      discardPile: [],
    });

    state = openAftermath(state);

    expect(pendingV070SuppliesAftermath(state)).toBeNull();
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'cards_drawn',
        payload: expect.objectContaining({
          count: 0,
          exhausted: true,
        }),
      }),
      expect.objectContaining({
        type: 'supplies_battle_resolved',
        payload: expect.objectContaining({
          discardedInstanceId: null,
          reason: 'no_card_to_discard',
        }),
      }),
    ]));
    expect(state.battleRuntime).toBeNull();
  });

  test('rejects a stale physical discard target', () => {
    let { state } = prepareSuppliesBattle();
    state = resolveBattleOutcome(state);

    const first = injectCard(state, 'A', 'neutral-new-recruits', 'stale-first');
    const second = injectCard(state, 'A', 'neutral-rallying-cry', 'stale-second');
    replaceOwnerResources(state, {
      hand: [first, second],
      drawPile: [],
      discardPile: [],
    });
    state = openAftermath(state);

    state.players.A.zones.hand = state.players.A.zones.hand.filter(
      instanceId => instanceId !== first,
    );
    state.players.A.zones.removed.push(first);

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_supplies_aftermath',
      playerId: 'A',
      targetInstanceId: first,
    })).toThrow(/still in your Hand/i);
  });

  test('negation removes both its deferred registration and shared-timing carrier', () => {
    const { state, source } = prepareSuppliesBattle();
    const negator = injectCard(state, 'B', 'neutral-assassins', 'negator');

    negateV070BattleCardEffect(
      state,
      source,
      negator,
      'neutral-assassins',
    );

    expect(state.battleRuntime?.suppliesBattleSourceInstanceIds ?? [])
      .not.toContain(source);
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements ?? [])
      .not.toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceInstanceId: source }),
      ]));
  });
});
