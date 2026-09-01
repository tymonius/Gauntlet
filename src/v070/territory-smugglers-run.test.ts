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
import { bindV070CardFromPlayerZone } from './bindings';
import { viewV070GameForPlayer } from './views';
import {
  advanceV070FrontLine,
  nextV070FrontLineTarget,
} from './front-line';
import { placeV070OverlayFromHand } from './overlays';
import {
  V070_SMUGGLERS_RUN_BINDING_PURPOSE,
  V070_SMUGGLERS_RUN_ID,
} from './smugglers-run';

const militaryA = 'military-general-forward-doctrine';
const militaryB = 'military-commandant-holdfast';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'territory-smugglers-run',
    seed: 'territory-smugglers-run-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: militaryA },
      B: { name: 'Bravo', starterDeckId: militaryB },
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
  return state;
}

function inject(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `smugglers-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: playerId,
  };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function openingAtControlledSmugglersRun(): V070GameState {
  let state = readyGame();
  const position = state.players.A.position!;
  const territory = state.board[position]!;
  territory.territoryId = V070_SMUGGLERS_RUN_ID;
  territory.controller = 'A';
  territory.occupant = 'A';
  territory.blank = false;

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function moveToDenouement(state: V070GameState): V070GameState {
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'hold',
  });
}

function moveInstanceToHand(
  state: V070GameState,
  playerId: 'A' | 'B',
  instanceId: string,
): void {
  const player = state.players[playerId];
  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones.hand.push(instanceId);
}

function firstEligibleGambit(
  state: V070GameState,
  playerId: 'A' | 'B',
): string {
  const instance = Object.values(state.cardInstances).find(item =>
    item.owner === playerId
    && cardEligibleForV070BattleRole(item.cardId, 'gambit')
  );
  if (!instance) {
    throw new Error(`Fixture has no Gambit-eligible card for ${playerId}.`);
  }
  return instance.instanceId;
}

describe("v0.7.0 Smuggler's Run Territory", () => {
  test('stashing costs an Action, binds one Hand card face down, and keeps its identity private', () => {
    let state = openingAtControlledSmugglersRun();
    const card = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'privacy',
    );
    const actionsBefore = state.turnState!.actionsAvailable;

    state = reduceV070TurnAction(state, {
      type: 'stash_smugglers_run_card',
      playerId: 'A',
      cardInstanceId: card,
    });

    expect(state.turnState?.actionsAvailable).toBe(actionsBefore - 1);
    expect(state.players.A.zones.hand).not.toContain(card);
    expect(state.bindings).toEqual([
      expect.objectContaining({
        cardInstanceId: card,
        owner: 'A',
        faceUp: false,
        purpose: V070_SMUGGLERS_RUN_BINDING_PURPOSE,
      }),
    ]);

    const ownView = viewV070GameForPlayer(state, 'A');
    const opponentView = viewV070GameForPlayer(state, 'B');
    expect(ownView.bindings[0]?.card).toEqual({
      instanceId: card,
      cardId: 'neutral-rallying-cry',
    });
    expect(opponentView.bindings[0]?.card).toBeUndefined();
    expect(JSON.stringify(opponentView)).not.toContain(card);

    state = moveToDenouement(state);
    // Supply an explicit extra Action so this assertion reaches the
    // one-stash rule rather than failing on the normal one-Action turn budget.
    state.turnState!.actionsAvailable = 1;
    const second = inject(
      state,
      'A',
      'neutral-phantom-passage',
      'second',
    );
    expect(() => reduceV070TurnAction(state, {
      type: 'stash_smugglers_run_card',
      playerId: 'A',
      cardInstanceId: second,
    })).toThrow(/Only one card may be stashed/);
  });

  test('the stashed card can be played for its normal Action effect while here and controlling', () => {
    let state = openingAtControlledSmugglersRun();
    const card = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'action',
    );

    state = reduceV070TurnAction(state, {
      type: 'stash_smugglers_run_card',
      playerId: 'A',
      cardInstanceId: card,
    });
    state = moveToDenouement(state);
    // Stashing spent the normal Action. Supply one additional Action to
    // exercise the separate permission to play the stashed Action effect.
    state.turnState!.actionsAvailable = 1;
    const actionsBefore = state.turnState!.actionsAvailable;

    state = reduceV070TurnAction(state, {
      type: 'play_smugglers_run_stash_action',
      playerId: 'A',
    });

    expect(state.bindings).toHaveLength(0);
    expect(state.players.A.zones.discardPile).toContain(card);
    expect(state.turnState?.actionsAvailable).toBe(actionsBefore - 1);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'action_card_played',
        payload: expect.objectContaining({
          instanceId: card,
          cardId: 'neutral-rallying-cry',
        }),
      }),
    ]));
  });

  test('the stashed card can be set as a Gambit and is treated like a Hand Gambit', () => {
    let state = readyGame();
    state.players.A.position = 2;
    state.players.B.position = 3;
    for (const territory of state.board) territory.occupant = null;
    state.board[2]!.occupant = 'A';
    state.board[2]!.blank = true;
    const smugglersRun = state.board[3]!;
    smugglersRun.occupant = 'B';
    smugglersRun.controller = 'A';
    smugglersRun.territoryId = V070_SMUGGLERS_RUN_ID;
    smugglersRun.blank = false;

    const gambit = firstEligibleGambit(state, 'A');
    moveInstanceToHand(state, 'A', gambit);
    bindV070CardFromPlayerZone(state, {
      hostId: smugglersRun.territoryInstanceId,
      owner: 'A',
      cardInstanceId: gambit,
      sourceZone: 'hand',
      faceUp: false,
      purpose: V070_SMUGGLERS_RUN_BINDING_PURPOSE,
    });

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
    state = reduceV070BattleAction(state, {
      type: 'set_smugglers_run_gambit',
      playerId: 'A',
    });

    expect(state.bindings).toHaveLength(0);
    expect(state.battleRuntime?.participants.A.gambit).toMatchObject({
      instanceId: gambit,
      owner: 'A',
      role: 'gambit',
      faceUp: false,
    });
    expect(viewV070GameForPlayer(
      state,
      'B',
    ).battleRuntime?.participants.A.gambit).toEqual({
      set: true,
      faceUp: false,
    });
  });

  test('start-of-turn return requires control but not presence', () => {
    let state = readyGame();
    const startPosition = state.players.A.position!;
    const smugglersRun = state.board[startPosition]!;
    smugglersRun.territoryId = V070_SMUGGLERS_RUN_ID;
    smugglersRun.controller = 'A';
    smugglersRun.blank = false;

    const card = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'return',
    );
    bindV070CardFromPlayerZone(state, {
      hostId: smugglersRun.territoryInstanceId,
      owner: 'A',
      cardInstanceId: card,
      sourceZone: 'hand',
      faceUp: false,
      purpose: V070_SMUGGLERS_RUN_BINDING_PURPOSE,
    });

    const elsewhere = startPosition === 0 ? 1 : 0;
    smugglersRun.occupant = null;
    state.players.A.position = elsewhere;
    state.board[elsewhere]!.occupant = 'A';
    const actionsBefore = state.turnState!.actionsAvailable;

    state = reduceV070TurnAction(state, {
      type: 'return_smugglers_run_stash',
      playerId: 'A',
      territoryInstanceId: smugglersRun.territoryInstanceId,
    });

    expect(state.bindings).toHaveLength(0);
    expect(state.players.A.zones.hand).toContain(card);
    expect(state.turnState?.actionsAvailable).toBe(actionsBefore);
  });

  test('losing control discards the stash and reveals the discarded card publicly', () => {
    const state = readyGame();
    const target = nextV070FrontLineTarget(state, 'A');
    if (!target) throw new Error('Fixture has no opposing Front Line target.');
    target.territoryId = V070_SMUGGLERS_RUN_ID;
    target.blank = false;

    const card = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'control-loss',
    );
    bindV070CardFromPlayerZone(state, {
      hostId: target.territoryInstanceId,
      owner: 'B',
      cardInstanceId: card,
      sourceZone: 'hand',
      faceUp: false,
      purpose: V070_SMUGGLERS_RUN_BINDING_PURPOSE,
    });

    advanceV070FrontLine(state, 'A', 1, 'Smuggler test');

    expect(target.controller).toBe('A');
    expect(state.bindings).toHaveLength(0);
    expect(state.players.B.zones.discardPile).toContain(card);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'bound_card_released',
        visibility: 'public',
        payload: expect.objectContaining({
          destination: 'discard',
          cardInstanceId: card,
          cardId: 'neutral-rallying-cry',
        }),
      }),
    ]));
  });

  test('an exposed Overlay supersedes use of the printed stash effect', () => {
    let state = openingAtControlledSmugglersRun();
    const card = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'overlay-stash',
    );
    state = reduceV070TurnAction(state, {
      type: 'stash_smugglers_run_card',
      playerId: 'A',
      cardInstanceId: card,
    });

    const overlay = inject(
      state,
      'A',
      'mystics-circle-of-bones',
      'overlay',
    );
    placeV070OverlayFromHand(
      state,
      'A',
      overlay,
      state.players.A.position!,
      "Smuggler's Run test",
    );
    state = moveToDenouement(state);

    expect(() => reduceV070TurnAction(state, {
      type: 'play_smugglers_run_stash_action',
      playerId: 'A',
    })).toThrow(/printed effect is active/);
    expect(state.bindings).toEqual([
      expect.objectContaining({
        cardInstanceId: card,
        purpose: V070_SMUGGLERS_RUN_BINDING_PURPOSE,
      }),
    ]);
  });
});
