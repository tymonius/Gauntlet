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
  V070_ACT_OF_FAITH_BATTLE_TEXT,
  V070_ACT_OF_FAITH_ID,
  pendingV070ActOfFaithAftermath,
} from './act-of-faith-battle';
import {
  V070_ACCUSATION_ID,
  pendingV070AccusationAftermath,
} from './accusation-battle';
import { viewV070GameForPlayer } from './views';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'act-of-faith-battle-test',
    seed: 'act-of-faith-battle-seed',
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
  const instanceId = `act-of-faith-${owner}-${suffix}`;
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

function chooseNoTactics(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

function rollToAftermath(state: V070GameState): V070GameState {
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

function actOfFaithAftermath(): {
  state: V070GameState;
  actOfFaith: string;
} {
  let state = startBattle();
  const actOfFaith = injectCard(
    state,
    'A',
    V070_ACT_OF_FAITH_ID,
    'source',
  );
  state = setGambits(state, actOfFaith);
  state = revealGambits(state);
  state = chooseNoTactics(state);
  state = rollToAftermath(state);
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return { state, actOfFaith };
}

function putOnTopOfDrawPile(
  state: V070GameState,
  playerId: 'A' | 'B',
  instanceIds: string[],
): void {
  const drawPile = state.players[playerId].zones.drawPile;
  drawPile.unshift(...instanceIds);
}

function clearDiscardPile(
  state: V070GameState,
  playerId: 'A' | 'B',
): void {
  const zones = state.players[playerId].zones;
  zones.graveyard.push(...zones.discardPile);
  zones.discardPile = [];
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

describe('v0.7.0 Act of Faith battle effect', () => {
  test('binds to released authority and advertises Act of Faith as supported', () => {
    const card = v070CanonicalContent.cardsById.get(V070_ACT_OF_FAITH_ID);
    expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_ACT_OF_FAITH_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_ACT_OF_FAITH_ID)?.expectedText)
      .toBe(V070_ACT_OF_FAITH_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_ACT_OF_FAITH_ID);
  });

  test('registers at reveal without weakening unsupported-effect atomicity', () => {
    let supported = startBattle();
    const actOfFaith = injectCard(
      supported,
      'A',
      V070_ACT_OF_FAITH_ID,
      'register',
    );
    supported = setGambits(supported, actOfFaith);
    supported = revealGambits(supported);

    expect(supported.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(supported.battleRuntime?.actOfFaithBattleSourceInstanceIds)
      .toEqual([actOfFaith]);
    expect(supported.battleRuntime?.stage).toBe('choose_tactics');

    let blocked = startBattle();
    const blockedAct = injectCard(
      blocked,
      'A',
      V070_ACT_OF_FAITH_ID,
      'blocked',
    );
    const unsupported = unsupportedGambit(blocked, 'B');
    blocked = setGambits(blocked, blockedAct, unsupported);
    blocked = revealGambits(blocked);

    expect(blocked.battleRuntime?.stage).toBe('halted');
    expect(blocked.battleRuntime?.actOfFaithBattleSourceInstanceIds ?? [])
      .not.toContain(blockedAct);
  });

  test('chooses a private reveal count before exposing any Draw Pile identities', () => {
    let { state } = actOfFaithAftermath();
    const first = injectCard(state, 'B', 'neutral-rallying-cry', 'hidden-one');
    const second = injectCard(state, 'B', 'neutral-forced-march', 'hidden-two');
    putOnTopOfDrawPile(state, 'B', [first, second]);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battleRuntime?.aftermathCardsCleared).toBe(false);
    expect(pendingV070ActOfFaithAftermath(state)).toEqual(expect.objectContaining({
      stage: 'reveal_count',
      playerId: 'A',
      owner: 'A',
      opponent: 'B',
      maximumRevealCount: 2,
      candidateInstanceIds: [],
    }));
    expect(viewV070GameForPlayer(state, 'A').pendingActOfFaithAftermath)
      .toEqual(expect.objectContaining({
        stage: 'reveal_count',
        maximumRevealCount: 2,
        candidateCount: 0,
      }));
    expect(viewV070GameForPlayer(state, 'A').pendingActOfFaithAftermath)
      .not.toHaveProperty('candidateInstanceIds');
    expect(viewV070GameForPlayer(state, 'B').pendingActOfFaithAftermath)
      .not.toHaveProperty('candidateInstanceIds');
  });

  test('may reveal zero cards and continue normal Aftermath cleanup', () => {
    let { state, actOfFaith } = actOfFaithAftermath();
    const first = injectCard(state, 'B', 'neutral-rallying-cry', 'declined');
    putOnTopOfDrawPile(state, 'B', [first]);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_act_of_faith_reveal_count',
      playerId: 'A',
      revealCount: 0,
    });

    expect(state.battle).toBeNull();
    expect(state.players.B.zones.drawPile[0]).toBe(first);
    expect(state.players.B.zones.graveyard).not.toContain(first);
    expect(state.players.A.zones.graveyard).toContain(actOfFaith);
  });

  test('revealing one card puts that card in the opponent Graveyard', () => {
    let { state } = actOfFaithAftermath();
    const first = injectCard(state, 'B', 'neutral-rallying-cry', 'single-one');
    const second = injectCard(state, 'B', 'neutral-forced-march', 'single-two');
    putOnTopOfDrawPile(state, 'B', [first, second]);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_act_of_faith_reveal_count',
      playerId: 'A',
      revealCount: 1,
    });

    expect(state.players.B.zones.graveyard).toContain(first);
    expect(state.players.B.zones.drawPile[0]).toBe(second);
    expect(state.events.some(event =>
      event.type === 'act_of_faith_battle_cards_revealed'
      && (event.payload as { candidateInstanceIds?: string[] })
        .candidateInstanceIds?.[0] === first
    )).toBe(true);
  });

  test('revealing two cards makes their identities public, then Graveyards one and discards the other', () => {
    let { state } = actOfFaithAftermath();
    const first = injectCard(state, 'B', 'neutral-rallying-cry', 'pair-one');
    const second = injectCard(state, 'B', 'neutral-forced-march', 'pair-two');
    putOnTopOfDrawPile(state, 'B', [first, second]);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_act_of_faith_reveal_count',
      playerId: 'A',
      revealCount: 2,
    });

    expect(pendingV070ActOfFaithAftermath(state)).toEqual(expect.objectContaining({
      stage: 'graveyard',
      candidateInstanceIds: [first, second],
    }));
    expect(viewV070GameForPlayer(state, 'A').pendingActOfFaithAftermath)
      .toEqual(expect.objectContaining({
        candidateInstanceIds: [first, second],
      }));
    expect(viewV070GameForPlayer(state, 'B').pendingActOfFaithAftermath)
      .toEqual(expect.objectContaining({
        candidateInstanceIds: [first, second],
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_act_of_faith_graveyard',
      playerId: 'A',
      graveyardInstanceId: second,
    });

    expect(state.players.B.zones.graveyard).toContain(second);
    expect(state.players.B.zones.discardPile).toContain(first);
    expect(state.players.B.zones.drawPile).not.toContain(first);
    expect(state.players.B.zones.drawPile).not.toContain(second);
  });

  test('shares core Aftermath ordering with Accusation by source instance', () => {
    let state = startBattle();
    const actOfFaith = injectCard(
      state,
      'A',
      V070_ACT_OF_FAITH_ID,
      'ordered-act',
    );
    state = setGambits(state, actOfFaith);
    state = revealGambits(state);

    const accusation = injectCard(
      state,
      'A',
      V070_ACCUSATION_ID,
      'ordered-accusation',
    );
    state.battleRuntime!.participants.A.reserve.push(accusation);
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: accusation,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = rollToAftermath(state);

    clearDiscardPile(state, 'B');
    const first = injectCard(state, 'B', 'neutral-rallying-cry', 'ordered-one');
    const second = injectCard(state, 'B', 'neutral-forced-march', 'ordered-two');
    putOnTopOfDrawPile(state, 'B', [first, second]);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battleRuntime?.pendingBattleAftermathControlledEffectChoice)
      .toEqual(expect.objectContaining({
        playerId: 'A',
        candidateSourceInstanceIds: expect.arrayContaining([
          actOfFaith,
          accusation,
        ]),
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: actOfFaith,
    });
    expect(pendingV070ActOfFaithAftermath(state)?.stage).toBe('reveal_count');

    state = reduceV070BattleAction(state, {
      type: 'resolve_act_of_faith_reveal_count',
      playerId: 'A',
      revealCount: 2,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_act_of_faith_graveyard',
      playerId: 'A',
      graveyardInstanceId: first,
    });

    expect(state.players.B.zones.discardPile).toEqual([second]);
    expect(pendingV070AccusationAftermath(state)).toEqual(expect.objectContaining({
      sourceInstanceId: accusation,
      stage: 'destination',
      targetInstanceId: second,
    }));
  });
});
