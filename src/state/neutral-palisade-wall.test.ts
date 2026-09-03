import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { bankedAssetUseAllowed } from './banked-assets';
import {
  openPalisadeWallAssetChoice,
  PALISADE_WALL,
} from './neutral-palisade-wall';

const FORTIFICATIONS = 'card-fortifications';
const COUNTERINTELLIGENCE = 'neutral-counterintelligence';
const VALOR = 'card-valor';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-palisade-wall-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Attacker', factionId: 'military', leaderName: 'General', deck: [PALISADE_WALL, VALOR], territories: ['p1-one', 'p1-two', 'p1-three'] },
      { id: 'player_2', name: 'Defender', factionId: 'intelligence', leaderName: 'Ranger', deck: [PALISADE_WALL, FORTIFICATIONS], territories: ['p2-one', 'p2-two', 'p2-three'] },
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
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled: false, ...overrides };
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

function beginBattle(
  state: GameState,
  stage: 'hand_commit' | 'dice',
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
    id: 'palisade-battle',
    stage,
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Palisade Wall', () => {
  it('registers both canonical forms and banks its Action form', () => {
    expect(getCardPlayRule(PALISADE_WALL)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [PALISADE_WALL];
    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_1', cardId: PALISADE_WALL,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([PALISADE_WALL]);
  });

  it('opens one optional Asset trigger at battle start and may suppress the attacker', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [PALISADE_WALL, PALISADE_WALL];
    state.players.player_1.zones.assetBank = [FORTIFICATIONS];
    beginBattle(state, 'hand_commit');

    expect(openPalisadeWallAssetChoice(state)).toBe(true);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'palisade_wall_asset', playerId: 'player_2', targetPlayerId: 'player_1',
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'use',
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual([PALISADE_WALL]);
    expect(state.players.player_2.zones.discard).toEqual([PALISADE_WALL]);
    expect(state.battle?.bankedAssetUseProhibited).toContain('player_1');
    expect(bankedAssetUseAllowed(state, 'player_1')).toBe(false);
    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(openPalisadeWallAssetChoice(state)).toBe(false);
  });

  it('may pass without discarding or suppressing Assets', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [PALISADE_WALL];
    beginBattle(state, 'hand_commit');
    openPalisadeWallAssetChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'pass',
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual([PALISADE_WALL]);
    expect(state.battle?.bankedAssetUseProhibited ?? []).not.toContain('player_1');
    expect(openPalisadeWallAssetChoice(state)).toBe(false);
  });

  it('does not offer its Asset trigger when the source or target Assets are already inactive', () => {
    const sourceInactive = game();
    sourceInactive.players.player_2.zones.assetBank = [PALISADE_WALL];
    beginBattle(sourceInactive, 'hand_commit');
    sourceInactive.battle!.bankedAssetUseProhibited = ['player_2'];
    expect(openPalisadeWallAssetChoice(sourceInactive)).toBe(false);

    const targetInactive = game();
    targetInactive.players.player_2.zones.assetBank = [PALISADE_WALL];
    beginBattle(targetInactive, 'hand_commit');
    targetInactive.battle!.bankedAssetUseProhibited = ['player_1'];
    expect(openPalisadeWallAssetChoice(targetInactive)).toBe(false);
  });

  it('negates the opponent committed Battle card before modifiers resolve', () => {
    let state = game();
    beginBattle(
      state,
      'dice',
      [played(VALOR, 'player_1', 'hand')],
      [played(PALISADE_WALL, 'player_2')],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.handCommit?.negated).toBe(true);
    expect(state.battle?.attacker.modifiers).toBe(0);
  });

  it('respects banked Counterintelligence protection', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [COUNTERINTELLIGENCE];
    beginBattle(
      state,
      'dice',
      [played(VALOR, 'player_1', 'hand')],
      [played(PALISADE_WALL, 'player_2')],
    );

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;

    expect(state.battle?.attacker.handCommit?.negated).not.toBe(true);
    expect(state.battle?.attacker.modifiers).toBe(2);
  });

  it('ignores canceled, negated, virtual, and targetless Battle copies', () => {
    for (const override of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      let state = game();
      beginBattle(
        state,
        'dice',
        [played(VALOR, 'player_1', 'hand')],
        [played(PALISADE_WALL, 'player_2', 'battle_draw', override)],
      );
      state = applyGameAction(state, {
        type: 'resolve_battle_reveal', playerId: 'player_1',
      }).state;
      expect(state.battle?.attacker.handCommit?.negated).not.toBe(true);
    }

    let targetless = game();
    beginBattle(targetless, 'dice', [], [played(PALISADE_WALL, 'player_2')]);
    targetless = applyGameAction(targetless, {
      type: 'resolve_battle_reveal', playerId: 'player_1',
    }).state;
    expect(targetless.battle?.attacker.handCommit).toBeUndefined();
  });
});
