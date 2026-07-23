import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattleState, CardID, GameState, PlayerID } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { initializeGame } from './initialize';
import { applyGameAction } from './apply';
import { setFactionResource } from './resources';

const financierDeck = [
  'financiers-monetary-crisis',
  'financiers-underwriting',
  'financiers-capital-gains',
  'financiers-foreclosure',
  'financiers-speculation',
  'financiers-liquidation',
  'financiers-tariffs',
  'financiers-property-dues',
  'financiers-divestment',
  'financiers-margin-loan',
];

function participant(playerId: PlayerID, played: CardID[], roll: number, handCommit?: CardID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: handCommit === undefined,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    handCommit: handCommit ? { cardId: handCommit, owner: playerId, origin: 'hand', faceDown: false, canceled: false } : undefined,
    battleDraw: [],
    battleDrawPlayed: played.map((cardId) => ({ cardId, owner: playerId, origin: 'battle_draw', faceDown: false, canceled: false })),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(played.length, 1),
    diceRoll: roll,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function game(attackerCards: CardID[] = [], defenderCards: CardID[] = [], attackerRoll = 6, defenderRoll = 1, attackerHandCommit?: CardID): { state: GameState; battle: BattleState; targetId: string } {
  const state = initializeGame({
    id: 'financier-battle-cards', version: 'v0.6.0', shuffleDecks: false, openingHandSize: 8,
    players: [
      { id: 'player_1', name: 'Financier', factionId: 'financiers', leaderName: 'Banker', deck: financierDeck, territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  const origin = territories[2];
  const target = territories[3];
  for (const space of state.board.spaces) space.occupant = undefined;
  origin.occupant = 'player_1';
  target.occupant = 'player_2';
  origin.controller = 'player_1';
  target.controller = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = target.id;
  for (const cardId of attackerCards) {
    const index = state.players.player_1.zones.hand.indexOf(cardId);
    if (index >= 0) state.players.player_1.zones.hand.splice(index, 1);
  }
  if (attackerHandCommit) {
    const index = state.players.player_1.zones.hand.indexOf(attackerHandCommit);
    if (index >= 0) state.players.player_1.zones.hand.splice(index, 1);
  }
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  const battle: BattleState = {
    id: `${state.id}-battle-test`,
    stage: 'resolution',
    location: target.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards, attackerRoll, attackerHandCommit),
    defender: participant('player_2', defenderCards, defenderRoll),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  state.battle = battle;
  return { state, battle, targetId: target.id };
}

describe('Financier Battle card foundations', () => {
  it('refunds Subsidize through Underwriting after a loss', () => {
    const setup = game([], ['financiers-underwriting'], 1, 6);
    setup.state.players.player_2.factionId = 'financiers';
    setup.state.players.player_2.financiers = { treasury: [], deedsOwned: [], subsidizeBonusThisBattle: 2, subsidizeOfferedBattleId: setup.battle.id };
    setup.state.players.player_2.resources = { capital: { value: 0, maximum: 99 } };
    const result = applyGameAction(setup.state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(result.players.player_2.resources?.capital?.value).toBe(2);
    expect(result.log.some((event) => event.type === 'financier_underwriting_battle_refund')).toBe(true);
  });

  it('captures immediately with Foreclosure when the attacker owns the Deed', () => {
    const setup = game(['financiers-foreclosure']);
    setup.state.players.player_1.financiers!.deedsOwned.push(setup.targetId);
    const result = applyGameAction(setup.state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    const target = result.board.spaces.find((space) => space.id === setup.targetId)!;
    expect(target.controller).toBe('player_1');
    expect(target.capturePendingBy).toBeUndefined();
    expect(result.players.player_1.controlledTerritories).toContain(target.territoryId);
  });

  it('places another played card in Treasury through Capital Gains', () => {
    const setup = game(['financiers-monetary-crisis'], [], 6, 1, 'financiers-capital-gains');
    let state = applyGameAction(setup.state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'battle_capital_gains' });
    expect(buildGuidedOptions(state).some((option) => option.action.type === 'resolve_financier_choice' && option.action.cardId === 'financiers-monetary-crisis')).toBe(true);
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'financiers-monetary-crisis', cardId: 'financiers-monetary-crisis' }).state;
    expect(state.players.player_1.financiers?.treasury).toContain('financiers-monetary-crisis');
    expect(state.players.player_1.zones.discard).not.toContain('financiers-monetary-crisis');
  });

  it('makes each player keep one hand card during Monetary Crisis cleanup', () => {
    const setup = game(['financiers-monetary-crisis']);
    setup.state.players.player_1.zones.hand = ['p1-a', 'p1-b', 'p1-c'];
    setup.state.players.player_2.zones.hand = ['p2-a', 'p2-b', 'p2-c'];
    let state = applyGameAction(setup.state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'battle_monetary_crisis', playerId: 'player_1' });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'p1-b', cardId: 'p1-b' }).state;
    expect(state.players.player_1.zones.hand).toEqual(['p1-b']);
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'battle_monetary_crisis', playerId: 'player_2' });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_2', choice: 'p2-c', cardId: 'p2-c' }).state;
    expect(state.players.player_2.zones.hand).toEqual(['p2-c']);
    expect(state.pendingFinancierChoice).toBeUndefined();
  });

  it('enables only implemented Financier Battle modes', () => {
    const setup = game();
    setFactionResource(setup.state, 'player_1', 'capital', 1, 'test');
    setup.state.phase = 'battle';
    setup.state.battle!.stage = 'hand_commit';
    expect(() => applyGameAction(setup.state, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'financiers-monetary-crisis' })).not.toThrow();
    expect(() => applyGameAction(setup.state, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'financiers-liquidation' })).toThrow();
  });
});
