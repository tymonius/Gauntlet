import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
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
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import {
  V070_ACCUSATION_BATTLE_TEXT,
  V070_ACCUSATION_ID,
  pendingV070AccusationAftermath,
} from './accusation-battle';
import { viewV070GameForPlayer } from './views';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'accusation-battle-test',
    seed: 'accusation-battle-seed',
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
  const instanceId = `accusation-battle-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function setGambits(
  state: V070GameState,
  aCard?: string,
  bCard?: string,
): V070GameState {
  if (aCard) state.players.A.zones.hand.push(aCard);
  if (bCard) state.players.B.zones.hand.push(bCard);
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aCard,
  });
  return reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bCard,
  });
}

function revealGambits(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function toAftermath(state: V070GameState): V070GameState {
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
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [1],
  });
}

function accusationAftermath(): {
  state: V070GameState;
  accusation: string;
} {
  let state = startBattle();
  const accusation = injectCard(
    state,
    'A',
    V070_ACCUSATION_ID,
    'source',
  );
  state = setGambits(state, accusation);
  state = revealGambits(state);
  state = toAftermath(state);
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return { state, accusation };
}

function replaceDiscardWith(
  state: V070GameState,
  playerId: 'A' | 'B',
  instanceIds: string[],
): void {
  const zones = state.players[playerId].zones;
  for (const existing of zones.discardPile) {
    if (!instanceIds.includes(existing)) zones.graveyard.push(existing);
  }
  zones.discardPile = [...instanceIds];
}

function unsupportedGambit(
  state: V070GameState,
  owner: 'A' | 'B',
): string {
  const card = Object.values(state.cardInstances).find(instance =>
    instance.owner === owner
    && cardEligibleForV070BattleRole(instance.cardId, 'gambit')
    && !v070BattleEffectHandler(instance.cardId)
  );
  if (!card) throw new Error('Fixture has no unsupported Gambit.');

  const player = state.players[owner];
  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(card.instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones.hand.push(card.instanceId);
  return card.instanceId;
}

describe('v0.7.0 Accusation battle effect', () => {
  test('binds to released authority and advertises Accusation as supported', () => {
    const card = v070CanonicalContent.cardsById.get(V070_ACCUSATION_ID);
    expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_ACCUSATION_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_ACCUSATION_ID)?.expectedText)
      .toBe(V070_ACCUSATION_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_ACCUSATION_ID);
  });

  test('registers at reveal without weakening unsupported-effect atomicity', () => {
    let supported = startBattle();
    const accusation = injectCard(
      supported,
      'A',
      V070_ACCUSATION_ID,
      'register',
    );
    supported = setGambits(supported, accusation);
    supported = revealGambits(supported);

    expect(supported.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(supported.battleRuntime?.accusationBattleSourceInstanceIds)
      .toEqual([accusation]);
    expect(supported.battleRuntime?.stage).toBe('choose_tactics');

    let blocked = startBattle();
    const blockedAccusation = injectCard(
      blocked,
      'A',
      V070_ACCUSATION_ID,
      'blocked',
    );
    const unsupported = unsupportedGambit(blocked, 'B');
    blocked = setGambits(blocked, blockedAccusation, unsupported);
    blocked = revealGambits(blocked);

    expect(blocked.battleRuntime?.stage).toBe('halted');
    expect(blocked.battleRuntime?.accusationBattleSourceInstanceIds ?? [])
      .not.toContain(blockedAccusation);
    expect(blocked.battleRuntime?.unsupportedEffects.some(effect =>
      effect.instanceId === unsupported
    )).toBe(true);
  });

  test('pauses Aftermath for the Accusation owner to choose among opposing Discard cards', () => {
    let { state, accusation } = accusationAftermath();
    const first = injectCard(state, 'B', 'neutral-rallying-cry', 'target-one');
    const second = injectCard(state, 'B', 'neutral-forced-march', 'target-two');
    replaceDiscardWith(state, 'B', [first, second]);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battleRuntime?.aftermathCardsCleared).toBe(false);
    expect(pendingV070AccusationAftermath(state)).toEqual({
      sourceInstanceId: accusation,
      owner: 'A',
      opponent: 'B',
      playerId: 'A',
      stage: 'target',
      candidateInstanceIds: [first, second],
    });

    const ownerView = viewV070GameForPlayer(state, 'A');
    const opponentView = viewV070GameForPlayer(state, 'B');
    expect(ownerView.pendingAccusationAftermath).toEqual({
      stage: 'target',
      playerId: 'A',
      owner: 'A',
      opponent: 'B',
      sourceInstanceId: accusation,
      candidateCount: 2,
      candidateInstanceIds: [first, second],
    });
    expect(opponentView.pendingAccusationAftermath).toEqual({
      stage: 'target',
      playerId: 'A',
      owner: 'A',
      opponent: 'B',
      sourceInstanceId: accusation,
      candidateCount: 2,
    });
  });

  test('the affected opponent chooses whether the selected card goes on top of Draw Pile', () => {
    let { state } = accusationAftermath();
    const first = injectCard(state, 'B', 'neutral-rallying-cry', 'draw-top-one');
    const second = injectCard(state, 'B', 'neutral-forced-march', 'draw-top-two');
    replaceDiscardWith(state, 'B', [first, second]);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_accusation_target',
      playerId: 'A',
      targetInstanceId: second,
    });

    const pending = pendingV070AccusationAftermath(state);
    expect(pending).toEqual(expect.objectContaining({
      stage: 'destination',
      playerId: 'B',
      targetInstanceId: second,
      candidateInstanceIds: [second],
    }));
    expect(viewV070GameForPlayer(state, 'A').pendingAccusationAftermath)
      .toEqual(expect.objectContaining({
        stage: 'destination',
        playerId: 'B',
        targetInstanceId: second,
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_accusation_destination',
      playerId: 'B',
      destination: 'draw_top',
    });

    expect(state.players.B.zones.discardPile).not.toContain(second);
    expect(state.players.B.zones.drawPile[0]).toBe(second);
    expect(state.players.B.zones.graveyard).not.toContain(second);
  });

  test('the affected opponent may put the selected card in their Graveyard instead', () => {
    let { state } = accusationAftermath();
    const target = injectCard(state, 'B', 'neutral-rallying-cry', 'graveyard');
    replaceDiscardWith(state, 'B', [target]);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(pendingV070AccusationAftermath(state)).toEqual(
      expect.objectContaining({
        stage: 'destination',
        playerId: 'B',
        targetInstanceId: target,
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_accusation_destination',
      playerId: 'B',
      destination: 'graveyard',
    });

    expect(state.players.B.zones.discardPile).not.toContain(target);
    expect(state.players.B.zones.graveyard).toContain(target);
  });

  test('an empty opposing Discard Pile resolves as far as able and does not block normal cleanup', () => {
    let { state, accusation } = accusationAftermath();
    replaceDiscardWith(state, 'B', []);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(pendingV070AccusationAftermath(state)).toBeNull();
    expect(state.battle).toBeNull();
    expect(state.players.A.zones.graveyard).toContain(accusation);
    expect(state.events.some(event =>
      event.type === 'accusation_battle_resolved_empty_discard'
    )).toBe(true);
  });
});
