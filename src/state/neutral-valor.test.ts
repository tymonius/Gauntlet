import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { buildPendingNeutralOptions } from '../dev/neutral-options';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { VALOR } from './neutral-valor';

const FIRST = 'neutral-rallying-cry';
const SECOND = 'neutral-reserves';
const THIRD = 'neutral-supplies';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-valor-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Valorous',
        factionId: 'military',
        leaderName: 'General',
        deck: [VALOR, VALOR, FIRST, SECOND, THIRD],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [FIRST, SECOND, THIRD],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  return state;
}

function participant(
  playerId: PlayerID,
  handCommit?: BattlePlayedCard,
  battleDrawPlayed: BattlePlayedCard[] = [],
): BattleParticipantState {
  return {
    playerId,
    handCommit,
    passedHandCommit: Boolean(handCommit),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed,
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function played(
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'hand',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId: VALOR,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    ...overrides,
  };
}

function beginBattle(
  state: GameState,
  attacker = participant('player_1'),
  defender = participant('player_2'),
): void {
  for (const space of state.board.spaces) delete space.occupant;
  state.board.spaces.find((space) => space.id === 'space-1')!.occupant = 'player_1';
  state.board.spaces.find((space) => space.id === 'space-2')!.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = 'space-1';
  state.players.player_2.occupiedSpaceId = 'space-2';
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'valor-battle',
    stage: 'dice',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker,
    defender,
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

describe('Neutral Valor', () => {
  it('registers both canonical forms and banks its Action form', () => {
    expect(getCardPlayRule(VALOR)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
      requiresTarget: false,
    });

    let state = game();
    state.players.player_1.zones.hand = [VALOR];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: VALOR,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([VALOR]);
  });

  it('draws one card per active banked copy after losing and completing retreat', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [VALOR, VALOR];
    state.players.player_1.zones.deck = [FIRST, SECOND, THIRD];
    beginBattle(state);
    state.battle!.stage = 'resolution';
    state.battle!.attacker.diceRoll = 1;
    state.battle!.defender.diceRoll = 6;

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.zones.hand).toEqual([FIRST, SECOND]);
    expect(state.players.player_1.occupiedSpaceId).toBe('space-1');
  });

  it('ignores inactive banked copies during the lost battle', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [VALOR, VALOR];
    state.players.player_1.faceDownAssets = [VALOR];
    state.players.player_1.zones.deck = [FIRST, SECOND];
    beginBattle(state);
    state.battle!.stage = 'resolution';
    state.battle!.attacker.diceRoll = 1;
    state.battle!.defender.diceRoll = 6;
    state.battle!.seditionInactiveAssets = { player_1: [VALOR] };

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.players.player_1.zones.hand).toEqual([]);
  });

  it('offers a public optional reroll only to a player whose battle total is lower', () => {
    let state = game();
    beginBattle(state, participant('player_1', played('player_1')));

    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 2 }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', value: 5 }).state;

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'valor_battle',
      playerId: 'player_1',
      oldRoll: 2,
    });
    expect(buildPendingNeutralOptions(state, 'player_1')).toHaveLength(7);
  });

  it('rerolls the full battle-dice pool and must use the new selected result', () => {
    let state = game();
    const attacker = participant('player_1', played('player_1'));
    attacker.advantage = 1;
    beginBattle(state, attacker);

    state = applyGameAction(state, {
      type: 'roll_battle_die', playerId: 'player_1', values: [2, 1],
    }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', value: 5 }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use', value: 6,
    }).state;

    expect(state.battle?.attacker.diceRolls).toEqual([6, 1]);
    expect(state.battle?.attacker.diceRoll).toBe(6);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('stacks physical copies sequentially and consumes a passed copy', () => {
    let state = game();
    beginBattle(
      state,
      participant('player_1', played('player_1'), [played('player_1', 'battle_draw')]),
    );
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 2 }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', value: 5 }).state;

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'pass',
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'valor_battle', playerId: 'player_1' });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'pass',
    }).state;
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('can offer the opponent Valor when a reroll reverses which total is lower', () => {
    let state = game();
    beginBattle(
      state,
      participant('player_1', played('player_1')),
      participant('player_2', played('player_2')),
    );
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 2 }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', value: 5 }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use', value: 6,
    }).state;

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'valor_battle',
      playerId: 'player_2',
      oldRoll: 5,
    });
  });

  it('does not trigger from canceled, negated, virtual, tied, or already-leading copies', () => {
    let state = game();
    beginBattle(
      state,
      participant(
        'player_1',
        played('player_1', 'hand', { canceled: true }),
        [
          played('player_1', 'battle_draw', { negated: true }),
          played('player_1', 'battle_draw', { virtual: true }),
        ],
      ),
    );
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 2 }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', value: 5 }).state;
    expect(state.pendingNeutralChoice).toBeUndefined();

    const leading = game();
    beginBattle(leading, participant('player_1', played('player_1')));
    leading.battle!.attacker.modifiers = 3;
    let resolved = applyGameAction(leading, { type: 'roll_battle_die', playerId: 'player_1', value: 3 }).state;
    resolved = applyGameAction(resolved, { type: 'roll_battle_die', playerId: 'player_2', value: 5 }).state;
    expect(resolved.pendingNeutralChoice).toBeUndefined();
  });
});
