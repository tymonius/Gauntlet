import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import {
  openNextSuppliesChoice,
  queueSuppliesBattleEffects,
  SUPPLIES,
} from './neutral-supplies';

const FIRST = 'card-valor';
const SECOND = 'card-fortifications';
const THIRD = 'card-attrition';
const FOURTH = 'neutral-rallying-cry';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-supplies-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: [SUPPLIES, SUPPLIES, FIRST, SECOND, THIRD, FOURTH],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [FIRST, SECOND, THIRD],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
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

function participant(
  playerId: PlayerID,
  handCommit?: BattlePlayedCard,
  battleDrawPlayed: BattlePlayedCard[] = [],
): BattleParticipantState {
  return {
    playerId,
    handCommit,
    passedHandCommit: !handCommit,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed,
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, battleDrawPlayed.length),
    rerollsRemaining: 0,
    diceRoll: playerId === 'player_1' ? 6 : 1,
    modifiers: 0,
    retreated: false,
  };
}

function beginResolvedBattle(
  state: GameState,
  handCommit?: BattlePlayedCard,
  battleDrawPlayed: BattlePlayedCard[] = [],
): void {
  for (const space of state.board.spaces) space.occupant = undefined;
  state.board.spaces.find((space) => space.id === 'space-1')!.occupant = 'player_1';
  state.board.spaces.find((space) => space.id === 'space-2')!.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = 'space-1';
  state.players.player_2.occupiedSpaceId = 'space-2';
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'supplies-battle',
    stage: 'resolution',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1', handCommit, battleDrawPlayed),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

describe('Neutral Supplies', () => {
  it('registers both canonical forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(SUPPLIES)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.phase = 'action_before_movement';
    state.players.player_1.actionsRemaining = 1;
    state.players.player_1.hasPlayedActionThisTurn = false;
    state.players.player_1.zones.hand = [SUPPLIES];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: SUPPLIES,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([SUPPLIES]);
  });

  it('opens only after the normal start-of-turn draw and may discard the Asset to draw two', () => {
    let state = game();
    state.phase = 'turn_start';
    state.players.player_1.zones.assetBank = [SUPPLIES];
    state.players.player_1.zones.deck = [FIRST, SECOND, THIRD];

    const result = applyGameAction(state, {
      type: 'draw_card',
      playerId: 'player_1',
    });
    state = result.state;

    expect(result.result?.drawnCards).toEqual([FIRST]);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'supplies_asset',
      playerId: 'player_1',
      triggersRemaining: 1,
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual([]);
    expect(state.players.player_1.zones.discard).toEqual([SUPPLIES]);
    expect(state.players.player_1.zones.hand).toEqual([FIRST, SECOND, THIRD]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('allows multiple banked copies to be used sequentially or passed as a group', () => {
    let state = game();
    state.phase = 'turn_start';
    state.players.player_1.zones.assetBank = [SUPPLIES, SUPPLIES];
    state.players.player_1.zones.deck = [FIRST, SECOND, THIRD, FOURTH];

    state = applyGameAction(state, { type: 'draw_card', playerId: 'player_1' }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
    }).state;

    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'supplies_asset', triggersRemaining: 1 });
    expect(state.players.player_1.zones.assetBank).toEqual([SUPPLIES]);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual([SUPPLIES]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('uses the shared reshuffle behavior for the Asset draw', () => {
    let state = game();
    state.phase = 'turn_start';
    state.players.player_1.zones.assetBank = [SUPPLIES];
    state.players.player_1.zones.deck = [FIRST];
    state.players.player_1.zones.discard = [SECOND, THIRD];

    state = applyGameAction(state, { type: 'draw_card', playerId: 'player_1' }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
    }).state;

    expect(state.players.player_1.zones.hand).toContain(FIRST);
    expect(state.players.player_1.zones.hand).toHaveLength(3);
    expect(state.players.player_1.zones.discard).toEqual([]);
  });

  it('draws two during battle cleanup and requires one hand discard', () => {
    let state = game();
    state.players.player_1.zones.deck = [FIRST, SECOND, THIRD];
    beginResolvedBattle(state, played(SUPPLIES, 'player_1', 'hand'));

    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.zones.graveyard).toContain(SUPPLIES);
    expect(state.players.player_1.zones.hand).toEqual([FIRST, SECOND]);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'supplies_battle_discard',
      cardOptions: expect.arrayContaining([FIRST, SECOND]),
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: SECOND,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([FIRST]);
    expect(state.players.player_1.zones.discard).toContain(SECOND);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('stacks Battle copies as sequential draw-two/discard-one triggers', () => {
    let state = game();
    state.players.player_1.zones.deck = [FIRST, SECOND, THIRD, FOURTH];
    beginResolvedBattle(
      state,
      played(SUPPLIES, 'player_1', 'hand'),
      [played(SUPPLIES, 'player_1')],
    );

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.players.player_1.zones.hand).toEqual([FIRST, SECOND]);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: FIRST,
    }).state;

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'supplies_battle_discard',
      triggersRemaining: 1,
    });
    expect(state.players.player_1.zones.hand).toEqual(expect.arrayContaining([SECOND, THIRD, FOURTH]));

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: SECOND,
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.hand).toEqual(expect.arrayContaining([THIRD, FOURTH]));
    expect(state.players.player_1.zones.hand).toHaveLength(2);
  });

  it('ignores canceled and negated Battle copies', () => {
    let state = game();
    state.players.player_1.zones.deck = [FIRST, SECOND];
    beginResolvedBattle(
      state,
      played(SUPPLIES, 'player_1', 'hand', { canceled: true }),
      [played(SUPPLIES, 'player_1', 'battle_draw', { negated: true })],
    );

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.hand).toContain(SUPPLIES);
    expect(state.players.player_1.zones.discard).toContain(SUPPLIES);
  });

  it('queues behind an existing faction aftermath choice', () => {
    const state = game();
    beginResolvedBattle(state, played(SUPPLIES, 'player_1', 'hand'));
    const battle = structuredClone(state.battle!);
    state.pendingLeaderAbilityWindow = {
      playerId: 'player_1',
      timing: 'after_battle',
      battleId: 'supplies-battle',
    };

    expect(queueSuppliesBattleEffects(state, battle)).toBe(1);
    expect(openNextSuppliesChoice(state)).toBe(false);
    expect(state.neutralSuppliesBattleQueue).toHaveLength(1);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });
});
