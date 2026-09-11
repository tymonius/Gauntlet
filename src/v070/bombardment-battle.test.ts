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
  V070_BOMBARDMENT_BATTLE_TEXT,
  V070_BOMBARDMENT_ID,
} from './bombardment-battle';
import {
  activeV070Overlay,
  resolveV070OverlayCaptureEffects,
} from './overlays';
import {
  isV070RuinsOverlay,
  turnV070OverlayIntoRuins,
} from './overlay-ruins';
import { v070PrintedTerritoryEffectActive } from './territories';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'bombardment-battle-test',
    seed: 'bombardment-battle-seed',
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

function injectBombardment(state: V070GameState, suffix: string): string {
  const instanceId = `bombardment-battle-A-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: V070_BOMBARDMENT_ID,
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

function revealBombardment(): {
  state: V070GameState;
  bombardment: string;
} {
  let state = startBattle();
  const bombardment = injectBombardment(state, 'source');
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: bombardment,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
  return { state, bombardment };
}

function finishBattleOutcome(
  state: V070GameState,
  attackerDie: number,
  defenderDie: number,
): V070GameState {
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
    values: [attackerDie],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [defenderDie],
  });
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath',
    playerId: 'A',
  });
}

describe('v0.7.0 Bombardment battle effect', () => {
  test('binds to released authority and advertises Bombardment as supported', () => {
    const card = v070CanonicalContent.cardsById.get(V070_BOMBARDMENT_ID);
    expect(card?.card_form).toBeNull();
    expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_BOMBARDMENT_BATTLE_TEXT);
    expect(card?.effects.some(effect => effect.label === 'Overlay')).toBe(true);
    expect(v070BattleEffectHandler(V070_BOMBARDMENT_ID)?.expectedText)
      .toBe(V070_BOMBARDMENT_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_BOMBARDMENT_ID);
  });

  test('an attacking Gambit reveal places Bombardment face up on the contested Territory', () => {
    const { state, bombardment } = revealBombardment();
    const overlay = state.overlays.find(item => item.instanceId === bombardment);

    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(overlay).toEqual(expect.objectContaining({
      instanceId: bombardment,
      owner: 'A',
      territoryInstanceId: state.board[3].territoryInstanceId,
    }));
    expect(isV070RuinsOverlay(overlay!)).toBe(false);
    expect(activeV070Overlay(state, 3)?.instanceId).toBe(bombardment);
  });

  test('Bombardment covers the Territory before and after becoming Ruins', () => {
    const { state, bombardment } = revealBombardment();
    const territory = state.board[3];
    territory.blank = false;

    expect(v070PrintedTerritoryEffectActive(state, territory, 'A', 'battle'))
      .toBe(false);

    expect(turnV070OverlayIntoRuins(state, bombardment, 'test')).toBe(true);
    expect(isV070RuinsOverlay(state.overlays[0])).toBe(true);
    expect(activeV070Overlay(state, 3)?.instanceId).toBe(bombardment);
    expect(v070PrintedTerritoryEffectActive(state, territory, 'A', 'battle'))
      .toBe(false);
  });

  test('winning the attack turns Bombardment into an attached Ruins Overlay', () => {
    const revealed = revealBombardment();
    const state = finishBattleOutcome(revealed.state, 6, 1);
    const overlay = state.overlays.find(
      item => item.instanceId === revealed.bombardment,
    );

    expect(overlay).toBeDefined();
    expect(isV070RuinsOverlay(overlay!)).toBe(true);
    expect(state.players.A.zones.graveyard).not.toContain(revealed.bombardment);
    expect(state.players.A.zones.discardPile).not.toContain(revealed.bombardment);
  });

  test('losing the attack removes Bombardment and puts it in its owner Graveyard', () => {
    const revealed = revealBombardment();
    const state = finishBattleOutcome(revealed.state, 1, 6);

    expect(state.overlays.some(item => item.instanceId === revealed.bombardment))
      .toBe(false);
    expect(state.players.A.zones.graveyard).toContain(revealed.bombardment);
    expect(state.players.A.zones.discardPile).not.toContain(revealed.bombardment);
  });

  test('capturing the Territory without a battle turns Bombardment into Ruins', () => {
    const { state, bombardment } = revealBombardment();

    resolveV070OverlayCaptureEffects(
      state,
      3,
      'bombardment battleless capture regression',
    );

    const overlay = state.overlays.find(item => item.instanceId === bombardment);
    expect(overlay).toBeDefined();
    expect(isV070RuinsOverlay(overlay!)).toBe(true);
    expect(state.players.A.zones.graveyard).not.toContain(bombardment);
  });
});
