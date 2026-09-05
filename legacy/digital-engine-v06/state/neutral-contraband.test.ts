import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { continueIntelligenceBattle } from './intelligence-battle';
import { initializeGame } from './initialize';
import {
  CONTRABAND,
  contrabandBattleEffectCanStillResolve,
} from './neutral-contraband';
import { toPrivateGameView, toPublicGameView } from './views';

const RALLYING_CRY = 'neutral-rallying-cry';
const FEALTY = 'neutral-fealty';
const CONSCRIPTION = 'neutral-conscription';
const TACTICAL_PLANNING = 'neutral-tactical-planning';
const UNKNOWN = 'unimplemented-battle-card';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-contraband-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Smuggler',
        factionId: 'military',
        leaderName: 'General',
        deck: [CONTRABAND, RALLYING_CRY, FEALTY],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: [FEALTY, RALLYING_CRY, CONTRABAND],
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
  cardId: CardID,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' | 'replayed' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin,
    faceDown: true,
    canceled: false,
    ...overrides,
  };
}

function participant(
  playerId: PlayerID,
  handCommit?: BattlePlayedCard,
  battleDrawPlayed: BattlePlayedCard[] = [],
): BattleParticipantState {
  return {
    playerId,
    handCommit,
    passedHandCommit: !handCommit,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    initialBattleHand: battleDrawPlayed.map((card) => card.cardId),
    battleDraw: [],
    battleDrawPlayed,
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, battleDrawPlayed.length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginPreRevealBattle(
  state: GameState,
  source: BattlePlayedCard,
  sourceZone: 'hand' | 'battle_draw' = 'hand',
  otherCards: BattlePlayedCard[] = [],
): void {
  const first = state.board.spaces.find((space) => space.id === 'space-1')!;
  const second = state.board.spaces.find((space) => space.id === 'space-2')!;
  first.occupant = 'player_1';
  second.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = first.id;
  state.players.player_2.occupiedSpaceId = second.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'contraband-battle',
    stage: 'normal_reveal',
    location: second.id,
    attackerOrigin: first.id,
    attacker: sourceZone === 'hand'
      ? participant('player_1', source, otherCards)
      : participant('player_1', undefined, [source, ...otherCards]),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function replaceWith(state: GameState, cardId: CardID): GameState {
  continueIntelligenceBattle(state);
  return applyGameAction(state, {
    type: 'resolve_neutral_choice',
    playerId: 'player_1',
    choice: 'select_card',
    cardId,
  }).state;
}

describe('Neutral Contraband', () => {
  it('registers both canonical forms and requires an Action target', () => {
    expect(getCardPlayRule(CONTRABAND)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: true,
    });
  });

  it('returns exactly one selected card from its own Discard Pile to hand', () => {
    let state = game();
    state.players.player_1.zones.hand = [CONTRABAND, CONTRABAND];
    state.players.player_1.zones.discard = [FEALTY, CONTRABAND];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONTRABAND,
      targets: [{ kind: 'card', owner: 'player_1', cardId: FEALTY }],
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([CONTRABAND, FEALTY]);
    expect(state.players.player_1.zones.discard.filter((cardId) => cardId === CONTRABAND)).toHaveLength(2);
    expect(state.players.player_1.zones.discard).not.toContain(FEALTY);
    expect(state.log.some((event) => event.type === 'neutral_contraband_action')).toBe(true);
  });

  it('rejects an Action target outside the acting player’s Discard Pile', () => {
    const state = game();
    state.players.player_1.zones.hand = [CONTRABAND];
    state.players.player_2.zones.discard = [FEALTY];

    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CONTRABAND,
      targets: [{ kind: 'card', owner: 'player_2', cardId: FEALTY }],
    })).toThrow('Contraband requires exactly one card from your own Discard Pile');
  });

  it('reveals early and privately offers registered Battle effects whose timing remains available', () => {
    const state = game();
    state.players.player_1.zones.discard = [RALLYING_CRY, CONSCRIPTION, TACTICAL_PLANNING, UNKNOWN];
    beginPreRevealBattle(state, played(CONTRABAND, 'player_1', 'hand'));

    continueIntelligenceBattle(state);

    expect(state.battle?.attacker.handCommit).toMatchObject({
      cardId: CONTRABAND,
      faceDown: false,
      earlyEffectResolved: true,
    });
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'contraband_battle',
      playerId: 'player_1',
      cardOptions: [RALLYING_CRY],
      source: { zone: 'hand_commit' },
    });
    expect(toPublicGameView(state).pendingNeutralChoice).toBeUndefined();
    expect(toPrivateGameView(state, 'player_1').pendingNeutralChoice).toEqual(state.pendingNeutralChoice);
    expect(toPrivateGameView(state, 'player_2').pendingNeutralChoice).toBeUndefined();
    expect(contrabandBattleEffectCanStillResolve(CONSCRIPTION)).toBe(false);
    expect(contrabandBattleEffectCanStillResolve(UNKNOWN)).toBe(false);
  });

  it('puts Contraband in the Graveyard and replaces its exact hand-commit slot face up', () => {
    let state = game();
    state.players.player_1.zones.discard = [RALLYING_CRY];
    beginPreRevealBattle(state, played(CONTRABAND, 'player_1', 'hand'));

    state = replaceWith(state, RALLYING_CRY);

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.handCommit).toMatchObject({
      cardId: RALLYING_CRY,
      owner: 'player_1',
      origin: 'replayed',
      faceDown: false,
      cleanupDestination: 'graveyard',
    });
    expect(state.players.player_1.zones.discard).not.toContain(RALLYING_CRY);
    expect(state.players.player_1.zones.graveyard).toContain(CONTRABAND);

    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;
    expect(state.battle?.attacker.modifiers).toBe(1);
  });

  it('replaces the exact Battle Hand slot without disturbing another physical card', () => {
    let state = game();
    state.players.player_1.zones.discard = [RALLYING_CRY];
    const untouched = played(FEALTY, 'player_1', 'battle_draw');
    beginPreRevealBattle(
      state,
      played(CONTRABAND, 'player_1', 'battle_draw'),
      'battle_draw',
      [untouched],
    );

    state = replaceWith(state, RALLYING_CRY);

    expect(state.battle?.attacker.battleDrawPlayed).toEqual([
      expect.objectContaining({ cardId: RALLYING_CRY, origin: 'replayed' }),
      expect.objectContaining({
        cardId: FEALTY,
        owner: 'player_1',
        origin: 'battle_draw',
        faceDown: false,
        canceled: false,
      }),
    ]);
    expect(state.players.player_1.zones.graveyard.filter((cardId) => cardId === CONTRABAND)).toHaveLength(1);
  });

  it('continues through a finite chain of discarded Contraband copies', () => {
    let state = game();
    state.players.player_1.zones.discard = [CONTRABAND, RALLYING_CRY];
    beginPreRevealBattle(state, played(CONTRABAND, 'player_1', 'hand'));

    state = replaceWith(state, CONTRABAND);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'contraband_battle',
      cardOptions: [RALLYING_CRY],
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'select_card',
      cardId: RALLYING_CRY,
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.players.player_1.zones.graveyard.filter((cardId) => cardId === CONTRABAND)).toHaveLength(2);
  });

  it('continues the normal reveal without a choice when no discarded Battle effect can resolve', () => {
    const state = game();
    state.players.player_1.zones.discard = [CONSCRIPTION, TACTICAL_PLANNING, UNKNOWN];
    beginPreRevealBattle(state, played(CONTRABAND, 'player_1', 'hand'));

    continueIntelligenceBattle(state);

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.attacker.handCommit).toMatchObject({
      cardId: CONTRABAND,
      faceDown: false,
      earlyEffectResolved: true,
    });
  });

  it('sends the replacement to the Graveyard during cleanup unless its card state names another destination', () => {
    let state = game();
    state.players.player_1.zones.discard = [RALLYING_CRY];
    beginPreRevealBattle(state, played(CONTRABAND, 'player_1', 'hand'));
    state = replaceWith(state, RALLYING_CRY);
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 6 }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', value: 1 }).state;
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining([CONTRABAND, RALLYING_CRY]));
    expect(state.players.player_1.zones.discard).not.toContain(RALLYING_CRY);
  });
});
