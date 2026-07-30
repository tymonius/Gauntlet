import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { INVASION } from './neutral-invasion';
import { toPrivateGameView, toPublicGameView } from './views';

const VALOR = 'card-valor';
const FORCED_MARCH = 'neutral-forced-march';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-invasion-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Attacker',
        factionId: 'military',
        leaderName: 'General',
        deck: [INVASION, INVASION, VALOR, FORCED_MARCH],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: ['d1', 'd2', 'd3'],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.movementRemaining = 1;
  state.players.player_1.invasionAdvanceMovementRemaining = 0;
  return state;
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId,
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
    initialBattleHand: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
): void {
  for (const space of state.board.spaces) space.occupant = undefined;
  const origin = state.board.spaces.find((space) => space.id === 'space-2')!;
  const location = state.board.spaces.find((space) => space.id === 'space-3')!;
  origin.occupant = 'player_1';
  location.kind = 'territory';
  location.controller = 'player_2';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'invasion-battle',
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function playAction(state: GameState): GameState {
  state.players.player_1.zones.hand = [INVASION];
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: INVASION,
  }).state;
}

describe('Neutral Invasion', () => {
  it('registers both canonical forms and grants two advance-only movements from its Action form', () => {
    expect(getCardPlayRule(INVASION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
    });

    const state = playAction(game());
    expect(state.players.player_1.zones.discard).toEqual([INVASION]);
    expect(state.players.player_1.movementRemaining).toBe(3);
    expect(state.players.player_1.invasionAdvanceMovementRemaining).toBe(2);
  });

  it('can be played only before movement and is omitted from later legal Action plays', () => {
    const state = game();
    state.phase = 'action_after_movement';
    state.players.player_1.zones.hand = [INVASION];
    expect(toPrivateGameView(state, 'player_1').legalActionPlays).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ cardId: INVASION })]),
    );
    expect(() => playAction(state)).toThrow(/only during the Action Opportunity before movement/);
  });

  it('spends Invasion movement on advances before ordinary movement and preserves the ordinary position', () => {
    let state = playAction(game());
    state.phase = 'movement';

    state = applyGameAction(state, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    expect(state.players.player_1.movementRemaining).toBe(2);
    expect(state.players.player_1.invasionAdvanceMovementRemaining).toBe(1);
    expect(state.phase).toBe('movement');

    state = applyGameAction(state, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-2' }).state;
    expect(state.players.player_1.movementRemaining).toBe(1);
    expect(state.players.player_1.invasionAdvanceMovementRemaining).toBe(0);

    state = applyGameAction(state, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    expect(state.players.player_1.movementRemaining).toBe(0);
    expect(state.players.player_1.occupiedSpaceId).toBe('space-1');
  });

  it('does not allow its remaining marked movement to move backward', () => {
    const state = game();
    for (const space of state.board.spaces) space.occupant = undefined;
    state.board.spaces.find((space) => space.id === 'space-2')!.occupant = 'player_1';
    state.players.player_1.occupiedSpaceId = 'space-2';
    state.phase = 'movement';
    state.players.player_1.movementRemaining = 1;
    state.players.player_1.invasionAdvanceMovementRemaining = 1;

    expect(() => applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-1',
    })).toThrow(/only to advance/);
  });

  it('loses all unused movement when a battle begins and clears across movement and turn endings', () => {
    let state = playAction(game());
    state.phase = 'movement';
    state.board.spaces.find((space) => space.id === 'player_2-heartland')!.occupant = undefined;
    state.board.spaces.find((space) => space.id === 'space-1')!.occupant = 'player_2';
    state.players.player_2.occupiedSpaceId = 'space-1';

    state = applyGameAction(state, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    expect(state.battle?.attacker.playerId).toBe('player_1');
    expect(state.players.player_1.movementRemaining).toBe(0);
    expect(state.players.player_1.invasionAdvanceMovementRemaining).toBe(0);

    const finished = game();
    finished.phase = 'movement';
    finished.players.player_1.movementRemaining = 2;
    finished.players.player_1.invasionAdvanceMovementRemaining = 1;
    const afterFinish = applyGameAction(finished, { type: 'finish_movement', playerId: 'player_1' }).state;
    expect(afterFinish.players.player_1.invasionAdvanceMovementRemaining).toBe(0);

    const ending = game();
    ending.players.player_1.invasionAdvanceMovementRemaining = 2;
    const afterTurn = applyGameAction(ending, { type: 'end_turn', playerId: 'player_1' }).state;
    expect(afterTurn.players.player_1.invasionAdvanceMovementRemaining).toBe(0);
    expect(toPublicGameView(afterTurn).players.player_1.invasionAdvanceMovementRemaining).toBe(0);
  });

  it('pauses reveal for the attacker to play the additional Battle card and keeps the choice private', () => {
    let state = game();
    state.players.player_1.zones.deck = [VALOR];
    beginBattle(state, [played(INVASION, 'player_1')]);

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'invasion_battle', drawnCardId: VALOR });
    expect(toPublicGameView(state).pendingNeutralChoice).toBeUndefined();
    expect(toPrivateGameView(state, 'player_1').pendingNeutralChoice).toMatchObject({ kind: 'invasion_battle' });
    expect(state.battle?.effectsResolved).not.toContain('before_battle_resolution');

    state = applyGameAction(state, { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle?.attacker.battleDrawPlayed).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: VALOR, faceDown: false, fromInitialBattleHand: false }),
    ]));
    expect(state.battle?.attacker.modifiers).toBe(2);
  });

  it('discards a passed additional card normally during battle cleanup', () => {
    let state = game();
    state.players.player_1.zones.deck = [VALOR];
    beginBattle(state, [played(INVASION, 'player_1')]);
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'pass' }).state;
    expect(state.battle?.attacker.battleDraw).toContain(VALOR);

    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 6 }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', value: 1 }).state;
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.players.player_1.zones.discard).toContain(VALOR);
  });

  it('stacks multiple active attacker copies and resolves each additional card in sequence', () => {
    let state = game();
    state.players.player_1.zones.deck = [VALOR, FORCED_MARCH];
    beginBattle(state, [played(INVASION, 'player_1'), played(INVASION, 'player_1')]);

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ drawnCardId: VALOR });
    state = applyGameAction(state, { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'invasion_battle', drawnCardId: FORCED_MARCH });
    state = applyGameAction(state, { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use' }).state;

    expect(state.battle?.attacker.battleDrawPlayed).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: VALOR }),
      expect.objectContaining({ cardId: FORCED_MARCH }),
    ]));
    expect(state.battle?.attacker.modifiers).toBe(3);
  });

  it('does not trigger while defending and ignores canceled, negated, or virtual copies', () => {
    let defender = game();
    defender.players.player_1.zones.deck = [VALOR];
    beginBattle(defender, [], [played(INVASION, 'player_2')]);
    defender = applyGameAction(defender, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(defender.pendingNeutralChoice).toBeUndefined();

    for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      let state = game();
      state.players.player_1.zones.deck = [VALOR];
      beginBattle(state, [played(INVASION, 'player_1', 'battle_draw', overrides)]);
      state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
      expect(state.pendingNeutralChoice).toBeUndefined();
      expect(state.battle?.attacker.battleDraw).toEqual([]);
    }
  });
});
