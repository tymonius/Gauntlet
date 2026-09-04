import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { bankedAssetUseAllowed } from './intelligence-subversion-battle';
import {
  ILLEGAL_OCCUPATION,
  illegalOccupationSourceFor,
} from './neutral-illegal-occupation';
import { counterintelligenceAssetActive } from './neutral-counterintelligence';
import { queueSuppliesAfterNormalDraw } from './neutral-supplies';

const SUPPLIES = 'neutral-supplies';
const COUNTERINTELLIGENCE = 'neutral-counterintelligence';
const FORTIFICATIONS = 'card-fortifications';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-illegal-occupation-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Controller', factionId: 'military', leaderName: 'General', deck: [ILLEGAL_OCCUPATION], territories: ['p1-one', 'p1-two', 'p1-three'] },
      { id: 'player_2', name: 'Occupier', factionId: 'intelligence', leaderName: 'Ranger', deck: [SUPPLIES], territories: ['p2-one', 'p2-two', 'p2-three'] },
    ],
  });
  state.phase = 'action_before_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  return state;
}

function played(owner: PlayerID, origin: 'hand' | 'battle_draw' = 'battle_draw', overrides: Partial<BattlePlayedCard> = {}): BattlePlayedCard {
  return { cardId: ILLEGAL_OCCUPATION, owner, origin, faceDown: false, canceled: false, ...overrides };
}

function participant(playerId: PlayerID, cards: BattlePlayedCard[] = []): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: 3,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function occupyControlledTerritory(state: GameState): void {
  for (const space of state.board.spaces) space.occupant = undefined;
  const territory = state.board.spaces.find((space) => space.kind === 'territory')!;
  territory.controller = 'player_1';
  territory.occupant = 'player_2';
  state.players.player_2.occupiedSpaceId = territory.id;
}

function beginCounterattack(state: GameState, attackerCards: BattlePlayedCard[]): void {
  occupyControlledTerritory(state);
  const location = state.board.spaces.find((space) => space.occupant === 'player_2')!;
  const origin = state.board.spaces.find((space) => space.id !== location.id && !space.occupant)!;
  origin.occupant = 'player_1';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'illegal-occupation-battle',
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Illegal Occupation', () => {
  it('registers both canonical forms and banks its Action form', () => {
    expect(getCardPlayRule(ILLEGAL_OCCUPATION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });
    let state = game();
    state.players.player_1.zones.hand = [ILLEGAL_OCCUPATION];
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: ILLEGAL_OCCUPATION }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([ILLEGAL_OCCUPATION]);
  });

  it('makes the occupier banked Assets inactive only while occupying the controller Territory', () => {
    const state = game();
    state.players.player_1.zones.assetBank = [ILLEGAL_OCCUPATION];
    state.players.player_2.zones.assetBank = [SUPPLIES, COUNTERINTELLIGENCE];
    occupyControlledTerritory(state);

    expect(illegalOccupationSourceFor(state, 'player_2')).toBe('player_1');
    expect(bankedAssetUseAllowed(state, 'player_2')).toBe(false);
    expect(counterintelligenceAssetActive(state, 'player_2')).toBe(false);
    expect(queueSuppliesAfterNormalDraw(state, 'player_2')).toBe(0);

    const territory = state.board.spaces.find((space) => space.occupant === 'player_2')!;
    territory.controller = 'player_2';
    expect(bankedAssetUseAllowed(state, 'player_2')).toBe(true);
    expect(counterintelligenceAssetActive(state, 'player_2')).toBe(true);
  });

  it('does not suppress the occupier when the source Illegal Occupation is itself inactive', () => {
    const state = game();
    state.players.player_1.zones.assetBank = [ILLEGAL_OCCUPATION];
    occupyControlledTerritory(state);
    state.battle = {
      id: 'suppressed-source', stage: 'hand_commit', location: state.players.player_2.occupiedSpaceId!, attackerOrigin: state.players.player_1.occupiedSpaceId!,
      attacker: participant('player_1'), defender: participant('player_2'), tiePolicy: 'defender', effectsResolved: [], bankedAssetUseProhibited: ['player_1'],
    };
    expect(bankedAssetUseAllowed(state, 'player_2')).toBe(true);
  });

  it('suppresses the defender and grants advantage per active copy while counterattacking', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [COUNTERINTELLIGENCE, FORTIFICATIONS];
    beginCounterattack(state, [played('player_1', 'hand'), played('player_1')]);
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.bankedAssetUseProhibited).toContain('player_2');
    expect(state.battle?.attacker.advantage).toBe(2);
    expect(state.battle?.defender.modifiers).toBe(0);
    expect(counterintelligenceAssetActive(state, 'player_2')).toBe(false);
  });

  it('ignores canceled, negated, virtual, defensive, and non-counterattack copies', () => {
    let inactive = game();
    beginCounterattack(inactive, [
      played('player_1', 'hand', { canceled: true }),
      played('player_1', 'battle_draw', { negated: true }),
      played('player_1', 'battle_draw', { virtual: true }),
    ]);
    inactive = applyGameAction(inactive, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(inactive.battle?.bankedAssetUseProhibited ?? []).not.toContain('player_2');
    expect(inactive.battle?.attacker.advantage ?? 0).toBe(0);

    let defenderCopy = game();
    beginCounterattack(defenderCopy, []);
    defenderCopy.battle!.defender = participant('player_2', [played('player_2')]);
    defenderCopy = applyGameAction(defenderCopy, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(defenderCopy.battle?.attacker.advantage ?? 0).toBe(0);

    let notControlled = game();
    beginCounterattack(notControlled, [played('player_1')]);
    const location = notControlled.board.spaces.find((space) => space.id === notControlled.battle!.location)!;
    location.controller = 'player_2';
    notControlled = applyGameAction(notControlled, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(notControlled.battle?.bankedAssetUseProhibited ?? []).not.toContain('player_2');
    expect(notControlled.battle?.attacker.advantage ?? 0).toBe(0);
  });
});
