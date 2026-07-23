import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, BattleState, CardID, GameState, PlayerID } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { initializeGame } from './initialize';
import { applyGameAction } from './apply';

function played(cardId: CardID, owner: PlayerID): BattlePlayedCard {
  return { cardId, owner, origin: 'hand', faceDown: false, canceled: false };
}

function participant(playerId: PlayerID, cardId?: CardID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: cardId === undefined,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    handCommit: cardId ? played(cardId, playerId) : undefined,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function game(attackerCard?: CardID, defenderCard?: CardID): GameState {
  const state = initializeGame({
    id: 'battle-reveal-resolution',
    version: 'v0.6.0',
    shuffleDecks: false,
    openingHandSize: 0,
    players: [
      { id: 'player_1', name: 'Attacker', deck: ['a1', 'a2', 'a3'], territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Defender', deck: ['d1', 'd2', 'd3'], territories: ['t4', 't5', 't6'] },
    ],
  });
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  const origin = territories[2];
  const location = territories[3];
  for (const space of state.board.spaces) space.occupant = undefined;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  const battle: BattleState = {
    id: `${state.id}-battle-1`,
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCard),
    defender: participant('player_2', defenderCard),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  state.phase = 'battle';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.battle = battle;
  return state;
}

describe('explicit Battle reveal resolution', () => {
  it('applies revealed modifiers before dice and then exposes roll options', () => {
    let state = game('card-valor');
    const before = buildGuidedOptions(state);
    expect(before).toHaveLength(1);
    expect(before[0].action.type).toBe('resolve_battle_reveal');

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(state.battle?.attacker.modifiers).toBe(2);
    expect(state.battle?.resolvedModifiers).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerId: 'player_1', source: 'card-valor', amount: 2 }),
    ]));
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
    expect(buildGuidedOptions(state).filter((option) => option.action.type === 'roll_battle_die')).toHaveLength(6);
  });

  it('enumerates and applies an Embargo target before dice', () => {
    let state = game('card-embargo', 'card-valor');
    const options = buildGuidedOptions(state);
    const cancelValor = options.find((option) => (
      option.action.type === 'resolve_battle_reveal'
      && option.action.battleCardTargets?.some((target) => target.targetCardId === 'card-valor')
    ));
    expect(cancelValor).toBeDefined();

    state = applyGameAction(state, cancelValor!.action).state;
    expect(state.battle?.defender.handCommit?.canceled).toBe(true);
    expect(state.battle?.defender.modifiers).toBe(0);
    expect(state.battle?.resolvedCancellations).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: 'card-valor', owner: 'player_2', source: 'card-embargo' }),
    ]));
  });

  it('does not apply the same reveal effects twice during final resolution', () => {
    let state = game('card-valor');
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 2 }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', value: 3 }).state;
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
    const resolved = [...state.log].reverse().find((event) => event.type === 'battle_resolved');
    expect(resolved?.payload).toMatchObject({ attackerTotal: 4, defenderTotal: 3 });
  });

  it('rejects a second reveal-resolution action', () => {
    let state = game();
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(() => applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' })).toThrow('already resolved');
  });
});
