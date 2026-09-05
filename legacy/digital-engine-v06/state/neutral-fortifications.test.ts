import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import { buildPendingNeutralOptions } from '../dev/neutral-options';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { FORTIFICATIONS } from './neutral-fortifications';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-fortifications-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Attacker',
        factionId: 'military',
        leaderName: 'General',
        deck: [FORTIFICATIONS, 'card-valor', 'neutral-rallying-cry'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: [FORTIFICATIONS, FORTIFICATIONS, 'card-valor', 'neutral-rallying-cry'],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.movementRemaining = 1;
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
    initialBattleHand: cards.filter((card) => card.origin === 'battle_draw').map((card) => card.cardId),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
    diceRoll,
  };
}

function placePlayers(state: GameState, attackerIndex: number, defenderIndex: number): void {
  for (const space of state.board.spaces) delete space.occupant;
  const attacker = state.board.spaces.find((space) => space.index === attackerIndex)!;
  const defender = state.board.spaces.find((space) => space.index === defenderIndex)!;
  attacker.occupant = 'player_1';
  defender.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = attacker.id;
  state.players.player_2.occupiedSpaceId = defender.id;
}

function revealBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
): void {
  state.phase = 'battle';
  state.battle = {
    id: 'fortifications-battle',
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
  defenderCards: BattlePlayedCard[] = [],
  attackerOriginIndex = 2,
  locationIndex = 3,
  attackerRoll = 6,
  defenderRoll = 1,
): BattleState {
  return {
    id: 'fortifications-battle',
    stage: 'resolution',
    location: state.board.spaces.find((space) => space.index === locationIndex)!.id,
    attackerOrigin: state.board.spaces.find((space) => space.index === attackerOriginIndex)!.id,
    attacker: participant('player_1', [], attackerRoll),
    defender: participant('player_2', defenderCards, defenderRoll),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function resolveBattle(state: GameState): GameState {
  return applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;
}

function resolveChoice(state: GameState, choice: 'pass' | 'use'): GameState {
  return applyGameAction(state, {
    type: 'resolve_neutral_choice',
    playerId: 'player_2',
    choice,
  }).state;
}

describe('Neutral Fortifications', () => {
  it('registers both canonical forms and banks as an Action Asset', () => {
    expect(getCardPlayRule(FORTIFICATIONS)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
      requiresTarget: false,
    });

    let state = game();
    state.players.player_1.zones.hand = [FORTIFICATIONS];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: FORTIFICATIONS,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([FORTIFICATIONS]);
  });

  it('lets an active defending Asset choose up to two Battle Hand cards', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.phase = 'movement';
    state.players.player_2.zones.assetBank = [FORTIFICATIONS];
    const destination = state.board.spaces.find((space) => space.index === 3)!;

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: destination.id,
    }).state;

    expect(state.battle?.defender.battleDrawPlayLimit).toBe(2);
    expect(state.battle?.attacker.battleDrawPlayLimit).toBe(1);
    expect(state.log.some((event) => event.type === 'neutral_fortifications_asset')).toBe(true);
  });

  it('does not grant the Asset benefit while face down or suppressed', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.phase = 'movement';
    state.players.player_2.zones.assetBank = [FORTIFICATIONS];
    state.players.player_2.faceDownAssets = [FORTIFICATIONS];
    const destination = state.board.spaces.find((space) => space.index === 3)!;

    state = applyGameAction(state, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: destination.id,
    }).state;

    expect(state.battle?.defender.battleDrawPlayLimit).toBe(1);
  });

  it('adds +1 per active physical Battle copy only for the defender', () => {
    let state = game();
    revealBattle(
      state,
      [played(FORTIFICATIONS, 'player_1')],
      [
        played(FORTIFICATIONS, 'player_2', 'hand'),
        played(FORTIFICATIONS, 'player_2'),
        played(FORTIFICATIONS, 'player_2', 'battle_draw', { canceled: true }),
        played(FORTIFICATIONS, 'player_2', 'battle_draw', { negated: true }),
        played(FORTIFICATIONS, 'player_2', 'battle_draw', { virtual: true }),
      ],
    );

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.defender.modifiers).toBe(2);
    expect(state.battle?.attacker.modifiers).toBe(0);
    expect(state.battle?.effectsResolved).toContain('neutral_fortifications_battle');
  });

  it('offers the losing defender an optional extra withdrawal after normal retreat', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.phase = 'battle';
    state.battle = resolutionBattle(state, [played(FORTIFICATIONS, 'player_2')]);

    state = resolveBattle(state);

    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'fortifications_battle',
      playerId: 'player_2',
    });
    expect(buildPendingNeutralOptions(state, 'player_2')?.map((option) => (option.action as { choice?: string }).choice)).toEqual(['pass', 'use']);
  });

  it('moves one additional position when used and then completes cleanup', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.phase = 'battle';
    state.battle = resolutionBattle(state, [played(FORTIFICATIONS, 'player_2')]);
    state = resolveBattle(state);

    state = resolveChoice(state, 'use');

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle).toBeUndefined();
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 5)?.id,
    );
    expect(state.players.player_2.zones.discard).toContain(FORTIFICATIONS);
  });

  it('does not move farther when the defender passes', () => {
    let state = game();
    placePlayers(state, 2, 3);
    state.phase = 'battle';
    state.battle = resolutionBattle(state, [played(FORTIFICATIONS, 'player_2')]);
    state = resolveBattle(state);

    state = resolveChoice(state, 'pass');

    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
    expect(state.battle).toBeUndefined();
  });

  it('offers each active Battle copy while withdrawal space remains', () => {
    let state = game();
    placePlayers(state, 1, 2);
    state.phase = 'battle';
    state.battle = resolutionBattle(
      state,
      [
        played(FORTIFICATIONS, 'player_2', 'hand'),
        played(FORTIFICATIONS, 'player_2'),
      ],
      1,
      2,
    );

    state = resolveBattle(state);
    expect(state.pendingNeutralChoice?.kind).toBe('fortifications_battle');
    state = resolveChoice(state, 'use');
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 4)?.id,
    );
    expect(state.pendingNeutralChoice?.kind).toBe('fortifications_battle');
    state = resolveChoice(state, 'use');
    expect(state.players.player_2.occupiedSpaceId).toBe(
      state.board.spaces.find((space) => space.index === 5)?.id,
    );
    expect(state.battle).toBeUndefined();
  });

  it('is suppressed by No Martyrs and does nothing without extra space', () => {
    let suppressed = game();
    placePlayers(suppressed, 2, 3);
    suppressed.phase = 'battle';
    suppressed.battle = {
      ...resolutionBattle(suppressed, [played(FORTIFICATIONS, 'player_2')]),
      lossRetreatEffectsSuppressedFor: ['player_2'],
    };
    suppressed = resolveBattle(suppressed);
    expect(suppressed.pendingNeutralChoice).toBeUndefined();
    expect(suppressed.players.player_2.occupiedSpaceId).toBe(
      suppressed.board.spaces.find((space) => space.index === 4)?.id,
    );

    let edge = game();
    placePlayers(edge, 5, 6);
    edge.phase = 'battle';
    edge.battle = resolutionBattle(edge, [played(FORTIFICATIONS, 'player_2')], 5, 6);
    edge = resolveBattle(edge);
    expect(edge.pendingNeutralChoice).toBeUndefined();
    expect(edge.players.player_2.occupiedSpaceId).toBe('player_2-heartland');
  });
});
