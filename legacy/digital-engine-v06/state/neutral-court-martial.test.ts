import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { buildPendingNeutralOptions } from '../dev/neutral-options';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { COURT_MARTIAL } from './neutral-court-martial';
import { FEALTY } from './neutral-fealty';
import { STAND_GROUND } from './neutral-stand-ground';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-court-martial-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Victor',
        factionId: 'military',
        leaderName: 'General',
        deck: [COURT_MARTIAL, COURT_MARTIAL, FEALTY, 'card-valor'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Defeated',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: [STAND_GROUND, STAND_GROUND, FEALTY, 'card-fortifications'],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
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

function participant(
  playerId: PlayerID,
  cards: BattlePlayedCard[] = [],
  diceRoll?: number,
): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
    diceRoll,
  };
}

function placePlayers(state: GameState, playerOneIndex: number, playerTwoIndex: number): void {
  for (const space of state.board.spaces) delete space.occupant;
  const one = state.board.spaces.find((space) => space.index === playerOneIndex)!;
  const two = state.board.spaces.find((space) => space.index === playerTwoIndex)!;
  one.occupant = 'player_1';
  two.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = one.id;
  state.players.player_2.occupiedSpaceId = two.id;
}

function revealBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
): void {
  state.phase = 'battle';
  state.battle = {
    id: 'court-martial-battle',
    stage: 'dice',
    location: state.board.spaces.find((space) => space.index === 3)!.id,
    attackerOrigin: state.board.spaces.find((space) => space.index === 2)!.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function resolutionBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
  attackerOriginIndex = 2,
  locationIndex = 3,
  attackerRoll = 6,
  defenderRoll = 1,
): BattleState {
  return {
    id: 'court-martial-battle',
    stage: 'resolution',
    location: state.board.spaces.find((space) => space.index === locationIndex)!.id,
    attackerOrigin: state.board.spaces.find((space) => space.index === attackerOriginIndex)!.id,
    attacker: participant('player_1', attackerCards, attackerRoll),
    defender: participant('player_2', defenderCards, defenderRoll),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function resolveBattle(state: GameState): GameState {
  return applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
}

function resolveNeutral(state: GameState, playerId: PlayerID, choice: 'pass' | 'use'): GameState {
  return applyGameAction(state, {
    type: 'resolve_neutral_choice',
    playerId,
    choice,
  }).state;
}

describe('Neutral Court Martial', () => {
  it('registers both canonical forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(COURT_MARTIAL)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
      requiresTarget: false,
    });

    let state = game();
    state.players.player_1.zones.hand = [COURT_MARTIAL];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: COURT_MARTIAL,
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual([COURT_MARTIAL]);
  });

  it('gives the opponent disadvantage per active physical Battle copy', () => {
    let state = game();
    revealBattle(state, [
      played(COURT_MARTIAL, 'player_1', 'hand'),
      played(COURT_MARTIAL, 'player_1'),
      played(COURT_MARTIAL, 'player_1', 'battle_draw', { canceled: true }),
      played(COURT_MARTIAL, 'player_1', 'battle_draw', { negated: true }),
      played(COURT_MARTIAL, 'player_1', 'battle_draw', { virtual: true }),
    ]);

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.defender.disadvantage).toBe(2);
    expect(state.battle?.effectsResolved).toContain('neutral_court_martial_battle');
  });

  it('is prevented by an active Fealty Asset', () => {
    let state = game();
    revealBattle(state, [played(COURT_MARTIAL, 'player_1')]);
    state.players.player_2.zones.assetBank = [FEALTY];

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.defender.disadvantage ?? 0).toBe(0);
    expect(state.log.some((event) => event.type === 'neutral_fealty_prevented_disadvantage')).toBe(true);
  });

  it('lets a Battle Fealty remove Court Martial disadvantage', () => {
    let state = game();
    revealBattle(
      state,
      [played(COURT_MARTIAL, 'player_1')],
      [played(FEALTY, 'player_2')],
    );

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.defender.disadvantage ?? 0).toBe(0);
    expect(state.battle?.defender.modifiers).toBe(0);
  });

  it('automatically forces one additional retreat when its Battle owner wins', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.phase = 'battle';
    state.battle = resolutionBattle(state, [played(COURT_MARTIAL, 'player_1')]);

    state = resolveBattle(state);

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 5)?.id,
    );
    expect(state.log.some((event) => event.type === 'neutral_court_martial_extra_retreat')).toBe(true);
  });

  it('does not force an additional retreat when the Court Martial owner loses', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.phase = 'battle';
    state.battle = resolutionBattle(
      state,
      [played(COURT_MARTIAL, 'player_1')],
      [],
      2,
      3,
      1,
      6,
    );

    state = resolveBattle(state);

    expect(state.players.player_1.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 2)?.id,
    );
    expect(state.log.some((event) => event.type === 'neutral_court_martial_extra_retreat')).toBe(false);
  });

  it('offers the winning player an optional Asset after the normal retreat', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.players.player_1.zones.assetBank = [COURT_MARTIAL];
    state.phase = 'battle';
    state.battle = resolutionBattle(state);

    state = resolveBattle(state);

    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'court_martial_asset',
      playerId: 'player_1',
      targetPlayerId: 'player_2',
    });
    expect(buildPendingNeutralOptions(state, 'player_1')?.map((option) => (option.action as { choice?: string }).choice)).toEqual(['pass', 'use']);
  });

  it('keeps the Asset banked when its owner passes', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.players.player_1.zones.assetBank = [COURT_MARTIAL];
    state.phase = 'battle';
    state.battle = resolutionBattle(state);
    state = resolveBattle(state);

    state = resolveNeutral(state, 'player_1', 'pass');

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([COURT_MARTIAL]);
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
  });

  it('discards the Asset and forces one additional retreat when used', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.players.player_1.zones.assetBank = [COURT_MARTIAL];
    state.phase = 'battle';
    state.battle = resolutionBattle(state);
    state = resolveBattle(state);

    state = resolveNeutral(state, 'player_1', 'use');

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([]);
    expect(state.players.player_1.zones.discard).toContain(COURT_MARTIAL);
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 5)?.id,
    );
  });

  it('stacks Battle and Asset copies while retreat space remains', () => {
    let state = game();
    placePlayers(state, 1, 2);
    state.players.player_1.zones.assetBank = [COURT_MARTIAL, COURT_MARTIAL];
    state.phase = 'battle';
    state.battle = resolutionBattle(
      state,
      [played(COURT_MARTIAL, 'player_1')],
      [],
      1,
      2,
    );

    state = resolveBattle(state);
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
    expect(state.pendingNeutralChoice?.kind).toBe('court_martial_asset');

    state = resolveNeutral(state, 'player_1', 'use');
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 5)?.id,
    );
    expect(state.pendingNeutralChoice?.kind).toBe('court_martial_asset');

    state = resolveNeutral(state, 'player_1', 'use');
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 6)?.id,
    );
    expect(state.players.player_1.zones.discard.filter((card) => card === COURT_MARTIAL)).toHaveLength(3);
  });

  it('lets Stand Ground prevent each Court Martial movement separately', () => {
    let state = game();
    placePlayers(state, 1, 2);
    state.players.player_2.zones.assetBank = [STAND_GROUND, STAND_GROUND];
    state.phase = 'battle';
    state.battle = resolutionBattle(state, [
      played(COURT_MARTIAL, 'player_1', 'hand'),
      played(COURT_MARTIAL, 'player_1'),
    ], [], 1, 2);

    state = resolveBattle(state);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'court_martial_retreat',
      playerId: 'player_2',
    });

    state = resolveNeutral(state, 'player_2', 'use');
    expect(state.pendingNeutralChoice?.kind).toBe('court_martial_retreat');
    state = resolveNeutral(state, 'player_2', 'use');

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 3)?.id,
    );
    expect(state.players.player_2.zones.discard.filter((card) => card === STAND_GROUND)).toHaveLength(2);
  });

  it('does not offer an Asset when banked Asset use was prohibited in that battle', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.players.player_1.zones.assetBank = [COURT_MARTIAL];
    state.phase = 'battle';
    state.battle = {
      ...resolutionBattle(state),
      bankedAssetUseProhibited: ['player_1'],
    };

    state = resolveBattle(state);

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([COURT_MARTIAL]);
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
  });

  it('does not offer an Asset when Sedition made the only copy inactive', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.players.player_1.zones.assetBank = [COURT_MARTIAL];
    state.phase = 'battle';
    state.battle = {
      ...resolutionBattle(state),
      seditionInactiveAssets: { player_1: [COURT_MARTIAL] },
    };

    state = resolveBattle(state);

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([COURT_MARTIAL]);
  });

  it('does nothing when the loser cannot retreat farther after the normal retreat', () => {
    let state = game();
    placePlayers(state, 5, 6);
    state.players.player_1.zones.assetBank = [COURT_MARTIAL];
    state.phase = 'battle';
    state.battle = resolutionBattle(
      state,
      [played(COURT_MARTIAL, 'player_1')],
      [],
      5,
      6,
    );

    state = resolveBattle(state);

    expect(state.players.player_2.occupiedSpaceId).toBe('player_2-heartland');
    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([COURT_MARTIAL]);
  });
});
