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
import { STRATEGIC_WITHDRAWAL } from './neutral-strategic-withdrawal';

const OTHER = 'neutral-rallying-cry';
const ASSET = 'neutral-fealty';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-strategic-withdrawal-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: [STRATEGIC_WITHDRAWAL, OTHER, ASSET, OTHER, ASSET],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [OTHER, ASSET, OTHER, ASSET, OTHER],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.movementRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
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

function participant(playerId: PlayerID, cards: BattlePlayedCard[]): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards.filter((card) => card.origin !== 'hand'),
    battleDrawCount: 3,
    battleDrawPlayLimit: 3,
    rerollsRemaining: 0,
    modifiers: 0,
    diceRoll: playerId === 'player_1' ? 1 : 6,
    retreated: false,
  };
}

function battle(
  attackerCards: BattlePlayedCard[],
  defenderCards: BattlePlayedCard[] = [],
): GameState {
  const state = game();
  for (const space of state.board.spaces) space.occupant = undefined;
  const origin = state.board.spaces.find((space) => space.id === 'space-3')!;
  const location = state.board.spaces.find((space) => space.id === 'space-4')!;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.battle = {
    id: 'strategic-withdrawal-battle',
    stage: 'resolution',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
  return state;
}

function resolve(state: GameState): GameState {
  return applyGameAction(state, {
    type: 'resolve_battle',
    playerId: 'player_2',
  }).state;
}

describe('Neutral Strategic Withdrawal', () => {
  it('registers both canonical forms and returns a targeted banked Asset for its Action', () => {
    expect(getCardPlayRule(STRATEGIC_WITHDRAWAL)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: true,
    });

    let state = game();
    state.players.player_1.zones.hand = [STRATEGIC_WITHDRAWAL];
    state.players.player_1.zones.assetBank = [ASSET];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: STRATEGIC_WITHDRAWAL,
      targets: [{ kind: 'card', cardId: ASSET, owner: 'player_1' }],
    }).state;

    expect(state.players.player_1.zones.discard).toContain(STRATEGIC_WITHDRAWAL);
    expect(state.players.player_1.zones.assetBank).toEqual([]);
    expect(state.players.player_1.zones.hand).toEqual([ASSET]);
    expect(state.players.player_1.movementRemaining).toBe(2);
  });

  it('reopens movement when played during the after-movement Action Opportunity', () => {
    let state = game();
    state.phase = 'action_after_movement';
    state.players.player_1.movementRemaining = 0;
    state.players.player_1.zones.hand = [STRATEGIC_WITHDRAWAL];
    state.players.player_1.zones.assetBank = [ASSET];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: STRATEGIC_WITHDRAWAL,
      targets: [{ kind: 'card', cardId: ASSET, owner: 'player_1' }],
    }).state;

    expect(state.phase).toBe('movement');
    expect(state.players.player_1.movementRemaining).toBe(1);
    expect(state.priorityPlayer).toBe('player_1');
  });

  it('cannot use its Action without returning exactly one banked Asset it controls', () => {
    const state = game();
    state.players.player_1.zones.hand = [STRATEGIC_WITHDRAWAL];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: STRATEGIC_WITHDRAWAL,
    })).toThrow(/exactly one banked Asset/);

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: STRATEGIC_WITHDRAWAL,
      targets: [{ kind: 'card', cardId: ASSET, owner: 'player_1' }],
    })).toThrow(/must be in your Asset Bank/);
  });

  it('offers its Battle effect after normal retreat and returns another used card instead of its normal destination', () => {
    let state = battle([
      played(OTHER, 'player_1', 'hand'),
      played(STRATEGIC_WITHDRAWAL, 'player_1'),
    ]);

    state = resolve(state);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'strategic_withdrawal_battle',
      playerId: 'player_1',
      triggerSourceKey: 'battle_draw:0',
      targetOptions: [{ targetKey: 'hand_commit', cardId: OTHER }],
    });
    expect(state.players.player_1.occupiedSpaceId).toBe('space-3');

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
      targetKey: 'hand_commit',
    }).state;

    expect(state.battle).toBeUndefined();
    expect(state.players.player_1.occupiedSpaceId).toBe('space-2');
    expect(state.players.player_1.zones.hand).toContain(OTHER);
    expect(state.players.player_1.zones.graveyard).not.toContain(OTHER);
    expect(state.players.player_1.zones.discard).toContain(STRATEGIC_WITHDRAWAL);
  });

  it('stacks physical copies sequentially and requires a different other card for each return', () => {
    let state = battle([
      played(STRATEGIC_WITHDRAWAL, 'player_1', 'hand'),
      played(STRATEGIC_WITHDRAWAL, 'player_1'),
      played(OTHER, 'player_1'),
    ]);

    state = resolve(state);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'strategic_withdrawal_battle',
      triggerSourceKey: 'hand_commit',
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
      targetKey: 'battle_draw:1',
    }).state;
    expect(state.players.player_1.occupiedSpaceId).toBe('space-2');
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'strategic_withdrawal_battle',
      triggerSourceKey: 'battle_draw:0',
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
      targetKey: 'hand_commit',
    }).state;

    expect(state.players.player_1.occupiedSpaceId).toBe('space-1');
    expect(state.players.player_1.zones.hand).toEqual(expect.arrayContaining([OTHER, STRATEGIC_WITHDRAWAL]));
    expect(state.players.player_1.zones.discard.filter((id) => id === STRATEGIC_WITHDRAWAL)).toHaveLength(1);
  });

  it('allows one physical copy to pass without suppressing a later copy', () => {
    let state = battle([
      played(STRATEGIC_WITHDRAWAL, 'player_1', 'hand'),
      played(STRATEGIC_WITHDRAWAL, 'player_1'),
      played(OTHER, 'player_1'),
    ]);
    state = resolve(state);
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'strategic_withdrawal_battle',
      triggerSourceKey: 'battle_draw:0',
    });
  });

  it('does not trigger from canceled, negated, or virtual copies or when no other used card exists', () => {
    for (const source of [
      played(STRATEGIC_WITHDRAWAL, 'player_1', 'battle_draw', { canceled: true }),
      played(STRATEGIC_WITHDRAWAL, 'player_1', 'battle_draw', { negated: true }),
      played(STRATEGIC_WITHDRAWAL, 'player_1', 'battle_draw', { virtual: true }),
      played(STRATEGIC_WITHDRAWAL, 'player_1'),
    ]) {
      const state = resolve(battle([source]));
      expect(state.pendingNeutralChoice).toBeUndefined();
      expect(state.battle).toBeUndefined();
    }
  });

  it('is suppressed by No Martyrs and cannot withdraw beyond the available board', () => {
    let suppressed = battle([
      played(OTHER, 'player_1', 'hand'),
      played(STRATEGIC_WITHDRAWAL, 'player_1'),
    ]);
    suppressed.battle!.lossRetreatEffectsSuppressedFor = ['player_1'];
    suppressed = resolve(suppressed);
    expect(suppressed.pendingNeutralChoice).toBeUndefined();
    expect(suppressed.battle).toBeUndefined();

    let blocked = battle([
      played(OTHER, 'player_1', 'hand'),
      played(STRATEGIC_WITHDRAWAL, 'player_1'),
    ]);
    for (const space of blocked.board.spaces) space.occupant = undefined;
    const beyond = blocked.board.spaces.find((space) => space.id === 'player_1-heartland')!;
    const before = blocked.board.spaces.find((space) => space.id === 'space-1')!;
    beyond.occupant = 'player_1';
    before.occupant = 'player_2';
    blocked.players.player_1.occupiedSpaceId = beyond.id;
    blocked.players.player_2.occupiedSpaceId = before.id;
    blocked.battle!.attackerOrigin = beyond.id;
    blocked.battle!.location = before.id;
    blocked = resolve(blocked);
    expect(blocked.pendingNeutralChoice).toBeUndefined();
    expect(blocked.battle).toBeUndefined();
  });
});
