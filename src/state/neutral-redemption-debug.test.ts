import { expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, PlayerID } from '../types';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { REDEMPTION } from './neutral-redemption';

function participant(playerId: PlayerID, handCommit?: BattlePlayedCard, battleDrawPlayed: BattlePlayedCard[] = []): BattleParticipantState {
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

it('traces Redemption cleanup', () => {
  const state = initializeGame({
    id: 'redemption-debug',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Inquisitor', factionId: 'inquisition', leaderName: 'Grand Inquisitor', deck: ['inquisition-divine-mercy', 'neutral-rallying-cry', 'card-valor'], territories: ['p1-one', 'p1-two', 'p1-three'] },
      { id: 'player_2', name: 'Defender', factionId: 'military', leaderName: 'General', deck: [REDEMPTION, REDEMPTION, 'card-fortifications'], territories: ['p2-one', 'p2-two', 'p2-three'] },
    ],
  });
  state.players.player_1.inquisition = undefined;
  for (const space of state.board.spaces) space.occupant = undefined;
  state.board.spaces.find((space) => space.id === 'space-1')!.occupant = 'player_1';
  state.board.spaces.find((space) => space.id === 'space-2')!.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = 'space-1';
  state.players.player_2.occupiedSpaceId = 'space-2';
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'redemption-battle',
    stage: 'resolution',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: participant('player_1'),
    defender: participant(
      'player_2',
      { cardId: REDEMPTION, owner: 'player_2', origin: 'hand', faceDown: false, canceled: false },
      [{ cardId: 'card-valor', owner: 'player_2', origin: 'battle_draw', faceDown: false, canceled: false, negated: true }],
    ),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };

  const prepared = structuredClone(state);
  const result = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
  console.log('REDEMPTION_DEBUG', JSON.stringify({
    before: prepared.players.player_2.zones,
    after: result.players.player_2.zones,
    returns: result.neutralRedemptionBattleReturns,
    pending: result.pendingNeutralChoice,
    log: result.log.slice(-8),
  }));
  expect(result.battle).toBeUndefined();
});
