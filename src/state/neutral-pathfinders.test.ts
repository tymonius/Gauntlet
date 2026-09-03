import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { applyPathfindersBattleEffects, PATHFINDERS } from './neutral-pathfinders';
import { territoryPrintedEffectIsActive } from './territory-printed-effects';
import { toPublicGameView } from './views';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-pathfinders-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: [PATHFINDERS, PATHFINDERS, 'card-valor'],
        territories: ['territory-high-ground', 'territory-watchtower', 'territory-garrison'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [PATHFINDERS, 'card-fortifications', 'card-attrition'],
        territories: ['territory-watchtower', 'territory-high-ground', 'territory-garrison'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
  return state;
}

function played(
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'hand',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId: PATHFINDERS,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    ...overrides,
  };
}

function participant(playerId: PlayerID, cards: BattlePlayedCard[] = []): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function revealTerritory(
  state: GameState,
  spaceId: string,
  territoryId: string,
  kind: 'territory' | 'arena' = 'territory',
): void {
  const space = state.board.spaces.find((candidate) => candidate.id === spaceId)!;
  space.kind = kind;
  space.territoryId = territoryId;
  space.revealed = true;
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
  territoryId = 'territory-high-ground',
  kind: 'territory' | 'arena' = 'territory',
): void {
  revealTerritory(state, 'space-1', territoryId, kind);
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'pathfinders-battle',
    stage: 'dice',
    location: 'space-1',
    attackerOrigin: 'player_1-heartland',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function playAction(state: GameState, spaceId = 'space-1'): GameState {
  state.players.player_1.zones.hand = [PATHFINDERS];
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: PATHFINDERS,
    targets: [{ kind: 'space', spaceId }],
  }).state;
}

describe('Neutral Pathfinders', () => {
  it('registers both canonical forms with a Territory target', () => {
    expect(getCardPlayRule(PATHFINDERS)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: true,
    });
  });

  it('requires exactly one Territory or Arena target', () => {
    const state = game();
    state.players.player_1.zones.hand = [PATHFINDERS];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: PATHFINDERS,
    })).toThrow(/exactly one Territory target/);

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: PATHFINDERS,
      targets: [{ kind: 'space', spaceId: 'player_1-heartland' }],
    })).toThrow(/only a Territory/);

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: PATHFINDERS,
      targets: [{ kind: 'card', cardId: PATHFINDERS, owner: 'player_1' }],
    })).toThrow(/exactly one Territory target/);
  });

  it('records a public suppression through the current movement sequence', () => {
    let state = game();
    revealTerritory(state, 'space-1', 'territory-watchtower');
    state = playAction(state);

    expect(state.players.player_1.zones.discard).toEqual([PATHFINDERS]);
    expect(state.neutralPathfindersSuppressions).toEqual([{
      playerId: 'player_1',
      spaceId: 'space-1',
      turn: 1,
    }]);
    expect(toPublicGameView(state).neutralPathfindersSuppressions)
      .toEqual(state.neutralPathfindersSuppressions);
  });

  it('turns off Watchtower during a battle initiated by the chosen movement', () => {
    let state = game();
    revealTerritory(state, 'space-1', 'territory-watchtower');
    state = playAction(state);
    state.phase = 'movement';

    state.board.spaces.find((space) => space.id === 'player_2-heartland')!.occupant = undefined;
    const watchtower = state.board.spaces.find((space) => space.id === 'space-1')!;
    watchtower.controller = 'player_2';
    watchtower.occupant = 'player_2';
    state.players.player_2.occupiedSpaceId = 'space-1';

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-1',
    }).state;

    expect(state.battle?.attackerHandCommitVisibleTo).toBeUndefined();
    expect(territoryPrintedEffectIsActive(state, state.board.spaces.find((space) => space.id === 'space-1'), 'player_1')).toBe(false);
  });

  it('leaves an unsuppressed Watchtower active', () => {
    let state = game();
    revealTerritory(state, 'space-1', 'territory-watchtower');
    state.phase = 'movement';
    state.board.spaces.find((space) => space.id === 'player_2-heartland')!.occupant = undefined;
    const watchtower = state.board.spaces.find((space) => space.id === 'space-1')!;
    watchtower.controller = 'player_2';
    watchtower.occupant = 'player_2';
    state.players.player_2.occupiedSpaceId = 'space-1';

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-1',
    }).state;

    expect(state.battle?.attackerHandCommitVisibleTo).toEqual(['player_2']);
  });

  it('expires the suppression after the turn ends', () => {
    let state = game();
    revealTerritory(state, 'space-1', 'territory-watchtower');
    state = playAction(state);
    state.phase = 'cleanup';

    state = applyGameAction(state, {
      type: 'end_turn',
      playerId: 'player_1',
    }).state;

    expect(state.turn).toBe(2);
    expect(state.neutralPathfindersSuppressions).toBeUndefined();
  });

  it('adds +1 per active copy for both players on a Territory with an active printed effect', () => {
    let state = game();
    beginBattle(
      state,
      [played('player_1'), played('player_1', 'battle_draw')],
      [played('player_2')],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.modifiers).toBe(2);
    expect(state.battle?.defender.modifiers).toBe(1);
    expect(state.battle?.resolvedModifiers).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerId: 'player_1', source: PATHFINDERS, amount: 2 }),
      expect.objectContaining({ playerId: 'player_2', source: PATHFINDERS, amount: 1 }),
    ]));
  });

  it('recognizes an Arena printed effect', () => {
    let state = game();
    beginBattle(state, [played('player_1')], [], 'territory-arena-spoils-of-war', 'arena');

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.modifiers).toBe(1);
  });

  it('does not add a bonus on a blank, face-down, or inactive printed effect', () => {
    let blank = game();
    beginBattle(blank, [played('player_1')], [], 'blank-territory');
    blank = applyGameAction(blank, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    expect(blank.battle?.attacker.modifiers).toBe(0);

    let hidden = game();
    beginBattle(hidden, [played('player_1')]);
    hidden.board.spaces.find((space) => space.id === 'space-1')!.revealed = false;
    hidden = applyGameAction(hidden, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    expect(hidden.battle?.attacker.modifiers).toBe(0);

    let suppressed = game();
    beginBattle(suppressed, [played('player_1')]);
    suppressed.neutralPathfindersSuppressions = [{
      playerId: 'player_1',
      spaceId: 'space-1',
      turn: suppressed.turn,
    }];
    suppressed = applyGameAction(suppressed, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    expect(suppressed.battle?.attacker.modifiers).toBe(0);
  });

  it('ignores canceled and negated copies and resolves only once', () => {
    let state = game();
    beginBattle(state, [
      played('player_1', 'hand', { canceled: true }),
      played('player_1', 'battle_draw', { negated: true }),
    ]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    applyPathfindersBattleEffects(state);

    expect(state.battle?.attacker.modifiers).toBe(0);
    expect(state.battle?.effectsResolved.filter((key) => key === 'neutral_pathfinders_battle')).toHaveLength(1);
  });
});
