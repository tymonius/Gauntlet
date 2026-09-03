import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, BattleState, GameState, PlayerID } from '../types/v06';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import { initializeGame } from './initialize';
import {
  exchangeHandAndGraveyard,
  openNextSoulForSoulBattleChoice,
  queueSoulForSoulBattleEffects,
} from './mystics-soul-for-soul';
import { toPrivateGameView, toPublicGameView } from './views';

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw',
  canceled = false,
): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled };
}

function game(leaderName = 'Spirit Walker'): GameState {
  const state = initializeGame({
    id: 'mystics-soul-for-soul-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName,
        deck: ['mystics-soul-for-soul', 'card-valor', 'card-fortifications'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function resolvedBattle(): BattleState {
  return {
    id: 'soul-for-soul-battle',
    stage: 'resolution',
    location: 'space-4',
    attackerOrigin: 'space-3',
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function recordResult(state: GameState, battle: BattleState, handCards: string[]): void {
  state.recentBattleResult = {
    battleId: battle.id,
    turn: state.turn,
    winner: 'player_1',
    loser: 'player_2',
    attacker: 'player_1',
    defender: 'player_2',
    location: battle.location,
    attackerOrigin: battle.attackerOrigin,
    retreatDirection: 1,
    handCommittedCards: { player_1: handCards, player_2: [] },
  };
  state.phase = 'action_after_movement';
}

describe('Soul for Soul Action effect', () => {
  it('requires ordered hand and Graveyard targets and excludes the source card', () => {
    const state = game();
    state.players.player_1.zones.hand = ['mystics-soul-for-soul', 'hand-card'];
    state.players.player_1.zones.graveyard = ['grave-card'];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-soul-for-soul',
    })).toThrow(/requires one hand card/i);

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-soul-for-soul',
      targets: [
        { kind: 'card', owner: 'player_1', cardId: 'mystics-soul-for-soul' },
        { kind: 'card', owner: 'player_1', cardId: 'grave-card' },
      ],
    })).toThrow(/another card in your hand/i);
    expect(state.players.player_1.zones.hand).toEqual(['mystics-soul-for-soul', 'hand-card']);
  });

  it('atomically exchanges zones, follows the source destination, and triggers Materia Prima', () => {
    let state = game('Alchemist');
    state.players.player_1.zones.hand = ['mystics-soul-for-soul', 'hand-card'];
    state.players.player_1.zones.graveyard = ['grave-card'];
    state.players.player_1.zones.deck = ['card-valor'];

    expect(buildGuidedOptions(state).map((option) => option.action)).toContainEqual({
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-soul-for-soul',
      targets: [
        { kind: 'card', owner: 'player_1', cardId: 'hand-card' },
        { kind: 'card', owner: 'player_1', cardId: 'grave-card' },
      ],
    });

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-soul-for-soul',
      targets: [
        { kind: 'card', owner: 'player_1', cardId: 'hand-card' },
        { kind: 'card', owner: 'player_1', cardId: 'grave-card' },
      ],
    }).state;

    expect(state.players.player_1.zones.hand).toEqual(expect.arrayContaining(['grave-card', 'card-valor']));
    expect(state.players.player_1.zones.hand).not.toContain('hand-card');
    expect(state.players.player_1.zones.graveyard).toContain('hand-card');
    expect(state.players.player_1.zones.graveyard).not.toContain('grave-card');
    expect(state.players.player_1.zones.discard).toContain('mystics-soul-for-soul');
    expect(state.players.player_1.mystics?.materiaPrimaUsedTurn).toBe(state.turn);
  });

  it('supports matching card IDs in both zones', () => {
    let state = game();
    state.players.player_1.zones.hand = ['mystics-soul-for-soul', 'duplicate'];
    state.players.player_1.zones.graveyard = ['duplicate'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-soul-for-soul',
      targets: [
        { kind: 'card', owner: 'player_1', cardId: 'duplicate' },
        { kind: 'card', owner: 'player_1', cardId: 'duplicate' },
      ],
    }).state;

    expect(state.players.player_1.zones.hand).toEqual(['duplicate']);
    expect(state.players.player_1.zones.graveyard).toEqual(['duplicate']);
  });

  it('does not partially move either card when one is missing', () => {
    const state = game();
    state.players.player_1.zones.hand = ['hand-card'];
    state.players.player_1.zones.graveyard = [];

    expect(() => exchangeHandAndGraveyard(
      state,
      'player_1',
      'hand-card',
      'missing-card',
      'test',
    )).toThrow(/original zones/i);
    expect(state.players.player_1.zones.hand).toEqual(['hand-card']);
    expect(state.players.player_1.zones.graveyard).toEqual([]);
  });
});

describe('Soul for Soul Battle effect', () => {
  it('excludes a hand-committed source card and opens a private optional exchange', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.attacker.handCommit = played('mystics-soul-for-soul', 'player_1', 'hand');
    state.players.player_1.zones.hand = ['current-hand'];
    state.players.player_1.zones.graveyard = ['mystics-soul-for-soul', 'other-commitment'];
    recordResult(state, battle, ['mystics-soul-for-soul', 'other-commitment']);

    expect(queueSoulForSoulBattleEffects(state, battle)).toBe(1);
    expect(openNextSoulForSoulBattleChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'soul_for_soul_battle',
      handOptions: ['current-hand'],
      graveyardOptions: ['other-commitment'],
    });
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual(expect.arrayContaining([
      { type: 'resolve_mystics_choice', playerId: 'player_1', choice: 'pass' },
      {
        type: 'resolve_mystics_choice',
        playerId: 'player_1',
        choice: 'exchange',
        cardId: 'current-hand',
        secondaryCardId: 'other-commitment',
      },
    ]));
  });

  it('allows a Battle Hand source to exchange for a hand-committed Soul for Soul', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.attacker.handCommit = played('mystics-soul-for-soul', 'player_1', 'hand');
    battle.attacker.battleDrawPlayed = [played('mystics-soul-for-soul', 'player_1', 'battle_draw')];
    state.players.player_1.zones.hand = ['current-hand'];
    state.players.player_1.zones.graveyard = ['mystics-soul-for-soul'];
    recordResult(state, battle, ['mystics-soul-for-soul']);

    queueSoulForSoulBattleEffects(state, battle);
    openNextSoulForSoulBattleChoice(state);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'soul_for_soul_battle',
      sourceKey: 'player_1:battle_draw:0',
      graveyardOptions: ['mystics-soul-for-soul'],
    });
  });

  it('exchanges through the top-level reducer, triggers Materia Prima, and then opens Grave Ward', () => {
    let state = game('Alchemist');
    const battle = resolvedBattle();
    battle.attacker.battleDrawPlayed = [played('mystics-soul-for-soul', 'player_1', 'battle_draw')];
    state.players.player_1.zones.hand = ['current-hand'];
    state.players.player_1.zones.graveyard = ['committed-card'];
    state.players.player_1.zones.assetBank = ['mystics-grave-ward'];
    state.players.player_1.zones.deck = ['card-valor'];
    recordResult(state, battle, ['committed-card']);
    queueSoulForSoulBattleEffects(state, battle);
    openNextSoulForSoulBattleChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'exchange',
      cardId: 'current-hand',
      secondaryCardId: 'committed-card',
    }).state;

    expect(state.players.player_1.zones.hand).toEqual(expect.arrayContaining(['committed-card', 'card-valor']));
    expect(state.players.player_1.zones.graveyard).toContain('current-hand');
    expect(state.players.player_1.mystics?.materiaPrimaUsedTurn).toBe(state.turn);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'grave_ward_asset',
      cardId: 'current-hand',
    });
  });

  it('passes or resolves multiple active copies sequentially and ignores canceled copies', () => {
    let state = game();
    const battle = resolvedBattle();
    battle.attacker.handCommit = played('mystics-soul-for-soul', 'player_1', 'hand', true);
    battle.attacker.battleDrawPlayed = [
      played('mystics-soul-for-soul', 'player_1', 'battle_draw'),
      played('mystics-soul-for-soul', 'player_1', 'battle_draw'),
    ];
    state.players.player_1.zones.hand = ['hand-a', 'hand-b'];
    state.players.player_1.zones.graveyard = ['grave-a', 'grave-b'];
    recordResult(state, battle, ['grave-a', 'grave-b']);

    expect(queueSoulForSoulBattleEffects(state, battle)).toBe(2);
    openNextSoulForSoulBattleChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;
    expect(state.pendingMysticsChoice).toMatchObject({ kind: 'soul_for_soul_battle' });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'exchange',
      cardId: 'hand-a',
      secondaryCardId: 'grave-a',
    }).state;
    expect(state.pendingMysticsChoice).toBeUndefined();
    expect(state.players.player_1.zones.hand).toContain('grave-a');
  });

  it('auto-skips when either exchange zone has no eligible card', () => {
    const state = game();
    const battle = resolvedBattle();
    battle.attacker.battleDrawPlayed = [played('mystics-soul-for-soul', 'player_1', 'battle_draw')];
    state.players.player_1.zones.hand = [];
    state.players.player_1.zones.graveyard = ['committed-card'];
    recordResult(state, battle, ['committed-card']);

    queueSoulForSoulBattleEffects(state, battle);
    expect(openNextSoulForSoulBattleChoice(state)).toBe(false);
    expect(state.pendingMysticsChoice).toBeUndefined();
  });
});
