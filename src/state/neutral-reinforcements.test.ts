import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { REINFORCEMENTS } from './neutral-reinforcements';

const VALOR = 'card-valor';
const FORTIFICATIONS = 'card-fortifications';
const ENTRENCHMENT = 'neutral-entrenchment';
const ILLEGAL_OCCUPATION = 'neutral-illegal-occupation';
const DISRUPTION = 'neutral-disruption';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-reinforcements-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Attacker', factionId: 'military', leaderName: 'General', deck: [VALOR, FORTIFICATIONS, ENTRENCHMENT, REINFORCEMENTS], territories: ['p1-one', 'p1-two', 'p1-three'] },
      { id: 'player_2', name: 'Defender', factionId: 'intelligence', leaderName: 'Ranger', deck: ['d1', 'd2', 'd3'], territories: ['p2-one', 'p2-two', 'p2-three'] },
    ],
  });
  state.phase = 'action_before_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  return state;
}

function played(cardId: string, owner: PlayerID, overrides: Partial<BattlePlayedCard> = {}): BattlePlayedCard {
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
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(state: GameState, attackerCards: BattlePlayedCard[] = [], defenderCards: BattlePlayedCard[] = []): void {
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
    id: 'reinforcements-battle',
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Reinforcements', () => {
  it('registers both canonical forms and banks its Action form', () => {
    expect(getCardPlayRule(REINFORCEMENTS)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });
    let state = game();
    state.players.player_1.zones.hand = [REINFORCEMENTS];
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: REINFORCEMENTS }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([REINFORCEMENTS]);
  });

  it('discards a banked copy to permit exactly one additional Action card', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [REINFORCEMENTS];
    state.players.player_1.zones.hand = [FORTIFICATIONS, ENTRENCHMENT];
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: FORTIFICATIONS }).state;
    state = applyGameAction(state, { type: 'use_neutral_reinforcements_asset', playerId: 'player_1' }).state;
    expect(state.players.player_1.zones.discard).toContain(REINFORCEMENTS);
    expect(state.neutralReinforcementsActionOpportunity).toMatchObject({ playerId: 'player_1' });
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: ENTRENCHMENT }).state;
    expect(state.neutralReinforcementsActionOpportunity).toBeUndefined();
    expect(() => applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: REINFORCEMENTS })).toThrow(/already played a card|does not have/);
  });

  it('cannot use an inactive copy or create an extra opportunity before spending the normal one', () => {
    const tooEarly = game();
    tooEarly.players.player_1.zones.assetBank = [REINFORCEMENTS];
    expect(() => applyGameAction(tooEarly, { type: 'use_neutral_reinforcements_asset', playerId: 'player_1' })).toThrow(/cannot grant/);

    const inactive = game();
    inactive.players.player_1.zones.assetBank = [REINFORCEMENTS];
    inactive.players.player_2.zones.assetBank = [ILLEGAL_OCCUPATION];
    inactive.players.player_1.actionsRemaining = 0;
    inactive.players.player_1.hasPlayedActionThisTurn = true;
    for (const space of inactive.board.spaces) space.occupant = undefined;
    const occupiedTerritory = inactive.board.spaces.find((space) => space.kind === 'territory')!;
    occupiedTerritory.controller = 'player_2';
    occupiedTerritory.occupant = 'player_1';
    inactive.players.player_1.occupiedSpaceId = occupiedTerritory.id;
    expect(() => applyGameAction(inactive, { type: 'use_neutral_reinforcements_asset', playerId: 'player_1' })).toThrow(/cannot grant/);
  });

  it('pauses reveal after cancellation, draws one card, and may reveal it before modifiers resolve', () => {
    let state = game();
    state.players.player_1.zones.deck = [VALOR];
    beginBattle(state, [played(REINFORCEMENTS, 'player_1')]);
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'reinforcements_battle', drawnCardId: VALOR });
    expect(state.battle?.effectsResolved).not.toContain('before_battle_resolution');
    state = applyGameAction(state, { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use' }).state;
    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle?.attacker.battleDrawPlayed).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: VALOR, faceDown: false }),
    ]));
    expect(state.battle?.attacker.modifiers).toBe(2);
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
  });

  it('keeps a passed draw unchosen for normal battle cleanup', () => {
    let state = game();
    state.players.player_1.zones.deck = [VALOR];
    beginBattle(state, [played(REINFORCEMENTS, 'player_1')]);
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'pass' }).state;
    expect(state.battle?.attacker.battleDraw).toContain(VALOR);
    expect(state.battle?.attacker.modifiers).toBe(0);
  });

  it('ignores canceled, negated, and virtual Reinforcements copies', () => {
    for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      let state = game();
      state.players.player_1.zones.deck = [VALOR];
      beginBattle(state, [played(REINFORCEMENTS, 'player_1', overrides)]);
      state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
      expect(state.pendingNeutralChoice).toBeUndefined();
      expect(state.battle?.attacker.battleDraw).toEqual([]);
    }
  });

  it('does not trigger a Reinforcements copy canceled during the cancellation pass', () => {
    let state = game();
    state.players.player_1.zones.deck = [VALOR];
    const disruption = played(DISRUPTION, 'player_2');
    beginBattle(state, [played(REINFORCEMENTS, 'player_1')], [disruption]);
    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
      battleCardTargets: [{
        sourceCardId: DISRUPTION,
        sourceOwner: 'player_2',
        targetCardId: REINFORCEMENTS,
        targetOwner: 'player_1',
      }],
    }).state;
    expect(state.battle?.attacker.battleDrawPlayed[0].canceled).toBe(true);
    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle?.attacker.battleDraw).toEqual([]);
  });
});