import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { ASSIMILATION } from './neutral-assimilation';
import { COUNTERWORKS } from './neutral-counterworks';
import { PROTRACTED_SIEGE } from './neutral-protracted-siege';
import { confirmPendingCapturesFor } from './reducer';
import { toPublicGameView } from './views';

const FORTIFICATIONS = 'neutral-fortifications';
const RALLYING_CRY = 'neutral-rallying-cry';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-assimilation-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Attacker',
        factionId: 'military',
        leaderName: 'General',
        deck: [ASSIMILATION, ASSIMILATION, COUNTERWORKS, FORTIFICATIONS, RALLYING_CRY],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'intelligence',
        leaderName: 'Spy',
        deck: [PROTRACTED_SIEGE, PROTRACTED_SIEGE, FORTIFICATIONS, RALLYING_CRY],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 2;
  state.players.player_2.actionsRemaining = 1;
  return state;
}

function participant(
  playerId: PlayerID,
  cards: BattlePlayedCard[] = [],
  roll = playerId === 'player_1' ? 6 : 1,
): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    initialBattleHand: [],
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    diceRoll: roll,
    modifiers: 0,
    retreated: false,
  };
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'hand',
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

function beginAttack(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
  attackerWins = true,
): void {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.id === 'space-3')!;
  const location = state.board.spaces.find((space) => space.id === 'space-4')!;
  origin.occupant = 'player_1';
  location.kind = 'territory';
  location.territoryId = 'p2-three';
  location.revealed = true;
  location.controller = 'player_2';
  location.occupant = 'player_2';
  delete location.capturePendingBy;
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  if (!state.players.player_2.controlledTerritories.includes(location.territoryId)) {
    state.players.player_2.controlledTerritories.push(location.territoryId);
  }
  state.players.player_1.controlledTerritories = state.players.player_1.controlledTerritories
    .filter((territoryId) => territoryId !== location.territoryId);
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `assimilation-battle-${state.log.length + 1}`,
    stage: 'resolution',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards, attackerWins ? 6 : 1),
    defender: participant('player_2', defenderCards, attackerWins ? 1 : 6),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function resolveBattle(state: GameState): GameState {
  return applyGameAction(state, {
    type: 'resolve_battle',
    playerId: 'player_1',
  }).state;
}

function playAssimilationCondition(state: GameState): GameState {
  state.players.player_1.zones.hand = [ASSIMILATION];
  return applyGameAction(state, {
    type: 'play_action_card',
    playerId: 'player_1',
    cardId: ASSIMILATION,
  }).state;
}

describe('Neutral Assimilation', () => {
  it('registers both forms, holds the Action copy as a public Condition, and discards it at end of turn', () => {
    expect(getCardPlayRule(ASSIMILATION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'removed', battle_draw: 'discard' },
    });

    let state = playAssimilationCondition(game());
    expect(state.players.player_1.zones.removed).toEqual([ASSIMILATION]);
    expect(state.neutralAssimilationConditions).toMatchObject([
      { playerId: 'player_1', turn: state.turn, sourceCardId: ASSIMILATION },
    ]);
    expect(toPublicGameView(state).neutralAssimilationConditions).toHaveLength(1);

    state.phase = 'action_after_movement';
    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_1' }).state;
    expect(state.neutralAssimilationConditions).toBeUndefined();
    expect(state.players.player_1.zones.removed).not.toContain(ASSIMILATION);
    expect(state.players.player_1.zones.discard).toContain(ASSIMILATION);
  });

  it('captures immediately after the conditioned attacker wins on an enemy Territory', () => {
    let state = playAssimilationCondition(game());
    beginAttack(state);
    state = resolveBattle(state);

    const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
    expect(space.controller).toBe('player_1');
    expect(space.capturePendingBy).toBeUndefined();
    expect(state.players.player_1.controlledTerritories).toContain('p2-three');
    expect(state.neutralAssimilationConditions?.[0].consumedBattleId).toBeDefined();
  });

  it('uses the Action form to reduce one Protracted Siege delay instead of capturing immediately', () => {
    let state = playAssimilationCondition(game());
    beginAttack(state, [], [played(PROTRACTED_SIEGE, 'player_2')]);
    state = resolveBattle(state);

    const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
    expect(space.controller).toBe('player_2');
    expect(space.capturePendingBy).toBe('player_1');
    expect(space.overlays?.some((overlay) => overlay.cardId === PROTRACTED_SIEGE)).toBeFalsy();
    expect(state.players.player_2.zones.graveyard).toContain(PROTRACTED_SIEGE);

    confirmPendingCapturesFor(state, 'player_1');
    expect(space.controller).toBe('player_1');
    expect(space.capturePendingBy).toBeUndefined();
  });

  it('uses the Battle form to override every matching Protracted Siege copy and capture immediately', () => {
    let state = game();
    beginAttack(
      state,
      [played(ASSIMILATION, 'player_1')],
      [
        played(PROTRACTED_SIEGE, 'player_2', 'hand'),
        played(PROTRACTED_SIEGE, 'player_2', 'battle_draw'),
      ],
    );
    state = resolveBattle(state);

    const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
    expect(space.controller).toBe('player_1');
    expect(space.capturePendingBy).toBeUndefined();
    expect(space.overlays?.some((overlay) => overlay.cardId === PROTRACTED_SIEGE)).toBeFalsy();
    expect(state.players.player_2.zones.graveyard.filter((card) => card === PROTRACTED_SIEGE)).toHaveLength(2);
  });

  it('waits for Counterworks to resolve a Siege placement before applying the Action capture replacement', () => {
    let state = playAssimilationCondition(game());
    state.players.player_1.zones.assetBank = [COUNTERWORKS];
    beginAttack(state, [], [played(PROTRACTED_SIEGE, 'player_2')]);
    state = resolveBattle(state);

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'counterworks_asset',
      playerId: 'player_1',
      overlayCardId: PROTRACTED_SIEGE,
    });
    expect(state.neutralAssimilationBattleResolution).toBeDefined();
    expect(state.board.spaces.find((space) => space.id === 'space-4')?.controller).toBe('player_2');

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'use',
    }).state;

    const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
    expect(space.controller).toBe('player_1');
    expect(space.capturePendingBy).toBeUndefined();
    expect(state.players.player_2.zones.discard).toContain(PROTRACTED_SIEGE);
    expect(state.players.player_1.zones.graveyard).toContain(COUNTERWORKS);
    expect(state.neutralAssimilationBattleResolution).toBeUndefined();
  });

  it('consumes the Action condition on a qualifying loss and does not apply it to a later battle', () => {
    let state = playAssimilationCondition(game());
    beginAttack(state, [], [], false);
    state = resolveBattle(state);
    expect(state.neutralAssimilationConditions?.[0].consumedBattleId).toBeDefined();

    beginAttack(state);
    state = resolveBattle(state);
    const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
    expect(space.controller).toBe('player_2');
    expect(space.capturePendingBy).toBe('player_1');
  });

  it('ignores canceled, negated, and virtual Battle copies', () => {
    for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      let state = game();
      beginAttack(state, [played(ASSIMILATION, 'player_1', 'hand', overrides)]);
      state = resolveBattle(state);
      const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
      expect(space.controller).toBe('player_2');
      expect(space.capturePendingBy).toBe('player_1');
    }
  });
});
