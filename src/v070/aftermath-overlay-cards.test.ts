import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  V070_NATURES_ALTAR_BATTLE_TEXT,
  V070_NATURES_ALTAR_ID,
  V070_SCORCHED_EARTH_BATTLE_TEXT,
  V070_SCORCHED_EARTH_ID,
} from './aftermath-overlay-cards';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import { isV070RuinsOverlay } from './overlays';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'aftermath-overlay-cards',
    seed: 'aftermath-overlay-cards-seed',
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

function injectHandCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `aftermath-overlay-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function revealGambits(
  state: V070GameState,
  aCard?: string,
  bCard?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aCard,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bCard,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function toOutcome(state: V070GameState): V070GameState {
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

function resolveOutcome(
  state: V070GameState,
  aDie: number,
  bDie: number,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [aDie],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [bDie],
  });
}

describe('current v0.7.2 Aftermath Overlay battle cards', () => {
  test('binds Nature\'s Altar and Scorched Earth to unchanged frozen/current authority', () => {
    for (const [cardId, text] of [
      [V070_NATURES_ALTAR_ID, V070_NATURES_ALTAR_BATTLE_TEXT],
      [V070_SCORCHED_EARTH_ID, V070_SCORCHED_EARTH_BATTLE_TEXT],
    ] as const) {
      expect(v070CanonicalContent.cardsById.get(cardId)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(text);
      expect(currentCanonicalContent.cardsById.get(cardId)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(text);
      expect(v070BattleEffectHandler(cardId)?.expectedText).toBe(text);
      expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(cardId);
    }
  });

  test('Nature\'s Altar opens an optional owner-win Aftermath placement and may be accepted', () => {
    let state = startBattle();
    const altar = injectHandCard(
      state,
      'A',
      V070_NATURES_ALTAR_ID,
      'accept',
    );
    const contested = state.board.find(
      territory => territory.position === state.battle!.contestedPosition,
    )!;

    state = revealGambits(state, altar);
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
      .toContainEqual(expect.objectContaining({
        owner: 'A',
        sourceInstanceId: altar,
        sourceCardId: V070_NATURES_ALTAR_ID,
        territoryInstanceId: contested.territoryInstanceId,
        condition: 'owner_win',
        optional: true,
      }));

    state = toOutcome(state);
    state = resolveOutcome(state, 6, 1);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toEqual(expect.objectContaining({
      playerId: 'A',
      candidateSourceInstanceIds: [altar],
    }));
    expect(state.overlays.some(overlay => overlay.instanceId === altar))
      .toBe(false);

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: altar,
    });

    expect(state.overlays).toContainEqual(expect.objectContaining({
      instanceId: altar,
      owner: 'A',
      territoryInstanceId: contested.territoryInstanceId,
    }));
    expect(state.players.A.zones.graveyard).not.toContain(altar);
  });

  test('Nature\'s Altar may be declined and then clears as a normal Gambit', () => {
    let state = startBattle();
    const altar = injectHandCard(
      state,
      'A',
      V070_NATURES_ALTAR_ID,
      'decline',
    );

    state = revealGambits(state, altar);
    state = toOutcome(state);
    state = resolveOutcome(state, 6, 1);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    state = reduceV070BattleAction(state, {
      type: 'pass_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: altar,
    });

    expect(state.overlays.some(overlay => overlay.instanceId === altar))
      .toBe(false);
    expect(state.players.A.zones.graveyard).toContain(altar);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_aftermath_controlled_effect_declined',
      payload: expect.objectContaining({
        sourceInstanceId: altar,
        sourceCardId: V070_NATURES_ALTAR_ID,
      }),
    }));
  });

  test('Scorched Earth becomes Ruins after its defending controller loses and retreats', () => {
    let state = startBattle();
    const scorched = injectHandCard(
      state,
      'B',
      V070_SCORCHED_EARTH_ID,
      'loss',
    );
    const contestedPosition = state.battle!.contestedPosition;
    const contested = state.board.find(
      territory => territory.position === contestedPosition,
    )!;

    state = revealGambits(state, undefined, scorched);
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
      .toContainEqual(expect.objectContaining({
        owner: 'B',
        sourceInstanceId: scorched,
        sourceCardId: V070_SCORCHED_EARTH_ID,
        territoryInstanceId: contested.territoryInstanceId,
        condition: 'owner_loss_after_retreat',
        asRuins: true,
      }));

    state = toOutcome(state);
    state = resolveOutcome(state, 6, 1);
    expect(state.battle?.loser).toBe('B');
    expect(state.battle?.positions.B).not.toBe(contestedPosition);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    const overlay = state.overlays.find(
      candidate => candidate.instanceId === scorched,
    );
    expect(overlay).toEqual(expect.objectContaining({
      owner: 'B',
      territoryInstanceId: contested.territoryInstanceId,
    }));
    expect(isV070RuinsOverlay(overlay!)).toBe(true);
    expect(state.players.B.zones.graveyard).not.toContain(scorched);
    expect(state.players.B.zones.discardPile).not.toContain(scorched);
  });

  test('Scorched Earth does not register for the attacker or an uncontrolled defense', () => {
    let attackerState = startBattle();
    const attacker = injectHandCard(
      attackerState,
      'A',
      V070_SCORCHED_EARTH_ID,
      'attacker',
    );
    attackerState = revealGambits(attackerState, attacker);
    expect(attackerState.battleRuntime?.battleCardAftermathOverlayPlacements)
      .not.toContainEqual(expect.objectContaining({
        sourceInstanceId: attacker,
      }));

    let uncontrolledState = startBattle();
    const contested = uncontrolledState.board.find(
      territory => territory.position === uncontrolledState.battle!.contestedPosition,
    )!;
    contested.controller = 'A';
    const defender = injectHandCard(
      uncontrolledState,
      'B',
      V070_SCORCHED_EARTH_ID,
      'uncontrolled',
    );
    uncontrolledState = revealGambits(
      uncontrolledState,
      undefined,
      defender,
    );
    expect(uncontrolledState.battleRuntime?.battleCardAftermathOverlayPlacements)
      .not.toContainEqual(expect.objectContaining({
        sourceInstanceId: defender,
      }));
  });
});
