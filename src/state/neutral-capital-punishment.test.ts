import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { CAPITAL_PUNISHMENT } from './neutral-capital-punishment';
import { toPrivateGameView } from './views';

const ASSET = 'neutral-entrenchment';
const RALLYING_CRY = 'neutral-rallying-cry';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-capital-punishment-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Judge',
        factionId: 'intelligence',
        leaderName: 'Spy',
        deck: [CAPITAL_PUNISHMENT, CAPITAL_PUNISHMENT, 'p1-draw'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'intelligence',
        leaderName: 'Spy',
        deck: [ASSET, RALLYING_CRY, 'p2-draw'],
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

function recordBattleWin(state: GameState, winner: PlayerID): void {
  state.log.push({
    id: `${state.id}-capital-punishment-win`,
    turn: state.turn,
    actor: winner,
    type: 'battle_resolved',
    message: `${winner} won a battle.`,
    payload: { winner },
    visibility: 'public',
  } satisfies GameEvent);
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
    id: `capital-punishment-battle-${state.log.length + 1}`,
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function resolveReveal(state: GameState): GameState {
  return applyGameAction(state, {
    type: 'resolve_battle_reveal',
    playerId: 'player_1',
    battleCardTargets: [{
      sourceCardId: CAPITAL_PUNISHMENT,
      sourceOwner: 'player_1',
      targetCardId: RALLYING_CRY,
      targetOwner: 'player_2',
    }],
  }).state;
}

function finishBattle(state: GameState, attackerWins: boolean): GameState {
  state.battle!.attacker.diceRoll = attackerWins ? 6 : 1;
  state.battle!.defender.diceRoll = attackerWins ? 1 : 6;
  state.battle!.stage = 'resolution';
  return applyGameAction(state, {
    type: 'resolve_battle',
    playerId: 'player_1',
  }).state;
}

describe('Neutral Capital Punishment', () => {
  it('registers both canonical forms and requires an Action target', () => {
    expect(getCardPlayRule(CAPITAL_PUNISHMENT)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
      requiresTarget: true,
    });
  });

  it('only offers and resolves the Action after a same-turn battle win', () => {
    let state = game();
    state.players.player_1.zones.hand = [CAPITAL_PUNISHMENT];
    state.players.player_2.zones.assetBank = [ASSET];

    expect(toPrivateGameView(state, 'player_1').legalActionPlays?.some((option) => option.cardId === CAPITAL_PUNISHMENT)).toBe(false);
    expect(() => applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CAPITAL_PUNISHMENT,
      targets: [{ kind: 'card', owner: 'player_2', cardId: ASSET }],
    })).toThrow('won a battle this turn');

    recordBattleWin(state, 'player_1');
    expect(toPrivateGameView(state, 'player_1').legalActionPlays).toContainEqual(expect.objectContaining({
      cardId: CAPITAL_PUNISHMENT,
      requiresTarget: true,
    }));

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: CAPITAL_PUNISHMENT,
      targets: [{ kind: 'card', owner: 'player_2', cardId: ASSET }],
    }).state;

    expect(state.players.player_1.zones.discard).toContain(CAPITAL_PUNISHMENT);
    expect(state.players.player_2.zones.assetBank).not.toContain(ASSET);
    expect(state.players.player_2.zones.graveyard).toContain(ASSET);
  });

  it('rejects own, missing, and unbanked Action targets', () => {
    const own = game();
    own.players.player_1.zones.hand = [CAPITAL_PUNISHMENT];
    own.players.player_1.zones.assetBank = [ASSET];
    recordBattleWin(own, 'player_1');
    expect(() => applyGameAction(own, {
      type: 'play_action_card', playerId: 'player_1', cardId: CAPITAL_PUNISHMENT,
      targets: [{ kind: 'card', owner: 'player_1', cardId: ASSET }],
    })).toThrow('opposing Asset');

    const missing = game();
    missing.players.player_1.zones.hand = [CAPITAL_PUNISHMENT];
    recordBattleWin(missing, 'player_1');
    expect(() => applyGameAction(missing, {
      type: 'play_action_card', playerId: 'player_1', cardId: CAPITAL_PUNISHMENT,
    })).toThrow('one opposing Asset target');

    const unbanked = game();
    unbanked.players.player_1.zones.hand = [CAPITAL_PUNISHMENT];
    recordBattleWin(unbanked, 'player_1');
    expect(() => applyGameAction(unbanked, {
      type: 'play_action_card', playerId: 'player_1', cardId: CAPITAL_PUNISHMENT,
      targets: [{ kind: 'card', owner: 'player_2', cardId: ASSET }],
    })).toThrow('remains banked');
  });

  it('exposes the active opposing Battle cards as private target options', () => {
    const state = game();
    beginBattle(
      state,
      [played(CAPITAL_PUNISHMENT, 'player_1')],
      [played(RALLYING_CRY, 'player_2')],
    );

    expect(toPrivateGameView(state, 'player_1').battle?.validBattleCardTargets).toContainEqual({
      sourceCardId: CAPITAL_PUNISHMENT,
      sourceOwner: 'player_1',
      sourceOrigin: 'battle_draw',
      targetCardId: RALLYING_CRY,
      targetOwner: 'player_2',
      targetOrigin: 'battle_draw',
    });
  });

  it('negates the chosen Battle card before its effect resolves', () => {
    let state = game();
    beginBattle(
      state,
      [played(CAPITAL_PUNISHMENT, 'player_1')],
      [played(RALLYING_CRY, 'player_2')],
    );

    state = resolveReveal(state);

    expect(state.battle?.defender.battleDrawPlayed[0]).toMatchObject({
      cardId: RALLYING_CRY,
      negated: true,
      capitalPunishmentBy: ['player_1'],
    });
    expect(state.battle?.defender.modifiers).toBe(0);
  });

  it('sends the negated Battle Hand card to the Graveyard only if its controller wins', () => {
    let winning = game();
    beginBattle(
      winning,
      [played(CAPITAL_PUNISHMENT, 'player_1')],
      [played(RALLYING_CRY, 'player_2')],
    );
    winning = finishBattle(resolveReveal(winning), true);
    expect(winning.players.player_2.zones.graveyard).toContain(RALLYING_CRY);
    expect(winning.players.player_2.zones.discard).not.toContain(RALLYING_CRY);

    let losing = game();
    beginBattle(
      losing,
      [played(CAPITAL_PUNISHMENT, 'player_1')],
      [played(RALLYING_CRY, 'player_2')],
    );
    losing = finishBattle(resolveReveal(losing), false);
    expect(losing.players.player_2.zones.discard).toContain(RALLYING_CRY);
    expect(losing.players.player_2.zones.graveyard).not.toContain(RALLYING_CRY);
  });

  it('ignores canceled, negated, and virtual Capital Punishment copies', () => {
    for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      const state = game();
      beginBattle(
        state,
        [played(CAPITAL_PUNISHMENT, 'player_1', 'battle_draw', overrides)],
        [played(RALLYING_CRY, 'player_2')],
      );
      const resolved = applyGameAction(state, {
        type: 'resolve_battle_reveal',
        playerId: 'player_1',
      }).state;
      expect(resolved.battle?.defender.battleDrawPlayed[0].negated).not.toBe(true);
      expect(resolved.battle?.defender.modifiers).toBe(1);
    }
  });
});
