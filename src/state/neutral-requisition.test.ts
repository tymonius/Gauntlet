import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { REQUISITION } from './neutral-requisition';

const ASSET_ONE = 'card-fortifications';
const ASSET_TWO = 'neutral-entrenchment';
const DISRUPTION = 'neutral-disruption';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-requisition-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Attacker',
        factionId: 'military',
        leaderName: 'General',
        deck: ['draw-one', 'draw-two', 'draw-three'],
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
  state.phase = 'action_before_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  return state;
}

function played(
  cardId: string,
  owner: PlayerID,
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return { cardId, owner, origin: 'battle_draw', faceDown: false, canceled: false, ...overrides };
}

function participant(playerId: PlayerID, cards: BattlePlayedCard[] = []): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards,
    battleDrawCount: 3,
    battleDrawPlayLimit: 3,
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
    id: 'requisition-battle',
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Requisition', () => {
  it('registers both canonical forms with a targeted discard Action', () => {
    expect(getCardPlayRule(REQUISITION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: true,
    });
  });

  it('discards one chosen banked Asset, draws two, and preserves duplicate source copies', () => {
    let state = game();
    state.players.player_1.zones.hand = [REQUISITION, REQUISITION];
    state.players.player_1.zones.assetBank = [ASSET_ONE, ASSET_TWO];

    const result = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: REQUISITION,
      targets: [{ kind: 'card', cardId: ASSET_ONE, owner: 'player_1' }],
    });
    state = result.state;

    expect(state.players.player_1.zones.assetBank).toEqual([ASSET_TWO]);
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([REQUISITION, ASSET_ONE]));
    expect(state.players.player_1.zones.hand).toContain(REQUISITION);
    expect(result.result?.drawnCards).toHaveLength(2);
    expect(state.players.player_1.zones.hand).toHaveLength(3);
  });

  it('rejects missing, opposing, or non-banked Action targets', () => {
    const missing = game();
    missing.players.player_1.zones.hand = [REQUISITION];
    missing.players.player_1.zones.assetBank = [ASSET_ONE];
    expect(() => applyGameAction(missing, {
      type: 'play_action_card', playerId: 'player_1', cardId: REQUISITION,
    })).toThrow(/exactly one banked Asset/);

    const opposing = game();
    opposing.players.player_1.zones.hand = [REQUISITION];
    opposing.players.player_2.zones.assetBank = [ASSET_ONE];
    expect(() => applyGameAction(opposing, {
      type: 'play_action_card', playerId: 'player_1', cardId: REQUISITION,
      targets: [{ kind: 'card', cardId: ASSET_ONE, owner: 'player_2' }],
    })).toThrow(/banked Asset you control/);

    const absent = game();
    absent.players.player_1.zones.hand = [REQUISITION];
    expect(() => applyGameAction(absent, {
      type: 'play_action_card', playerId: 'player_1', cardId: REQUISITION,
      targets: [{ kind: 'card', cardId: ASSET_ONE, owner: 'player_1' }],
    })).toThrow(/must be in your Asset Bank/);
  });

  it('may discard one banked Asset to gain advantage before dice', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSET_ONE];
    beginBattle(state, [played(REQUISITION, 'player_1')]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'requisition_battle',
      playerId: 'player_1',
      cardOptions: [ASSET_ONE],
      triggersRemaining: 1,
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: ASSET_ONE,
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual([]);
    expect(state.players.player_1.zones.discard).toContain(ASSET_ONE);
    expect(state.battle?.attacker.advantage).toBe(1);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('resolves one optional sacrifice per active physical copy', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSET_ONE, ASSET_TWO];
    beginBattle(state, [played(REQUISITION, 'player_1'), played(REQUISITION, 'player_1')]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ triggersRemaining: 2 });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: ASSET_ONE,
    }).state;
    expect(state.battle?.attacker.advantage).toBe(1);
    expect(state.pendingNeutralChoice).toMatchObject({ triggersRemaining: 1 });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: ASSET_TWO,
    }).state;
    expect(state.battle?.attacker.advantage).toBe(2);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('may pass all remaining copies without sacrificing an Asset', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSET_ONE, ASSET_TWO];
    beginBattle(state, [played(REQUISITION, 'player_1'), played(REQUISITION, 'player_1')]);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'pass',
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual([ASSET_ONE, ASSET_TWO]);
    expect(state.battle?.attacker.advantage ?? 0).toBe(0);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('ignores canceled, negated, and virtual Battle copies', () => {
    for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      let state = game();
      state.players.player_1.zones.assetBank = [ASSET_ONE];
      beginBattle(state, [played(REQUISITION, 'player_1', overrides)]);
      state = applyGameAction(state, {
        type: 'resolve_battle_reveal', playerId: 'player_1',
      }).state;
      expect(state.pendingNeutralChoice).toBeUndefined();
      expect(state.battle?.attacker.advantage ?? 0).toBe(0);
    }
  });

  it('does not trigger a copy canceled during the cancellation pass', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSET_ONE];
    beginBattle(
      state,
      [played(REQUISITION, 'player_1')],
      [played(DISRUPTION, 'player_2')],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
      battleCardTargets: [{
        sourceCardId: DISRUPTION,
        sourceOwner: 'player_2',
        targetCardId: REQUISITION,
        targetOwner: 'player_1',
      }],
    }).state;

    expect(state.battle?.attacker.battleDrawPlayed[0].canceled).toBe(true);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('may sacrifice an inactive Asset because Requisition uses its own Battle effect', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSET_ONE];
    beginBattle(state, [played(REQUISITION, 'player_1')]);
    state.battle!.bankedAssetUseProhibited = ['player_1'];

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'requisition_battle' });
  });
});
