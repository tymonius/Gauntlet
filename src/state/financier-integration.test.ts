import { describe, expect, it } from 'vitest';
import type { BattleState, GameState } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { initializeGame } from './initialize';
import { applyGameAction } from './apply';
import { setFactionResource } from './resources';

function game(): GameState {
  const state = initializeGame({
    id: 'financier-integration', version: 'v0.6.0', shuffleDecks: false, openingHandSize: 3,
    players: [
      { id: 'player_1', name: 'Banker', factionId: 'financiers', leaderName: 'Banker', deck: ['financiers-speculation', 'financiers-monetary-crisis', 'financiers-corner-the-market'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Executive', factionId: 'financiers', leaderName: 'Executive', deck: ['financiers-liquidation', 'financiers-underwriting', 'financiers-capital-gains'], territories: ['t4', 't5', 't6'] },
    ],
  });
  for (const space of state.board.spaces) space.revealed = true;
  return state;
}

function participant(playerId: string, roll?: number) {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: false,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
    diceRoll: roll,
  };
}

function setBattle(state: GameState, stage: BattleState['stage'], attackerRoll?: number, defenderRoll?: number): void {
  const origin = state.board.spaces.find((space) => space.id === 'space-3')!;
  const location = state.board.spaces.find((space) => space.id === 'space-4')!;
  for (const space of state.board.spaces) delete space.occupant;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'financier-battle', stage, location: location.id, attackerOrigin: origin.id,
    attacker: participant('player_1', attackerRoll), defender: participant('player_2', defenderRoll),
    tiePolicy: 'defender', effectsResolved: [],
  } satisfies BattleState;
}

describe('Financier gameplay integration', () => {
  it('uses StateActions for Treasury placement and Play the Market', () => {
    let state = game();
    state.phase = 'action_after_movement';
    state = applyGameAction(state, { type: 'place_treasury_card', playerId: 'player_1', cardId: 'financiers-corner-the-market' }).state;
    expect(state.players.player_1.financiers?.treasury).toEqual(['financiers-corner-the-market']);

    state = game();
    state.phase = 'action_after_movement';
    state = applyGameAction(state, { type: 'begin_play_the_market', playerId: 'player_1', cardId: 'financiers-corner-the-market' }).state;
    expect(state.pendingFinancierChoice?.kind).toBe('play_the_market');
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: '6', amount: 6 }).state;
    expect(state.players.player_1.resources?.capital?.value).toBe(10);
    expect(state.players.player_1.zones.discard).toContain('financiers-corner-the-market');
  });

  it('opens an explicit Banker collateral choice for a Deed purchase', () => {
    let state = game();
    state.phase = 'action_after_movement';
    setFactionResource(state, 'player_1', 'capital', 1, 'test');
    const target = state.board.spaces.find((space) => space.kind === 'territory' && space.controller === 'player_2')!;
    state = applyGameAction(state, { type: 'begin_deed_purchase', playerId: 'player_1', spaceId: target.id }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'deed_purchase', spaceId: target.id, cost: 2 });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'collateral', cardId: 'financiers-corner-the-market' }).state;
    expect(state.players.player_1.financiers?.deedsOwned).toContain(target.id);
    expect(state.players.player_1.zones.discard).toContain('financiers-corner-the-market');
    expect(state.players.player_1.actionsRemaining).toBe(0);
  });

  it('automatically resolves Capital limits and next-turn Deed income', () => {
    let state = game();
    state.players.player_2.financiers!.deedsOwned = ['space-4', 'space-5'];
    setFactionResource(state, 'player_1', 'capital', 20, 'test');
    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_1' }).state;
    expect(state.players.player_1.resources?.capital?.value).toBe(3);
    expect(state.players.player_2.resources?.capital?.value).toBe(2);
    expect(state.activePlayer).toBe('player_2');
  });

  it('opens Subsidize automatically before dice and blocks rolling until resolved', () => {
    let state = game();
    setBattle(state, 'battle_play_selection');
    state.battle!.attacker.battleDraw = ['financiers-speculation'];
    state.battle!.defender.battleDraw = ['financiers-liquidation'];
    setFactionResource(state, 'player_1', 'capital', 6, 'test');
    state = applyGameAction(state, { type: 'pass_battle_draw_play', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'pass_battle_draw_play', playerId: 'player_2' }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'subsidize', playerId: 'player_1', maximumBonus: 3 });
    expect(() => applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 4 })).toThrow(/pending faction choice/i);
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: '3', amount: 3 }).state;
    expect(state.battle?.attacker.modifiers).toBe(3);
    expect(state.players.player_1.resources?.capital?.value).toBe(0);
  });

  it('makes Executive Hostile Takeover available after an attacking victory', () => {
    let state = game();
    state.players.player_1.leaderName = 'Executive';
    setFactionResource(state, 'player_1', 'capital', 10, 'test');
    setBattle(state, 'resolution', 6, 1);
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    const location = state.board.spaces.find((space) => space.id === 'space-4')!;
    expect(state.players.player_1.financiers?.hostileTakeoverEligibleSpaceId).toBe(location.id);
    state = applyGameAction(state, { type: 'use_hostile_takeover', playerId: 'player_1' }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'deed_purchase', hostileTakeover: true, spaceId: location.id });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'capital' }).state;
    expect(location.id).toBe(state.players.player_1.financiers?.deedsOwned[0]);
    expect(state.board.spaces.find((space) => space.id === location.id)?.controller).toBe('player_1');
  });

  it('wins immediately when the last Deed is purchased through StateActions', () => {
    let state = game();
    state.phase = 'action_after_movement';
    const territories = state.board.spaces.filter((space) => space.kind === 'territory');
    const target = territories.find((space) => space.controller === 'player_1')!;
    state.players.player_1.financiers!.deedsOwned = territories.filter((space) => space.id !== target.id).map((space) => space.id);
    setFactionResource(state, 'player_1', 'capital', 20, 'test');
    state = applyGameAction(state, { type: 'begin_deed_purchase', playerId: 'player_1', spaceId: target.id }).state;
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'capital' }).state;
    expect(state.winner).toBe('player_1');
    expect(state.phase).toBe('game_over');
  });

  it('shows Financier actions and pending choices in guided interfaces', () => {
    let state = game();
    state.phase = 'action_after_movement';
    const labels = buildGuidedOptions(state).map((option) => option.label);
    expect(labels.some((label) => label.startsWith('Place financiers-'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Play the Market'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Buy Deed'))).toBe(true);

    state = applyGameAction(state, { type: 'begin_play_the_market', playerId: 'player_1', cardId: 'financiers-speculation' }).state;
    expect(buildGuidedOptions(state)).toHaveLength(6);
  });
});
