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
import {
  ARCANE_KNOWLEDGE,
  openNextArcaneKnowledgeChoice,
} from './neutral-arcane-knowledge';
import { FORTIFICATIONS } from './neutral-fortifications';
import { openNextValorReroll, VALOR } from './neutral-valor';
import { toPrivateGameView } from './views';

const ATTRITION = 'neutral-attrition';
const UNSUPPORTED = 'neutral-capital-punishment';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-arcane-knowledge-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Scholar',
        factionId: 'intelligence',
        leaderName: 'Spy',
        deck: [ARCANE_KNOWLEDGE, ATTRITION, VALOR, 'p1-draw'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'intelligence',
        leaderName: 'Spy',
        deck: [ARCANE_KNOWLEDGE, FORTIFICATIONS, 'p2-draw'],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
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
  return {
    cardId,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    fromInitialBattleHand: origin === 'battle_draw',
    ...overrides,
  };
}

function participant(
  playerId: PlayerID,
  cards: BattlePlayedCard[],
): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    initialBattleHand: cards.filter((card) => card.origin === 'battle_draw').map((card) => card.cardId),
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[],
  defenderCards: BattlePlayedCard[],
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
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `arcane-knowledge-battle-${state.log.length + 1}`,
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function resolveChoice(state: GameState, playerId: PlayerID, cardId: string): GameState {
  return applyGameAction(state, {
    type: 'resolve_neutral_choice',
    playerId,
    choice: 'select_card',
    cardId,
  }).state;
}

describe('Neutral Arcane Knowledge', () => {
  it('registers both canonical forms and only offers the Action with a legal Graveyard target', () => {
    const state = game();
    state.players.player_1.zones.hand = [ARCANE_KNOWLEDGE];

    expect(getCardPlayRule(ARCANE_KNOWLEDGE)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: true,
    });
    expect(toPrivateGameView(state, 'player_1').legalActionPlays?.some(
      (option) => option.cardId === ARCANE_KNOWLEDGE,
    )).toBe(false);

    state.players.player_1.zones.graveyard = [ATTRITION];
    expect(toPrivateGameView(state, 'player_1').legalActionPlays).toContainEqual(
      expect.objectContaining({ cardId: ARCANE_KNOWLEDGE, requiresTarget: true }),
    );
  });

  it('moves exactly one chosen card from its controller’s Graveyard to their Discard Pile', () => {
    let state = game();
    state.players.player_1.zones.hand = [ARCANE_KNOWLEDGE];
    state.players.player_1.zones.graveyard = [ATTRITION, VALOR];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ARCANE_KNOWLEDGE,
      targets: [{ kind: 'card', owner: 'player_1', cardId: ATTRITION }],
    }).state;

    expect(state.players.player_1.zones.graveyard).toEqual([VALOR]);
    expect(state.players.player_1.zones.discard).toEqual(
      expect.arrayContaining([ARCANE_KNOWLEDGE, ATTRITION]),
    );
  });

  it('rejects missing, opposing, and ungraveyarded Action targets', () => {
    const missing = game();
    missing.players.player_1.zones.hand = [ARCANE_KNOWLEDGE];
    expect(() => applyGameAction(missing, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ARCANE_KNOWLEDGE,
    })).toThrow('exactly one card from your own Graveyard');

    const opposing = game();
    opposing.players.player_1.zones.hand = [ARCANE_KNOWLEDGE];
    opposing.players.player_2.zones.graveyard = [ATTRITION];
    expect(() => applyGameAction(opposing, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ARCANE_KNOWLEDGE,
      targets: [{ kind: 'card', owner: 'player_2', cardId: ATTRITION }],
    })).toThrow('your own Graveyard');

    const absent = game();
    absent.players.player_1.zones.hand = [ARCANE_KNOWLEDGE];
    expect(() => applyGameAction(absent, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ARCANE_KNOWLEDGE,
      targets: [{ kind: 'card', owner: 'player_1', cardId: ATTRITION }],
    })).toThrow('not in your Graveyard');
  });

  it('offers only currently replayable Graveyard effects and leaves the chosen card there', () => {
    let state = game();
    state.players.player_1.zones.graveyard = [ATTRITION, UNSUPPORTED, ARCANE_KNOWLEDGE];
    beginBattle(state, [played(ARCANE_KNOWLEDGE, 'player_1')], []);

    expect(openNextArcaneKnowledgeChoice(state)).toBe(true);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'arcane_knowledge_battle',
      playerId: 'player_1',
      graveyardOptions: [ATTRITION],
    });

    state = resolveChoice(state, 'player_1', ATTRITION);
    expect(state.players.player_1.zones.graveyard).toEqual(
      expect.arrayContaining([ATTRITION, UNSUPPORTED, ARCANE_KNOWLEDGE]),
    );
    expect(state.battle?.attacker.battleDrawPlayed).toContainEqual(
      expect.objectContaining({
        cardId: ATTRITION,
        origin: 'replayed',
        virtual: true,
        effectOnlyReplay: true,
      }),
    );
  });

  it('resolves canonical Fortifications from the Graveyard and never creates a cleanup duplicate', () => {
    let state = game();
    state.players.player_2.zones.graveyard = [FORTIFICATIONS];
    beginBattle(state, [], [played(ARCANE_KNOWLEDGE, 'player_2')]);

    expect(openNextArcaneKnowledgeChoice(state)).toBe(true);
    state = resolveChoice(state, 'player_2', FORTIFICATIONS);
    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    expect(state.battle?.defender.modifiers).toBe(1);
    state.battle!.attacker.diceRoll = 1;
    state.battle!.defender.diceRoll = 6;
    state.battle!.stage = 'resolution';
    state = applyGameAction(state, {
      type: 'resolve_battle',
      playerId: 'player_1',
    }).state;

    expect(state.players.player_2.zones.graveyard.filter(
      (cardId) => cardId === FORTIFICATIONS,
    )).toHaveLength(1);
    expect(state.players.player_2.zones.discard).not.toContain(FORTIFICATIONS);
  });

  it('makes a virtually replayed Valor source eligible for its normal reroll window', () => {
    let state = game();
    state.players.player_1.zones.graveyard = [VALOR];
    beginBattle(state, [played(ARCANE_KNOWLEDGE, 'player_1')], []);

    expect(openNextArcaneKnowledgeChoice(state)).toBe(true);
    state = resolveChoice(state, 'player_1', VALOR);
    state.battle!.attacker.diceRoll = 1;
    state.battle!.defender.diceRoll = 6;
    state.battle!.stage = 'resolution';

    expect(openNextValorReroll(state)).toBe(true);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'valor_battle',
      playerId: 'player_1',
    });
    expect(state.players.player_1.zones.graveyard).toEqual([VALOR]);
  });

  it('ignores canceled, negated, and virtual Arcane Knowledge sources', () => {
    for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      const state = game();
      state.players.player_1.zones.graveyard = [ATTRITION];
      beginBattle(
        state,
        [played(ARCANE_KNOWLEDGE, 'player_1', 'battle_draw', overrides)],
        [],
      );

      expect(openNextArcaneKnowledgeChoice(state)).toBe(false);
      expect(state.pendingNeutralChoice).toBeUndefined();
    }
  });
});
