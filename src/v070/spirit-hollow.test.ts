import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { advanceV070FrontLine, nextV070FrontLineTarget } from './front-line';
import { placeV070OverlayFromBattle } from './overlays';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'spirit-hollow-test',
    seed: 'spirit-hollow-test-seed',
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
  const instanceId = `spirit-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function injectHandCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = injectCard(state, owner, cardId, suffix);
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function injectGraveyardCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = injectCard(state, owner, cardId, suffix);
  state.players[owner].zones.graveyard.push(instanceId);
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

function winBattleAsA(state: V070GameState): V070GameState {
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

describe('v0.7.0 Spirit Hollow lifecycle', () => {
  test('a battle-played Spirit Hollow becomes the active Overlay and opens its same-Aftermath player windows after cards clear', () => {
    let state = startBattle();
    const contestedPosition = state.battle!.contestedPosition;
    const contestedTerritoryInstanceId = state.board.find(
      territory => territory.position === contestedPosition,
    )!.territoryInstanceId;
    const spiritHollow = injectHandCard(
      state,
      'A',
      'mystics-spirit-hollow',
      'battle',
    );

    state = revealGambits(state, spiritHollow);
    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
      .toContainEqual({
        owner: 'A',
        sourceInstanceId: spiritHollow,
        sourceCardId: 'mystics-spirit-hollow',
        territoryInstanceId: contestedTerritoryInstanceId,
        condition: 'always',
      });

    state = winBattleAsA(toOutcome(state));
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battleRuntime?.aftermathCardsCleared).toBe(true);
    expect(state.battleRuntime?.pendingSpiritHollowAftermath?.playerId)
      .toBe('A');
    expect(state.overlays).toContainEqual(
      expect.objectContaining({
        instanceId: spiritHollow,
        owner: 'A',
        territoryInstanceId: contestedTerritoryInstanceId,
      }),
    );
    expect(state.players.A.zones.graveyard).not.toContain(spiritHollow);
    expect(state.players.A.zones.discardPile).not.toContain(spiritHollow);
  });

  test('attacker then defender may use or decline Spirit Hollow, and recovery is limited to a preexisting Graveyard card', () => {
    let state = startBattle();
    const spiritHollow = injectHandCard(
      state,
      'A',
      'mystics-spirit-hollow',
      'choice',
    );
    const sacrifice = injectHandCard(
      state,
      'A',
      'neutral-new-recruits',
      'sacrifice',
    );
    const recovered = injectGraveyardCard(
      state,
      'A',
      'neutral-rallying-cry',
      'recover',
    );

    state = winBattleAsA(toOutcome(revealGambits(state, spiritHollow)));
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_spirit_hollow_aftermath',
      playerId: 'A',
      handInstanceId: sacrifice,
      graveyardInstanceId: sacrifice,
    })).toThrow(/already in that Graveyard/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_spirit_hollow_aftermath',
      playerId: 'A',
      handInstanceId: sacrifice,
      graveyardInstanceId: recovered,
    });

    expect(state.players.A.zones.hand).not.toContain(sacrifice);
    expect(state.players.A.zones.graveyard).toContain(sacrifice);
    expect(state.players.A.zones.graveyard).not.toContain(recovered);
    expect(state.players.A.zones.discardPile).toContain(recovered);
    expect(state.battleRuntime?.pendingSpiritHollowAftermath?.playerId)
      .toBe('B');

    const publicResolution = [...state.events].reverse().find(event =>
      event.type === 'spirit_hollow_aftermath_resolved'
      && event.visibility === 'public'
    );
    expect(JSON.stringify(publicResolution?.payload)).not.toContain(sacrifice);
    expect(JSON.stringify(publicResolution?.payload)).not.toContain(recovered);
    const privateIdentity = [...state.events].reverse().find(event =>
      event.type === 'spirit_hollow_aftermath_identity'
      && event.visibility === 'A'
    );
    expect(JSON.stringify(privateIdentity?.payload)).toContain(sacrifice);
    expect(JSON.stringify(privateIdentity?.payload)).toContain(recovered);

    state = reduceV070BattleAction(state, {
      type: 'resolve_spirit_hollow_aftermath',
      playerId: 'B',
    });
    expect(state.battleRuntime?.pendingSpiritHollowAftermath ?? null)
      .toBeNull();
    expect(state.battleRuntime?.spiritHollowAftermathPlayers ?? [])
      .toEqual([]);
  });

  test('capture graveyards Spirit Hollow and Circle of Bones even when another Overlay covers them', () => {
    const state = startBattle();
    const target = nextV070FrontLineTarget(state, 'A');
    expect(target).not.toBeNull();

    const spiritHollow = injectCard(
      state,
      'A',
      'mystics-spirit-hollow',
      'covered-spirit',
    );
    const circleOfBones = injectCard(
      state,
      'B',
      'mystics-circle-of-bones',
      'covered-circle',
    );
    const coveringOverlay = injectCard(
      state,
      'A',
      'neutral-battlefield-plunder',
      'cover',
    );

    placeV070OverlayFromBattle(
      state,
      'A',
      spiritHollow,
      target!.position,
      'test',
    );
    placeV070OverlayFromBattle(
      state,
      'B',
      circleOfBones,
      target!.position,
      'test',
    );
    placeV070OverlayFromBattle(
      state,
      'A',
      coveringOverlay,
      target!.position,
      'test',
    );

    advanceV070FrontLine(state, 'A', 1, 'test_capture');

    expect(state.players.A.zones.graveyard).toContain(spiritHollow);
    expect(state.players.B.zones.graveyard).toContain(circleOfBones);
    expect(state.overlays.some(
      overlay => overlay.instanceId === spiritHollow,
    )).toBe(false);
    expect(state.overlays.some(
      overlay => overlay.instanceId === circleOfBones,
    )).toBe(false);
    expect(state.overlays.some(
      overlay => overlay.instanceId === coveringOverlay,
    )).toBe(true);
  });
});
