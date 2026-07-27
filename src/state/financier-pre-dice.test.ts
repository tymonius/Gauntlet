import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, CardID, GameState, PlayerID } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply';
import { initializeGame } from './initialize';
import { setFactionResource } from './resources';

const financierDeck: CardID[] = [
  'financiers-speculation',
  'financiers-liquidation',
  'financiers-tariffs',
  'financiers-divestment',
  'financiers-margin-loan',
  'financiers-property-dues',
  'financiers-underwriting',
  'financiers-capital-gains',
  'financiers-monetary-crisis',
  'financiers-foreclosure',
];

function participant(playerId: PlayerID, cards: CardID[]): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards.map((cardId) => ({ cardId, owner: playerId, origin: 'battle_draw', faceDown: false, canceled: false })),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(cards.length, 1),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function removeOne(source: CardID[], cardId: CardID): void {
  const index = source.indexOf(cardId);
  if (index >= 0) source.splice(index, 1);
}

function game(cards: CardID[], opponentHand: CardID[] = []): { state: GameState; location: string } {
  const state = initializeGame({
    id: 'financier-pre-dice',
    version: 'v0.6.0',
    shuffleDecks: false,
    openingHandSize: 0,
    players: [
      { id: 'player_1', name: 'Financier', factionId: 'financiers', leaderName: 'Banker', deck: financierDeck, territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  const origin = territories[2];
  const target = territories[3];
  for (const space of state.board.spaces) space.occupant = undefined;
  origin.occupant = 'player_1';
  origin.controller = 'player_1';
  target.occupant = 'player_2';
  target.controller = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = target.id;
  state.players.player_2.zones.hand = [...opponentHand];
  for (const cardId of cards) removeOne(state.players.player_1.zones.deck, cardId);
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `${state.id}-battle-test`,
    stage: 'dice',
    location: target.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', cards),
    defender: participant('player_2', []),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  return { state, location: target.id };
}

function reveal(state: GameState): GameState {
  return applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
}

function finishBattle(state: GameState, attackerRoll = 6, defenderRoll = 1): GameState {
  let next = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: attackerRoll }).state;
  next = applyGameAction(next, { type: 'roll_battle_die', playerId: 'player_2', value: defenderRoll }).state;
  return applyGameAction(next, { type: 'resolve_battle', playerId: 'player_1' }).state;
}

describe('Financier pre-dice Battle cards', () => {
  it('funds Speculation before dice and pays 2 Capital during cleanup after a win', () => {
    const setup = game(['financiers-speculation']);
    setFactionResource(setup.state, 'player_1', 'capital', 1, 'test');
    let state = reveal(setup.state);
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'battle_speculation', playerId: 'player_1' });
    expect(buildGuidedOptions(state).some((option) => option.action.type === 'resolve_financier_choice' && option.action.choice === 'spend')).toBe(true);
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'spend' }).state;
    expect(state.players.player_1.resources?.capital?.value).toBe(0);
    state = finishBattle(state);
    expect(state.players.player_1.resources?.capital?.value).toBe(2);
    expect(state.players.player_1.zones.discard).toContain('financiers-speculation');
  });

  it('liquidates Treasury value, opens immediate Subsidize, then continues the queued Tariffs choice', () => {
    const setup = game(['financiers-liquidation', 'financiers-tariffs'], ['o-card']);
    setup.state.players.player_1.financiers!.treasury = ['financiers-underwriting'];
    removeOne(setup.state.players.player_1.zones.deck, 'financiers-underwriting');
    let state = reveal(setup.state);
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'battle_liquidation' });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'liquidate', cardId: 'financiers-underwriting' }).state;
    expect(state.players.player_1.resources?.capital?.value).toBe(2);
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'subsidize', playerId: 'player_1' });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: '0', amount: 0 }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'battle_tariffs', playerId: 'player_2' });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_2', choice: 'grant_bonus' }).state;
    expect(state.battle?.attacker.modifiers).toBe(1);
  });

  it('divests a Deed for the prior Deed count and may immediately Subsidize', () => {
    const setup = game(['financiers-divestment']);
    const other = setup.state.board.spaces.find((space) => space.kind === 'territory' && space.id !== setup.location)!.id;
    setup.state.players.player_1.financiers!.deedsOwned = [setup.location, other];
    let state = reveal(setup.state);
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'battle_divestment' });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'divest', spaceId: setup.location }).state;
    expect(state.players.player_1.financiers?.deedsOwned).not.toContain(setup.location);
    expect(state.players.player_1.resources?.capital?.value).toBe(2);
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'subsidize' });
  });

  it('defaults a losing Battle Margin Loan and its collateral to Graveyard', () => {
    const setup = game(['financiers-margin-loan']);
    setup.state.players.player_1.zones.hand = ['financiers-underwriting'];
    removeOne(setup.state.players.player_1.zones.deck, 'financiers-underwriting');
    let state = reveal(setup.state);
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'battle_margin_loan' });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'collateralize', cardId: 'financiers-underwriting' }).state;
    expect(state.players.player_1.resources?.capital?.value).toBe(2);
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: '0', amount: 0 }).state;
    state = finishBattle(state, 1, 6);
    expect(state.players.player_1.zones.graveyard).toContain('financiers-margin-loan');
    expect(state.players.player_1.zones.graveyard).toContain('financiers-underwriting');
    expect(state.players.player_1.zones.discard).not.toContain('financiers-margin-loan');
  });

  it('collects Property Dues during cleanup when the opponent declines to discard', () => {
    const setup = game(['financiers-property-dues'], ['o-card']);
    setup.state.players.player_1.financiers!.deedsOwned = [setup.location];
    let state = reveal(setup.state);
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'battle_property_dues', playerId: 'player_2' });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_2', choice: 'pay_dues' }).state;
    expect(state.players.player_1.resources?.capital?.value).toBe(0);
    state = finishBattle(state);
    expect(state.players.player_1.resources?.capital?.value).toBe(3);
  });

  it('does not open choices for a canceled Financier card', () => {
    const setup = game(['financiers-tariffs'], ['o-card']);
    setup.state.battle!.attacker.battleDrawPlayed[0].canceled = true;
    const state = reveal(setup.state);
    expect(state.pendingFinancierChoice).toBeUndefined();
    expect(state.battle?.attacker.modifiers).toBe(0);
  });
});
